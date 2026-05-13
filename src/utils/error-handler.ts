// ============================================
// Error Handler - Classification, Recovery & Escalation
// ============================================

export type ErrorSeverity = 'retryable' | 'fatal' | 'escalation_needed';

export class WorkflowError extends Error {
  public readonly severity: ErrorSeverity;
  public readonly stage: number;
  public readonly workflowId: string;
  public readonly context: Record<string, unknown>;
  public readonly originalError?: Error;

  constructor(
    message: string,
    stage: number,
    workflowId: string,
    severity: ErrorSeverity,
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message);
    this.name = 'WorkflowError';
    this.severity = severity;
    this.stage = stage;
    this.workflowId = workflowId;
    this.context = context || {};
    this.originalError = originalError;
  }
}

/**
 * Classify an error into retryable, fatal, or escalation_needed
 */
export function classifyError(error: Error): ErrorSeverity {
  const message = error.message.toLowerCase();

  // Retryable errors (transient)
  if (
    message.includes('timeout') ||
    message.includes('rate limit') ||
    message.includes('overloaded') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('503') ||
    message.includes('429')
  ) {
    return 'retryable';
  }

  // Escalation needed (human intervention required)
  if (
    message.includes('confidence') ||
    message.includes('quality gate') ||
    message.includes('validation failed') ||
    message.includes('unmapped critical') ||
    message.includes('revenue impact')
  ) {
    return 'escalation_needed';
  }

  // Everything else is fatal
  return 'fatal';
}

/**
 * Wrap an error with workflow context
 */
export function wrapError(
  error: unknown,
  stage: number,
  workflowId: string,
  context?: Record<string, unknown>
): WorkflowError {
  const err = error instanceof Error ? error : new Error(String(error));
  const severity = classifyError(err);

  return new WorkflowError(
    err.message,
    stage,
    workflowId,
    severity,
    context,
    err
  );
}

/**
 * Format error for escalation notification
 */
export function formatEscalation(error: WorkflowError): string {
  return [
    `🚨 WORKFLOW ESCALATION`,
    ``,
    `Workflow ID: ${error.workflowId}`,
    `Stage: ${error.stage}`,
    `Severity: ${error.severity}`,
    `Error: ${error.message}`,
    ``,
    `Context:`,
    JSON.stringify(error.context, null, 2),
    ``,
    `Action Required: Human review needed before workflow can proceed.`,
  ].join('\n');
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    delayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
  }
): Promise<T> {
  const { maxRetries, delayMs = 1000, backoffMultiplier = 2, onRetry } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt > maxRetries) break;

      const severity = classifyError(lastError);
      if (severity !== 'retryable') throw lastError;

      if (onRetry) onRetry(attempt, lastError);

      const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
