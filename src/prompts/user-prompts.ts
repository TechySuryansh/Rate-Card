// ============================================
// User Prompts - Templated User Prompts for All 8 Stages
// ============================================

import { formatDate, addDays } from '../utils/helpers';

// -------------------------------------------
// Stage 1: PDF Extraction
// -------------------------------------------
export interface Stage1Context {
  clientName: string;
  expectedRecordCount?: number;
  pdfText: string;
}

export function buildStage1UserPrompt(ctx: Stage1Context): string {
  return `Extract the rate card from the attached PDF and structure it into JSON format.

CLIENT_INFO:
- Client Name: ${ctx.clientName}
- Expected Record Count: ${ctx.expectedRecordCount || 'UNKNOWN'}

TEMPLATE_FIELDS (extract these if present):
- lane_id
- origin (airport/port code)
- destination (airport/port code)
- rate (numeric)
- rate_unit (per unit type)
- currency (USD, EUR, etc.)
- effective_date (YYYY-MM-DD format)
- expiry_date (YYYY-MM-DD format)
- minimum_charge
- surcharges (if applicable)

INSTRUCTIONS:
1. Extract ALL data from the PDF into rows
2. Identify each column header and data type
3. Flag any ambiguous, missing, or inconsistent data
4. Preserve original values exactly (don't round or correct)
5. Return as structured JSON following the format above

PDF CONTENT:
${ctx.pdfText}

CRITICAL:
- Do NOT make assumptions about missing data
- Do NOT attempt to correct values in extraction stage
- Flag everything you're uncertain about
- Include confidence scores for each field type`;
}

// -------------------------------------------
// Stage 2: Validation
// -------------------------------------------
export interface Stage2Context {
  extractedDataJson: string;
  industry: string;
  validOrigins?: string[];
  validDestinations?: string[];
  rateRangeMin: number;
  rateRangeMax: number;
  expectedCurrency: string;
  effectiveDateStart: string;
  effectiveDateEnd: string;
  laneIdFormat?: string;
  commonMisspellings?: string[];
}

export function buildStage2UserPrompt(ctx: Stage2Context): string {
  return `Validate and clean this extracted rate card data against our business rules.

EXTRACTED_DATA_JSON:
${ctx.extractedDataJson}

VALIDATION_RULES_CONTEXT:
- Industry: ${ctx.industry}
- Valid Origins: ${ctx.validOrigins?.join(', ') || 'Not specified - validate as standard airport/port codes'}
- Valid Destinations: ${ctx.validDestinations?.join(', ') || 'Not specified - validate as standard airport/port codes'}
- Acceptable Rate Range: $${ctx.rateRangeMin} - $${ctx.rateRangeMax} per unit
- Currency: ${ctx.expectedCurrency}
- Effective Date Range: ${ctx.effectiveDateStart} to ${ctx.effectiveDateEnd}
- Lane ID Format: ${ctx.laneIdFormat || 'Not specified'}

COMMON_ERRORS_IN_YOUR_DATA (learn from these):
${ctx.commonMisspellings?.map((m) => `- ${m}`).join('\n') || '- No common errors provided'}

DELIVERABLE:
1. Validation report categorizing all issues
2. List of auto-corrections applied with justification
3. List of issues requiring manual human review
4. Cleaned data JSON ready for Stage 3
5. Confidence score for overall data quality (0-1)
6. Record count: [original_count] → [passed_count]`;
}

// -------------------------------------------
// Stage 3: Template Mapping
// -------------------------------------------
export interface Stage3Context {
  cleanedDataJson: string;
  templateSchema: string;
  fieldMappingRules?: string;
  transformationRules?: string[];
}

export function buildStage3UserPrompt(ctx: Stage3Context): string {
  return `Convert the validated rate card data into our RateCube template format.

CLEANED_DATA_JSON:
${ctx.cleanedDataJson}

RATECUBE_TEMPLATE_SCHEMA:
${ctx.templateSchema}

FIELD_MAPPING_RULES:
${ctx.fieldMappingRules || 'Use direct mapping for matching field names. Apply standard transformations (uppercase port codes, YYYY-MM-DD dates).'}

TRANSFORMATION_RULES:
${ctx.transformationRules?.map((r) => `- ${r}`).join('\n') || '- Apply standard field transformations\n- Standardize date formats to YYYY-MM-DD\n- Uppercase all port/airport codes'}

DELIVERABLE:
1. Rate card data in template format
2. Mapping validation report
3. Any unmapped fields with explanation
4. Data ready for Stage 4 (analysis)
5. Audit trail of all transformations`;
}

