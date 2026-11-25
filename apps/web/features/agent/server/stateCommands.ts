import "server-only";
import type { CommandResult } from "../commands/protocol";
import { commands } from "../commands";
import { planTrackMetadataChange } from "../../browser/trackMetadataCore";
import { sortTrackList } from "../../browser/trackSortCore";
import type { SessionService } from "../../sessions/server/service";

/**
 * Pure server-side chromosome lengths for supported assemblies.
 * TODO: replace with the app's shared assembly definitions once added.
 */
const assemblyChromosomes: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  hg38: {
    chr1: 248956422,
    chr2: 242193529,
    chr3: 198295559,
    chr4: 190214555,
    chr5: 181538259,
    chr6: 170805979,
    chr7: 159345973,
    chr8: 145138636,
    chr9: 138394717,
    chr10: 133797422,
    chr11: 135086622,
    chr12: 133275309,
    chr13: 114364328,
    chr14: 107043718,
    chr15: 101991189,
    chr16: 90338345,
    chr17: 83257441,
    chr18: 80373285,
    chr19: 58617616,
    chr20: 64444167,
    chr21: 46709983,
    chr22: 50818468,
    chrX: 156040895,
    chrY: 57227415,
    chrM: 16569,
  },
};

const serverStateCommandNames = new Set([
  "set_region",
  "list_tracks",
  "sort_tracks",
  "set_track_metadata",
]);

/** Whether an agent command operates purely on session state (needs 0 open clients). */
export function isServerStateCommand(name: string): boolean {
  return serverStateCommandNames.has(name);
}

/**
 * Execute a state-only MCP command directly against `SessionService`. Persists
 * to PostgreSQL and broadcasts to every open web client through the `SessionBus`.
 */
export async function runServerStateCommand(
  service: SessionService,
  sessionId: string,
  name: string,
  rawParams: unknown,
): Promise<CommandResult> {
  const command = commands.find((candidate) => candidate.name === name);
  if (!command) return { ok: false, code: "UNKNOWN_COMMAND", error: `No command ${name}` };
  const parsed = command.params.safeParse(rawParams);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_PARAMS", error: "Invalid command parameters" };
  }

  switch (name) {
    case "list_tracks": {
      const saved = await service.load(sessionId);
      const pinned = new Set(saved.snapshot.pinnedTrackIds);
      return {
        ok: true,
        value: {
          tracks: saved.snapshot.tracks.map(({ type, base, metadata }) => ({
            id: base.id,
            title: base.title,
            type,
            pinned: pinned.has(base.id),
            metadata: metadata ?? {},
          })),
        },
      };
    }

    case "set_region": {
      const { region } = parsed.data as {
        region: { chromosome: string; start: number; end: number };
      };
      const outcome = await service.mutate(sessionId, (current) => {
        const normalized = normalizeRegion(region, current.snapshot.browser.assembly);
        if (!normalized.ok) return normalized;
        return {
          ok: true,
          name: current.name,
          snapshot: {
            ...current.snapshot,
            browser: { ...current.snapshot.browser, region: normalized.region },
          },
          value: { region: normalized.region, clamped: normalized.clamped },
        };
      });
      return outcome.ok ? { ok: true, value: outcome.value } : outcome;
    }

    case "sort_tracks": {
      const { by } = parsed.data as {
        by: { field: string; direction?: "ascending" | "descending" }[];
      };
      const outcome = await service.mutate(sessionId, (current) => {
        const sorted = sortTrackList(current.snapshot.tracks, current.snapshot.pinnedTrackIds, by);
        if (!sorted.ok) return sorted;
        return {
          ok: true,
          name: current.name,
          snapshot: { ...current.snapshot, tracks: sorted.tracks },
          value: {
            tracks: sorted.tracks.map(({ base }) => ({ id: base.id, title: base.title })),
          },
        };
      });
      return outcome.ok ? { ok: true, value: outcome.value } : outcome;
    }

    case "set_track_metadata": {
      const {
        trackIds,
        set = {},
        remove = [],
      } = parsed.data as {
        trackIds: string[];
        set?: Record<string, string | number | boolean | null>;
        remove?: string[];
      };
      if (Object.keys(set).length === 0 && remove.length === 0) {
        return { ok: false, code: "INVALID_PARAMS", error: "Give fields to set or remove" };
      }
      const both = remove.filter((field) => Object.hasOwn(set, field));
      if (both.length > 0) {
        const fields = both.map((field) => `"${field}"`).join(", ");
        return {
          ok: false,
          code: "INVALID_PARAMS",
          error: `Fields both set and removed: ${fields}`,
        };
      }
      const outcome = await service.mutate(sessionId, (current) => {
        const planned = planTrackMetadataChange(current.snapshot.tracks, trackIds, { set, remove });
        if (!planned.ok) return planned;
        const byId = new Map(planned.tracks.map(({ id, metadata }) => [id, metadata] as const));
        const tracks = current.snapshot.tracks.map((track) => {
          const metadata = byId.get(track.base.id);
          return metadata ? { ...track, metadata } : track;
        });
        return {
          ok: true,
          name: current.name,
          snapshot: { ...current.snapshot, tracks },
          value: { tracks: planned.tracks },
        };
      });
      return outcome.ok ? { ok: true, value: outcome.value } : outcome;
    }

    default:
      return { ok: false, code: "UNKNOWN_COMMAND", error: `No server command ${name}` };
  }
}

function normalizeRegion(
  region: { chromosome: string; start: number; end: number },
  assemblyId: string,
):
  | { ok: true; region: { chromosome: string; start: number; end: number }; clamped: boolean }
  | { ok: false; code: string; error: string } {
  const chromosomes = assemblyChromosomes[assemblyId];
  if (!chromosomes) {
    return { ok: false, code: "INVALID_REGION", error: `Unsupported assembly "${assemblyId}".` };
  }
  if (!Object.hasOwn(chromosomes, region.chromosome)) {
    return {
      ok: false,
      code: "UNKNOWN_CHROMOSOME",
      error: `Chromosome "${region.chromosome}" is not present in assembly "${assemblyId}".`,
    };
  }
  const length = chromosomes[region.chromosome];
  if (region.end <= 0 || region.start >= length) {
    return {
      ok: false,
      code: "OUTSIDE_CHROMOSOME",
      error: `Region does not overlap chromosome "${region.chromosome}" bounds [0, ${length}).`,
    };
  }
  const start = Math.max(0, region.start);
  const end = Math.min(length, region.end);
  return {
    ok: true,
    region: { chromosome: region.chromosome, start, end },
    clamped: start !== region.start || end !== region.end,
  };
}
