import type { AnyTrackModule, TrackCreateInput } from "./types";

type ModuleForType<Modules extends readonly AnyTrackModule[], Type extends string> =
  Extract<Modules[number], { type: Type }> extends never
    ? Modules[number]
    : Extract<Modules[number], { type: Type }>;

export type ModuleRegistry<Modules extends readonly AnyTrackModule[] = readonly AnyTrackModule[]> =
  {
    modules: Readonly<Modules>;
    get<T extends string>(type: T): ModuleForType<Modules, T>;
    get(type: string): Modules[number];
  };

export type TrackCollectionEntry = TrackCreateInput<Record<string, unknown>> & {
  type: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export function createModuleRegistry<const Modules extends readonly AnyTrackModule[]>(
  modules: Modules,
): ModuleRegistry<Modules> {
  const moduleSnapshot = Object.freeze([...modules]) as unknown as Readonly<Modules>;
  const byType = new Map<string, Modules[number]>();

  for (const module of moduleSnapshot) {
    if (byType.has(module.type)) {
      throw new Error(`Duplicate track module type: ${module.type}`);
    }
    byType.set(module.type, module);
  }

  function get<T extends string>(type: T): ModuleForType<Modules, T>;
  function get(type: string): Modules[number];
  function get(type: string) {
    const module = byType.get(type);
    if (!module) {
      throw new Error(`No track module registered for type: ${type}`);
    }
    return module;
  }

  return { modules: moduleSnapshot, get };
}
