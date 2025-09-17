import { Config, TrackDimensions, TrackType } from "../types";

export interface LDTrackConfig extends Config<any> {
  trackType: TrackType.LDTrack;
  show?: string[];
}

export type LDProps = {
  id: string;
  data: any[];
  color: string;
  height: number;
  dimensions: TrackDimensions;
  show?: string[];
  onClick?: (data: any) => void;
  onHover?: (data: any) => void;
  onLeave?: (data: any) => void;
  tooltip?: React.FC<any>;
};

export type Population = {
  population: string;
  subpopulation?: string;
};

export const POPULATIONS = [
  { text: "African", value: "AFRICAN" },
  { text: "Native American", value: "AMERICAN" },
  { text: "East Asian", value: "EAST_ASIAN" },
  { text: "European", value: "EUROPEAN" },
  { text: "South Asian", value: "SOUTH_ASIAN" },
];

export const SUBPOPULATIONS: Map<string, ({ text: string; value: string } | null)[]> = new Map([
  [
    "AFRICAN",
    [
      null,
      { text: "Gambian", value: "GAMBIAN" },
      { text: "Mende", value: "MENDE" },
      { text: "Easn", value: "ESAN" },
      { text: "African American", value: "AFRICAN_AMERICAN" },
      { text: "African Caribbean", value: "AFRICAN_CARIBBEAN" },
    ],
  ],
  [
    "AMERICAN",
    [
      null,
      { text: "Mexican", value: "MEXICAN" },
      { text: "Puerto Rican", value: "PUERTO_RICAN" },
      { text: "Colombian", value: "COLOMBIAN" },
      { text: "Peruvian", value: "PERUVIAN" },
      // { text: 'Southern Han Chinese', value: 'SOUTHERN_HAN_CHINESE' },
    ],
  ],
  [
    "EAST_ASIAN",
    [
      null,
      { text: "Han Chinese from Beijing", value: "HAN_CHINESE_BEIJING" },
      { text: "Japanese", value: "JAPANESE" },
      { text: "Dai", value: "DAI" },
      { text: "Kinh", value: "KINH" },
      { text: "Southern Han Chinese", value: "SOUTHERN_HAN_CHINESE" },
    ],
  ],
  [
    "EUROPEAN",
    [
      null,
      { text: "Iberian", value: "IBERIAN" },
      { text: "British", value: "BRITISH" },
      { text: "Finnish", value: "FINNISH" },
      { text: "Toscani", value: "TOSCANI" },
      { text: "Utah resident northwest European", value: "UTAH_RESIDENT_NW_EUROPEAN" },
    ],
  ],
  [
    "SOUTH_ASIAN",
    [
      null,
      { text: "Gujarati", value: "GUJARATI" },
      { text: "Punjabi", value: "PUNJABI" },
      { text: "Bengali", value: "BENGALI" },
      { text: "Sri Lankan Tamil", value: "SRI_LANKAN_TAMIL" },
      { text: "Indian Telugu", value: "INDIAN_TELUGU" },
    ],
  ],
]);

export const ALL_POPULATIONS: Population[] = POPULATIONS.flatMap((pop) => {
  const subpops = SUBPOPULATIONS.get(pop.value) ?? [];
  return subpops
    .filter((subpop): subpop is { text: string; value: string } => subpop !== null)
    .map((subpop) => ({
      population: pop.value,
      subpopulation: subpop.value,
    }));
});
