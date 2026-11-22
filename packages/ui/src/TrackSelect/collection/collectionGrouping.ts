export function groupRowsByField<Row extends Record<string, unknown>>(
  rows: Row[],
  field: string,
  getFallback: (row: Row) => string,
) {
  const groupedRows = new Map<string, Row[]>();

  for (const row of rows) {
    const value = formatCollectionValue(row[field], getFallback(row));
    const group = groupedRows.get(value);
    if (group) {
      group.push(row);
    } else {
      groupedRows.set(value, [row]);
    }
  }

  return groupedRows;
}

export function formatCollectionValue(value: unknown, fallback: string): string {
  if (value === null || value === undefined || value === "") return fallback;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint" ||
    typeof value === "symbol"
  ) {
    return String(value);
  }
  try {
    return JSON.stringify(value) ?? fallback;
  } catch {
    return fallback;
  }
}
