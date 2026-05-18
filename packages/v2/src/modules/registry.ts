import type { AnyTrackModule } from "./types";

export function createModuleRegistry(modules: AnyTrackModule[]) {
  const byType = new Map<string, AnyTrackModule>();

  for (const module of modules) {
    if (byType.has(module.type)) {
      throw new Error(`Duplicate track module type: ${module.type}`);
    }
    byType.set(module.type, module);
  }

  return {
    get(type: string) {
      const module = byType.get(type);
      if (!module) {
        throw new Error(`No track module registered for type: ${type}`);
      }
      return module;
    },
  };
}
