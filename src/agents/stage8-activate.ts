// ============================================
// Stage 8 Agent: Rate Card Activation & Finalization
// ============================================

import { callClaudeForJson } from '../services/claude-client';
import { renderPrompt } from '../prompts/prompt-renderer';
import { createLogger } from '../utils/logger';
import { wrapError } from '../utils/error-handler';
import { measureTime } from '../utils/helpers';
import { ActivationResult } from './types';

const logger = createLogger();

export interface Stage8Input {
  workflowId: string;
  approvedRateCardJson: string;
  approvals: Array<{
    approverName: string;
    approverEmail: string;
    approvalDate: string;
    approvalMethod: string;
    notes?: string;
  }>;
  clientName: string;
  carrierName: string;
  effectiveDate: string;
  currentActiveRateCardId: string;
  deploymentEnvironment: string;
  deploymentWindow?: string;
}

export interface Stage8Output {
  result: ActivationResult;
  tokenUsage: number;
  processingTimeMs: number;
}

/**
 * Execute Stage 8: Prepare and activate rate card to production
 */
export async function executeStage8(input: Stage8Input): Promise<Stage8Output> {
  logger.stageStart(8, 'Activate');

  try {
    const rendered = renderPrompt({
      stage: 8,
      context: {
        approvedRateCardJson: input.approvedRateCardJson,
        approvals: input.approvals,
        workflowId: input.workflowId,
        clientName: input.clientName,
        carrierName: input.carrierName,
        effectiveDate: input.effectiveDate,
        currentActiveRateCardId: input.currentActiveRateCardId,
        deploymentEnvironment: input.deploymentEnvironment,
        deploymentWindow: input.deploymentWindow,
      },
    });

    const { result: claudeResult, durationMs } = await measureTime(() =>
      callClaudeForJson<ActivationResult>({
        systemPrompt: rendered.systemPrompt,
        userPrompt: rendered.userPrompt,
        stageNumber: 8,
        workflowId: input.workflowId,
      })
    );

    const output: Stage8Output = {
      result: claudeResult.parsed,
      tokenUsage: claudeResult.raw.tokenUsage.totalTokens,
      processingTimeMs: durationMs,
    };

    const activation = claudeResult.parsed;
    logger.stageComplete(8, 'Activate', durationMs);

    if (activation.activation_status === 'ready_for_deployment') {
      logger.info(
        `✅ Activation READY: ${activation.activation_package?.record_count} lanes, effective ${activation.rate_card_calculations?.effective_date}`,
        {
          stage: 8,
          action: 'activation_ready',
          data: {
            status: activation.activation_status,
            recordCount: activation.activation_package?.record_count,
            effectiveDate: activation.rate_card_calculations?.effective_date,
            allChecksPassed: activation.pre_activation_checks?.all_checks_passed,
          },
        }
      );
    } else {
      logger.warn(
        `⚠️ Activation BLOCKED: ${activation.blocked_issues?.length || 0} issues found`,
        {
          stage: 8,
          action: 'activation_blocked',
          data: {
            status: activation.activation_status,
            blockedIssues: activation.blocked_issues,
          },
        }
      );
    }

    return output;
  } catch (error) {
    logger.stageFailed(8, 'Activate', (error as Error).message);
    throw wrapError(error, 8, input.workflowId, {
      clientName: input.clientName,
      carrierName: input.carrierName,
    });
  }
}
