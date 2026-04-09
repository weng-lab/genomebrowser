import { FolderDefinition, FolderRuntimeConfig } from "./Folders/types";

export type FolderRuntimeConfigOverrides = Map<
  string,
  Partial<FolderRuntimeConfig>
>;

export type ResolvedFolderRuntimeConfig = FolderRuntimeConfig & {
  buildTree: FolderDefinition["buildTree"];
};

export const createDefaultFolderRuntimeConfig = (
  folder: FolderDefinition,
): ResolvedFolderRuntimeConfig => ({
  columns: folder.columns,
  groupingModel: folder.groupingModel,
  leafField: folder.leafField,
  buildTree: folder.buildTree,
});

export const deriveFolderRuntimeConfig = ({
  folder,
  runtimeConfigOverridesByFolder,
}: {
  folder: FolderDefinition;
  runtimeConfigOverridesByFolder: FolderRuntimeConfigOverrides;
}): ResolvedFolderRuntimeConfig => ({
  ...createDefaultFolderRuntimeConfig(folder),
  ...(runtimeConfigOverridesByFolder.get(folder.id) ?? {}),
});

export const updateFolderRuntimeConfigOverrides = ({
  folder,
  partial,
  runtimeConfigOverridesByFolder,
}: {
  folder: FolderDefinition;
  partial: Partial<FolderRuntimeConfig>;
  runtimeConfigOverridesByFolder: FolderRuntimeConfigOverrides;
}): FolderRuntimeConfigOverrides => {
  const nextOverrides = new Map(runtimeConfigOverridesByFolder);
  const currentOverride = nextOverrides.get(folder.id) ?? {};
  nextOverrides.set(folder.id, {
    ...currentOverride,
    ...partial,
  });
  return nextOverrides;
};
