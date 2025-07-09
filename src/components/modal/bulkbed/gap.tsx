import { useTrackStore } from "../../../store/trackStore";
import Form from "../shared/form";
import Value from "../shared/value";

export default function Gap({ id, defaultGap }: { id: string; defaultGap: number }) {
  const editTrack = useTrackStore((state) => state.editTrack);
  const MIN_GAP = 0;
  const MAX_GAP = 20;

  const callback = (value: string) => {
    const gap = Number(value) < MIN_GAP ? MIN_GAP : Number(value) > MAX_GAP ? MAX_GAP : Number(value);
    editTrack(id, { gap: gap });
  };

  const validate = (value: string) => {
    if (!value) return undefined;
    if (value === "") return undefined;
    const num = Number(value);
    if (isNaN(num)) return "Must be a number";
    if (num < MIN_GAP) return `Gap must be at least ${MIN_GAP}`;
    if (num > MAX_GAP) return `Gap must be at most ${MAX_GAP}`;
    return undefined;
  };

  return (
    <Form title="Gap">
      <Value defaultValue={defaultGap} validate={validate} callback={callback} />
    </Form>
  );
}