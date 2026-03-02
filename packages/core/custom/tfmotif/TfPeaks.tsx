import {
  ClipPath,
  CustomTrackConfig,
  CustomTrackProps,
  DisplayMode,
  fetchBigBedUrl,
  Rect,
  renderSquishBigBedData,
  TrackType,
  useBrowserStore,
  useInteraction,
  useRowHeight,
  useXTransform,
  Vibrant,
  useTrackStore,
} from "../../src/lib";
import { DNALogo } from "logo-test";
import { useMemo, useState } from "react";
import motifData from "./TF-ChIP-Canonical-Motifs-w-Trimmed.json";

// --- Types ---

type OverlayData = {
  primary: Rect[];
  overlay: Rect[];
};

type OverlayInteractionRect = Rect & {
  source: "base" | "overlay";
  matchedName?: string;
  pwm?: number[][];
};

// The config type — extra fields go directly on the config
type OverlayBigBedConfig = CustomTrackConfig<OverlayInteractionRect> & {
  primaryUrl: string;
  overlayUrl: string;
  baseColor?: string;
  overlayColor?: string;
  filter?: string[];
};

// --- Helpers ---

function nameKey(name?: string) {
  if (!name) return "";
  return name.split(/[-_]/)[0].trim().toLowerCase();
}

function buildOverlayIndex(rects: Rect[]) {
  return rects.reduce<Record<string, Rect[]>>((acc, rect) => {
    const key = nameKey(rect.name);
    if (!key) return acc;
    (acc[key] ??= []).push(rect);
    return acc;
  }, {});
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart <= bEnd && bStart <= aEnd;
}

function darkenHexColor(color: string, score?: number) {
  if (!color.startsWith("#") || color.length !== 7) return color;
  const t = 1 - (0.7 * Math.min(Math.max(score ?? 0, 0), 1000)) / 1000;
  const r = Math.round(parseInt(color.slice(1, 3), 16) * t);
  const g = Math.round(parseInt(color.slice(3, 5), 16) * t);
  const b = Math.round(parseInt(color.slice(5, 7), 16) * t);
  if ([r, g, b].some(isNaN)) return color;
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// --- Motif data lookup ---

type MotifEntry = { trimmed_ppm: number[][]; ppm: number[][] };
const motifLookup = motifData as Record<string, MotifEntry>;

function lookupPwm(name?: string): number[][] | undefined {
  const key = nameKey(name)?.toUpperCase();
  if (!key) return undefined;
  const entry = motifLookup[key];
  return entry?.trimmed_ppm ?? entry?.ppm;
}

// --- Tooltip ---

function tfDisplayName(name?: string): string {
  return nameKey(name)?.toUpperCase() || name || "Unknown";
}

function TfPeaksTooltip(rect: OverlayInteractionRect) {
  const pwm = rect.pwm;
  const label = tfDisplayName(rect.name);
  if (!pwm || pwm.length === 0) {
    return (
      <g>
        <rect
          width={120}
          height={24}
          fill="white"
          rx={2}
          style={{ filter: "drop-shadow(0px 0px 4px rgba(0,0,0,0.25))" }}
        />
        <text x={6} y={16} fontSize={12} fill="#333">
          {label}
        </text>
      </g>
    );
  }
  const logoWidth = pwm.length * 15;
  const logoHeight = 130;
  const totalHeight = logoHeight - 5;
  return (
    <g transform={`translate(0, ${-totalHeight})`}>
      <rect
        width={logoWidth + 10}
        height={totalHeight}
        fill="white"
        rx={3}
        style={{ filter: "drop-shadow(0px 0px 5px rgba(0,0,0,0.3))" }}
      />
      <text x={5} y={16} fontSize={12} fontWeight="bold" fill="#333">
        {label}
      </text>
      <g transform="translate(5, 5)">
        <DNALogo ppm={pwm} mode="INFORMATION_CONTENT" width={logoWidth} height={logoHeight} />
      </g>
    </g>
  );
}

// --- Settings Panel ---

function TfPeaksSettings({ id }: { id: string }) {
  const track = useTrackStore((state) => state.getTrack(id)) as OverlayBigBedConfig | undefined;
  const editTrack = useTrackStore((state) => state.editTrack);
  const [input, setInput] = useState((track?.filter || []).join(", "));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    const names = value
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    editTrack<OverlayBigBedConfig>(id, { filter: names.length > 0 ? names : undefined });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        paddingBlock: "5px",
        paddingInline: "10px",
        gap: "3px",
      }}
    >
      <div style={{ fontWeight: "bold" }}>Filter TFs</div>
      <input value={input} onChange={handleChange} placeholder="e.g. CTCF, TP53, GATA1" style={{ width: "100%" }} />
    </div>
  );
}

// --- Renderer ---

