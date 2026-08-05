import { useId, useState, type KeyboardEvent } from "react";
import type { TrackMutationResult } from "../../modules/types";
import { isHexColor } from "./settingsColor";

type DraftColorInputProps = {
  value: string;
  disabled?: boolean;
  ariaLabel?: string;
  onCommit: (color: string) => TrackMutationResult;
};

export function DraftColorInput(props: DraftColorInputProps) {
  return <DraftColorInputState key={props.value} {...props} />;
}

function DraftColorInputState({
  value,
  disabled = false,
  ariaLabel,
  onCommit,
}: DraftColorInputProps) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string>();
  const errorId = useId();

  const commit = () => {
    if (disabled) return;
    if (!isHexColor(draft)) {
      setError("Enter a six-digit hexadecimal color, for example #1A2B3C.");
      return;
    }
    if (draft.toUpperCase() === value.toUpperCase()) {
      setError(undefined);
      return;
    }

    const result = onCommit(draft.toUpperCase());
    setError(result.ok ? undefined : result.error);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      setDraft(value);
      setError(undefined);
    }
  };

  return (
    <div style={{ display: "grid", gap: "2px" }}>
      <input
        type="text"
        aria-label={ariaLabel}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error !== undefined}
        disabled={disabled}
        value={draft}
        onBlur={commit}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(undefined);
        }}
        onKeyDown={handleKeyDown}
      />
      {error && (
        <div id={errorId} role="alert" style={{ color: "#b00020", fontSize: "12px" }}>
          {error}
        </div>
      )}
    </div>
  );
}
