import React from 'react';
import { useRouteStore } from './store/routeStore';
import { useRoutePolling } from './hooks/useRoutePolling';
import { RouteControls } from './components/RouteControls';
import { JobStatus } from './components/JobStatus';

const App: React.FC = () => {
  const currentJobId = useRouteStore((s) => s.currentJobId);
  useRoutePolling(currentJobId);

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC]">
      <header className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold tracking-tight">Logistics OS</h1>
          <p className="text-slate-400 text-sm mt-1">
            Weather-aware freight routing — find the safest route.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <RouteControls />
        <JobStatus />
      </main>
    </div>
  );
};

export default App;
