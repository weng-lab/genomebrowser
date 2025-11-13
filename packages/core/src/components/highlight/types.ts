export interface Highlight {
  id: string;
  domain: { chromosome?: string; start: number; end: number };
  color: string;
}