function OverlayBigBedRenderer(props: CustomTrackProps<OverlayData> & OverlayBigBedConfig) {
  const {
    data,
    dimensions,
    id,
    height: trackHeight,
    color,
    baseColor: baseColorProp,
    overlayColor: overlayColorProp,
    filter,
    ...rest
  } = props;
  const domain = useBrowserStore((state) => state.domain);
  const { totalWidth, sideWidth } = dimensions;
  const { x, reverseX } = useXTransform(totalWidth);

  const filterSet = useMemo(
    () => (filter && filter.length > 0 ? new Set(filter.map((f) => f.toUpperCase())) : null),
    [filter]
  );

  const rows = useMemo(() => {
    let visible = (data?.primary || []).filter((r) => r.end >= domain.start && r.start <= domain.end);
    if (filterSet) {
      visible = visible.filter((r) => filterSet.has(nameKey(r.name)?.toUpperCase()));
    }
    return renderSquishBigBedData(visible, x);
  }, [data, domain.end, domain.start, x, filterSet]);

  const rowHeight = useRowHeight(rows.length, id);
  const height = Math.max(trackHeight, rowHeight * Math.max(rows.length, 1));
  const overlayByName = useMemo(() => buildOverlayIndex(data?.overlay || []), [data]);

  const baseColor = baseColorProp || color || Vibrant[0];
  const overlayColor = overlayColorProp || Vibrant[3];
  const cursor = rest.onClick ? "pointer" : "default";

  const { handleClick, handleHover, handleLeave } = useInteraction<OverlayInteractionRect>({
    onClick: rest.onClick,
    onHover: rest.onHover,
    onLeave: rest.onLeave,
    tooltip: rest.tooltip,
  });

  return (
    <g width={totalWidth} height={height} clipPath={`url(#${id})`} transform={`translate(-${sideWidth}, 0)`}>
      <rect width={totalWidth} height={height} fill="transparent" />
      <defs>
        <ClipPath id={id} width={totalWidth} height={height} />
      </defs>
      {rows.map((row, rowIndex) => {
        const baseY = rowHeight * 0.2;
        const baseH = rowHeight * 0.6;
        return (
          <g key={`row_${rowIndex}`} transform={`translate(0, ${rowIndex * rowHeight})`}>
            {row.map((rect, ri) => {
              const realStart = Math.round(reverseX(rect.start));
              const realEnd = Math.round(reverseX(rect.end));
              const baseName = rect.rectname;
              const attached = (overlayByName[nameKey(rect.rectname)] || []).filter((a) =>
                intervalsOverlap(realStart, realEnd, a.start, a.end)
              );
              const fill = darkenHexColor(rect.color || baseColor, rect.score);
              const baseRect: OverlayInteractionRect = {
                source: "base",
                start: realStart,
                end: realEnd,
                name: baseName,
                color: fill,
                score: rect.score,
                pwm: lookupPwm(baseName),
              };

              return (
                <g key={`${id}_${rowIndex}_${ri}`}>
                  <rect
                    style={{ cursor }}
                    x={rect.start}
                    y={baseY}
                    width={Math.max(rect.end - rect.start, 1)}
                    height={baseH}
                    fill={fill}
                    opacity={0.9}
                    onClick={() => handleClick(baseRect)}
                    onMouseOver={(e) => handleHover(baseRect, baseRect.name || "", e)}
                    onMouseOut={() => handleLeave(baseRect)}
                  />
                  {attached.map((a, ai) => {
                    const left = x(a.start);
                    const right = x(a.end);
                    const overlayRect: OverlayInteractionRect = {
                      source: "overlay",
                      start: a.start,
                      end: a.end,
                      name: a.name,
                      color: a.color || overlayColor,
                      score: a.score,
                      matchedName: baseName,
                      pwm: lookupPwm(a.name),
                    };
                    return (
                      <rect
                        style={{ cursor }}
                        key={`${id}_${rowIndex}_${ri}_a_${ai}`}
                        x={left}
                        y={baseY}
                        width={Math.max(right - left, 1)}
                        height={baseH}
                        fill={a.color || overlayColor}
                        opacity={0.9}
                        onClick={() => handleClick(overlayRect)}
                        onMouseOver={(e) => handleHover(overlayRect, overlayRect.name || "", e)}
                        onMouseOut={() => handleLeave(overlayRect)}
                      />
                    );
                  })}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

// --- Track config ---

export const PEAKS_BIGBED_URL = "https://users.wenglab.org/gaomingshi/no_trim.TF_name.rPeaks.bb";
export const DECORATOR_BIGBED_URL = "https://users.wenglab.org/gaomingshi/no_trim.TF_name.decorator.bb";

export const tfPeaksTrack: OverlayBigBedConfig = {
  id: "custom-tf-peaks",
  title: "TF Peaks (Overlay)",
  shortLabel: "TF Peaks",
  trackType: TrackType.Custom,
  displayMode: DisplayMode.Full,
  color: Vibrant[0],
  height: 80,
  primaryUrl: PEAKS_BIGBED_URL,
  overlayUrl: DECORATOR_BIGBED_URL,
  baseColor: "#d1d5db",
  overlayColor: "#1e3a8a",
  tooltip: TfPeaksTooltip,
  settingsPanel: TfPeaksSettings,
  renderers: {
    [DisplayMode.Full]: OverlayBigBedRenderer,
  },
  fetcher: async (ctx) => {
    const track = ctx.track as OverlayBigBedConfig;
    const [primary, overlay] = await Promise.all([
      fetchBigBedUrl(track.primaryUrl, ctx),
      fetchBigBedUrl(track.overlayUrl, ctx),
    ]);
    const error = [primary.error, overlay.error].filter(Boolean).join("\n") || null;
    return {
      data: { primary: primary.data || [], overlay: overlay.data || [] },
      error,
    };
  },
};