// -------------------------------------------
// Stage 4: Impact Analysis
// -------------------------------------------
export interface Stage4Context {
  newRateCardJson: string;
  currentRateCardJson: string;
  clientName: string;
  carrierName: string;
  effectiveDate: string;
  currentRateCardId: string;
  volumeEstimates?: Array<{ laneId: string; monthlyVolume: number }>;
  riskThresholds?: {
    priceIncreasePercent: number;
    priceDecreasePercent: number;
    monthlyShipmentThreshold: number;
    competitivePositionPercent: number;
  };
}

export function buildStage4UserPrompt(ctx: Stage4Context): string {
  return `Analyze the impact of this new rate card compared to the currently active rate card.

NEW_RATE_CARD_JSON:
${ctx.newRateCardJson}

CURRENT_RATE_CARD_JSON:
${ctx.currentRateCardJson}

COMPARISON_CONTEXT:
- Client Name: ${ctx.clientName}
- Carrier: ${ctx.carrierName}
- Effective Date of New Rate Card: ${ctx.effectiveDate}
- Current Active Rate Card ID: ${ctx.currentRateCardId}

VOLUME_ESTIMATES:
${ctx.volumeEstimates?.map((v) => `- Lane: ${v.laneId}, Current Monthly Volume: ${v.monthlyVolume}`).join('\n') || '- No volume estimates provided - use reasonable defaults'}

RISK_THRESHOLDS:
- Flag price increases > ${ctx.riskThresholds?.priceIncreasePercent || 10}%
- Flag price decreases > ${ctx.riskThresholds?.priceDecreasePercent || 8}%
- Flag changes affecting > ${ctx.riskThresholds?.monthlyShipmentThreshold || 100} monthly shipments
- Flag competitive positioning if > ${ctx.riskThresholds?.competitivePositionPercent || 5}% above market

DELIVERABLE:
1. Detailed comparison report (additions, deletions, changes)
2. Impact metrics (revenue, volume, pricing positioning)
3. High-risk changes flagged for client review
4. Executive summary (2-3 paragraphs)
5. Recommendations for approval/revision
6. Data-driven insights`;
}

// -------------------------------------------
// Stage 5: Client Communication
// -------------------------------------------
export interface Stage5Context {
  impactAnalysisJson: string;
  clientName: string;
  contactName: string;
  contactEmail: string;
  ccEmails?: string[];
  communicationStyle: 'professional' | 'technical' | 'executive' | 'friendly';
  approvalAuthority: string;
  carrierName: string;
  effectiveDate: string;
  changeReason: string;
  approvalTimeline: number;
  clientBenefits?: string;
  knownConcerns?: string;
}

export function buildStage5UserPrompt(ctx: Stage5Context): string {
  const deadline = formatDate(addDays(new Date(), ctx.approvalTimeline));

  return `Create a client communication package requesting approval for this rate card.

IMPACT_ANALYSIS_JSON:
${ctx.impactAnalysisJson}

CLIENT_CONTEXT:
{
  "client_name": "${ctx.clientName}",
  "contact_name": "${ctx.contactName}",
  "contact_email": "${ctx.contactEmail}",
  "cc_emails": ${JSON.stringify(ctx.ccEmails || [])},
  "communication_style": "${ctx.communicationStyle}",
  "approval_authority": "${ctx.approvalAuthority}",
  "preferred_format": "email",
  "language": "english"
}

BUSINESS_CONTEXT:
- Carrier Name: ${ctx.carrierName}
- Effective Date: ${ctx.effectiveDate}
- Reason for Rate Card Change: ${ctx.changeReason}
- Approval Timeline: ${ctx.approvalTimeline} days (deadline: ${deadline})

TONE_AND_EMPHASIS:
- Emphasize benefits to: ${ctx.clientBenefits || 'competitive pricing and service reliability'}
- Address concerns about: ${ctx.knownConcerns || 'any significant price changes'}
- Highlight competitive advantage if applicable
- Note any volume discounts or loyalty benefits

DELIVERABLE:
1. Professional email draft
2. Executive summary (client-friendly)
3. Comparison materials
4. Clear approval options and response instructions
5. Deadline and next steps
6. Ready to send via email platform`;
}

// -------------------------------------------
// Stage 6: Approval Monitoring
// -------------------------------------------
export interface Stage6Context {
  clientName: string;
  requestSentDate: string;
  approvalDeadline: string;
  clientEmail: string;
  workflowId: string;
  clientResponse?: string;
  escalationRules?: {
    noResponseDays: number;
    accountManagerName: string;
    salesLeadName?: string;
    pricingTeamName?: string;
  };
}

