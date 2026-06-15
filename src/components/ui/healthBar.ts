// Tailwind fill class for portrait health stripes: green above 67%, red below 33%.
export function healthBarColorClass(hp: number, maxHp: number): string {
  if (maxHp <= 0) {
    return "bg-red-500";
  }
  const pct = (hp / maxHp) * 100;
  if (pct > 67) {
    return "bg-green-500";
  }
  if (pct < 33) {
    return "bg-red-500";
  }
  return "bg-yellow-500";
}

export function healthBarWidthPct(hp: number, maxHp: number): number {
  return maxHp > 0 ? Math.max(0, (hp / maxHp) * 100) : 0;
}
