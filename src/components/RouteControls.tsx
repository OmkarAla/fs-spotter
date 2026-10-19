import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { useRouteStore } from '../store/routeStore';

export const RouteControls: React.FC = () => {
  const setJob = useRouteStore((state) => state.setJob);
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    departureTime: '',
    loadWeight: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const job = await apiClient.triggerRoute({
        origin: form.origin,
        destination: form.destination,
        departure_time: new Date(form.departureTime).toISOString(),
        load_weight: Number(form.loadWeight),
      });
      setJob(job.id);
    } catch (err) {
      console.error('Failed to trigger route:', err);
      setError('Could not start routing. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0F172A] p-6 rounded-xl border border-slate-800 shadow-2xl max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="origin" className="text-[#F8FAFC] text-sm font-medium">Origin</label>
          <input
            id="origin"
            type="text"
            value={form.origin}
            onChange={(e) => setForm({ ...form, origin: e.target.value })}
            className="bg-slate-900 border border-slate-700 text-[#F8FAFC] p-2 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
            placeholder="Enter start city..."
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="destination" className="text-[#F8FAFC] text-sm font-medium">Destination</label>
          <input
            id="destination"
            type="text"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            className="bg-slate-900 border border-slate-700 text-[#F8FAFC] p-2 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
            placeholder="Enter end city..."
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="departureTime" className="text-[#F8FAFC] text-sm font-medium">Departure Time</label>
          <input
            id="departureTime"
            type="datetime-local"
            value={form.departureTime}
            onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
            className="bg-slate-900 border border-slate-700 text-[#F8FAFC] p-2 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="loadWeight" className="text-[#F8FAFC] text-sm font-medium">Load Weight (kg)</label>
          <input
            id="loadWeight"
            type="number"
            min="0"
            step="any"
            value={form.loadWeight}
            onChange={(e) => setForm({ ...form, loadWeight: e.target.value })}
            className="bg-slate-900 border border-slate-700 text-[#F8FAFC] p-2 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
            placeholder="0"
            required
          />
        </div>
        {error && (
          <div className="md:col-span-2 bg-red-900/20 border border-red-500 text-red-200 text-sm p-3 rounded-md">
            {error}
          </div>
        )}
        <div className="md:col-span-2 mt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F59E0B] hover:bg-amber-600 text-[#0F172A] font-bold py-3 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {loading ? 'Processing...' : 'Find Safest Route'}
          </button>
        </div>
      </form>
    </div>
  );
};
