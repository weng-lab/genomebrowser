import { useRef, useState, useEffect } from "react";

export default function Value({
  defaultValue,
  validate,
  callback,
}: {
  defaultValue: number;
  validate: (value: string) => string | undefined;
  callback: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>(String(defaultValue));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  useEffect(() => {
    if (value === String(defaultValue)) return;
    const newValue = value ? value : String(defaultValue);
    const delay = value ? 500 : 2000;
    const timeout = setTimeout(() => {
      const message = validate(value);
      if (!message) callback(newValue);
      if (inputRef.current) {
        inputRef.current.setCustomValidity(message || "");
        inputRef.current.reportValidity();
      }
    }, delay);
    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="number"
      step="any"
      placeholder={formatValue(Number(defaultValue))}
      onChange={handleChange}
      style={{ appearance: "textfield" }}
    />
  );
}

function formatValue(num: number) {
  if (Number.isNaN(num) || Number(num) === 0) return "";
  if (Number.isInteger(num)) return num.toString();
  return Number(num.toFixed(2)).toString();
}
