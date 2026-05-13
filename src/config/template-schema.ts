// ============================================
// Template Schema - RateCube Template Field Definitions
// ============================================

export interface TemplateField {
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  format?: string;
  description: string;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation: 'direct_mapping' | 'uppercase' | 'lowercase' | 'date_conversion' | 'number_conversion' | 'calculation' | 'lookup';
  formula?: string;
  notes?: string;
}

/**
 * RateCube template schema definition.
 * Customize these fields to match your actual RateCube template.
 */
export const ratecubeTemplateSchema: Record<string, TemplateField> = {
  lane_id: {
    type: 'string',
    required: true,
    description: 'Unique lane identifier',
  },
  origin: {
    type: 'string',
    required: true,
    description: 'Origin airport/port code',
  },
  destination: {
    type: 'string',
    required: true,
    description: 'Destination airport/port code',
  },
  rate: {
    type: 'number',
    required: true,
    description: 'Rate per unit',
  },
  currency: {
    type: 'string',
    required: true,
    description: 'ISO currency code',
  },
  effective_date: {
    type: 'date',
    required: true,
    format: 'YYYY-MM-DD',
    description: 'Rate effective date',
  },
  expiry_date: {
    type: 'date',
    required: false,
    format: 'YYYY-MM-DD',
    description: 'Rate expiry date',
  },
  rate_unit: {
    type: 'string',
    required: false,
    description: 'Unit of measurement for rate',
  },
  minimum_charge: {
    type: 'number',
    required: false,
    description: 'Minimum charge per shipment',
  },
  surcharge_percent: {
    type: 'number',
    required: false,
    description: 'Surcharge percentage',
  },
  fuel_surcharge: {
    type: 'number',
    required: false,
    description: 'Fuel surcharge amount or percentage',
  },
  service_level: {
    type: 'string',
    required: false,
    description: 'Service level (economy, standard, express)',
  },
  equipment_type: {
    type: 'string',
    required: false,
    description: 'Equipment type (container, pallet, etc.)',
  },
  transit_days: {
    type: 'number',
    required: false,
    description: 'Estimated transit time in days',
  },
  notes: {
    type: 'string',
    required: false,
    description: 'Additional notes or conditions',
  },
};

/**
 * Default field mappings from source to template.
 * Customize these for your specific data sources.
 */
export const defaultFieldMappings: FieldMapping[] = [
  { sourceField: 'lane_id', targetField: 'lane_id', transformation: 'uppercase' },
  { sourceField: 'origin', targetField: 'origin', transformation: 'uppercase' },
  { sourceField: 'destination', targetField: 'destination', transformation: 'uppercase' },
  { sourceField: 'rate', targetField: 'rate', transformation: 'number_conversion' },
  { sourceField: 'currency', targetField: 'currency', transformation: 'uppercase' },
  { sourceField: 'effective_date', targetField: 'effective_date', transformation: 'date_conversion' },
  { sourceField: 'expiry_date', targetField: 'expiry_date', transformation: 'date_conversion' },
  { sourceField: 'rate_unit', targetField: 'rate_unit', transformation: 'direct_mapping' },
  { sourceField: 'minimum_charge', targetField: 'minimum_charge', transformation: 'number_conversion' },
  { sourceField: 'surcharges', targetField: 'surcharge_percent', transformation: 'number_conversion' },
  { sourceField: 'fuel_surcharge', targetField: 'fuel_surcharge', transformation: 'number_conversion' },
  { sourceField: 'service_level', targetField: 'service_level', transformation: 'direct_mapping' },
  { sourceField: 'equipment_type', targetField: 'equipment_type', transformation: 'direct_mapping' },
  { sourceField: 'transit_days', targetField: 'transit_days', transformation: 'number_conversion' },
  { sourceField: 'notes', targetField: 'notes', transformation: 'direct_mapping' },
];

/**
 * Get template schema as a serialized string for prompt injection
 */
export function getTemplateSchemaForPrompt(): string {
  const lines: string[] = [];
  for (const [field, config] of Object.entries(ratecubeTemplateSchema)) {
    const req = config.required ? 'required' : 'optional';
    const fmt = config.format ? `(${config.format})` : '';
    lines.push(`  "${field}": "${config.type}${fmt}|${req}"`);
  }
  return `{\n${lines.join(',\n')}\n}`;
}

/**
 * Get field mappings as a serialized string for prompt injection
 */
export function getFieldMappingsForPrompt(): string {
  return JSON.stringify(
    defaultFieldMappings.map((m) => ({
      source_field: m.sourceField,
      target_field: m.targetField,
      transformation: m.transformation,
    })),
    null,
    2
  );
}
