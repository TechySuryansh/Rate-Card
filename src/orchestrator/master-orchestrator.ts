// ============================================
// Master Orchestrator - Simplified 8-Stage Pipeline
// ============================================

import { createLogger } from '../utils/logger';
import { formatDate, addDays, formatTimestamp, generateVersion } from '../utils/helpers';
import { WorkflowError } from '../utils/error-handler';
import { loadConfig } from '../config/agent-config';

// Stage agents
import { executeStage1 } from '../agents/stage1-extract';
import { executeStage2 } from '../agents/stage2-validate';
import { executeStage3 } from '../agents/stage3-map';
import { executeStage4 } from '../agents/stage4-analyze';
import { executeStage5 } from '../agents/stage5-communicate';
import { executeStage6 } from '../agents/stage6-monitor';
import { executeStage7 } from '../agents/stage7-revise';
import { executeStage8 } from '../agents/stage8-activate';

// State management
import {
  createNewWorkflow,
  updateStageCompletion,
  updateWorkflowStatus,
  recordRevision,
  recordGateResult,
  getWorkflowSummary,
} from './state-manager';

// Services
import { sendEmail } from '../services/email-service';

// Types
import { WorkflowState, WorkflowConfig, RevisionResult } from '../agents/types';

/**
 * Execute the complete RateCard Agentic Workflow - Simplified Version
 */
