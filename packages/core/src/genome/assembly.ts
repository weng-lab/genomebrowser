export type AssemblyDefinition = {
  readonly id: string;
  readonly chromosomes: Readonly<Record<string, number>>;
};

/** Validates an assembly definition and returns an immutable snapshot. */
export function createAssemblyDefinition(definition: AssemblyDefinition): AssemblyDefinition {
  if (typeof definition !== "object" || definition === null) {
    throw new Error("Invalid assembly definition: expected an object.");
  }
  if (typeof definition.id !== "string" || definition.id.length === 0) {
    throw new Error("Invalid assembly definition: id must be a non-empty string.");
  }
  if (
    typeof definition.chromosomes !== "object" ||
    definition.chromosomes === null ||
    Array.isArray(definition.chromosomes)
  ) {
    throw new Error("Invalid assembly definition: chromosomes must be a record.");
  }

  const chromosomeEntries = Object.entries(definition.chromosomes);
  if (chromosomeEntries.length === 0) {
    throw new Error("Invalid assembly definition: chromosomes must not be empty.");
  }

  for (const [chromosome, length] of chromosomeEntries) {
    if (chromosome.length === 0) {
      throw new Error("Invalid assembly definition: chromosome names must not be empty.");
    }
    if (!Number.isSafeInteger(length) || length <= 0) {
      throw new Error(
        `Invalid assembly definition: chromosome "${chromosome}" length must be a positive safe integer.`,
      );
    }
  }

  const chromosomeSnapshot = Object.create(null) as Record<string, number>;
  for (const [chromosome, length] of chromosomeEntries) {
    chromosomeSnapshot[chromosome] = length;
  }

  const chromosomes = Object.freeze(chromosomeSnapshot);
  return Object.freeze({ id: definition.id, chromosomes });
}
