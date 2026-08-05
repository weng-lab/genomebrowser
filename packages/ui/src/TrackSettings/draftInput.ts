import type { TrackMutationResult } from "@weng-lab/genomebrowser";
import { useEffect, useEffectEvent, useState, type KeyboardEvent } from "react";

const defaultDebounceMs = 300;

const completeNumberPattern = /^[+-]?(?:\d+|\d+\.\d+|\.\d+)(?:[eE][+-]?\d+)?$/;

export type DraftValidation<Value> = { ok: true; value: Value } | { ok: false; error: string };

export type DraftControllerOptions<Raw, Value> = {
  value: Value;
  toRaw: (value: Value) => Raw;
  validate: (raw: Raw) => DraftValidation<Value>;
  isEqual: (left: Value, right: Value) => boolean;
  onCommit: (value: Value) => TrackMutationResult;
  debounceMs?: number | false;
};

export type DraftController<Raw> = {
  value: Raw;
  error: string | undefined;
  change: (value: Raw) => void;
  blur: () => void;
  keyDown: (event: KeyboardEvent<HTMLElement>) => void;
  submit: (value: Raw) => TrackMutationResult;
};

type DraftState<Raw, Value> = {
  raw: Raw;
  baseline: Value;
  externalValue: Value;
  dirty: boolean;
  error?: string;
  revision: number;
  pendingRevision?: number;
};

/** Owns raw editable text until a validated update is accepted or cancelled. */
export function useDraftController<Raw, Value>(
  options: DraftControllerOptions<Raw, Value>,
): DraftController<Raw> {
  const [draft, setDraft] = useState<DraftState<Raw, Value>>();

  const currentBaseline = (currentDraft: DraftState<Raw, Value> | undefined) => {
    if (currentDraft !== undefined && options.isEqual(currentDraft.externalValue, options.value)) {
      return currentDraft.baseline;
    }
    return options.value;
  };

  const makeDraft = (raw: Raw) => {
    const revision = (draft?.revision ?? 0) + 1;
    const baseline = currentBaseline(draft);
    const validation = options.validate(raw);
    const pendingRevision =
      validation.ok && !options.isEqual(validation.value, baseline) ? revision : undefined;

    return {
      raw,
      baseline,
      externalValue: options.value,
      dirty: true,
      error: validation.ok ? undefined : validation.error,
      revision,
      pendingRevision,
    } satisfies DraftState<Raw, Value>;
  };

  const attemptCommit = (currentDraft: DraftState<Raw, Value>) => {
    const validation = options.validate(currentDraft.raw);
    if (!validation.ok) {
      setDraft({ ...currentDraft, error: validation.error, pendingRevision: undefined });
      return { ok: false, error: validation.error } satisfies TrackMutationResult;
    }

    const baseline = currentBaseline(currentDraft);
    if (options.isEqual(validation.value, baseline)) {
      if (options.isEqual(baseline, options.value)) {
        setDraft(undefined);
      } else {
        setDraft({
          raw: options.toRaw(baseline),
          baseline,
          externalValue: options.value,
          dirty: false,
          revision: currentDraft.revision,
        });
      }
      return { ok: true } satisfies TrackMutationResult;
    }

    const result = options.onCommit(validation.value);
    if (!result.ok) {
      setDraft({ ...currentDraft, error: result.error, pendingRevision: undefined });
      return result;
    }

    setDraft({
      raw: options.toRaw(validation.value),
      baseline: validation.value,
      externalValue: options.value,
      dirty: false,
      revision: currentDraft.revision,
    });
    return result;
  };

  const commitAfterDelay = useEffectEvent((revision: number) => {
    if (draft?.dirty && draft.pendingRevision === revision) attemptCommit(draft);
  });

  const pendingRevision = draft?.pendingRevision;
  const debounceMs = options.debounceMs ?? defaultDebounceMs;
  useEffect(() => {
    if (pendingRevision === undefined || debounceMs === false) return;

    const timer = setTimeout(() => commitAfterDelay(pendingRevision), debounceMs);
    return () => clearTimeout(timer);
  }, [debounceMs, pendingRevision]);

  const change = (raw: Raw) => setDraft(makeDraft(raw));

  const flush = () => {
    if (draft?.dirty) attemptCommit(draft);
  };

  const submit = (raw: Raw) => {
    const nextDraft = makeDraft(raw);
    setDraft(nextDraft);
    return attemptCommit(nextDraft);
  };

  const cancel = () => {
    if (draft === undefined) return;

    const baseline = currentBaseline(draft);
    if (options.isEqual(baseline, options.value)) {
      setDraft(undefined);
    } else {
      setDraft({
        raw: options.toRaw(baseline),
        baseline,
        externalValue: options.value,
        dirty: false,
        revision: draft.revision,
      });
    }
  };

  const keyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      flush();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    }
  };

  const externalSupersedesSettledDraft =
    draft !== undefined && !draft.dirty && !options.isEqual(draft.externalValue, options.value);

  return {
    value:
      draft === undefined || externalSupersedesSettledDraft
        ? options.toRaw(options.value)
        : draft.raw,
    error: draft?.error,
    change,
    blur: flush,
    keyDown,
    submit,
  };
}

export function parseFiniteNumber(value: string): DraftValidation<number> {
  const trimmedValue = value.trim();
  if (trimmedValue === "") return { ok: false, error: "Enter a number." };
  if (!completeNumberPattern.test(trimmedValue)) {
    return { ok: false, error: "Enter a complete number." };
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue)) {
    return { ok: false, error: "Enter a finite number." };
  }
  return { ok: true, value: parsedValue };
}
