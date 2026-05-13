// ============================================
// Stage 3 Agent: Template Conversion & Mapping
// ============================================

import { callClaudeForJson } from '../services/claude-client';
import { renderPrompt } from '../prompts/prompt-renderer';
import { createLogger } from '../utils/logger';
import { wrapError } from '../utils/error-handler';
import { measureTime } from '../utils/helpers';
import { ValidationResult, MappingResult } from './types';
import { getTemplateSchemaForPrompt, getFieldMappingsForPrompt } from '../config/template-schema';

const logger = createLogger();

export interface Stage3Input {
  workflowId: string;
  validationResult: ValidationResult;
  templateSchemaOverride?: string;
  fieldMappingOverride?: string;
  transformationRules?: string[];
}

export interface Stage3Output {
  result: MappingResult;
  tokenUsage: number;
  processingTimeMs: number;
}

/**
 * Execute Stage 3: Map validated data to RateCube template format
 */
export async function executeStage3(input: Stage3Input): Promise<Stage3Output> {
  logger.stageStart(3, 'Map');

  try {
    // Serialize cleaned data for prompt
    const cleanedDataJson = JSON.stringify(input.validationResult.cleaned_data, null, 2);

    // Get template schema and mappings
    const templateSchema = input.templateSchemaOverride || getTemplateSchemaForPrompt();
    const fieldMappings = input.fieldMappingOverride || getFieldMappingsForPrompt();

    // Build prompt and call Claude
    const rendered = renderPrompt({
      stage: 3,
      context: {
        cleanedDataJson,
        templateSchema,
        fieldMappingRules: fieldMappings,
        transformationRules: input.transformationRules,
      },
    });

    const { result: claudeResult, durationMs } = await measureTime(() =>
      callClaudeForJson<MappingResult>({
        systemPrompt: rendered.systemPrompt,
        userPrompt: rendered.userPrompt,
        stageNumber: 3,
        workflowId: input.workflowId,
      })
    );

    const output: Stage3Output = {
      result: claudeResult.parsed,
      tokenUsage: claudeResult.raw.tokenUsage.totalTokens,
      processingTimeMs: durationMs,
    };

    const quality = claudeResult.parsed.mapping_quality;
    logger.stageComplete(3, 'Map', durationMs);
    logger.info(
      `Mapping: ${quality.fully_mapped} fully mapped, ${quality.partially_mapped} partial, ${quality.unmapped_critical} unmapped critical`,
      {
        stage: 3,
        action: 'mapping_complete',
        data: {
          recordsConverted: claudeResult.parsed.records_converted,
          fullyMapped: quality.fully_mapped,
          partiallyMapped: quality.partially_mapped,
          unmappedCritical: quality.unmapped_critical,
          unmappedOptional: quality.unmapped_optional,
          status: claudeResult.parsed.conversion_status,
        },
      }
    );

    return output;
  } catch (error) {
    logger.stageFailed(3, 'Map', (error as Error).message);
    throw wrapError(error, 3, input.workflowId, {
      recordCount: input.validationResult.cleaned_data?.length,
    });
  }
}
