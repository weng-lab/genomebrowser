import { useEffect, useState } from "react";
import { useBrowserStore } from "../browserStore";
import { useTrackStore } from "../tracksStore";

// Move the fakeFetch function outside or to a separate API utility file
function fakeFetch(domain: string) {
  const seed = domain.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rng = (n: number) => {
    const x = Math.sin(n + seed) * 10000;
    return x - Math.floor(x);
  };

  const randomStrings = Array.from({ length: 7 }, (_, i) => {
    const length = Math.floor(rng(i) * 10) + 5;
    return Array.from({ length }, (_, j) =>
      String.fromCharCode(97 + Math.floor(rng(i * length + j) * 26))
    ).join("");
  });
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: randomStrings,
      } as { data: string[] });
    }, 2000);
  });
}

export function useTrackFetcher() {
  const domain = useBrowserStore((state) => state.domain);
  const setTrackData = useTrackStore((state) => state.setTrackData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    fakeFetch(domain)
      .then((data) => {
        setTrackData((data as { data: string[] }).data);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [domain, setTrackData]);

  return { isLoading, error };
} 