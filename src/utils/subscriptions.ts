const MONTH_ABBREVIATIONS = new Set([
  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
]);

// Common bank-statement connector words that vary in position/case but carry
// no merchant-identifying information, so they should never survive into a
// grouping key. Kept deliberately short — only words that are near-certain
// to be statement boilerplate, not part of a real merchant name.
const BOILERPLATE_TOKENS = new Set([
  'date', 'in', 'card', 'ref', 'receipt', 'foreign', 'currency', 'amount', 'visa', 'purchase',
]);

/**
 * Removes tokens that contain a digit — typically receipt numbers, card
 * references, or the random alphanumeric transaction suffixes banks append
 * to a merchant name (e.g. "7MJJBCZ3TM9M") — plus common bank-statement
 * boilerplate words and month abbreviations, which otherwise survive
 * digit-stripping and still differ per transaction (e.g. "Date 01 Jul 2026"
 * vs "Date 31 May 2026" both keep a different month word). Without this,
 * one recurring subscription still fragments into a group per transaction
 * date instead of collapsing into a single service. Falls back to the
 * original text if nothing survives.
 */
export function stripReferenceTokens(text: string): string {
  const withoutRefTokens = text
    .split(' ')
    .filter(token => {
      if (!token) return false;
      if (/\d/.test(token)) return false;
      const lower = token.toLowerCase().replace(/[^a-z]/g, '');
      return !MONTH_ABBREVIATIONS.has(lower) && !BOILERPLATE_TOKENS.has(lower);
    })
    .join(' ')
    .trim();
  return withoutRefTokens || text.trim();
}

/**
 * Derives a grouping key from a raw, uncleaned transaction description for
 * the lightweight subscription widget (unlike the full Subscription Audit
 * page, this doesn't run the heavier bank-metadata regex cleanup first).
 */
export function normalizeSubscriptionName(description: string): string {
  const cleaned = description
    .split('-')[0]
    .replace(/[*#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripReferenceTokens(cleaned);
}

/**
 * Same normalization as normalizeSubscriptionName, aliased for call sites
 * that group general transactions by merchant rather than subscriptions
 * specifically (e.g. merchant-frequency analysis) — the underlying noise
 * (receipt numbers, card refs, embedded dates) is identical either way.
 */
export const normalizeMerchantName = normalizeSubscriptionName;
