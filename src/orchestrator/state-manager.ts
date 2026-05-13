// ============================================
// State Manager - Workflow State Persistence
// ============================================

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { formatTimestamp } from '../utils/helpers';
import {
  createWorkflow,
  getWorkflow,
  updateWorkflowStage,
  updateWorkflowRevision,
  setWorkflowEscalation,
  logAuditEntry,
  saveStageOutput,
  getStageOutput,
  getAllStageOutputs,
  getAuditTrail,
  WorkflowRecord,
} from '../database/db-client';
import { 
  mongoCreateWorkflow, 
  mongoUpdateWorkflow, 
  mongoLogAudit,
  mongoGetWorkflow 
} from '../database/mongo-client';
import { WorkflowState, OverallStatus } from '../agents/types';

const logger = createLogger();

/**
 * Create a new workflow and return its state
 */
export async function createNewWorkflow(
  clientName: string,
  carrierName: string,
  pdfFilename?: string
): Promise<WorkflowState> {
  let workflowId: string;

  try {
    const record = await createWorkflow(clientName, carrierName, pdfFilename);
    workflowId = record.id;
  } catch (dbError) {
    // If database is not available, use in-memory ID
    logger.warn('Database not available, using in-memory workflow ID', {
      action: 'db_fallback',
      data: { error: (dbError as Error).message },
    });
    workflowId = uuidv4();
  }

  const state: WorkflowState = {
    workflow_id: workflowId,
    client: clientName,
    carrier: carrierName,
    current_stage: 0,
    overall_status: 'in_progress',
    stage_results: {},
    approvals: [],
    revision_history: [],
    timestamps: {
      started: formatTimestamp(new Date()),
    },
    audit_trail: [],
    metadata: {
      started: formatTimestamp(new Date())
    }
  };

  logger.info(`Workflow created: ${workflowId}`, {
    action: 'workflow_created',
    data: { workflowId, clientName, carrierName },
  });

  // Persist to MongoDB
  await mongoCreateWorkflow(state);

  return state;
}

/**
 * Update workflow state after a stage completes
 */
export async function updateStageCompletion(
  state: WorkflowState,
  stage: number,
  stageResult: Record<string, unknown>,
  options?: {
    confidenceScore?: number;
    passRate?: number;
    tokenUsage?: number;
    processingTimeMs?: number;
  }
): Promise<WorkflowState> {
  // Update in-memory state
  const stageKey = `stage_${stage}` as keyof typeof state.stage_results;
  (state.stage_results as Record<string, unknown>)[stageKey] = stageResult;
  state.current_stage = stage;
  state.timestamps[`stage_${stage}_completed` as keyof typeof state.timestamps] = formatTimestamp(new Date());
  if (!state.metadata) state.metadata = {};
  state.metadata[`stage_${stage}_completed`] = formatTimestamp(new Date());

  // Add audit entry
  state.audit_trail.push({
    timestamp: formatTimestamp(new Date()),
    stage,
    action: `stage_${stage}_completed`,
    status: 'success',
    details: `Stage ${stage} completed successfully`,
  });

  // Persist to database (best-effort)
  try {
    await updateWorkflowStage(state.workflow_id, stage, state.overall_status, {
      [`stage_${stage}_completed`]: formatTimestamp(new Date()),
    });

    // CRITICAL: Sync to MongoDB so the server can see the results for PDF generation
    await mongoUpdateWorkflow(state.workflow_id, {
      stage_results: state.stage_results,
      current_stage: state.current_stage,
      overall_status: state.overall_status,
      metadata: {
        [`stage_${stage}_completed`]: formatTimestamp(new Date())
      }
    });

    await saveStageOutput(state.workflow_id, stage, stageResult, {
      version: state.revision_history.length > 0
        ? `v1.${state.revision_history.length}`
        : 'v1.0',
      confidenceScore: options?.confidenceScore,
      passRate: options?.passRate,
      tokenUsage: options?.tokenUsage,
      processingTimeMs: options?.processingTimeMs,
    });

    await logAuditEntry(
      state.workflow_id,
      stage,
      `stage_${stage}_completed`,
      'success',
      { processingTimeMs: options?.processingTimeMs, tokenUsage: options?.tokenUsage },
      { tokenUsage: options?.tokenUsage, durationMs: options?.processingTimeMs }
    );
  } catch (dbError) {
    // Silently continue - MongoDB handles the main state now
  }

  // Update MongoDB
  await mongoUpdateWorkflow(state.workflow_id, {
    stage_results: state.stage_results,
    current_stage: state.current_stage,
    timestamps: state.timestamps,
    audit_trail: state.audit_trail
  });

  return state;
}

