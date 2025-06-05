import Refresh from "../../../icons/refresh";
import { useTrackStore } from "../../../store/trackStore";
import { YRange } from "../../tracks/bigwig/types";
import Form from "../shared/form";
import Value from "../shared/value";

export default function Range({
  id,
  defaultRange,
  customRange,
}: {
  id: string;
  defaultRange: YRange | undefined;
  customRange: YRange | undefined;
}) {
  const editTrack = useTrackStore((state) => state.editTrack);

  const validateMin = (value: string) => {
    const num = Number(value);
    if (Number.isNaN(num)) return "Invalid number";
    return undefined;
  };
  const validateMax = (value: string) => {
    const num = Number(value);
    if (Number.isNaN(num)) return "Invalid number";
    return undefined;
  };

  const minCallback = (value: string) => {
    const num = Number(value);
    const newRange = { min: num, max: customRange?.max || defaultRange!.max };
    editTrack(id, { customRange: newRange });
  };
  const maxCallback = (value: string) => {
    const num = Number(value);
    const newRange = { min: customRange?.min || defaultRange!.min, max: num };
    editTrack(id, { customRange: newRange });
  };

  return (
    <Form title="Range">
      <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
        Min:{" "}
        <Value defaultValue={customRange?.min || defaultRange!.min} validate={validateMin} callback={minCallback} />
        Max:{" "}
        <Value defaultValue={customRange?.max || defaultRange!.max} validate={validateMax} callback={maxCallback} />
        <button onClick={() => editTrack(id, { customRange: undefined })}>
          <Refresh fill="#000000" width={15} height={15} style={{ cursor: "pointer" }} />
        </button>
      </div>
    </Form>
  );
}
