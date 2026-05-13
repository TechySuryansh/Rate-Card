// ============================================
// Prompt Renderer - Template Engine for Dynamic Injection
// ============================================

import { getSystemPrompt } from './system-prompts';
import {
  buildStage1UserPrompt, Stage1Context,
  buildStage2UserPrompt, Stage2Context,
  buildStage3UserPrompt, Stage3Context,
  buildStage4UserPrompt, Stage4Context,
  buildStage5UserPrompt, Stage5Context,
  buildStage6UserPrompt, Stage6Context,
  buildStage7UserPrompt, Stage7Context,
  buildStage8UserPrompt, Stage8Context,
} from './user-prompts';

export type StageContext =
  | { stage: 1; context: Stage1Context }
  | { stage: 2; context: Stage2Context }
  | { stage: 3; context: Stage3Context }
  | { stage: 4; context: Stage4Context }
  | { stage: 5; context: Stage5Context }
  | { stage: 6; context: Stage6Context }
  | { stage: 7; context: Stage7Context }
  | { stage: 8; context: Stage8Context };

export interface RenderedPrompt {
  systemPrompt: string;
  userPrompt: string;
  stageNumber: number;
}

/**
 * Render a complete prompt pair (system + user) for a given stage
 */
export function renderPrompt(stageCtx: StageContext): RenderedPrompt {
  const systemPrompt = getSystemPrompt(stageCtx.stage);
  let userPrompt: string;

  switch (stageCtx.stage) {
    case 1:
      userPrompt = buildStage1UserPrompt(stageCtx.context);
      break;
    case 2:
      userPrompt = buildStage2UserPrompt(stageCtx.context);
      break;
    case 3:
      userPrompt = buildStage3UserPrompt(stageCtx.context);
      break;
    case 4:
      userPrompt = buildStage4UserPrompt(stageCtx.context);
      break;
    case 5:
      userPrompt = buildStage5UserPrompt(stageCtx.context);
      break;
    case 6:
      userPrompt = buildStage6UserPrompt(stageCtx.context);
      break;
    case 7:
      userPrompt = buildStage7UserPrompt(stageCtx.context);
      break;
    case 8:
      userPrompt = buildStage8UserPrompt(stageCtx.context);
      break;
    default: {
      const _exhaustive: never = stageCtx;
      throw new Error(`Unknown stage: ${(_exhaustive as StageContext).stage}`);
    }
  }

  return {
    systemPrompt,
    userPrompt,
    stageNumber: stageCtx.stage,
  };
}

/**
 * Validate that a rendered prompt doesn't contain unfilled placeholders
 */
export function validatePrompt(prompt: RenderedPrompt): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for unfilled template placeholders
  const placeholderPattern = /\[(?:INSERT|PASTE|PROVIDE|YOUR)_[A-Z_]+\]/g;
  const systemMatches = prompt.systemPrompt.match(placeholderPattern);
  const userMatches = prompt.userPrompt.match(placeholderPattern);

  if (systemMatches) {
    issues.push(`System prompt contains unfilled placeholders: ${systemMatches.join(', ')}`);
  }
  if (userMatches) {
    issues.push(`User prompt contains unfilled placeholders: ${userMatches.join(', ')}`);
  }

  // Check for empty critical sections
  if (prompt.userPrompt.includes('undefined') || prompt.userPrompt.includes('null')) {
    issues.push('User prompt contains undefined or null values');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
