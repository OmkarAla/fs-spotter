import React from 'react';
import { useRouteStore } from '../store/routeStore';
import type { JobStatus as JobStatusType } from '../store/routeStore';
import type { RiskLevel } from '../types/api';
import { dangerousMiles } from '../utils/geo';

const STEPS: { status: Exclude<JobStatusType, 'FAILED' | null>; label: string }[] = [
  { status: 'PENDING', label: 'Requesting Route' },
  { status: 'PROCESSING', label: 'Analyzing Weather' },
  { status: 'COMPLETED', label: 'Finalizing Recommendation' },
];

const activeIndex = (status: JobStatusType): number =>
  STEPS.findIndex((s) => s.status === status);

const summarizeRisk = (riskMiles: Partial<Record<RiskLevel, number>>): string => {
  const dangerous = dangerousMiles(riskMiles);
  if (dangerous === 0) return 'no high-risk miles';
  return `${Math.round(dangerous)} high-risk mi`;
};

export const JobStatus: React.FC = () => {
  const status = useRouteStore((s) => s.jobStatus);
  const result = useRouteStore((s) => s.result);

  if (!status) return null;

  if (status === 'FAILED') {
    return (
      <div className="bg-red-900/20 border border-red-500 text-red-200 p-4 rounded-md text-center my-4">
        Route calculation failed. Please check your inputs and try again.
      </div>
    );
  }

  const isDone = status === 'COMPLETED';
  const currentIdx = activeIndex(status);
  const recommended = result
    ? result.routes.find((r) => r.route_id === result.recommended_route_id) ?? null
    : null;

  return (
    <div className="max-w-2xl mx-auto my-8 px-6">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 z-0" />
        {STEPS.map((step, index) => {
          const isActive = !isDone && index === currentIdx;
          const isCompleted = isDone || index < currentIdx;

          return (
            <div key={step.label} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-500
                ${isActive ? 'bg-[#F59E0B] text-[#0F172A] scale-125 ring-4 ring-amber-500/30' :
                  isCompleted ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-500'}`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span
                className={`max-w-[6.5rem] text-center text-[10px] font-medium leading-tight sm:text-xs ${
                  isActive ? 'text-[#F59E0B]' : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {isDone && (
        <div className="mt-8 bg-green-900/20 border border-green-500 rounded-lg p-5">
          <div className="flex items-center gap-2 text-green-300 font-semibold">
            <span>Route calculated</span>
          </div>
          {result ? (
            <div className="mt-2 text-sm text-slate-200 space-y-1">
              <p>
                Analyzed {result.routes.length} route
                {result.routes.length === 1 ? '' : 's'}.
              </p>
              {recommended && (
                <p className="text-slate-300">
                  Recommended:{' '}
                  <span className="text-green-300 font-medium">
                    {recommended.total_distance.toFixed(0)} mi ·{' '}
                    {(recommended.total_time / 3600).toFixed(1)} hr
                  </span>{' '}
                  — {summarizeRisk(recommended.risk_miles)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-slate-200 mt-2 text-sm">
              Safest route identified. Visualization is coming next.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
