import { DOCUMENT_METHODS, KycMethod, KycRegion, NIGERIA_METHODS } from './kyc.constants';

export interface SupportedCountry {
  /** ISO 3166-1 alpha-2 */
  code: string;
  name: string;
  dialCode: string;
  /** Default currency for salary processing (ISO 4217). */
  currency: string;
  region: KycRegion;
  /** Identity methods a user from this country may use. */
  methods: readonly KycMethod[];
}

const international = (code: string, name: string, dialCode: string, currency: string) =>
  ({
    code,
    name,
    dialCode,
    currency,
    region: 'international',
    methods: DOCUMENT_METHODS,
  }) as const;

/**
 * Countries available at launch. Nigeria uses BVN/NIN (needed later for the
 * Nigerian virtual salary account); every other country uses the international
 * document path. Add a country here to support it.
 */
export const SUPPORTED_COUNTRIES: readonly SupportedCountry[] = [
  {
    code: 'NG',
    name: 'Nigeria',
    dialCode: '+234',
    currency: 'NGN',
    region: 'nigeria',
    methods: NIGERIA_METHODS,
  },
  international('GH', 'Ghana', '+233', 'GHS'),
  international('KE', 'Kenya', '+254', 'KES'),
  international('ZA', 'South Africa', '+27', 'ZAR'),
  international('GB', 'United Kingdom', '+44', 'GBP'),
  international('US', 'United States', '+1', 'USD'),
];

export function findSupportedCountry(code?: string | null): SupportedCountry | undefined {
  if (!code) return undefined;
  return SUPPORTED_COUNTRIES.find((c) => c.code === code.toUpperCase());
}
