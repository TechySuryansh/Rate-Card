import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { executeWorkflow } from './orchestrator/master-orchestrator';
import { getWorkflow } from './database/db-client';
import { mongoGetWorkflow } from './database/mongo-client';
import { generateStructuredPdf } from './services/pdf-generator';
import { WorkflowConfig, WorkflowState } from './agents/types';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4001;
const workflowCache = new Map<string, WorkflowState>();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:4001',
    'https://rate-card-vko6.onrender.com',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Setup multer for PDF uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// API Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a PDF file' });
  }

  try {
    const config: WorkflowConfig = {
      clientName: req.body.clientName || 'Acme Logistics',
      carrierName: req.body.carrierName || 'Global Freight Corp',
      pdfFilePath: req.file.path,
      clientContactEmail: 'info@acme.com',
      clientContactName: 'Acme Admin',
      approvalAuthority: 'Operations Manager',
      approvalDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      targetActivationDate: new Date().toISOString(),
      expectedCurrency: 'USD',
      industry: 'Logistics',
      rateRangeMin: 0,
      rateRangeMax: 10000,
      escalationContact: 'manager@company.com',
      carrierEmail: 'rates@carrier.com',
      communicationStyle: 'professional',
      changeReason: 'Rate card update',
      validationRules: {
        requireOrigins: true,
        requireDestinations: true,
        requireRates: true,
        requireDates: true
      }
    };

    console.log(`🚀 API: Starting workflow for ${config.clientName}...`);
    
    // Execute the real 8-stage pipeline
    const { state, summary } = await executeWorkflow(config);

    // Cache the state for export fallback
    workflowCache.set(state.workflow_id, state);

    // Clean up uploaded file (optional, keeping for audit trail in this demo)
    // fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      workflowId: state.workflow_id,
      status: state.overall_status,
      stagesComplete: state.current_stage,
      auditTrail: state.audit_trail,
      impactAnalysis: state.stage_results?.stage_4?.impact_analysis,
      extractionMetadata: state.stage_results?.stage_1?.extracted_data?.metadata,
      fullState: state,
      summary
    });
  } catch (error: any) {
    console.error('❌ API Error:', error.message);
    res.status(500).json({ 
      success: false, 
      data: { error: error.message },
      stage: error.stage,
      workflowId: error.workflowId 
    });
  }
});

// Get workflow status
app.get('/api/workflows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const state = await mongoGetWorkflow(id);
    
    if (!state) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    res.json({
      success: true,
      workflow: state
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/export/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    // Poll for completion (max 30 seconds for complex PDFs)
    let state: WorkflowState | null = null;
    const maxAttempts = 30;
    
    for (let i = 0; i < maxAttempts; i++) {
      // Always fetch fresh from the most reliable source
      state = await mongoGetWorkflow(workflowId);
      
      // Fallback to memory if mongo is slow or initial
      if (!state) state = workflowCache.get(workflowId) || null;

      // We wait specifically for the mapping data to be ready
      if (state?.stage_results?.stage_3?.transformed_data) {
        console.log(`✅ Data found for workflow ${workflowId} at poll ${i+1}`);
        break;
      }
      
      // If this is the last attempt, return error
      if (i === maxAttempts - 1) {
        return res.status(202).json({ 
          error: 'AI is still structuring your data. Please wait 10 seconds and try again.',
          status: 'processing',
          workflowId
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (i % 5 === 0) console.log(`⏳ Waiting for AI data for workflow ${workflowId}... (${i+1}/${maxAttempts})`);
    }

    if (!state?.stage_results?.stage_3?.transformed_data) {
      return res.status(202).json({ 
        error: 'AI is still structuring your data. Please wait 10 seconds and try again.',
        status: 'processing',
        workflowId
      });
    }

    // Sort the lanes alphabetically by Origin then Destination
    state.stage_results.stage_3.transformed_data.sort((a: any, b: any) => {
      const originA = a.template_fields.origin || '';
      const originB = b.template_fields.origin || '';
      if (originA !== originB) return originA.localeCompare(originB);
      return (a.template_fields.destination || '').localeCompare(b.template_fields.destination || '');
    });

    const outputPath = path.join(process.cwd(), 'uploads', `structured-${workflowId}.pdf`);

    // Ensure uploads dir exists
    if (!fs.existsSync(path.join(process.cwd(), 'uploads'))) {
      fs.mkdirSync(path.join(process.cwd(), 'uploads'));
    }

    await generateStructuredPdf(state, outputPath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="RateCard-${state.client}.pdf"`);
    res.sendFile(outputPath);
  } catch (error: any) {
    console.error('❌ Export Error:', error.message);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', provider: process.env.GROQ_API_KEY ? 'Groq' : 'Missing API Key' });
});

app.listen(port, async () => {
  console.log(`
  ================================================
  🚀 RateCard AI Server is LIVE!
  📡 API: http://localhost:${port}
  🏗️ Environment: ${process.env.GROQ_API_KEY ? 'Ready' : 'API Key Missing'}
  ================================================
  `);

  // Initialize MongoDB on startup to confirm connection
  try {
    const { getMongoClient } = await import('./database/mongo-client');
    await getMongoClient();
  } catch (err) {
    console.error('⚠️ Initial MongoDB connection failed (fallback enabled)');
  }
});
