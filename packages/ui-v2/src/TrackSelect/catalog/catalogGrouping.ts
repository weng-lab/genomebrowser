export function groupRowsByField<Row extends Record<string, unknown>>(
  rows: Row[],
  field: string,
  getFallback: (row: Row) => string,
) {
  const groupedRows = new Map<string, Row[]>();

  for (const row of rows) {
    const value = formatCatalogValue(row[field], getFallback(row));
    const group = groupedRows.get(value);
    if (group) {
      group.push(row);
    } else {
      groupedRows.set(value, [row]);
    }
  }

  return groupedRows;
}

export function formatCatalogValue(value: unknown, fallback: string) {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}
