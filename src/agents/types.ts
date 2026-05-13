// ============================================
// Types - Shared TypeScript Interfaces for All Stages
// ============================================

// -------------------------------------------
// Common Types
// -------------------------------------------

export type Severity = 'critical' | 'warning' | 'info';
export type OverallStatus = 'in_progress' | 'approved' | 'activated' | 'failed' | 'escalated';
export type ApprovalType = 'approved' | 'conditional' | 'revision' | 'clarification' | 'no_response' | 'escalation' | 'pending';

export interface Flag {
  field: string;
  issue: string;
  severity: Severity;
  recommended_action: string;
}

// -------------------------------------------
// Stage 1: Extraction Types
// -------------------------------------------

export interface ExtractionResult {
  extraction_status: 'success' | 'partial_with_flags' | 'failed';
  confidence_score: number;
  extracted_data: {
    headers: Record<string, string>;
    rows: Record<string, unknown>[];
    metadata: {
      total_rows: number;
      date_range: string;
      currencies_found: string[];
    };
  };
  flags: Flag[];
  source_metadata: {
    pdf_name: string;
    pages_extracted: string;
    extraction_method: 'table' | 'text' | 'hybrid';
    extraction_confidence: number;
  };
}

// -------------------------------------------
// Stage 2: Validation Types
// -------------------------------------------

export interface AutoCorrection {
  record_id: string;
  field: string;
  original: string;
  corrected_to: string;
  confidence: number;
  rule: string;
}

export interface ValidationIssue {
  record_id: string;
  field: string;
  value: string;
  issue: string;
  severity: Severity;
  suggested_action: string;
  requires_human_approval: boolean;
}

export interface ValidationResult {
  validation_summary: {
    total_records: number;
    passed: number;
    warnings: number;
    errors: number;
    overall_status: 'pass' | 'pass_with_corrections' | 'fail';
  };
  auto_corrections_applied: AutoCorrection[];
  validation_issues: ValidationIssue[];
  missing_data: {
    critical: Array<{ record_id: string; missing_fields: string[] }>;
    optional: Array<{ record_id: string; missing_fields: string[] }>;
  };
  cleaned_data: Record<string, unknown>[];
}

// -------------------------------------------
// Stage 3: Mapping Types
// -------------------------------------------

export interface TransformationEntry {
  source_field: string;
  original_value: string;
  target_field: string;
  transformed_value: string;
  transformation_type: string;
}

export interface MappingResult {
  template_version: string;
  conversion_status: 'success' | 'partial' | 'failed';
  records_converted: number;
  mapping_quality: {
    fully_mapped: number;
    partially_mapped: number;
    unmapped_critical: number;
    unmapped_optional: number;
  };
  transformed_data: Array<{
    template_fields: Record<string, unknown>;
  }>;
  transformation_log: Array<{
    record_index: number;
    original_record: Record<string, unknown>;
    transformations_applied: TransformationEntry[];
  }>;
  unmapped_fields: Array<{
    field_name: string;
    reason: string;
  }>;
}

// -------------------------------------------
// Stage 4: Analysis Types
// -------------------------------------------

export interface LaneChange {
  lane_id: string;
  old_rate: number;
  new_rate: number;
  change_percent: number;
  estimated_monthly_volume?: number;
  revenue_impact?: string;
}

export interface HighRiskChange {
  lane_id: string;
  change_type: string;
  change_percent: number;
  change_amount: number;
  reason_for_flag: string;
  risk_level: 'high' | 'medium' | 'low';
  recommended_action: string;
}

export interface AnalysisResult {
  comparison_summary: {
    current_rate_card_id: string;
    new_rate_card_id: string;
    comparison_date: string;
    total_lanes_current: number;
    total_lanes_new: number;
  };
  changes_breakdown: {
    price_increases: {
      count: number;
      avg_increase_percent: number;
      min_increase?: number;
      max_increase?: number;
      lanes_affected: LaneChange[];
    };
    price_decreases: {
      count: number;
      avg_decrease_percent: number;
      lanes_affected: LaneChange[];
    };
    new_lanes: { count: number; lanes: unknown[] };
    deleted_lanes: { count: number; lanes: unknown[] };
  };
  impact_analysis: {
    net_revenue_impact: string;
    net_price_change_percent: string;
    affected_customers: number;
    affected_shipments_monthly: number;
    competitive_positioning: string;
  };
  high_risk_changes: HighRiskChange[];
  executive_summary: string;
}

// -------------------------------------------
// Stage 5: Communication Types
// -------------------------------------------

export interface CommunicationPackage {
  communication_package: {
    message_type: string;
    client_name: string;
    recipient_emails: string[];
    deadline: string;
    email_subject: string;
    email_body: string;
    attachments_manifest: Array<{ filename: string; type: string }>;
  };
  review_materials: {
    executive_summary: string;
    key_changes_summary: Array<{
      change_type: string;
      affected_lanes: number;
      average_change: string;
      business_impact: string;
    }>;
    impact_highlights: Record<string, string>;
  };
  approval_workflow: {
    approval_deadline: string;
    approval_options: Array<{
      option: string;
      label: string;
      description: string;
    }>;
    response_instructions: string;
  };
}

// -------------------------------------------
// Stage 6: Monitoring Types
// -------------------------------------------

