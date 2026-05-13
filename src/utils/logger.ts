// ============================================
// Logger - Structured JSON Logging + Audit Trail
// ============================================

import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  workflowId?: string;
  stage?: number;
  action?: string;
  message: string;
  data?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const logToFile = process.env.LOG_TO_FILE === 'true';
const logFilePath = process.env.LOG_FILE_PATH || './logs/workflow.log';

/**
 * Ensure the log directory exists
 */
function ensureLogDir(): void {
  if (logToFile) {
    const dir = path.dirname(logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Write a log entry to console and optionally to file
 */
function writeLog(entry: LogEntry): void {
  if (LOG_LEVELS[entry.level] < LOG_LEVELS[currentLevel]) return;

  const formatted = JSON.stringify(entry);

  // Console output with color
  switch (entry.level) {
    case 'error':
      console.error(`\x1b[31m[ERROR]\x1b[0m ${entry.message}`, entry.data || '');
      break;
    case 'warn':
      console.warn(`\x1b[33m[WARN]\x1b[0m ${entry.message}`, entry.data || '');
      break;
    case 'info':
      console.log(`\x1b[36m[INFO]\x1b[0m ${entry.message}`, entry.data || '');
      break;
    case 'debug':
      console.debug(`\x1b[90m[DEBUG]\x1b[0m ${entry.message}`, entry.data || '');
      break;
  }

  // File output
  if (logToFile) {
    ensureLogDir();
    fs.appendFileSync(logFilePath, formatted + '\n');
  }
}

/**
 * Create a logger instance scoped to a workflow
 */
export function createLogger(workflowId?: string) {
  function log(
    level: LogLevel,
    message: string,
    options?: { stage?: number; action?: string; data?: Record<string, unknown> }
  ): void {
    writeLog({
      timestamp: new Date().toISOString(),
      level,
      workflowId,
      stage: options?.stage,
      action: options?.action,
      message,
      data: options?.data,
    });
  }

  return {
    debug: (msg: string, opts?: { stage?: number; action?: string; data?: Record<string, unknown> }) =>
      log('debug', msg, opts),
    info: (msg: string, opts?: { stage?: number; action?: string; data?: Record<string, unknown> }) =>
      log('info', msg, opts),
    warn: (msg: string, opts?: { stage?: number; action?: string; data?: Record<string, unknown> }) =>
      log('warn', msg, opts),
    error: (msg: string, opts?: { stage?: number; action?: string; data?: Record<string, unknown> }) =>
      log('error', msg, opts),

    /** Log a stage transition with structured data */
    stageStart: (stage: number, stageName: string) =>
      log('info', `Stage ${stage} (${stageName}) started`, { stage, action: 'stage_start' }),

    stageComplete: (stage: number, stageName: string, durationMs: number) =>
      log('info', `Stage ${stage} (${stageName}) completed in ${durationMs}ms`, {
        stage,
        action: 'stage_complete',
        data: { durationMs },
      }),

    stageFailed: (stage: number, stageName: string, error: string) =>
      log('error', `Stage ${stage} (${stageName}) failed: ${error}`, {
        stage,
        action: 'stage_failed',
        data: { error },
      }),

    gateCheck: (gate: string, passed: boolean, details?: Record<string, unknown>) =>
      log(passed ? 'info' : 'warn', `Quality gate "${gate}": ${passed ? 'PASSED' : 'BLOCKED'}`, {
        action: 'quality_gate',
        data: { gate, passed, ...details },
      }),
  };
}

/** Global logger for non-workflow-scoped messages */
export const globalLogger = createLogger();
