// ============================================
// Stage 4 Agent: Rate Card Comparison & Impact Analysis
// ============================================

import { callClaudeForJson } from '../services/claude-client';
import { renderPrompt } from '../prompts/prompt-renderer';
import { createLogger } from '../utils/logger';
import { wrapError } from '../utils/error-handler';
import { measureTime, formatDate } from '../utils/helpers';
import { MappingResult, AnalysisResult } from './types';

const logger = createLogger();

export interface Stage4Input {
  workflowId: string;
  mappingResult: MappingResult;
  clientName: string;
  carrierName: string;
  effectiveDate: string;
  currentRateCardId: string;
  currentRateCardData?: Record<string, unknown>[];
  volumeEstimates?: Array<{ laneId: string; monthlyVolume: number }>;
  riskThresholds?: {
    priceIncreasePercent: number;
    priceDecreasePercent: number;
    monthlyShipmentThreshold: number;
    competitivePositionPercent: number;
  };
}

export interface Stage4Output {
  result: AnalysisResult;
  tokenUsage: number;
  processingTimeMs: number;
}

/**
 * Execute Stage 4: Compare new rate card against current and analyze impact
 */
export async function executeStage4(input: Stage4Input): Promise<Stage4Output> {
  logger.stageStart(4, 'Analyze');

  try {
    // Serialize new rate card data
    const newRateCardJson = JSON.stringify(input.mappingResult.transformed_data, null, 2);

    // Get current rate card (from input or generate empty placeholder)
    const currentRateCardJson = input.currentRateCardData
      ? JSON.stringify(input.currentRateCardData, null, 2)
      : JSON.stringify(
          {
            message: 'No current rate card available for comparison. This appears to be a new rate card.',
            lanes: [],
          },
          null,
          2
        );

    // Build prompt and call Claude
    const rendered = renderPrompt({
      stage: 4,
      context: {
        newRateCardJson,
        currentRateCardJson,
        clientName: input.clientName,
        carrierName: input.carrierName,
        effectiveDate: input.effectiveDate,
        currentRateCardId: input.currentRateCardId,
        volumeEstimates: input.volumeEstimates,
        riskThresholds: input.riskThresholds,
      },
    });

    const { result: claudeResult, durationMs } = await measureTime(() =>
      callClaudeForJson<AnalysisResult>({
        systemPrompt: rendered.systemPrompt,
        userPrompt: rendered.userPrompt,
        stageNumber: 4,
        workflowId: input.workflowId,
      })
    );

    const output: Stage4Output = {
      result: claudeResult.parsed,
      tokenUsage: claudeResult.raw.tokenUsage.totalTokens,
      processingTimeMs: durationMs,
    };

    const impact = claudeResult.parsed.impact_analysis;
    logger.stageComplete(4, 'Analyze', durationMs);
    logger.info(
      `Analysis: Revenue impact ${impact.net_revenue_impact}, ${impact.net_price_change_percent} change, ${claudeResult.parsed.high_risk_changes?.length || 0} high-risk items`,
      {
        stage: 4,
        action: 'analysis_complete',
        data: {
          revenueImpact: impact.net_revenue_impact,
          priceChange: impact.net_price_change_percent,
          highRiskCount: claudeResult.parsed.high_risk_changes?.length || 0,
          affectedShipments: impact.affected_shipments_monthly,
        },
      }
    );

    return output;
  } catch (error) {
    logger.stageFailed(4, 'Analyze', (error as Error).message);
    throw wrapError(error, 4, input.workflowId, {
      clientName: input.clientName,
      carrierName: input.carrierName,
    });
  }
}
