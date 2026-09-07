export interface DiffToken {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

/**
 * Computes a word-level diff between original and modified text using Longest Common Subsequence (LCS).
 * Preserves words with space separation and highlights deletions (red) and additions (green).
 */
export function computeWordDiff(original: string, modified: string): DiffToken[] {
  if (!original && !modified) return [];
  if (!original) return [{ type: 'added', text: modified }];
  if (!modified) return [{ type: 'removed', text: original }];
  if (original.trim() === modified.trim()) {
    return [{ type: 'unchanged', text: modified }];
  }

  // Tokenize preserving words
  const words1 = original.trim().split(/\s+/);
  const words2 = modified.trim().split(/\s+/);

  const n = words1.length;
  const m = words2.length;

  // Build LCS DP table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (words1[i - 1] === words2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  let i = n;
  let j = m;
  const rawDiff: DiffToken[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && words1[i - 1] === words2[j - 1]) {
      rawDiff.push({ type: 'unchanged', text: words1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({ type: 'added', text: words2[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.push({ type: 'removed', text: words1[i - 1] });
      i--;
    }
  }

  rawDiff.reverse();

  // Group adjacent tokens of same type for cleaner rendering
  const merged: DiffToken[] = [];
  for (const token of rawDiff) {
    if (merged.length > 0 && merged[merged.length - 1].type === token.type) {
      merged[merged.length - 1].text += ' ' + token.text;
    } else {
      merged.push({ type: token.type, text: token.text });
    }
  }

  return merged;
}
