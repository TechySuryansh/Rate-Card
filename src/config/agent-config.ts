// ============================================
// Agent Configuration - Temperature, Tokens, Model per Stage
// ============================================

export interface StageConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  retries: number;
  stageName: string;
  description: string;
}

export interface AppConfig {
  stages: Record<string, StageConfig>;
  workflow: WorkflowConfig;
  database: DatabaseConfig;
  email: EmailConfig;
  ratecube: RateCubeConfig;
}

export interface WorkflowConfig {
  maxRevisionCycles: number;
  approvalDeadlineDays: number;
  monitoringIntervalHours: number;
  escalationEmail: string;
}

export interface DatabaseConfig {
  connectionString: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface EmailConfig {
  provider: 'stub' | 'sendgrid' | 'gmail';
  sendgridApiKey?: string;
  gmailClientId?: string;
  gmailClientSecret?: string;
}

export interface RateCubeConfig {
  apiUrl: string;
  apiKey: string;
  mockMode: boolean;
}

// ============================================
// Default configurations per stage
// ============================================

const defaultModel = process.env.LLM_MODEL || 'llama-3.3-70b-versatile';

export const stageConfigs: Record<number, StageConfig> = {
  1: {
    model: defaultModel,
    temperature: 0.3,
    maxTokens: 4000,
    timeoutMs: 60000,
    retries: 3,
    stageName: 'Extract',
    description: 'PDF Extraction & Structured Conversion',
  },
  2: {
    model: defaultModel,
    temperature: 0.2,
    maxTokens: 3000,
    timeoutMs: 60000,
    retries: 3,
    stageName: 'Validate',
    description: 'Intelligent Validation & Auto-Correction',
  },
  3: {
    model: defaultModel,
    temperature: 0.1,
    maxTokens: 4000,
    timeoutMs: 60000,
    retries: 3,
    stageName: 'Map',
    description: 'Template Conversion & Mapping',
  },
  4: {
    model: defaultModel,
    temperature: 0.3,
    maxTokens: 4000,
    timeoutMs: 60000,
    retries: 3,
    stageName: 'Analyze',
    description: 'Rate Card Comparison & Impact Analysis',
  },
  5: {
    model: defaultModel,
    temperature: 0.4,
    maxTokens: 3000,
    timeoutMs: 60000,
    retries: 3,
    stageName: 'Communicate',
    description: 'Client Communication & Approval Request',
  },
  6: {
    model: defaultModel,
    temperature: 0.2,
    maxTokens: 2000,
    timeoutMs: 60000,
    retries: 3,
    stageName: 'Monitor',
    description: 'Approval Monitoring & Response Handling',
  },
  7: {
    model: defaultModel,
    temperature: 0.3,
    maxTokens: 2500,
    timeoutMs: 60000,
    retries: 3,
    stageName: 'Revise',
    description: 'Revision Management & Carrier Communication',
  },
  8: {
    model: defaultModel,
    temperature: 0.1,
    maxTokens: 3000,
    timeoutMs: 60000,
    retries: 3,
    stageName: 'Activate',
    description: 'Rate Card Activation & Finalization',
  },
};

// ============================================
// Load full app configuration from environment
// ============================================

export function loadConfig(): AppConfig {
  return {
    stages: stageConfigs,
    workflow: {
      maxRevisionCycles: parseInt(process.env.MAX_REVISION_CYCLES || '3', 10),
      approvalDeadlineDays: parseInt(process.env.APPROVAL_DEADLINE_DAYS || '7', 10),
      monitoringIntervalHours: parseInt(process.env.MONITORING_INTERVAL_HOURS || '4', 10),
      escalationEmail: process.env.ESCALATION_EMAIL || 'manager@company.com',
    },
    database: {
      connectionString: process.env.DATABASE_URL || 'postgresql://ratecard:ratecard_pass@localhost:5432/ratecard_workflow',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'ratecard_workflow',
      user: process.env.DB_USER || 'ratecard',
      password: process.env.DB_PASSWORD || 'ratecard_pass',
    },
    email: {
      provider: (process.env.EMAIL_PROVIDER as 'stub' | 'sendgrid' | 'gmail') || 'stub',
      sendgridApiKey: process.env.SENDGRID_API_KEY,
      gmailClientId: process.env.GMAIL_CLIENT_ID,
      gmailClientSecret: process.env.GMAIL_CLIENT_SECRET,
    },
    ratecube: {
      apiUrl: process.env.RATECUBE_API_URL || 'https://api.ratecube.example.com',
      apiKey: process.env.RATECUBE_API_KEY || '',
      mockMode: process.env.RATECUBE_MOCK === 'true',
    },
  };
}
