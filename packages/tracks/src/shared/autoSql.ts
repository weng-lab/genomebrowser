/** Ordered scalar/array column names from a UCSC AutoSQL table declaration. */
export function getAutoSqlFieldNames(autoSql: string): string[] {
  const declarations = autoSql.replace(/"(?:\\.|[^"\\])*"/g, "");
  return [
    ...declarations.matchAll(
      /\b(?:uint|int|string|lstring|char)(?:\s*\[\s*\w+\s*\])?\s+(\w+)\s*;/g,
    ),
  ].map((match) => match[1]);
}