export async function executeWorkflow(config: WorkflowConfig): Promise<{
  state: WorkflowState;
  summary: Record<string, unknown>;
}> {
  const logger = createLogger();
  const appConfig = loadConfig();

  logger.info('🚀 Starting RateCard Workflow', {
    action: 'workflow_start',
    data: { client: config.clientName, carrier: config.carrierName },
  });

  // Create workflow state
  let state = await createNewWorkflow(
    config.clientName,
    config.carrierName,
    config.pdfFilePath
  );

  const workflowLogger = createLogger(state.workflow_id);

  try {
    // ========================================
    // STAGE 1: PDF Extraction
    // ========================================
    workflowLogger.info('📄 Stage 1: Extracting PDF data...');

    const stage1Output = await executeStage1({
      workflowId: state.workflow_id,
      pdfFilePath: config.pdfFilePath,
      clientName: config.clientName,
      expectedRecordCount: undefined,
    });

    state = await updateStageCompletion(state, 1, stage1Output.result as unknown as Record<string, unknown>, {
      confidenceScore: stage1Output.result.confidence_score,
      tokenUsage: stage1Output.tokenUsage,
      processingTimeMs: stage1Output.processingTimeMs,
    });

    workflowLogger.info(`✅ Stage 1 Complete: ${stage1Output.result.extracted_data?.metadata?.total_rows || 0} rows extracted`);

    // ========================================
    // STAGE 2: Validation
    // ========================================
    workflowLogger.info('🔍 Stage 2: Validating data...');

    const stage2Output = await executeStage2({
      workflowId: state.workflow_id,
      extractionResult: stage1Output.result,
      industry: config.industry,
      expectedCurrency: config.expectedCurrency,
      effectiveDateStart: config.targetActivationDate,
      effectiveDateEnd: formatDate(addDays(new Date(config.targetActivationDate), 365)),
      rateRangeMin: config.rateRangeMin,
      rateRangeMax: config.rateRangeMax,
    });

    state = await updateStageCompletion(state, 2, stage2Output.result as unknown as Record<string, unknown>, {
      passRate: stage2Output.result.validation_summary.total_records > 0
        ? (stage2Output.result.validation_summary.passed / stage2Output.result.validation_summary.total_records) * 100
        : 0,
      tokenUsage: stage2Output.tokenUsage,
      processingTimeMs: stage2Output.processingTimeMs,
    });

    workflowLogger.info(`✅ Stage 2 Complete: ${stage2Output.result.validation_summary.passed}/${stage2Output.result.validation_summary.total_records} records passed`);

    // ========================================
    // STAGE 3: Template Mapping
    // ========================================
    workflowLogger.info('🗺️ Stage 3: Mapping to template...');

    const stage3Output = await executeStage3({
      workflowId: state.workflow_id,
      validationResult: stage2Output.result,
    });

    state = await updateStageCompletion(state, 3, stage3Output.result as unknown as Record<string, unknown>, {
      tokenUsage: stage3Output.tokenUsage,
      processingTimeMs: stage3Output.processingTimeMs,
    });

    workflowLogger.info(`✅ Stage 3 Complete: ${stage3Output.result.records_converted} records mapped`);

    // ========================================
    // STAGE 4: Impact Analysis
    // ========================================
    workflowLogger.info('📊 Stage 4: Analyzing impact...');

    const stage4Output = await executeStage4({
      workflowId: state.workflow_id,
      mappingResult: stage3Output.result,
      clientName: config.clientName,
      carrierName: config.carrierName,
      effectiveDate: config.targetActivationDate,
      currentRateCardId: config.currentRateCardId || 'N/A',
      currentRateCardData: config.currentRateCardData,
    });

    state = await updateStageCompletion(state, 4, stage4Output.result as unknown as Record<string, unknown>, {
      tokenUsage: stage4Output.tokenUsage,
      processingTimeMs: stage4Output.processingTimeMs,
    });

    workflowLogger.info(`✅ Stage 4 Complete: Revenue impact ${stage4Output.result.impact_analysis.net_revenue_impact}`);

    // ========================================
    // STAGE 5: Client Communication
    // ========================================
    workflowLogger.info('📧 Stage 5: Generating communication...');

    const stage5Output = await executeStage5({
      workflowId: state.workflow_id,
      analysisResult: stage4Output.result,
      clientName: config.clientName,
      contactName: config.clientContactName,
      contactEmail: config.clientContactEmail,
      communicationStyle: config.communicationStyle,
      approvalAuthority: config.approvalAuthority,
      carrierName: config.carrierName,
      effectiveDate: config.targetActivationDate,
      changeReason: config.changeReason,
      approvalTimeline: appConfig.workflow.approvalDeadlineDays,
    });

    state = await updateStageCompletion(state, 5, stage5Output.result as unknown as Record<string, unknown>, {
      tokenUsage: stage5Output.tokenUsage,
      processingTimeMs: stage5Output.processingTimeMs,
    });

    // Send email
    try {
      const commPkg = stage5Output.result.communication_package;
      await sendEmail({
        to: commPkg.recipient_emails,
        subject: commPkg.email_subject,
        body: commPkg.email_body,
      });
      workflowLogger.info('✅ Stage 5 Complete: Communication sent');
    } catch (err) {
      workflowLogger.warn('Stage 5: Email send failed (non-blocking)', { action: 'email_failed', data: { error: (err as Error).message } });
    }

    // ========================================
    // STAGE 6: Approval Monitoring
    // ========================================
    workflowLogger.info('⏳ Stage 6: Simulating approval...');

    // For demo: simulate approved response
    const clientResponse = 'We have reviewed the rate card changes and approve them as submitted. Please proceed with activation.';

    const stage6Output = await executeStage6({
      workflowId: state.workflow_id,
      clientName: config.clientName,
      requestSentDate: formatDate(new Date()),
      approvalDeadline: config.approvalDeadline,
      clientEmail: config.clientContactEmail,
      clientResponse,
      escalationRules: {
        noResponseDays: appConfig.workflow.approvalDeadlineDays,
        accountManagerName: config.escalationContact,
      },
    });

    state = await updateStageCompletion(state, 6, stage6Output.result as unknown as Record<string, unknown>, {
      tokenUsage: stage6Output.tokenUsage,
      processingTimeMs: stage6Output.processingTimeMs,
    });

    workflowLogger.info(`✅ Stage 6 Complete: Response type - ${stage6Output.result.response_type}`);

    // ========================================
    // STAGE 7: Revision Check (Skip if approved)
    // ========================================
    workflowLogger.info('🔄 Stage 7: Checking revisions...');

    const stage7NoRevisionResult: RevisionResult = {
      revision_cycle: {
        workflow_id: state.workflow_id,
        current_version: generateVersion(0),
        revision_number: 0,
        revision_reason: 'No revision needed - client approved as submitted',
        requested_changes: [],
        status: 'ready_for_reapproval',
      },
      carrier_communication: {
        to: config.carrierEmail,
        subject: 'Rate Card Approved - Ready for Activation',
        body: 'The rate card has been approved by the client and is ready for activation.',
        deadline_for_submission: '',
        required_changes: [],
      },
      resubmission_tracking: {
        deadline_for_revision: '',
        expected_resubmission_date: '',
        escalation_date_if_no_response: '',
      },
      next_steps: ['Proceed to Stage 8 - Activation'],
    };

    state = await updateStageCompletion(state, 7, stage7NoRevisionResult as unknown as Record<string, unknown>, {
      processingTimeMs: 10
    });

    workflowLogger.info('✅ Stage 7 Complete: No revisions needed');

    // ========================================
    // STAGE 8: Activation
    // ========================================
    workflowLogger.info('🚀 Stage 8: Activating rate card...');

    state.approvals.push({
      approver: config.approvalAuthority,
      date: formatTimestamp(new Date()),
      type: 'approved',
      conditions: stage6Output.result.response_summary,
    });

    const stage8Output = await executeStage8({
      workflowId: state.workflow_id,
      approvedRateCardJson: JSON.stringify(stage3Output.result.transformed_data),
      approvals: [
        {
          approverName: config.approvalAuthority,
          approverEmail: config.clientContactEmail,
          approvalDate: formatDate(new Date()),
          approvalMethod: 'email',
          notes: stage6Output.result.response_summary,
        },
      ],
      clientName: config.clientName,
      carrierName: config.carrierName,
      effectiveDate: config.targetActivationDate,
      currentActiveRateCardId: config.currentRateCardId || 'N/A',
      deploymentEnvironment: 'production',
    });

    state = await updateStageCompletion(state, 8, stage8Output.result as unknown as Record<string, unknown>, {
      tokenUsage: stage8Output.tokenUsage,
      processingTimeMs: stage8Output.processingTimeMs,
    });

    // Mark workflow as activated
    state = await updateWorkflowStatus(state, 'activated', 'Rate card activated successfully');
    workflowLogger.info('✅ Stage 8 Complete: Rate card ACTIVATED');

    // ========================================
    // WORKFLOW COMPLETE
    // ========================================
    workflowLogger.info('🎉 WORKFLOW COMPLETE - All 8 stages finished successfully');

    return { state, summary: getWorkflowSummary(state) };

  } catch (error) {
    const err = error as WorkflowError | Error;
    workflowLogger.error(`❌ Workflow failed: ${err.message}`);

    if (state.overall_status === 'in_progress') {
      state = await updateWorkflowStatus(state, 'failed', err.message);
    }

    throw err;
  }
}
