// ============================================
// Stage 5 Agent: Client Communication & Approval Request
// ============================================

import { callClaudeForJson } from '../services/claude-client';
import { renderPrompt } from '../prompts/prompt-renderer';
import { createLogger } from '../utils/logger';
import { wrapError } from '../utils/error-handler';
import { measureTime, formatDate, addDays } from '../utils/helpers';
import { AnalysisResult, CommunicationPackage } from './types';

const logger = createLogger();

export interface Stage5Input {
  workflowId: string;
  analysisResult: AnalysisResult;
  clientName: string;
  contactName: string;
  contactEmail: string;
  ccEmails?: string[];
  communicationStyle: 'professional' | 'technical' | 'executive' | 'friendly';
  approvalAuthority: string;
  carrierName: string;
  effectiveDate: string;
  changeReason: string;
  approvalTimeline: number;
  clientBenefits?: string;
  knownConcerns?: string;
}

export interface Stage5Output {
  result: CommunicationPackage;
  tokenUsage: number;
  processingTimeMs: number;
}

/**
 * Execute Stage 5: Generate client communication and approval request
 */
export async function executeStage5(input: Stage5Input): Promise<Stage5Output> {
  logger.stageStart(5, 'Communicate');

  try {
    const impactAnalysisJson = JSON.stringify(input.analysisResult, null, 2);

    const rendered = renderPrompt({
      stage: 5,
      context: {
        impactAnalysisJson,
        clientName: input.clientName,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        ccEmails: input.ccEmails,
        communicationStyle: input.communicationStyle,
        approvalAuthority: input.approvalAuthority,
        carrierName: input.carrierName,
        effectiveDate: input.effectiveDate,
        changeReason: input.changeReason,
        approvalTimeline: input.approvalTimeline,
        clientBenefits: input.clientBenefits,
        knownConcerns: input.knownConcerns,
      },
    });

    const { result: claudeResult, durationMs } = await measureTime(() =>
      callClaudeForJson<CommunicationPackage>({
        systemPrompt: rendered.systemPrompt,
        userPrompt: rendered.userPrompt,
        stageNumber: 5,
        workflowId: input.workflowId,
      })
    );

    const output: Stage5Output = {
      result: claudeResult.parsed,
      tokenUsage: claudeResult.raw.tokenUsage.totalTokens,
      processingTimeMs: durationMs,
    };

    logger.stageComplete(5, 'Communicate', durationMs);
    logger.info(
      `Communication package ready: "${claudeResult.parsed.communication_package?.email_subject}" → ${claudeResult.parsed.communication_package?.recipient_emails?.join(', ')}`,
      {
        stage: 5,
        action: 'communication_ready',
        data: {
          subject: claudeResult.parsed.communication_package?.email_subject,
          recipients: claudeResult.parsed.communication_package?.recipient_emails,
          deadline: claudeResult.parsed.communication_package?.deadline,
        },
      }
    );

    return output;
  } catch (error) {
    logger.stageFailed(5, 'Communicate', (error as Error).message);
    throw wrapError(error, 5, input.workflowId, {
      clientName: input.clientName,
    });
  }
}
