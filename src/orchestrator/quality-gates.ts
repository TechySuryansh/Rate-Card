// ============================================
// Quality Gates - Gate Evaluation Between Stages
// ============================================

import { createLogger } from '../utils/logger';
import {
  ExtractionResult,
  ValidationResult,
  MappingResult,
  AnalysisResult,
  MonitoringResult,
  ActivationResult,
  QualityGateResult,
} from '../agents/types';

const logger = createLogger();

/**
 * Gate 1: Stage 1 → Stage 2
 * Checks extraction confidence and critical flags
 */
export function evaluateGate1(extraction: ExtractionResult): QualityGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Check confidence threshold
  if (extraction.confidence_score < 0.85) {
    blockers.push(
      `Extraction confidence ${extraction.confidence_score} is below 0.85 threshold`
    );
  }

  // Check extraction status
  if (extraction.extraction_status === 'failed') {
    blockers.push('Extraction failed completely');
  }

  // Check critical flags count
  const criticalFlags = extraction.flags?.filter((f) => f.severity === 'critical') || [];
  if (criticalFlags.length > 5) {
    blockers.push(
      `${criticalFlags.length} critical flags found (max 5 allowed)`
    );
  }

  // Check if any data was extracted
  if (!extraction.extracted_data?.rows || extraction.extracted_data.rows.length === 0) {
    blockers.push('No data rows extracted from PDF');
  }

  // Warnings (non-blocking)
  const warningFlags = extraction.flags?.filter((f) => f.severity === 'warning') || [];
  if (warningFlags.length > 0) {
    warnings.push(`${warningFlags.length} warning flags detected`);
  }

  const passed = blockers.length === 0;
  logger.gateCheck('Gate 1 (Extract → Validate)', passed, {
    confidence: extraction.confidence_score,
    criticalFlags: criticalFlags.length,
    rows: extraction.extracted_data?.rows?.length,
  });

  return {
    gate: 'Gate 1: Extract → Validate',
    passed,
    details: {
      confidence: extraction.confidence_score,
      status: extraction.extraction_status,
      criticalFlags: criticalFlags.length,
      totalRows: extraction.extracted_data?.rows?.length || 0,
    },
    blockers,
    warnings,
  };
}

/**
 * Gate 2: Stage 2 → Stage 3
 * Checks validation pass rate and correction confidence
 */
export function evaluateGate2(validation: ValidationResult): QualityGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const summary = validation.validation_summary;
  const passRate = summary.total_records > 0
    ? (summary.passed / summary.total_records) * 100
    : 0;

  // Check pass rate threshold
  if (passRate < 95) {
    blockers.push(
      `Validation pass rate ${passRate.toFixed(1)}% is below 95% threshold`
    );
  }

  // Check for critical missing data
  if (validation.missing_data?.critical?.length > 0) {
    blockers.push(
      `${validation.missing_data.critical.length} records have critical missing data`
    );
  }

  // Check overall status
  if (summary.overall_status === 'fail') {
    blockers.push('Validation overall status is FAIL');
  }

  // Check auto-correction confidence
  const lowConfidenceCorrections = validation.auto_corrections_applied?.filter(
    (c) => c.confidence < 0.95
  ) || [];
  if (lowConfidenceCorrections.length > 0) {
    warnings.push(
      `${lowConfidenceCorrections.length} auto-corrections have confidence below 0.95`
    );
  }

  // Issues requiring human approval
  const humanReview = validation.validation_issues?.filter(
    (i) => i.requires_human_approval
  ) || [];
  if (humanReview.length > 0) {
    warnings.push(`${humanReview.length} issues require human approval`);
  }

  const passed = blockers.length === 0;
  logger.gateCheck('Gate 2 (Validate → Map)', passed, {
    passRate: passRate.toFixed(1),
    errors: summary.errors,
    warnings: summary.warnings,
  });

  return {
    gate: 'Gate 2: Validate → Map',
    passed,
    details: {
      passRate: parseFloat(passRate.toFixed(1)),
      totalRecords: summary.total_records,
      passed: summary.passed,
      errors: summary.errors,
      warnings: summary.warnings,
      status: summary.overall_status,
    },
    blockers,
    warnings,
  };
}

/**
 * Gate 3: Stage 3 → Stage 4
 * Checks all records are mapped and no critical fields unmapped
 */
export function evaluateGate3(mapping: MappingResult): QualityGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Check conversion status
  if (mapping.conversion_status === 'failed') {
    blockers.push('Template conversion failed');
  }

  // Check unmapped critical fields
  if (mapping.mapping_quality.unmapped_critical > 0) {
    blockers.push(
      `${mapping.mapping_quality.unmapped_critical} critical fields could not be mapped`
    );
  }

  // Check that all records were converted
  if (mapping.mapping_quality.fully_mapped === 0 && mapping.records_converted === 0) {
    blockers.push('No records were converted to template format');
  }

  // Warnings for partial mappings
  if (mapping.mapping_quality.partially_mapped > 0) {
    warnings.push(
      `${mapping.mapping_quality.partially_mapped} records are only partially mapped`
    );
  }

  if (mapping.mapping_quality.unmapped_optional > 0) {
    warnings.push(
      `${mapping.mapping_quality.unmapped_optional} optional fields could not be mapped`
    );
  }

  const passed = blockers.length === 0;
  logger.gateCheck('Gate 3 (Map → Analyze)', passed, {
    fullyMapped: mapping.mapping_quality.fully_mapped,
    unmappedCritical: mapping.mapping_quality.unmapped_critical,
    status: mapping.conversion_status,
  });

  return {
    gate: 'Gate 3: Map → Analyze',
    passed,
    details: {
      conversionStatus: mapping.conversion_status,
      recordsConverted: mapping.records_converted,
      fullyMapped: mapping.mapping_quality.fully_mapped,
      partiallyMapped: mapping.mapping_quality.partially_mapped,
      unmappedCritical: mapping.mapping_quality.unmapped_critical,
      unmappedOptional: mapping.mapping_quality.unmapped_optional,
    },
    blockers,
    warnings,
  };
}

