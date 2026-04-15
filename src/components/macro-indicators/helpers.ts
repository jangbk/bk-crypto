// ---------------------------------------------------------------------------
// Helpers: extract latest/previous from FRED-style data
// ---------------------------------------------------------------------------

export function getLatestTwo(
  data: { date: string; value: string }[],
): { latest: number; prev: number } | null {
  if (!data || data.length < 2) return null;
  const latest = parseFloat(data[data.length - 1].value);
  const prev = parseFloat(data[data.length - 2].value);
  if (isNaN(latest) || isNaN(prev)) return null;
  return { latest, prev };
}

export function getYoYChange(
  data: { date: string; value: string }[],
): { current: number; yoy: number } | null {
  if (!data || data.length < 13) return null;
  const current = parseFloat(data[data.length - 1].value);
  const yearAgo = parseFloat(data[data.length - 13].value);
  if (isNaN(current) || isNaN(yearAgo) || yearAgo === 0) return null;
  return { current, yoy: ((current - yearAgo) / yearAgo) * 100 };
}
