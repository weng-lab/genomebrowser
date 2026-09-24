import type { RenderReason } from "./internal/fibers";

/** Why one component instance rendered during a measurement. */
export interface RenderCause {
  /** Component name plus its React key path, or its sibling index if unkeyed. */
  instance: string;
  renders: number;
  /** Union of the reasons across every render of this instance. */
  because: RenderReason[];
}

/** Committed renders of every composite component under a probe for one measurement. */
export interface RenderReport {
  /** Renders per component name, sorted by name, including mounted components that did not render. */
  readonly counts: Record<string, number>;
  /** The same shape as `counts`, limited to the named components. */
  pick(...names: string[]): Record<string, number>;
  /** One entry per rendered instance of the named component. */
  why(name: string): RenderCause[];
  /** A readable table of counts and reasons, for debugging. */
  toString(): string;
}

export interface InstanceRenders {
  name: string;
  renders: number;
  because: Set<RenderReason>;
}

export function createReport(
  mounted: Iterable<string>,
  instances: Map<string, InstanceRenders>,
): RenderReport {
  const totals = new Map<string, number>();
  for (const name of mounted) totals.set(name, 0);
  for (const { name, renders } of instances.values()) {
    totals.set(name, (totals.get(name) ?? 0) + renders);
  }
  const counts = Object.fromEntries([...totals].sort(([a], [b]) => compare(a, b)));

  const assertKnown = (name: string) => {
    if (!(name in counts)) {
      throw new Error(
        `render-probe: "${name}" did not render and is not mounted under the probe. ` +
          `Known components: ${Object.keys(counts).join(", ")}`,
      );
    }
  };

  const why = (name: string): RenderCause[] => {
    assertKnown(name);
    return [...instances]
      .filter(([, entry]) => entry.name === name)
      .sort(([a], [b]) => compare(a, b))
      .map(([instance, entry]) => ({
        instance,
        renders: entry.renders,
        because: [...entry.because].sort(compare),
      }));
  };

  return {
    counts,
    pick(...names) {
      names.forEach(assertKnown);
      return Object.fromEntries(
        [...names].sort(compare).map((name) => [name, counts[name]] as const),
      );
    },
    why,
    toString() {
      const width = Math.max(9, ...Object.keys(counts).map((name) => name.length));
      const lines = [`${"Component".padEnd(width)}  Renders  Because`];
      for (const [name, renders] of Object.entries(counts)) {
        const causes = renders === 0 ? [] : why(name);
        const because = causes.map((cause) => `${cause.instance} ${cause.because.join(" ")}`);
        lines.push(
          `${name.padEnd(width)}  ${String(renders).padStart(7)}  ${because.join("; ")}`.trimEnd(),
        );
      }
      return lines.join("\n");
    },
  };
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
