const LOCALE = "en-US";

/** Minutes as "5 h 44 min", "45 min" or "2 h", rounded to the nearest minute. */
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;

  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

/** A number with a fixed number of decimals, e.g. 7.16 -> "7.2". */
export function formatNumber(value: number, decimals: number): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** A 0-1 fraction as a percentage, e.g. 0.47 -> "47%". */
export function formatPercent(fraction: number, decimals = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(fraction);
}
