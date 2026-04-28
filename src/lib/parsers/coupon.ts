// Lightweight client/server-safe parser for coupon promo text.
// Pulls out code, expiry, min order, max discount, source app, and a description fallback.
// Best-effort — never throws; returns whatever it could find.

import type { z } from "zod/v4";
import type { sourceAppEnum } from "@/lib/validations";

type SourceApp = z.infer<typeof sourceAppEnum>;

export interface ParsedCoupon {
  code?: string;
  expiryDate?: string; // YYYY-MM-DD
  minOrderValue?: number;
  maxDiscountValue?: number;
  sourceApp?: SourceApp;
  sourceAppOther?: string;
  description?: string;
}

const SOURCE_KEYWORDS: { app: SourceApp; patterns: RegExp[] }[] = [
  { app: "zomato", patterns: [/zomato/i] },
  { app: "swiggy", patterns: [/swiggy/i] },
  { app: "paytm", patterns: [/paytm/i] },
  { app: "gpay", patterns: [/google\s*pay|gpay/i] },
  { app: "phonepe", patterns: [/phonepe|phone\s*pe/i] },
  { app: "amazon", patterns: [/amazon\b|amzn/i] },
  { app: "flipkart", patterns: [/flipkart/i] },
  { app: "myntra", patterns: [/myntra/i] },
  { app: "bookmyshow", patterns: [/bookmyshow|book\s*my\s*show|bms/i] },
  { app: "uber", patterns: [/\buber\b/i] },
  { app: "ola", patterns: [/\bola\b/i] },
  { app: "ajio", patterns: [/ajio/i] },
  { app: "nykaa", patterns: [/nykaa/i] },
  { app: "bigbasket", patterns: [/big\s*basket|bigbasket/i] },
  { app: "blinkit", patterns: [/blinkit/i] },
  { app: "zepto", patterns: [/zepto/i] },
];

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function parseDate(str: string): Date | null {
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    let year = parseInt(y);
    if (year < 100) year += 2000;
    const date = new Date(year, parseInt(m) - 1, parseInt(d));
    if (!isNaN(date.getTime())) return date;
  }

  // D Mon YYYY or DD Month YYYY
  const dMonY = str.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s+([A-Za-z]+)\s*[,]?\s*(\d{2,4})/);
  if (dMonY) {
    const [, d, monStr, y] = dMonY;
    const monIdx = MONTHS[monStr.toLowerCase()];
    if (monIdx !== undefined) {
      let year = parseInt(y);
      if (year < 100) year += 2000;
      const date = new Date(year, monIdx, parseInt(d));
      if (!isNaN(date.getTime())) return date;
    }
  }

  // Mon DD, YYYY (e.g. "Jan 15, 2026")
  const monDY = str.match(/([A-Za-z]+)\s+(\d{1,2})\s*[,]?\s*(\d{2,4})/);
  if (monDY) {
    const [, monStr, d, y] = monDY;
    const monIdx = MONTHS[monStr.toLowerCase()];
    if (monIdx !== undefined) {
      let year = parseInt(y);
      if (year < 100) year += 2000;
      const date = new Date(year, monIdx, parseInt(d));
      if (!isNaN(date.getTime())) return date;
    }
  }

  return null;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseCouponText(rawInput: string): ParsedCoupon {
  if (!rawInput) return {};
  const text = rawInput.replace(/ /g, " ").trim();
  const result: ParsedCoupon = {};

  // Code
  const codeMatch =
    text.match(/(?:use\s+code|coupon\s+code|promo\s+code|code|coupon|promo)\s*[:\-]?\s*["']?([A-Z0-9][A-Z0-9_\-]{2,24})["']?/i);
  if (codeMatch) {
    const candidate = codeMatch[1];
    // Reject if candidate looks like a number (likely amount, not code)
    if (!/^\d+$/.test(candidate)) {
      result.code = candidate.toUpperCase();
    }
  }

  // Min order value
  const minMatch =
    text.match(/min(?:imum)?\s*(?:order|purchase|cart|spend)?\s*(?:of\s+)?[₹$]?\s*(\d{2,6})/i) ||
    text.match(/(?:order|cart)\s+(?:of\s+|above\s+|over\s+)[₹$]?\s*(\d{2,6})/i);
  if (minMatch) {
    result.minOrderValue = parseInt(minMatch[1]);
  }

  // Max discount value
  const maxMatch =
    text.match(/(?:up\s*to|max(?:imum)?|maximum)\s*[₹$]?\s*(\d{2,6})/i) ||
    text.match(/save\s+(?:up\s*to\s+)?[₹$]?\s*(\d{2,6})/i);
  if (maxMatch) {
    result.maxDiscountValue = parseInt(maxMatch[1]);
  }

  // Expiry date — try several patterns from most explicit to least
  const expiryPatterns = [
    /(?:valid|expires?|expiry|use\s+by|valid\s+(?:till|until|upto|through))\s+(?:on\s+|by\s+)?([\d\w\s,\/\-\.]{6,30})/i,
    /(?:offer|coupon)\s+(?:valid|expires?)\s+(?:till|until|upto)?\s*([\d\w\s,\/\-\.]{6,30})/i,
  ];

  for (const pat of expiryPatterns) {
    const m = text.match(pat);
    if (m) {
      const candidate = m[1].trim();
      const date = parseDate(candidate);
      if (date) {
        result.expiryDate = toIsoDate(date);
        break;
      }
    }
  }

  // Fallback: any date pattern in text
  if (!result.expiryDate) {
    const anyDate = parseDate(text);
    if (anyDate) {
      // Only use it if it's in the future (sanity check)
      if (anyDate.getTime() > Date.now() - 24 * 60 * 60 * 1000) {
        result.expiryDate = toIsoDate(anyDate);
      }
    }
  }

  // Source app
  for (const { app, patterns } of SOURCE_KEYWORDS) {
    if (patterns.some((p) => p.test(text))) {
      result.sourceApp = app;
      break;
    }
  }

  // Description fallback — first non-empty line, capped at 200 chars
  const firstLine = text.split(/\n+/).map((l) => l.trim()).find((l) => l.length > 5);
  if (firstLine) {
    result.description = firstLine.length > 200 ? firstLine.slice(0, 197) + "…" : firstLine;
  }

  return result;
}
