import { useState, useCallback, useRef } from "react";
import {
  predictPrice,
  predictExplain,
  fetchSimilar,
  predictSimulate,
  type PredictionRequest,
  type PredictionResponse,
  type ExplainResponse,
  type SimilarResponse,
} from "@/lib/api";

export interface PredictionState {
  prediction: PredictionResponse | null;
  explanation: ExplainResponse | null;
  similar: SimilarResponse | null;
  loading: boolean;
  explaining: boolean;
  similarLoading: boolean;
  error: string | null;
}

export function usePrediction() {
  const [state, setState] = useState<PredictionState>({
    prediction: null,
    explanation: null,
    similar: null,
    loading: false,
    explaining: false,
    similarLoading: false,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const predict = useCallback(async (data: PredictionRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((s) => ({
      ...s,
      loading: true,
      explaining: true,
      similarLoading: true,
      error: null,
      prediction: null,
      explanation: null,
      similar: null,
    }));

    try {
      const [pred, explain, sim] = await Promise.all([
        predictPrice(data),
        predictExplain(data).catch(() => null),
        fetchSimilar(data).catch(() => null),
      ]);

      if (controller.signal.aborted) return;

      setState({
        prediction: pred,
        explanation: explain,
        similar: sim,
        loading: false,
        explaining: explain === null,
        similarLoading: sim === null,
        error: null,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      setState((s) => ({
        ...s,
        loading: false,
        explaining: false,
        similarLoading: false,
        error: err instanceof Error ? err.message : "Prediction failed",
      }));
    }
  }, []);

  const simulate = useCallback(
    async (data: PredictionRequest): Promise<number | null> => {
      try {
        const res = await predictSimulate(data);
        return res.price;
      } catch {
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({
      prediction: null,
      explanation: null,
      similar: null,
      loading: false,
      explaining: false,
      similarLoading: false,
      error: null,
    });
  }, []);

  return { ...state, predict, simulate, reset };
}
