import React, { useEffect, useId, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import type { GeocodeResult } from '../types/api';

interface LocationComboboxProps {
  id: string;
  label: string;
  value: GeocodeResult | null;
  onChange: (value: GeocodeResult | null) => void;
  placeholder?: string;
}

export const LocationCombobox: React.FC<LocationComboboxProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
}) => {
  const [query, setQuery] = useState(value?.label ?? '');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const listId = useId();
  const blurTimer = useRef<number | null>(null);

  useEffect(() => {
    setQuery(value?.label ?? '');
  }, [value?.label]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || value?.label === query) {
      setResults([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const locations = await apiClient.searchLocations(
          trimmed,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setResults(locations);
        setOpen(true);
        setHighlighted(0);
      } catch {
        if (controller.signal.aborted) return;
        setError('Location search is unavailable.');
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, value?.label]);

  useEffect(() => () => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
  }, []);

  const choose = (result: GeocodeResult) => {
    onChange(result);
    setQuery(result.label);
    setResults([]);
    setOpen(false);
    setError(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((index) => (index + 1) % results.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((index) =>
        index === 0 ? results.length - 1 : index - 1,
      );
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[highlighted]);
    }
    if (event.key === 'Escape') setOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-[#F8FAFC]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            open && results[highlighted]
              ? `${listId}-${highlighted}`
              : undefined
          }
          value={query}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current);
            if (results.length > 0) setOpen(true);
          }}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 120);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(null);
          }}
          className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-[#F8FAFC] outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-amber-500"
        />
        {loading && (
          <span className="absolute right-3 top-2.5 text-xs text-slate-400">
            Searching...
          </span>
        )}
        {open && results.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-[600] mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-700 bg-slate-950 py-1 shadow-2xl"
          >
            {results.map((result, index) => (
              <li
                id={`${listId}-${index}`}
                key={`${result.label}-${result.latitude}-${result.longitude}`}
                role="option"
                aria-selected={index === highlighted}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => choose(result)}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  index === highlighted
                    ? 'bg-amber-500/15 text-amber-200'
                    : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className="block font-medium">{result.name}</span>
                <span className="block text-xs text-slate-400">
                  {result.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!loading && open && results.length === 0 && query.trim().length >= 2 && (
        <p className="text-xs text-slate-500">No matching locations.</p>
      )}
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
};
