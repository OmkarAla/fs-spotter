import React from 'react';
import type { UnitSystem } from '../types/api';

interface UnitToggleProps {
  value: UnitSystem;
  onChange: (value: UnitSystem) => void;
}

const OPTIONS: Array<{ value: UnitSystem; label: string }> = [
  { value: 'imperial', label: 'Imperial (mi/lb)' },
  { value: 'metric', label: 'Metric (km/kg)' },
];

export const UnitToggle: React.FC<UnitToggleProps> = ({ value, onChange }) => (
  <div className="flex items-center gap-1 rounded-md border border-slate-700 p-1">
    {OPTIONS.map((option) => (
      <button
        key={option.value}
        type="button"
        aria-pressed={value === option.value}
        onClick={() => onChange(option.value)}
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
          value === option.value
            ? 'bg-amber-500 text-[#0F172A]'
            : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);
