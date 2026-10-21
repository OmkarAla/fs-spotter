import { useEffect, useRef } from 'react';
import { useRouteStore } from '../store/routeStore';
import { apiClient } from '../api/client';

const POLL_INTERVAL_MS = 3000;
const MAX_TRANSIENT_ERRORS = 3;

export const useRoutePolling = (jobId: string | null) => {
  const jobStatus = useRouteStore((s) => s.jobStatus);
  const updateStatus = useRouteStore((s) => s.updateStatus);
  const setResult = useRouteStore((s) => s.setResult);
  const setJobError = useRouteStore((s) => s.setJobError);
  const transientErrors = useRef(0);

  useEffect(() => {
    if (!jobId || jobStatus === 'COMPLETED' || jobStatus === 'FAILED') {
      return;
    }

    // Guard against a stale in-flight response landing after jobId changes.
    let active = true;
    // Reset the strike budget for the new job.
    transientErrors.current = 0;

    const poll = async () => {
      try {
        const job = await apiClient.getRouteStatus(jobId);
        if (!active) return;
        transientErrors.current = 0;
        updateStatus(job.status);
        if (job.status === 'COMPLETED' && job.result) {
          setResult(job.result);
          setJobError(null);
        }
        if (job.status === 'FAILED') {
          setJobError(job.error_message || 'Route calculation failed.');
        }
      } catch {
        if (!active) return;
        // Tolerate transient network blips; only fail after repeated errors.
        transientErrors.current += 1;
        if (transientErrors.current >= MAX_TRANSIENT_ERRORS) {
          updateStatus('FAILED');
          setJobError('Route calculation failed.');
        }
      }
    };

    poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [jobId, jobStatus, updateStatus, setResult, setJobError]);
};
