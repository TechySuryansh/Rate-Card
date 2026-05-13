// ============================================
// RateCube Service - Stub Implementation
// ============================================

import { createLogger } from '../utils/logger';

const logger = createLogger();

export interface RateCardRecord {
  id: string;
  clientName: string;
  carrierName: string;
  effectiveDate: string;
  expiryDate?: string;
  lanes: Record<string, unknown>[];
  status: 'active' | 'pending' | 'expired';
  version: string;
  createdAt: string;
}

/**
 * Get the currently active rate card for a client/carrier pair
 * (stub implementation - returns mock data)
 */
export async function getActiveRateCard(
  clientName: string,
  carrierName: string
): Promise<RateCardRecord | null> {
  const isMock = process.env.RATECUBE_MOCK === 'true';

  if (isMock) {
    logger.info(`🗃️ [STUB] Fetching active rate card for ${clientName} / ${carrierName}`, {
      action: 'ratecube_get',
      data: { clientName, carrierName },
    });

    // Return mock current rate card for comparison
    return {
      id: 'RC-2025-001',
      clientName,
      carrierName,
      effectiveDate: '2025-01-01',
      expiryDate: '2025-12-31',
      lanes: [
        { lane_id: 'LAX-JFK001', origin: 'LAX', destination: 'JFK', rate: 1400, currency: 'USD' },
        { lane_id: 'CHI-LAX002', origin: 'ORD', destination: 'LAX', rate: 1250, currency: 'USD' },
        { lane_id: 'SFO-MIA003', origin: 'SFO', destination: 'MIA', rate: 1900, currency: 'USD' },
      ],
      status: 'active',
      version: 'v1.0',
      createdAt: '2025-01-01T00:00:00Z',
    };
  }

  // TODO: Real RateCube API call
  // const apiUrl = process.env.RATECUBE_API_URL;
  // const apiKey = process.env.RATECUBE_API_KEY;
  // const response = await fetch(`${apiUrl}/api/rate-cards/active?client=${clientName}&carrier=${carrierName}`, {
  //   headers: { 'Authorization': `Bearer ${apiKey}` }
  // });
  // return response.json();

  throw new Error('RateCube API not configured. Set RATECUBE_MOCK=true for development.');
}

/**
 * Upload a new rate card to RateCube
 * (stub implementation - logs to console)
 */
export async function uploadRateCard(
  rateCard: {
    clientName: string;
    carrierName: string;
    effectiveDate: string;
    lanes: Record<string, unknown>[];
    version: string;
  }
): Promise<{ success: boolean; rateCardId: string }> {
  const isMock = process.env.RATECUBE_MOCK === 'true';

  if (isMock) {
    const rateCardId = `RC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    logger.info(`🗃️ [STUB] Uploading rate card to RateCube: ${rateCardId}`, {
      action: 'ratecube_upload',
      data: {
        rateCardId,
        clientName: rateCard.clientName,
        carrierName: rateCard.carrierName,
        laneCount: rateCard.lanes.length,
        effectiveDate: rateCard.effectiveDate,
      },
    });

    console.log('\n' + '='.repeat(60));
    console.log('🗃️ RATECUBE UPLOAD (STUB MODE)');
    console.log('='.repeat(60));
    console.log(`Rate Card ID: ${rateCardId}`);
    console.log(`Client: ${rateCard.clientName}`);
    console.log(`Carrier: ${rateCard.carrierName}`);
    console.log(`Lanes: ${rateCard.lanes.length}`);
    console.log(`Effective: ${rateCard.effectiveDate}`);
    console.log(`Version: ${rateCard.version}`);
    console.log('='.repeat(60) + '\n');

    return { success: true, rateCardId };
  }

  // TODO: Real RateCube API upload
  throw new Error('RateCube API not configured. Set RATECUBE_MOCK=true for development.');
}

/**
 * Create a backup of the current active rate card
 * (stub implementation)
 */
export async function backupCurrentRateCard(
  rateCardId: string
): Promise<{ success: boolean; backupId: string }> {
  const isMock = process.env.RATECUBE_MOCK === 'true';

  if (isMock) {
    const backupId = `BACKUP-${rateCardId}-${Date.now()}`;
    logger.info(`🗃️ [STUB] Backed up rate card ${rateCardId} → ${backupId}`, {
      action: 'ratecube_backup',
      data: { rateCardId, backupId },
    });
    return { success: true, backupId };
  }

  throw new Error('RateCube API not configured. Set RATECUBE_MOCK=true for development.');
}
