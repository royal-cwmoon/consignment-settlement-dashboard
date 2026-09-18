const NF = new Intl.NumberFormat("ko-KR");

export function won(v: number): string {
  return NF.format(Math.round(v)) + "원";
}

export function pct(v: number, digits = 1): string {
  return v.toFixed(digits) + "%";
}

export function pctDelta(v: number): string {
  const sign = v >= 0 ? "+" : "−";
  return sign + Math.abs(v).toFixed(1) + "%p";
}

export function tone(rate: number, target: number): string {
  if (rate >= target) return "#16a34a"; // green: 목표 이상
  if (rate >= target - 4) return "#d97706"; // amber: 근접 미달
  return "#dc2626"; // red: 큰 폭 미달
}

export function barWidth(rate: number, max: number): string {
  const w = Math.max(2, Math.min(100, (rate / max) * 100));
  return w.toFixed(1) + "%";
}
