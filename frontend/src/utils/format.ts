export function formatAmount(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    const k = amount / 1_000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(0)}K`;
  }
  return amount.toLocaleString();
}
