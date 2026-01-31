"use client";

import { useState, useRef, useEffect } from "react";
import { SearchResult } from "./types";
import { consumeToken, canMakeRequest } from "./rateLimiter";

interface SearchV2Options {
  debounceMs?: number;
  enableFallback?: boolean;
}

interface SearchV2State {
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  source: "fragrantica" | "rapidapi" | "none" | null;
  version: string | null;
  isRateLimited: boolean;
}

const RATE_LIMIT_KEY = "search-v2";

export function useSearchV2(query: string, options: SearchV2Options = {}) {
  const { debounceMs = 400, enableFallback = true } = options;

  const [state, setState] = useState<SearchV2State>({
    results: [],
    isLoading: false,
    error: null,
    source: null,
    version: null,
    isRateLimited: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear results for short queries
    if (!query || query.length < 2) {
      setState({
        results: [],
        isLoading: false,
        error: null,
        source: null,
        version: null,
        isRateLimited: false,
      });
      return;
    }

    // Check rate limit
    if (!canMakeRequest(RATE_LIMIT_KEY)) {
      setState((prev) => ({ ...prev, isRateLimited: true }));
    }

    const timeoutId = setTimeout(async () => {
      // Consume rate limit token
      if (!consumeToken(RATE_LIMIT_KEY)) {
        setState((prev) => ({ ...prev, isRateLimited: true }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        isRateLimited: false,
      }));

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const params = new URLSearchParams({
          q: query,
          fallback: enableFallback.toString(),
        });

        const response = await fetch(`/api/search/v2?${params}`, {
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Search failed");
        }

        setState({
          results: data.results || [],
          isLoading: false,
          error: data.warning || null,
          source: data.source || null,
          version: data.version || null,
          isRateLimited: false,
        });
      } catch (error) {
        // Don't update state if the request was aborted
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setState({
          results: [],
          isLoading: false,
          error: error instanceof Error ? error.message : "Search failed",
          source: null,
          version: null,
          isRateLimited: false,
        });
      }
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, debounceMs, enableFallback]);

  const clearResults = () => {
    setState({
      results: [],
      isLoading: false,
      error: null,
      source: null,
      version: null,
      isRateLimited: false,
    });
  };

  return {
    ...state,
    clearResults,
  };
}
