// ============================================
// Stage 2 Agent: Intelligent Validation & Auto-Correction
// ============================================

import { callClaudeForJson } from '../services/claude-client';
import { renderPrompt } from '../prompts/prompt-renderer';
import { createLogger } from '../utils/logger';
import { wrapError } from '../utils/error-handler';
import { measureTime } from '../utils/helpers';
import { ExtractionResult, ValidationResult } from './types';
import { getValidationRules } from '../config/validation-rules';

const logger = createLogger();

export interface Stage2Input {
  workflowId: string;
  extractionResult: ExtractionResult;
  industry: string;
  expectedCurrency: string;
  effectiveDateStart: string;
  effectiveDateEnd: string;
  rateRangeMin: number;
  rateRangeMax: number;
  validOrigins?: string[];
  validDestinations?: string[];
  laneIdFormat?: string;
}

export interface Stage2Output {
  result: ValidationResult;
  tokenUsage: number;
  processingTimeMs: number;
}

/**
 * Execute Stage 2: Validate and clean extracted rate card data
 */
export async function executeStage2(input: Stage2Input): Promise<Stage2Output> {
  logger.stageStart(2, 'Validate');

  try {
    const rules = getValidationRules();

    // Serialize extracted data for prompt
    const extractedDataJson = JSON.stringify(input.extractionResult.extracted_data, null, 2);

    // Build common misspellings list
    const misspellings = Object.entries(rules.commonMisspellings).map(
      ([wrong, right]) => `"${wrong}" should be "${right}"`
    );

    // Build prompt and call Claude
    const rendered = renderPrompt({
      stage: 2,
      context: {
        extractedDataJson,
        industry: input.industry,
        validOrigins: input.validOrigins || rules.validOrigins,
        validDestinations: input.validDestinations || rules.validDestinations,
        rateRangeMin: input.rateRangeMin,
        rateRangeMax: input.rateRangeMax,
        expectedCurrency: input.expectedCurrency,
        effectiveDateStart: input.effectiveDateStart,
        effectiveDateEnd: input.effectiveDateEnd,
        laneIdFormat: input.laneIdFormat,
        commonMisspellings: misspellings,
      },
    });

    const { result: claudeResult, durationMs } = await measureTime(() =>
      callClaudeForJson<ValidationResult>({
        systemPrompt: rendered.systemPrompt,
        userPrompt: rendered.userPrompt,
        stageNumber: 2,
        workflowId: input.workflowId,
      })
    );

    const output: Stage2Output = {
      result: claudeResult.parsed,
      tokenUsage: claudeResult.raw.tokenUsage.totalTokens,
      processingTimeMs: durationMs,
    };

    const summary = claudeResult.parsed.validation_summary;
    logger.stageComplete(2, 'Validate', durationMs);
    logger.info(
      `Validation: ${summary.passed}/${summary.total_records} passed, ${summary.warnings} warnings, ${summary.errors} errors (${summary.overall_status})`,
      {
        stage: 2,
        action: 'validation_complete',
        data: {
          totalRecords: summary.total_records,
          passed: summary.passed,
          warnings: summary.warnings,
          errors: summary.errors,
          status: summary.overall_status,
          corrections: claudeResult.parsed.auto_corrections_applied?.length || 0,
        },
      }
    );

    return output;
  } catch (error) {
    logger.stageFailed(2, 'Validate', (error as Error).message);
    throw wrapError(error, 2, input.workflowId, {
      totalRecords: input.extractionResult.extracted_data?.metadata?.total_rows,
    });
  }
}
