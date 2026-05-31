import { useEffect, useState } from "react";
import { loadAllPipelines, type PipelineTemplate } from "./pipeline";

export function usePipelines() {
  const [pipelines, setPipelines] = useState<PipelineTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllPipelines()
      .then(setPipelines)
      .catch((e) => setError(String(e)));
  }, []);

  return { pipelines, error, loading: !pipelines && !error };
}
