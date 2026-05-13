// ============================================
// Validation Rules - Business Rules Configuration
// ============================================

export interface ValidationRuleSet {
  requiredFields: string[];
  dateFormat: string;
  rateRange: { min: number; max: number };
  validOrigins: string[];
  validDestinations: string[];
  validCurrencies: string[];
  laneIdPattern: RegExp;
  commonMisspellings: Record<string, string>;
}

/**
 * Default validation rules for freight/logistics industry.
 * Customize these for your specific business needs.
 */
export const defaultValidationRules: ValidationRuleSet = {
  requiredFields: [
    'lane_id',
    'origin',
    'destination',
    'rate',
    'effective_date',
    'currency',
  ],

  dateFormat: 'YYYY-MM-DD',

  rateRange: {
    min: 50,
    max: 50000,
  },

  validOrigins: [
    // Major US airports
    'LAX', 'JFK', 'ORD', 'SFO', 'MIA', 'ATL', 'DFW', 'SEA', 'IAH', 'EWR',
    'BOS', 'PHL', 'DEN', 'MSP', 'DTW', 'CLT', 'PHX', 'MCO', 'IAD', 'BWI',
    // Major international airports
    'LHR', 'CDG', 'FRA', 'AMS', 'HKG', 'SIN', 'NRT', 'ICN', 'PVG', 'SHA',
    'DXB', 'DOH', 'SYD', 'MEL', 'GRU', 'MEX', 'YYZ', 'YVR', 'MUC', 'ZRH',
    'FCO', 'MAD', 'BCN', 'BKK', 'KUL', 'TPE', 'DEL', 'BOM', 'CAN', 'PEK',
    // Major seaports
    'USLAX', 'USLGB', 'USNYC', 'USSAV', 'USCHS', 'USHOU', 'USOAK',
    'CNSHA', 'CNYTN', 'CNSZX', 'CNNGB', 'HKHKG', 'SGSIN', 'KRPUS',
    'JPYOK', 'JPTYO', 'TWKHH', 'DEHAM', 'NLRTM', 'GBFXT', 'BEANR',
  ],

  validDestinations: [
    // Same as origins - bidirectional
    'LAX', 'JFK', 'ORD', 'SFO', 'MIA', 'ATL', 'DFW', 'SEA', 'IAH', 'EWR',
    'BOS', 'PHL', 'DEN', 'MSP', 'DTW', 'CLT', 'PHX', 'MCO', 'IAD', 'BWI',
    'LHR', 'CDG', 'FRA', 'AMS', 'HKG', 'SIN', 'NRT', 'ICN', 'PVG', 'SHA',
    'DXB', 'DOH', 'SYD', 'MEL', 'GRU', 'MEX', 'YYZ', 'YVR', 'MUC', 'ZRH',
    'FCO', 'MAD', 'BCN', 'BKK', 'KUL', 'TPE', 'DEL', 'BOM', 'CAN', 'PEK',
    'USLAX', 'USLGB', 'USNYC', 'USSAV', 'USCHS', 'USHOU', 'USOAK',
    'CNSHA', 'CNYTN', 'CNSZX', 'CNNGB', 'HKHKG', 'SGSIN', 'KRPUS',
    'JPYOK', 'JPTYO', 'TWKHH', 'DEHAM', 'NLRTM', 'GBFXT', 'BEANR',
  ],

  validCurrencies: [
    'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'HKD', 'SGD', 'AUD', 'CAD',
    'CHF', 'KRW', 'TWD', 'INR', 'BRL', 'MXN', 'THB', 'MYR', 'AED',
  ],

  laneIdPattern: /^[A-Z]{2,5}-?[A-Z]{2,5}[0-9]{0,4}$/,

  commonMisspellings: {
    'LOS ANGELAS': 'LAX',
    'LOS ANGELES': 'LAX',
    'NEW YORK': 'JFK',
    'CHICAGO': 'ORD',
    'SAN FRANCISCO': 'SFO',
    'HONG KONG': 'HKG',
    'SINGAPORE': 'SIN',
    'SHANGAHI': 'PVG',
    'SHANGHAI': 'PVG',
    'SHENZEN': 'CNSZX',
    'SHENZHEN': 'CNSZX',
    'FANKFURT': 'FRA',
    'FRANKFURT': 'FRA',
    'ROTTERDM': 'NLRTM',
    'ROTTERDAM': 'NLRTM',
    'US$': 'USD',
    'US Dollar': 'USD',
    'Euro': 'EUR',
    'Euros': 'EUR',
  },
};

/**
 * Get validation rules, optionally merging custom overrides
 */
export function getValidationRules(
  overrides?: Partial<ValidationRuleSet>
): ValidationRuleSet {
  if (!overrides) return defaultValidationRules;

  return {
    ...defaultValidationRules,
    ...overrides,
    rateRange: { ...defaultValidationRules.rateRange, ...overrides.rateRange },
    commonMisspellings: {
      ...defaultValidationRules.commonMisspellings,
      ...overrides.commonMisspellings,
    },
  };
}
