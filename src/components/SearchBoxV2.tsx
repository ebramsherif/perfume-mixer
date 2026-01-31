"use client";

import { useState, useRef, useEffect } from "react";
import { SearchResult } from "@/lib/types";
import { useSearchV2 } from "@/lib/useSearchV2";

interface SearchBoxV2Props {
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
  disabled?: boolean;
  showSourceBadge?: boolean;
}

export default function SearchBoxV2({
  onSelect,
  placeholder = "Search for a perfume...",
  disabled = false,
  showSourceBadge = true,
}: SearchBoxV2Props) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    results,
    isLoading,
    error,
    source,
    version,
    isRateLimited,
    clearResults,
  } = useSearchV2(query, {
    debounceMs: 400,
    enableFallback: true,
  });

  // Open dropdown when results arrive
  useEffect(() => {
    if (results.length > 0) {
      setIsOpen(true);
      setSelectedIndex(-1);
    }
  }, [results]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (result: SearchResult) => {
    setQuery("");
    clearResults();
    setIsOpen(false);
    onSelect(result);
  };

  const getSourceLabel = () => {
    if (!source) return null;
    if (source === "fragrantica") return "Fragrantica";
    if (source === "rapidapi") return version?.includes("fallback") ? "Fallback" : "RapidAPI";
    return null;
  };

  const sourceLabel = getSourceLabel();

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-5 py-4 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isRateLimited && (
            <span className="text-xs text-yellow-500">Throttled...</span>
          )}
          {isLoading && (
            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          )}
          {!isLoading && query.length > 0 && (
            <button
              onClick={() => {
                setQuery("");
                clearResults();
              }}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
        >
          {showSourceBadge && sourceLabel && (
            <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-700 flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Results from{" "}
                <span
                  className={
                    source === "fragrantica"
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }
                >
                  {sourceLabel}
                </span>
              </span>
              {error && (
                <span className="text-xs text-yellow-500" title={error}>
                  ⚠️
                </span>
              )}
            </div>
          )}
          <ul className="max-h-80 overflow-y-auto">
            {results.map((result, index) => (
              <li key={result.id}>
                <button
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                    index === selectedIndex
                      ? "bg-zinc-800"
                      : "hover:bg-zinc-800/50"
                  }`}
                >
                  {result.imageUrl && (
                    <img
                      src={result.imageUrl}
                      alt={result.name}
                      className="w-12 h-12 object-contain rounded-lg bg-zinc-800"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {result.name}
                    </p>
                    <p className="text-sm text-zinc-400 truncate">
                      {result.brand}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-2 p-4 bg-zinc-900 border border-zinc-700 rounded-xl text-center text-zinc-400">
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : (
            <>No perfumes found for &quot;{query}&quot;</>
          )}
        </div>
      )}
    </div>
  );
}
