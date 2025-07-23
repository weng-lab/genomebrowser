import Refresh from "../../../icons/refresh";
import { useTrackStore } from "../../../store/BrowserContext";
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
    const maxValue = customRange?.max || defaultRange?.max;
    if (maxValue !== undefined && num >= maxValue) {
      return "Min must be less than max";
    }
    return undefined;
  };

  const validateMax = (value: string) => {
    const num = Number(value);
    if (Number.isNaN(num)) return "Invalid number";
    const minValue = customRange?.min || defaultRange?.min;
    if (minValue !== undefined && num <= minValue) {
      return "Max must be greater than min";
    }
    return undefined;
  };

  const minCallback = (value: string) => {
    const num = Number(value);
    if (!defaultRange) return;
    const newRange = { min: num, max: customRange?.max ?? defaultRange.max };
    editTrack(id, { customRange: newRange });
  };
  const maxCallback = (value: string) => {
    const num = Number(value);
    if (!defaultRange) return;
    const newRange = { min: customRange?.min ?? defaultRange.min, max: num };
    editTrack(id, { customRange: newRange });
  };

  return (
    <Form title="Range">
      <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
        Min:{" "}
        <Value
          defaultValue={customRange?.min || defaultRange?.min || 0}
          validate={validateMin}
          callback={minCallback}
        />
        Max:{" "}
        <Value
          defaultValue={customRange?.max || defaultRange?.max || 100}
          validate={validateMax}
          callback={maxCallback}
        />
        <button title="auto scale range" onClick={() => editTrack(id, { customRange: undefined })}>
          <Refresh fill="#000000" width={15} height={15} style={{ cursor: "pointer" }} />
        </button>
      </div>
    </Form>
  );
}
