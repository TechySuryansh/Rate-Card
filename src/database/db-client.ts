// ============================================
// Database Client - PostgreSQL Connection & Queries
// ============================================

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { loadConfig } from '../config/agent-config';

let pool: Pool | null = null;

/**
 * Get or create the PostgreSQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    const config = loadConfig();
    pool = new Pool({
      connectionString: config.database.connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000, // Shorter timeout for faster failover
    });

    pool.on('error', (err) => {
      // Non-fatal if we have a fallback
      if (err.message.includes('ECONNREFUSED')) {
        console.warn('[DB] Connection refused. Running in memory-only mode.');
      } else {
        console.error('[DB] Unexpected pool error:', err.message);
      }
    });
  }
  return pool;
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// -------------------------------------------
// Workflow CRUD Operations
// -------------------------------------------

export interface WorkflowRecord {
  id: string;
  client_name: string;
  carrier_name: string;
  current_stage: number;
  overall_status: string;
  state_json: Record<string, unknown>;
  pdf_filename: string | null;
  revision_count: number;
  rate_card_version: string;
  escalation_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createWorkflow(
  clientName: string,
  carrierName: string,
  pdfFilename?: string
): Promise<WorkflowRecord> {
  const db = getPool();
  const id = uuidv4();
  const result = await db.query(
    `INSERT INTO workflows (id, client_name, carrier_name, pdf_filename, state_json)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, clientName, carrierName, pdfFilename || null, JSON.stringify({})]
  );
  return result.rows[0];
}

export async function getWorkflow(workflowId: string): Promise<WorkflowRecord | null> {
  try {
    const db = getPool();
    const result = await db.query('SELECT * FROM workflows WHERE id = $1', [workflowId]);
    return result.rows[0] || null;
  } catch (err) {
    console.warn('[DB] getWorkflow failed (database likely down):', (err as Error).message);
    return null;
  }
}

export async function updateWorkflowStage(
  workflowId: string,
  stage: number,
  status: string,
  stateUpdate?: Record<string, unknown>
): Promise<void> {
  const db = getPool();
  if (stateUpdate) {
    await db.query(
      `UPDATE workflows
       SET current_stage = $1, overall_status = $2,
           state_json = state_json || $3::jsonb,
           updated_at = NOW()
       WHERE id = $4`,
      [stage, status, JSON.stringify(stateUpdate), workflowId]
    );
  } else {
    await db.query(
      `UPDATE workflows
       SET current_stage = $1, overall_status = $2, updated_at = NOW()
       WHERE id = $3`,
      [stage, status, workflowId]
    );
  }
}

export async function updateWorkflowRevision(
  workflowId: string,
  revisionCount: number,
  version: string
): Promise<void> {
  const db = getPool();
  await db.query(
    `UPDATE workflows
     SET revision_count = $1, rate_card_version = $2, updated_at = NOW()
     WHERE id = $3`,
    [revisionCount, version, workflowId]
  );
}

export async function setWorkflowEscalation(
  workflowId: string,
  reason: string
): Promise<void> {
  const db = getPool();
  await db.query(
    `UPDATE workflows
     SET overall_status = 'escalated', escalation_reason = $1, updated_at = NOW()
     WHERE id = $2`,
    [reason, workflowId]
  );
}

// -------------------------------------------
// Audit Trail Operations
// -------------------------------------------

export interface AuditRecord {
  id: string;
  workflow_id: string;
  stage: number;
  action: string;
  user_id: string;
  status: string;
  details: Record<string, unknown>;
  error_message: string | null;
  token_usage: number | null;
  duration_ms: number | null;
  timestamp: Date;
}

export async function logAuditEntry(
  workflowId: string,
  stage: number,
  action: string,
  status: string,
  details?: Record<string, unknown>,
  options?: {
    userId?: string;
    errorMessage?: string;
    tokenUsage?: number;
    durationMs?: number;
  }
): Promise<AuditRecord> {
  const db = getPool();
  const id = uuidv4();
  const result = await db.query(
    `INSERT INTO audit_trail (id, workflow_id, stage, action, user_id, status, details, error_message, token_usage, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      id,
      workflowId,
      stage,
      action,
      options?.userId || 'system',
      status,
      JSON.stringify(details || {}),
      options?.errorMessage || null,
      options?.tokenUsage || null,
      options?.durationMs || null,
    ]
  );
  return result.rows[0];
}

export async function getAuditTrail(workflowId: string): Promise<AuditRecord[]> {
  const db = getPool();
  const result = await db.query(
    'SELECT * FROM audit_trail WHERE workflow_id = $1 ORDER BY timestamp ASC',
    [workflowId]
  );
  return result.rows;
}

// -------------------------------------------
// Stage Output Operations
// -------------------------------------------

export interface StageOutputRecord {
  id: string;
  workflow_id: string;
  stage: number;
  version: string;
  output_data: Record<string, unknown>;
  confidence_score: number | null;
  pass_rate: number | null;
  token_usage: number | null;
  processing_time_ms: number | null;
  created_at: Date;
}

export async function saveStageOutput(
  workflowId: string,
  stage: number,
  outputData: Record<string, unknown>,
  options?: {
    version?: string;
    confidenceScore?: number;
    passRate?: number;
    tokenUsage?: number;
    processingTimeMs?: number;
  }
): Promise<StageOutputRecord> {
  const db = getPool();
  const id = uuidv4();
  const result = await db.query(
    `INSERT INTO stage_outputs (id, workflow_id, stage, version, output_data, confidence_score, pass_rate, token_usage, processing_time_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      workflowId,
      stage,
      options?.version || 'v1.0',
      JSON.stringify(outputData),
      options?.confidenceScore || null,
      options?.passRate || null,
      options?.tokenUsage || null,
      options?.processingTimeMs || null,
    ]
  );
  return result.rows[0];
}

export async function getStageOutput(
  workflowId: string,
  stage: number,
  version?: string
): Promise<StageOutputRecord | null> {
  const db = getPool();
  let query = 'SELECT * FROM stage_outputs WHERE workflow_id = $1 AND stage = $2';
  const params: unknown[] = [workflowId, stage];

  if (version) {
    query += ' AND version = $3';
    params.push(version);
  }

  query += ' ORDER BY created_at DESC LIMIT 1';
  const result = await db.query(query, params);
  return result.rows[0] || null;
}

export async function getAllStageOutputs(workflowId: string): Promise<StageOutputRecord[]> {
  const db = getPool();
  const result = await db.query(
    'SELECT * FROM stage_outputs WHERE workflow_id = $1 ORDER BY stage ASC, created_at DESC',
    [workflowId]
  );
  return result.rows;
}

// -------------------------------------------
// Approval Operations
// -------------------------------------------

export interface ApprovalRecord {
  id: string;
  workflow_id: string;
  approver_name: string;
  approver_email: string;
  approval_type: string;
  response_text: string | null;
  conditions: Record<string, unknown> | null;
  response_date: Date | null;
  deadline_date: Date | null;
  escalated: boolean;
  created_at: Date;
}

export async function createApprovalRequest(
  workflowId: string,
  approverName: string,
  approverEmail: string,
  deadlineDate: Date
): Promise<ApprovalRecord> {
  const db = getPool();
  const id = uuidv4();
  const result = await db.query(
    `INSERT INTO approvals (id, workflow_id, approver_name, approver_email, approval_type, deadline_date)
     VALUES ($1, $2, $3, $4, 'pending', $5)
     RETURNING *`,
    [id, workflowId, approverName, approverEmail, deadlineDate]
  );
  return result.rows[0];
}

export async function updateApproval(
  approvalId: string,
  approvalType: string,
  responseText?: string,
  conditions?: Record<string, unknown>
): Promise<void> {
  const db = getPool();
  await db.query(
    `UPDATE approvals
     SET approval_type = $1, response_text = $2, conditions = $3, response_date = NOW()
     WHERE id = $4`,
    [approvalType, responseText || null, conditions ? JSON.stringify(conditions) : null, approvalId]
  );
}

export async function getApprovals(workflowId: string): Promise<ApprovalRecord[]> {
  const db = getPool();
  const result = await db.query(
    'SELECT * FROM approvals WHERE workflow_id = $1 ORDER BY created_at ASC',
    [workflowId]
  );
  return result.rows;
}

// -------------------------------------------
// Transaction Helper
// -------------------------------------------

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const db = getPool();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
