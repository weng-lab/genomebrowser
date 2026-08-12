export type GenomicRegion = {
  chromosome: string;
  start: number;
  end: number;
};

export type GenomicRecord = {
  chromosome: string;
  start: number;
  end: number;
};

export type ReadOptions = {
  signal?: AbortSignal;
};

export interface GenomicFile<T extends GenomicRecord> {
  read(region: GenomicRegion, options?: ReadOptions): Promise<T[]>;
}