export function buildStage6UserPrompt(ctx: Stage6Context): string {
  return `Check for client responses to the rate card approval request and route appropriately.

APPROVAL_REQUEST_INFO:
{
  "client_name": "${ctx.clientName}",
  "request_sent_date": "${ctx.requestSentDate}",
  "approval_deadline": "${ctx.approvalDeadline}",
  "client_email": "${ctx.clientEmail}",
  "workflow_id": "${ctx.workflowId}"
}

CLIENT_RESPONSE (if received):
${ctx.clientResponse || 'NO RESPONSE RECEIVED YET'}

ESCALATION_RULES:
- If no response after ${ctx.escalationRules?.noResponseDays || 7} days, escalate to ${ctx.escalationRules?.accountManagerName || 'Account Manager'}
- If response contains objections, escalate to ${ctx.escalationRules?.salesLeadName || 'Sales Lead'}
- If conditional approval, route to ${ctx.escalationRules?.pricingTeamName || 'Pricing Team'}

DELIVERABLE:
1. Classification of client response type
2. Parsed conditions or requested changes (if applicable)
3. Next routing decision with justification
4. Action items and timeline
5. Audit log entry for this interaction`;
}

// -------------------------------------------
// Stage 7: Revision Management
// -------------------------------------------
export interface Stage7Context {
  clientFeedbackResponse: string;
  originalRateCardJson: string;
  clientName: string;
  carrierName: string;
  carrierEmail: string;
  workflowId: string;
  revisionNumber: number;
  deadlineForCarrier: string;
}

export function buildStage7UserPrompt(ctx: Stage7Context): string {
  return `Process client feedback and communicate revision requirements to carrier.

CLIENT_FEEDBACK_RESPONSE:
${ctx.clientFeedbackResponse}

ORIGINAL_RATE_CARD_DATA:
${ctx.originalRateCardJson}

REVISION_CONTEXT:
{
  "client_name": "${ctx.clientName}",
  "carrier_name": "${ctx.carrierName}",
  "carrier_email": "${ctx.carrierEmail}",
  "workflow_id": "${ctx.workflowId}",
  "revision_number": ${ctx.revisionNumber},
  "deadline_for_carrier_submission": "${ctx.deadlineForCarrier}"
}

INSTRUCTIONS:
1. Parse client feedback to identify specific requested changes
2. Assess feasibility of each change
3. Draft professional communication to carrier
4. Specify exact changes needed
5. Set clear deadline for revised submission
6. Provide tracking for resubmission monitoring

DELIVERABLE:
1. Structured list of requested changes
2. Feasibility assessment for each change
3. Professional email to carrier with required changes
4. Tracking document for revision cycle
5. Timeline for revalidation once carrier resubmits
6. Version number for this revision (v1.${ctx.revisionNumber})`;
}

// -------------------------------------------
// Stage 8: Activation
// -------------------------------------------
export interface Stage8Context {
  approvedRateCardJson: string;
  approvals: Array<{
    approverName: string;
    approverEmail: string;
    approvalDate: string;
    approvalMethod: string;
    notes?: string;
  }>;
  workflowId: string;
  clientName: string;
  carrierName: string;
  effectiveDate: string;
  currentActiveRateCardId: string;
  deploymentEnvironment: string;
  deploymentWindow?: string;
}

export function buildStage8UserPrompt(ctx: Stage8Context): string {
  return `Prepare this rate card for final activation to RateCube production.

APPROVED_RATE_CARD_JSON:
${ctx.approvedRateCardJson}

APPROVAL_DOCUMENTATION:
{
  "client_name": "${ctx.clientName}",
  "approvals": ${JSON.stringify(ctx.approvals, null, 2)}
}

ACTIVATION_CONTEXT:
{
  "workflow_id": "${ctx.workflowId}",
  "client_name": "${ctx.clientName}",
  "carrier_name": "${ctx.carrierName}",
  "effective_date": "${ctx.effectiveDate}",
  "current_active_rate_card_id": "${ctx.currentActiveRateCardId}",
  "deployment_environment": "${ctx.deploymentEnvironment}",
  "deployment_window": "${ctx.deploymentWindow || 'Immediate upon approval'}"
}

DELIVERABLE:
1. Final validation report (pre-activation checks)
2. Pre-activation checklist (ALL items must be ✓)
3. Rate card calculation summary
4. Activation package ready for upload
5. Audit trail documentation
6. Post-activation monitoring plan
7. Backup location and rollback procedure
8. Final signoff from approver (if required)

CRITICAL: If ANY pre-activation check fails, list the issue and do NOT proceed with activation.`;
}