/**
 * Gate 4: Stage 4 → Stage 5
 * Checks impact analysis is complete
 */
export function evaluateGate4(analysis: AnalysisResult): QualityGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Check analysis completeness
  if (!analysis.comparison_summary) {
    blockers.push('Comparison summary is missing');
  }

  if (!analysis.impact_analysis) {
    blockers.push('Impact analysis is missing');
  }

  if (!analysis.executive_summary) {
    blockers.push('Executive summary is missing');
  }

  // Check for high-risk items (warning, not blocker)
  if (analysis.high_risk_changes && analysis.high_risk_changes.length > 0) {
    warnings.push(
      `${analysis.high_risk_changes.length} high-risk changes flagged for review`
    );
  }

  const passed = blockers.length === 0;
  logger.gateCheck('Gate 4 (Analyze → Communicate)', passed, {
    highRiskCount: analysis.high_risk_changes?.length || 0,
    revenueImpact: analysis.impact_analysis?.net_revenue_impact,
  });

  return {
    gate: 'Gate 4: Analyze → Communicate',
    passed,
    details: {
      hasComparisonSummary: !!analysis.comparison_summary,
      hasImpactAnalysis: !!analysis.impact_analysis,
      hasExecutiveSummary: !!analysis.executive_summary,
      highRiskCount: analysis.high_risk_changes?.length || 0,
      revenueImpact: analysis.impact_analysis?.net_revenue_impact,
    },
    blockers,
    warnings,
  };
}

/**
 * Gate 5: Stage 6 Routing Decision
 * Validates the monitoring result and routing decision
 */
export function evaluateGate5(monitoring: MonitoringResult): QualityGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Check routing decision exists
  if (!monitoring.routing_decision || !monitoring.routing_decision.target_stage) {
    blockers.push('No routing decision provided');
  }

  // Validate target stage
  const validTargets = [7, 8];
  if (monitoring.routing_decision && !validTargets.includes(monitoring.routing_decision.target_stage)) {
    // Special cases
    if (monitoring.response_type === 'no_response' || monitoring.response_type === 'escalation') {
      warnings.push(`Response type "${monitoring.response_type}" requires escalation`);
    } else if (monitoring.response_type === 'clarification') {
      warnings.push('Client needs clarification - re-send with details');
    } else {
      blockers.push(`Invalid target stage: ${monitoring.routing_decision.target_stage}`);
    }
  }

  const passed = blockers.length === 0;
  logger.gateCheck('Gate 5 (Monitor → Route)', passed, {
    responseType: monitoring.response_type,
    targetStage: monitoring.routing_decision?.target_stage,
  });

  return {
    gate: 'Gate 5: Monitor → Route',
    passed,
    details: {
      responseReceived: monitoring.response_received,
      responseType: monitoring.response_type,
      targetStage: monitoring.routing_decision?.target_stage,
      nextAction: monitoring.next_action,
    },
    blockers,
    warnings,
  };
}

/**
 * Gate 6: Stage 8 Pre-Activation
 * ALL pre-activation checks must pass
 */
export function evaluateGate6(activation: ActivationResult): QualityGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const checks = activation.pre_activation_checks;

  if (!checks.approvals_complete) {
    blockers.push('Client approvals are not complete');
  }

  if (!checks.validations_passed) {
    blockers.push('Final validation did not pass');
  }

  if (!checks.data_integrity) {
    blockers.push('Data integrity check failed');
  }

  if (!checks.backup_created) {
    blockers.push('Current rate card backup was not created');
  }

  if (!checks.rollback_procedure_defined) {
    warnings.push('Rollback procedure not defined');
  }

  // Check for blocked issues
  if (activation.blocked_issues && activation.blocked_issues.length > 0) {
    const criticalIssues = activation.blocked_issues.filter((i) => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      blockers.push(
        `${criticalIssues.length} critical issues block activation: ${criticalIssues.map((i) => i.issue).join('; ')}`
      );
    }
  }

  if (activation.activation_status !== 'ready_for_deployment') {
    blockers.push(`Activation status is "${activation.activation_status}", not "ready_for_deployment"`);
  }

  const passed = blockers.length === 0;
  logger.gateCheck('Gate 6 (Pre-Activation)', passed, {
    status: activation.activation_status,
    allChecksPassed: checks.all_checks_passed,
  });

  return {
    gate: 'Gate 6: Pre-Activation',
    passed,
    details: {
      activationStatus: activation.activation_status,
      approvalsComplete: checks.approvals_complete,
      validationsPassed: checks.validations_passed,
      dataIntegrity: checks.data_integrity,
      backupCreated: checks.backup_created,
      rollbackDefined: checks.rollback_procedure_defined,
      allChecksPassed: checks.all_checks_passed,
    },
    blockers,
    warnings,
  };
}
