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
} from "../src/lib";
import { useMemo } from "react";

// --- Types ---

type OverlayData = {
  primary: Rect[];
  overlay: Rect[];
};

type OverlayInteractionRect = Rect & {
  source: "base" | "overlay";
  matchedName?: string;
};

// The config type — extra fields go directly on the config
type OverlayBigBedConfig = CustomTrackConfig<OverlayInteractionRect> & {
  primaryUrl: string;
  overlayUrl: string;
  baseColor?: string;
  overlayColor?: string;
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
    ...rest
  } = props;
  const domain = useBrowserStore((state) => state.domain);
  const { totalWidth, sideWidth } = dimensions;
  const { x, reverseX } = useXTransform(totalWidth);

  const rows = useMemo(() => {
    const visible = (data?.primary || []).filter((r) => r.end >= domain.start && r.start <= domain.end);
    return renderSquishBigBedData(visible, x);
  }, [data, domain.end, domain.start, x]);

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
