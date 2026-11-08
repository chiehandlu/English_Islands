/**
 * 島上的時間：完成度越高，天色從清晨走到黃昏。
 * 刻意停在黃昏之前，畫面維持明亮好看。
 */
const START_HOUR = 7;
const END_HOUR = 17.5;

export function dayHour(completionRatio: number): number {
  const t = Math.min(1, Math.max(0, completionRatio));
  return START_HOUR + (END_HOUR - START_HOUR) * t;
}

export function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
