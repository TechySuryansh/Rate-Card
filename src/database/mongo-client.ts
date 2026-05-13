import { MongoClient, Db, Collection } from 'mongodb';
import { WorkflowState } from '../agents/types';
import { createLogger } from '../utils/logger';

const logger = createLogger();

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Get or create the MongoDB connection
 */
export async function getMongoClient(): Promise<{ client: MongoClient; db: Db }> {
  if (!client || !db) {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://your_atlas_uri_here';
    
    try {
      client = new MongoClient(uri, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
      });
      
      await client.connect();
      db = client.db(process.env.MONGODB_DB_NAME || 'ratecard_workflow');
      
      logger.info('🍃 Connected to MongoDB Atlas');
    } catch (error) {
      logger.error('❌ MongoDB Connection Error:', (error as Error).message);
      throw error;
    }
  }
  return { client, db };
}

/**
 * Get a specific collection
 */
export async function getCollection<T extends Document>(name: string): Promise<Collection<any>> {
  const { db } = await getMongoClient();
  return db.collection(name);
}

// -------------------------------------------
// Workflow Operations (Mongo Implementation)
// -------------------------------------------

export async function mongoCreateWorkflow(state: WorkflowState): Promise<void> {
  try {
    const col = await getCollection('workflows');
    await col.insertOne({
      _id: state.workflow_id as any,
      ...state,
      created_at: new Date(),
      updated_at: new Date(),
    });
  } catch (error) {
    logger.warn('Failed to persist workflow to MongoDB', { error: (error as Error).message });
  }
}

export async function mongoUpdateWorkflow(workflowId: string, update: Partial<WorkflowState>): Promise<void> {
  try {
    const col = await getCollection('workflows');
    
    // Create a specialized update object to avoid overwriting nested objects
    const updateObj: any = {
      $set: { updated_at: new Date() }
    };

    // If stage_results is being updated, use dot notation for atomic nested updates
    if (update.stage_results) {
      Object.entries(update.stage_results).forEach(([stage, data]) => {
        updateObj.$set[`stage_results.${stage}`] = data;
      });
    }

    // If metadata is being updated, do the same
    if (update.metadata) {
      Object.entries(update.metadata).forEach(([key, val]) => {
        updateObj.$set[`metadata.${key}`] = val;
      });
    }

    // Add all other top-level fields
    Object.entries(update).forEach(([key, val]) => {
      if (key !== 'stage_results' && key !== 'metadata') {
        updateObj.$set[key] = val;
      }
    });

    await col.updateOne(
      { _id: workflowId as any },
      updateObj
    );
  } catch (error) {
    logger.warn('Failed to update workflow in MongoDB', { error: (error as Error).message });
  }
}

export async function mongoGetWorkflow(workflowId: string): Promise<WorkflowState | null> {
  try {
    const col = await getCollection('workflows');
    const doc = await col.findOne({ _id: workflowId as any });
    return doc as unknown as WorkflowState;
  } catch (error) {
    logger.warn('Failed to fetch workflow from MongoDB', { error: (error as Error).message });
    return null;
  }
}

export async function mongoLogAudit(workflowId: string, entry: any): Promise<void> {
  try {
    const col = await getCollection('audit_trail');
    await col.insertOne({
      workflow_id: workflowId,
      ...entry,
      timestamp: new Date(),
    });
  } catch (error) {
    // Silent fail for audits in dev
  }
}