/**
 * Update workflow status
 */
export async function updateWorkflowStatus(
  state: WorkflowState,
  status: OverallStatus,
  reason?: string
): Promise<WorkflowState> {
  state.overall_status = status;

  if (status === 'activated' || status === 'failed') {
    state.timestamps.completed = formatTimestamp(new Date());
  }

  state.audit_trail.push({
    timestamp: formatTimestamp(new Date()),
    stage: state.current_stage,
    action: `status_changed_to_${status}`,
    status: status,
    details: reason || `Workflow status changed to ${status}`,
  });

  try {
    if (status === 'escalated' && reason) {
      await setWorkflowEscalation(state.workflow_id, reason);
    } else {
      await updateWorkflowStage(state.workflow_id, state.current_stage, status);
    }

    // CRITICAL: Sync status change to MongoDB
    await mongoUpdateWorkflow(state.workflow_id, {
      overall_status: state.overall_status,
      timestamps: state.timestamps,
      audit_trail: state.audit_trail
    });
  } catch (dbError) {
    logger.warn('Failed to update workflow status in database', {
      action: 'db_update_error',
      data: { error: (dbError as Error).message },
    });
  }

  return state;
}

/**
 * Record a revision in the workflow state
 */
export async function recordRevision(
  state: WorkflowState,
  revisionNumber: number,
  reason: string
): Promise<WorkflowState> {
  const version = `v1.${revisionNumber}`;

  state.revision_history.push({
    version,
    revision_number: revisionNumber,
    reason,
    date: formatTimestamp(new Date()),
  });

  state.audit_trail.push({
    timestamp: formatTimestamp(new Date()),
    stage: 7,
    action: `revision_${version}`,
    status: 'in_progress',
    details: `Revision ${version}: ${reason}`,
  });

  try {
    await updateWorkflowRevision(state.workflow_id, revisionNumber, version);
  } catch (dbError) {
    logger.warn('Failed to record revision in database', {
      action: 'db_revision_error',
      data: { error: (dbError as Error).message },
    });
  }

  return state;
}

/**
 * Record a gate evaluation in the audit trail
 */
export function recordGateResult(
  state: WorkflowState,
  gateName: string,
  passed: boolean,
  blockers: string[]
): WorkflowState {
  state.audit_trail.push({
    timestamp: formatTimestamp(new Date()),
    stage: state.current_stage,
    action: `gate_check: ${gateName}`,
    status: passed ? 'passed' : 'blocked',
    details: passed
      ? `${gateName} passed`
      : `${gateName} BLOCKED: ${blockers.join('; ')}`,
  });

  return state;
}

/**
 * Get a summary of the workflow for reporting
 */
export function getWorkflowSummary(state: WorkflowState): Record<string, unknown> {
  const startTime = new Date(state.timestamps.started).getTime();
  const endTime = state.timestamps.completed
    ? new Date(state.timestamps.completed).getTime()
    : Date.now();
  const totalDurationMs = endTime - startTime;

  return {
    workflowId: state.workflow_id,
    client: state.client,
    carrier: state.carrier,
    status: state.overall_status,
    currentStage: state.current_stage,
    totalDurationMinutes: Math.round(totalDurationMs / 60000),
    revisionCount: state.revision_history.length,
    approvalCount: state.approvals.length,
    stagesCompleted: Object.keys(state.stage_results).length,
    auditEntries: state.audit_trail.length,
    timestamps: state.timestamps,
  };
}
