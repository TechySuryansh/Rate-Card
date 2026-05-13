// ============================================
// Stage 6 Agent: Approval Monitoring & Response Handling
// ============================================

import { callClaudeForJson } from '../services/claude-client';
import { renderPrompt } from '../prompts/prompt-renderer';
import { createLogger } from '../utils/logger';
import { wrapError } from '../utils/error-handler';
import { measureTime } from '../utils/helpers';
import { MonitoringResult } from './types';

const logger = createLogger();

export interface Stage6Input {
  workflowId: string;
  clientName: string;
  requestSentDate: string;
  approvalDeadline: string;
  clientEmail: string;
  clientResponse?: string;
  escalationRules?: {
    noResponseDays: number;
    accountManagerName: string;
    salesLeadName?: string;
    pricingTeamName?: string;
  };
}

export interface Stage6Output {
  result: MonitoringResult;
  tokenUsage: number;
  processingTimeMs: number;
}

/**
 * Execute Stage 6: Monitor for client response and classify/route
 */
export async function executeStage6(input: Stage6Input): Promise<Stage6Output> {
  logger.stageStart(6, 'Monitor');

  try {
    const rendered = renderPrompt({
      stage: 6,
      context: {
        clientName: input.clientName,
        requestSentDate: input.requestSentDate,
        approvalDeadline: input.approvalDeadline,
        clientEmail: input.clientEmail,
        workflowId: input.workflowId,
        clientResponse: input.clientResponse,
        escalationRules: input.escalationRules,
      },
    });

    const { result: claudeResult, durationMs } = await measureTime(() =>
      callClaudeForJson<MonitoringResult>({
        systemPrompt: rendered.systemPrompt,
        userPrompt: rendered.userPrompt,
        stageNumber: 6,
        workflowId: input.workflowId,
      })
    );

    const output: Stage6Output = {
      result: claudeResult.parsed,
      tokenUsage: claudeResult.raw.tokenUsage.totalTokens,
      processingTimeMs: durationMs,
    };

    const routing = claudeResult.parsed.routing_decision;
    logger.stageComplete(6, 'Monitor', durationMs);
    logger.info(
      `Response: ${claudeResult.parsed.response_type} → Route to Stage ${routing.target_stage} (${claudeResult.parsed.next_action})`,
      {
        stage: 6,
        action: 'response_classified',
        data: {
          responseType: claudeResult.parsed.response_type,
          responseReceived: claudeResult.parsed.response_received,
          nextAction: claudeResult.parsed.next_action,
          targetStage: routing.target_stage,
          reason: routing.reason,
        },
      }
    );

    return output;
  } catch (error) {
    logger.stageFailed(6, 'Monitor', (error as Error).message);
    throw wrapError(error, 6, input.workflowId, {
      clientName: input.clientName,
    });
  }
}
