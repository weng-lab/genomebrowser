import { useTrackStore } from "../../../store/trackStore";
import Form from "./form";
import Value from "./value";

export default function Height({ id, defaultHeight }: { id: string; defaultHeight: number }) {
  const editTrack = useTrackStore((state) => state.editTrack);
  const MIN_HEIGHT = 20;
  const MAX_HEIGHT = 300;
  const callback = (value: string) => {
    const height = Number(value) < MIN_HEIGHT ? MIN_HEIGHT : Number(value) > MAX_HEIGHT ? MAX_HEIGHT : Number(value);
    editTrack(id, { height: height });
  };

  const validate = (value: string) => {
    if (!value) return undefined;
    if (value === "") return undefined;
    const num = Number(value);
    if (isNaN(num)) return "Must be a number";
    if (num < MIN_HEIGHT) return `Height must be at least ${MIN_HEIGHT}`;
    if (num > MAX_HEIGHT) return `Height must be at most ${MAX_HEIGHT}`;
    return undefined;
  };

  return (
    <Form>
      Height: <Value defaultValue={defaultHeight} validate={validate} callback={callback} />
    </Form>
  );
}
