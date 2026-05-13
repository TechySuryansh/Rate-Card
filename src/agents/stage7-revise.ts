// ============================================
// Stage 7 Agent: Revision Management & Carrier Communication
// ============================================

import { callClaudeForJson } from '../services/claude-client';
import { renderPrompt } from '../prompts/prompt-renderer';
import { createLogger } from '../utils/logger';
import { wrapError } from '../utils/error-handler';
import { measureTime, generateVersion } from '../utils/helpers';
import { RevisionResult } from './types';

const logger = createLogger();

export interface Stage7Input {
  workflowId: string;
  clientFeedbackResponse: string;
  originalRateCardJson: string;
  clientName: string;
  carrierName: string;
  carrierEmail: string;
  revisionNumber: number;
  deadlineForCarrier: string;
}

export interface Stage7Output {
  result: RevisionResult;
  tokenUsage: number;
  processingTimeMs: number;
}

/**
 * Execute Stage 7: Process client feedback and communicate with carrier
 */
export async function executeStage7(input: Stage7Input): Promise<Stage7Output> {
  logger.stageStart(7, 'Revise');

  try {
    const rendered = renderPrompt({
      stage: 7,
      context: {
        clientFeedbackResponse: input.clientFeedbackResponse,
        originalRateCardJson: input.originalRateCardJson,
        clientName: input.clientName,
        carrierName: input.carrierName,
        carrierEmail: input.carrierEmail,
        workflowId: input.workflowId,
        revisionNumber: input.revisionNumber,
        deadlineForCarrier: input.deadlineForCarrier,
      },
    });

    const { result: claudeResult, durationMs } = await measureTime(() =>
      callClaudeForJson<RevisionResult>({
        systemPrompt: rendered.systemPrompt,
        userPrompt: rendered.userPrompt,
        stageNumber: 7,
        workflowId: input.workflowId,
      })
    );

    const output: Stage7Output = {
      result: claudeResult.parsed,
      tokenUsage: claudeResult.raw.tokenUsage.totalTokens,
      processingTimeMs: durationMs,
    };

    const revision = claudeResult.parsed.revision_cycle;
    logger.stageComplete(7, 'Revise', durationMs);
    logger.info(
      `Revision ${revision.current_version}: ${revision.requested_changes?.length || 0} changes requested, status: ${revision.status}`,
      {
        stage: 7,
        action: 'revision_processed',
        data: {
          version: revision.current_version,
          revisionNumber: revision.revision_number,
          changesCount: revision.requested_changes?.length || 0,
          status: revision.status,
          reason: revision.revision_reason,
        },
      }
    );

    return output;
  } catch (error) {
    logger.stageFailed(7, 'Revise', (error as Error).message);
    throw wrapError(error, 7, input.workflowId, {
      revisionNumber: input.revisionNumber,
      clientName: input.clientName,
      carrierName: input.carrierName,
    });
  }
}
