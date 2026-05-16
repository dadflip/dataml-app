import { useEffect, useState } from "react";
import { loadAllCatalogs, type ParsedCatalog } from "./pipeline";

export function useCatalogs() {
  const [catalogs, setCatalogs] = useState<ParsedCatalog[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadAllCatalogs()
      .then(setCatalogs)
      .catch((e) => setError(String(e)));
  }, []);
  return { catalogs, error, loading: !catalogs && !error };
}
