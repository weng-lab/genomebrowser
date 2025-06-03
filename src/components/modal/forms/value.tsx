import { useEffect, useState } from "react";

import { useRef } from "react";

export default function Value({
  defaultValue,
  validate,
  callback,
}: {
  defaultValue: any;
  validate: (value: string) => string | undefined;
  callback: (value: string) => void;
}) {
  const [value, setValue] = useState<string>(String(defaultValue));
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      const message = validate(value);
      const height = value ? value : defaultValue;
      if (!message) callback(height);
      if (inputRef.current) {
        inputRef.current.setCustomValidity(message || "");
        inputRef.current.reportValidity();
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="number"
      value={value || ""}
      onChange={handleChange}
      style={{ appearance: "textfield" }}
    />
  );
}
