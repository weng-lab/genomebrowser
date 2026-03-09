import { useMemo } from "react";
import { useBrowserStore, useDataStore, useTrackStore } from "../../store/BrowserContext";
import { usePrevHeights } from "../../hooks/useTrackLayout";
import { RULER_HEIGHT } from "./ruler/ruler";
import Wrapper from "./wrapper/wrapper";

export default function DisplayTrack({ id }: { id: string }) {
  const track = useTrackStore((state) => state.getTrack(id));
  const trackDataState = useDataStore((state) => state.trackData.get(id));
  const getTrackDimensions = useBrowserStore((state) => state.getTrackDimensions);
  const trackDimensions = getTrackDimensions();

  const isLoading = !trackDataState || (trackDataState.data === null && trackDataState.error === null);
  const error = trackDataState?.error ?? undefined;
  const data = trackDataState?.data ?? undefined;

  const prevHeights = usePrevHeights(id);
  const transform = useMemo(() => `translate(0, ${prevHeights + RULER_HEIGHT})`, [prevHeights]);

  const trackComponent = useMemo(() => {
    if (!track || !data) return <></>;
    const Component = track.definition.renderers[track.displayMode];
    if (!Component) return <></>;
    return <Component {...track} data={data} dimensions={trackDimensions} />;
  }, [track, data, trackDimensions]);

  return (
    <Wrapper id={id} transform={transform} error={error} loading={isLoading}>
      {trackComponent}
    </Wrapper>
  );
}
