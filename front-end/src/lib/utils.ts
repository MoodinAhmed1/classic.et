import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate a random 6-character alphanumeric short code
export function generateShortCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Validate URL format
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

// Generate unique ID
export function generateId(): string {
  return crypto.randomUUID();
}

// Extract domain from URL
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// Fetch page title from URL
export async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; URL-Shortener-Bot/1.0)',
      },
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    
    return titleMatch ? titleMatch[1].trim() : null;
  } catch {
    return null;
  }
}

// Country code to full country name mapping (ISO Alpha-2)
const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  US: 'United States',
  DE: 'Germany',
  GB: 'United Kingdom',
  CA: 'Canada',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  BR: 'Brazil',
  IN: 'India',
  CN: 'China',
  JP: 'Japan',
  AU: 'Australia',
  NL: 'Netherlands',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  RU: 'Russia',
  MX: 'Mexico',
  ZA: 'South Africa',
  NG: 'Nigeria',
  KE: 'Kenya',
  ET: 'Ethiopia',
  SA: 'Saudi Arabia',
  AE: 'United Arab Emirates',
  TR: 'Turkey',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  KR: 'South Korea',
  ID: 'Indonesia',
  TH: 'Thailand',
  MY: 'Malaysia',
  SG: 'Singapore',
  PH: 'Philippines',
  VN: 'Vietnam',
  PL: 'Poland',
  CZ: 'Czechia',
  AT: 'Austria',
  CH: 'Switzerland',
  BE: 'Belgium',
  PT: 'Portugal',
  IE: 'Ireland',
  RO: 'Romania',
  HU: 'Hungary',
  GR: 'Greece',
  UA: 'Ukraine',
  BG: 'Bulgaria',
  SK: 'Slovakia',
  SI: 'Slovenia',
  HR: 'Croatia',
  RS: 'Serbia',
  IL: 'Israel',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  LK: 'Sri Lanka',
  NZ: 'New Zealand',
  MA: 'Morocco',
  TN: 'Tunisia',
  EG: 'Egypt',
  GH: 'Ghana',
  ET: 'Ethiopia',
  TZ: 'Tanzania',
  UG: 'Uganda',
  // Fallback coverage for common codes; others will show code
};

export function countryCodeToName(code: string): string {
  if (!code) return 'Unknown';
  const upper = code.toUpperCase();
  return COUNTRY_CODE_TO_NAME[upper] || upper;
}