// ============================================
// RateCard Agentic Workflow - Entry Point
// ============================================

import * as dotenv from 'dotenv';
import * as path from 'path';
import { executeWorkflow } from './orchestrator/master-orchestrator';
import { WorkflowConfig } from './agents/types';
import { globalLogger } from './utils/logger';
import { closePool } from './database/db-client';

// Load environment variables
dotenv.config();

/**
 * Parse command-line arguments
 */
function parseArgs(): { pdfPath?: string; config?: string } {
  const args = process.argv.slice(2);
  const result: { pdfPath?: string; config?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--pdf' && args[i + 1]) {
      result.pdfPath = args[i + 1];
      i++;
    } else if (args[i] === '--config' && args[i + 1]) {
      result.config = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--')) {
      result.pdfPath = args[i];
    }
  }

  return result;
}

/**
 * Create a demo workflow configuration
 */
function createDemoConfig(pdfPath: string): WorkflowConfig {
  return {
    clientName: 'Acme Logistics',
    carrierName: 'Global Freight Corp',
    clientContactEmail: 'john.smith@acmelogistics.com',
    clientContactName: 'John Smith',
    approvalAuthority: 'Sarah Johnson, VP Operations',
    approvalDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    targetActivationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    escalationContact: 'manager@company.com',
    carrierEmail: 'rates@globalfreightcorp.com',
    pdfFilePath: pdfPath,
    industry: 'Freight/Logistics',
    expectedCurrency: 'USD',
    rateRangeMin: 100,
    rateRangeMax: 50000,
    communicationStyle: 'professional',
    changeReason: 'Annual rate card renewal',
    currentRateCardId: 'RC-2025-001',
  };
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        RateCard Agentic Workflow - v1.0                 ║');
  console.log('║        Powered by Claude AI                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  const args = parseArgs();

  if (!args.pdfPath) {
    console.log('Usage:');
    console.log('  npm run dev -- --pdf <path-to-ratecard.pdf>');
    console.log('  npm run dev -- --pdf sample.pdf');
    console.log('');
    console.log('Options:');
    console.log('  --pdf <path>     Path to rate card PDF file');
    console.log('  --config <path>  Path to workflow config JSON (optional)');
    console.log('');

    // Check if mock mode is enabled for demo
    if (process.env.MOCK_MODE === 'true') {
      console.log('═══════════════════════════════════════════════════');
      console.log('🧪 MOCK MODE is enabled. Running demo workflow...');
      console.log('═══════════════════════════════════════════════════\n');

      const demoConfig = createDemoConfig('demo-ratecard.pdf');
      await runWorkflow(demoConfig);
    } else {
      console.log('Set MOCK_MODE=true in .env to run a demo without a PDF.\n');
      process.exit(1);
    }
    return;
  }

  // Resolve PDF path
  const pdfPath = path.resolve(args.pdfPath);

  // Load or create config
  let workflowConfig: WorkflowConfig;

  if (args.config) {
    try {
      const configFile = require(path.resolve(args.config));
      workflowConfig = { ...configFile, pdfFilePath: pdfPath };
    } catch {
      globalLogger.error(`Failed to load config file: ${args.config}`);
      process.exit(1);
    }
  } else {
    workflowConfig = createDemoConfig(pdfPath);
  }

  await runWorkflow(workflowConfig);
}

/**
 * Run the workflow and display results
 */
async function runWorkflow(config: WorkflowConfig): Promise<void> {
  const startTime = Date.now();

  try {
    const { state, summary } = await executeWorkflow(config);

    const durationMs = Date.now() - startTime;

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                   WORKFLOW SUMMARY                      ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Workflow ID:     ${state.workflow_id}`);
    console.log(`  Client:          ${state.client}`);
    console.log(`  Carrier:         ${state.carrier}`);
    console.log(`  Status:          ${state.overall_status.toUpperCase()}`);
    console.log(`  Stages Complete: ${Object.keys(state.stage_results).length}/8`);
    console.log(`  Revisions:       ${state.revision_history.length}`);
    console.log(`  Total Duration:  ${(durationMs / 1000).toFixed(1)}s`);
    console.log(`  Audit Entries:   ${state.audit_trail.length}`);
    console.log('');

    // Show audit trail summary
    console.log('  📋 Audit Trail:');
    for (const entry of state.audit_trail) {
      const icon =
        entry.status === 'success' ? '✅' :
        entry.status === 'passed' ? '✅' :
        entry.status === 'blocked' ? '🚫' :
        entry.status === 'failed' ? '❌' :
        entry.status === 'escalated' ? '⚠️' :
        '📝';
      console.log(`    ${icon} [Stage ${entry.stage}] ${entry.action} - ${entry.status}`);
    }

    console.log('');

    if (state.overall_status === 'activated') {
      console.log('  🎉 Rate card is LIVE in production!');
    } else if (state.overall_status === 'escalated') {
      console.log('  ⚠️ Workflow requires human intervention.');
    } else if (state.overall_status === 'failed') {
      console.log('  ❌ Workflow failed. Review audit trail for details.');
    }

    console.log('\n' + '═'.repeat(60) + '\n');
  } catch (error) {
    globalLogger.error(`Workflow execution failed: ${(error as Error).message}`);
    console.error('\n❌ Fatal error:', (error as Error).message);
    process.exit(1);
  } finally {
    // Clean up database connection
    try {
      await closePool();
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Execute
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
