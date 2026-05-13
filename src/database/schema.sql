-- ============================================
-- RateCard Agentic Workflow - Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------
-- Table: workflows
-- Central table tracking every rate card workflow
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name VARCHAR(255) NOT NULL,
  carrier_name VARCHAR(255) NOT NULL,
  current_stage INT NOT NULL DEFAULT 1,
  overall_status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
  state_json JSONB NOT NULL DEFAULT '{}',
  pdf_filename VARCHAR(500),
  revision_count INT NOT NULL DEFAULT 0,
  rate_card_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  escalation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- -------------------------------------------
-- Table: audit_trail
-- Immutable log of every action for compliance
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  stage INT NOT NULL,
  action VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL DEFAULT 'system',
  status VARCHAR(50) NOT NULL,
  details JSONB DEFAULT '{}',
  error_message TEXT,
  token_usage INT,
  duration_ms INT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- -------------------------------------------
-- Table: stage_outputs
-- Stores the JSON output from each agent stage
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS stage_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  stage INT NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  output_data JSONB NOT NULL,
  confidence_score DECIMAL(3, 2),
  pass_rate DECIMAL(5, 2),
  token_usage INT,
  processing_time_ms INT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- -------------------------------------------
-- Table: approvals
-- Tracks client approvals and revision requests
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  approver_name VARCHAR(255) NOT NULL,
  approver_email VARCHAR(255) NOT NULL,
  approval_type VARCHAR(50) NOT NULL,
  response_text TEXT,
  conditions JSONB,
  response_date TIMESTAMP WITH TIME ZONE,
  deadline_date TIMESTAMP WITH TIME ZONE,
  escalated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- -------------------------------------------
-- Indexes for query performance
-- -------------------------------------------
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(overall_status);
CREATE INDEX IF NOT EXISTS idx_workflows_client ON workflows(client_name);
CREATE INDEX IF NOT EXISTS idx_workflows_updated ON workflows(updated_at);

CREATE INDEX IF NOT EXISTS idx_audit_workflow ON audit_trail(workflow_id);
CREATE INDEX IF NOT EXISTS idx_audit_stage ON audit_trail(workflow_id, stage);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_trail(timestamp);

CREATE INDEX IF NOT EXISTS idx_stage_outputs_workflow ON stage_outputs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_stage_outputs_stage ON stage_outputs(workflow_id, stage);

CREATE INDEX IF NOT EXISTS idx_approvals_workflow ON approvals(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approvals_type ON approvals(approval_type);
