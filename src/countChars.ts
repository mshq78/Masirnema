/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pure function to count characters according to Masirnama rules:
 * 1. Exclude all newlines (\r, \n).
 * 2. Trim leading and trailing whitespace.
 * 3. Collapse consecutive whitespace (spaces, tabs, NBSP, extra ZWNJ adjacent to whitespace) into a single space.
 * 4. Collapse any sequence of 3 or more identical punctuation/symbols (e.g. !!!!!, ....., ؟؟؟؟, -----) into 1 mark.
 * 5. Return count as length of the resulting normalized string.
 */
export function countChars(rawText: string): { count: number; normalized: string } {
  if (!rawText) {
    return { count: 0, normalized: '' };
  }

  // 1. Remove all newlines (\r, \n) entirely
  let text = rawText.replace(/[\r\n]/g, '');

  // 2 & 3. Collapse whitespace sequences (spaces, tabs, NBSP, adjacent ZWNJ) to a single space
  // Also trim start and end whitespace / ZWNJ
  text = text.replace(/[\s\u00A0\u200C]*[\s\u00A0]+[\s\u00A0\u200C]*/g, ' ');
  text = text.replace(/^[\s\u00A0\u200C]+|[\s\u00A0\u200C]+$/g, '');

  // 4. Collapse 3 or more identical punctuation/symbols into a single symbol
  // Uses Unicode punctuation (\p{P}) and symbols (\p{S})
  text = text.replace(/([\p{P}\p{S}])\1{2,}/gu, '$1');

  // 5. Length of normalized string
  const charArray = Array.from(text);
  return {
    count: charArray.length,
    normalized: text,
  };
}

/**
 * Clips an incoming string (e.g. from paste or fast typing) so that
 * countChars(clipped).count does not exceed maxChars.
 */
export function clipToMaxChars(fullText: string, maxChars: number): string {
  const current = countChars(fullText);
  if (current.count <= maxChars) {
    return fullText;
  }

  // Binary search or iterative trim to find the maximal prefix that fits
  let low = 0;
  let high = fullText.length;
  let best = fullText.slice(0, maxChars);

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = fullText.slice(0, mid);
    if (countChars(candidate).count <= maxChars) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}
