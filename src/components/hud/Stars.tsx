/** 三顆星的顯示；亮的用實心星，沒拿到的用淡色。 */
export function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "text-4xl" : "text-sm";
  return (
    <span className={`inline-flex gap-0.5 ${cls}`} aria-label={`${value} 顆星`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < value ? "text-amber-400" : "text-neutral-300"} aria-hidden>
          ★
        </span>
      ))}
    </span>
  );
}