export interface MonitoringResult {
  response_received: boolean;
  response_timestamp: string;
  response_from: string;
  response_type: ApprovalType;
  response_summary: string;
  parsed_conditions: Array<{
    condition: string;
    priority: 'high' | 'medium' | 'low';
    feasibility: 'feasible' | 'challenging' | 'not_feasible';
  }>;
  next_action: 'proceed_to_activation' | 'enter_revision_loop' | 'contact_carrier' | 'escalate';
  routing_decision: {
    target_stage: number;
    reason: string;
  };
  audit_log: {
    approval_request_sent: string;
    response_received: string;
    time_to_respond_hours: number;
    response_method: string;
  };
}

// -------------------------------------------
// Stage 7: Revision Types
// -------------------------------------------

export interface RevisionResult {
  revision_cycle: {
    workflow_id: string;
    current_version: string;
    revision_number: number;
    revision_reason: string;
    requested_changes: Array<{
      lane_id: string;
      change_type: string;
      requested_change: string;
      current_rate: number;
      feasibility: 'feasible' | 'challenging' | 'not_feasible';
    }>;
    status: 'awaiting_carrier_response' | 'carrier_submitted' | 'under_reanalysis' | 'ready_for_reapproval';
  };
  carrier_communication: {
    to: string;
    subject: string;
    body: string;
    deadline_for_submission: string;
    required_changes: Array<{
      lane_id: string;
      current_rate: number;
      requested_new_rate: number;
      reason: string;
    }>;
  };
  resubmission_tracking: {
    deadline_for_revision: string;
    expected_resubmission_date: string;
    escalation_date_if_no_response: string;
  };
  next_steps: string[];
}

// -------------------------------------------
// Stage 8: Activation Types
// -------------------------------------------

export interface ActivationResult {
  activation_status: 'ready_for_deployment' | 'blocked_with_issues' | 'conditional';
  pre_activation_checks: {
    approvals_complete: boolean;
    approvals_list: Array<{
      approver: string;
      approval_date: string;
      approval_type: string;
    }>;
    validations_passed: boolean;
    data_integrity: boolean;
    backup_created: boolean;
    rollback_procedure_defined: boolean;
    all_checks_passed: boolean;
  };
  blocked_issues: Array<{
    issue: string;
    severity: 'critical' | 'warning';
    resolution: string;
  }>;
  rate_card_calculations: {
    total_lanes: number;
    effective_date: string;
    end_of_prior_rate_card?: string;
    rate_statistics: {
      min_rate: number;
      max_rate: number;
      average_rate: number;
      median_rate: number;
    };
    surcharges?: Array<{ name: string; type: string; value: number }>;
  };
  activation_package: {
    rate_card_id: string;
    upload_format: string;
    file_checksum?: string;
    record_count: number;
    file_size_bytes?: number;
    upload_instructions?: string;
    estimated_upload_time_minutes?: number;
  };
  audit_trail: Array<{
    timestamp: string;
    stage: string;
    action: string;
    user: string;
    status: string;
    details: string;
  }>;
  activation_timestamp_utc: string;
  post_activation_tasks: Array<{
    task: string;
    responsible_party: string;
    timeline: string;
  }>;
}

// -------------------------------------------
// Workflow State (used by orchestrator)
// -------------------------------------------

export interface WorkflowState {
  workflow_id: string;
  client: string;
  carrier: string;
  current_stage: number;
  overall_status: OverallStatus;
  stage_results: {
    stage_1?: ExtractionResult;
    stage_2?: ValidationResult;
    stage_3?: MappingResult;
    stage_4?: AnalysisResult;
    stage_5?: CommunicationPackage;
    stage_6?: MonitoringResult;
    stage_7?: RevisionResult;
    stage_8?: ActivationResult;
  };
  approvals: Array<{
    approver: string;
    date: string;
    type: ApprovalType;
    conditions?: string;
  }>;
  revision_history: Array<{
    version: string;
    revision_number: number;
    reason: string;
    date: string;
  }>;
  timestamps: {
    started: string;
    stage_1_completed?: string;
    stage_2_completed?: string;
    stage_3_completed?: string;
    stage_4_completed?: string;
    stage_5_completed?: string;
    stage_6_completed?: string;
    stage_7_completed?: string;
    stage_8_completed?: string;
    completed?: string;
  };
  metadata?: Record<string, any>;
  audit_trail: Array<{
    timestamp: string;
    stage: number;
    action: string;
    status: string;
    details?: string;
  }>;
}

// -------------------------------------------
// Workflow Configuration (input to orchestrator)
// -------------------------------------------

export interface WorkflowConfig {
  clientName: string;
  carrierName: string;
  clientContactEmail: string;
  clientContactName: string;
  approvalAuthority: string;
  approvalDeadline: string;
  targetActivationDate: string;
  escalationContact: string;
  carrierEmail: string;
  pdfFilePath: string;
  industry: string;
  expectedCurrency: string;
  rateRangeMin: number;
  rateRangeMax: number;
  communicationStyle: 'professional' | 'technical' | 'executive' | 'friendly';
  changeReason: string;
  currentRateCardId?: string;
  currentRateCardData?: Record<string, unknown>[];
  validationRules?: {
    requireOrigins?: boolean;
    requireDestinations?: boolean;
    requireRates?: boolean;
    requireDates?: boolean;
  };
}

// -------------------------------------------
// Quality Gate Result
// -------------------------------------------

export interface QualityGateResult {
  gate: string;
  passed: boolean;
  details: Record<string, unknown>;
  blockers: string[];
  warnings: string[];
}
