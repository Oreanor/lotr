import { useEffect, useState } from "react";

// useState that mirrors itself to localStorage under `key`. `parse` turns the
// stored string back into a value (returning the fallback when absent/invalid);
// `serialize` is the inverse. Storage errors (private mode, quota) are ignored.
export function usePersistentState<T>(
  key: string,
  fallback: T,
  parse: (raw: string) => T,
  serialize: (value: T) => string,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : parse(raw);
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(value));
    } catch {
      // ignore storage errors
    }
  }, [key, value, serialize]);
  return [value, setValue];
}
