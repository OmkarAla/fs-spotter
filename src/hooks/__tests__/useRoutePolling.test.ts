import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRoutePolling } from '../useRoutePolling';
import { useRouteStore } from '../../store/routeStore';
import { apiClient } from '../../api/client';
import type { RouteJob, RouteResult } from '../../types/api';

vi.mock('../../api/client', () => ({
  apiClient: {
    triggerRoute: vi.fn(),
    getRouteStatus: vi.fn(),
  },
}));

const flush = () => act(async () => {});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const makeResult = (): RouteResult => ({
  job_id: 'job-1',
  recommended_route_id: 'route-1',
  routes: [
    {
      route_id: 'route-1',
      polyline: 'poly',
      total_distance: 1000,
      total_time: 36000,
      risk_miles: { Low: 5 },
      total_risk_score: 0,
      checkpoints: [],
    },
  ],
});

describe('useRoutePolling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useRouteStore.setState({ currentJobId: null, jobStatus: null, result: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when jobId is null', async () => {
    renderHook(() => useRoutePolling(null));
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(apiClient.getRouteStatus).not.toHaveBeenCalled();
  });

  it('does not poll when the job is already in a terminal state', async () => {
    useRouteStore.setState({ jobStatus: 'COMPLETED' });
    renderHook(() => useRoutePolling('job-1'));
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(apiClient.getRouteStatus).not.toHaveBeenCalled();
  });

  it('polls, updates status, and stores the result on COMPLETED', async () => {
    const completed = makeResult();
    vi.mocked(apiClient.getRouteStatus).mockResolvedValue({
      id: 'job-1',
      status: 'COMPLETED',
      created_at: '2026-10-20T10:00:00Z',
      result: completed,
    });

    renderHook(() => useRoutePolling('job-1'));
    await flush();

    expect(apiClient.getRouteStatus).toHaveBeenCalledWith('job-1');
    expect(useRouteStore.getState().jobStatus).toBe('COMPLETED');
    expect(useRouteStore.getState().result).toBe(completed);
  });

  it('tolerates transient errors, then fails after repeated strikes', async () => {
    vi.mocked(apiClient.getRouteStatus).mockRejectedValue(new Error('network'));

    renderHook(() => useRoutePolling('job-1'));
    await flush(); // strike 1 (immediate poll)
    expect(useRouteStore.getState().jobStatus).not.toBe('FAILED');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    }); // strike 2 — still tolerated
    expect(useRouteStore.getState().jobStatus).not.toBe('FAILED');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    }); // strike 3 — now FAILED
    expect(useRouteStore.getState().jobStatus).toBe('FAILED');
  });

  it('stops polling once the store reaches a terminal state', async () => {
    vi.mocked(apiClient.getRouteStatus).mockResolvedValue({
      id: 'job-1',
      status: 'COMPLETED',
      created_at: '2026-10-20T10:00:00Z',
      result: makeResult(),
    });

    renderHook(() => useRoutePolling('job-1'));
    await flush();
    expect(apiClient.getRouteStatus).toHaveBeenCalledTimes(1);

    // jobStatus is now COMPLETED → further ticks must not poll
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(apiClient.getRouteStatus).toHaveBeenCalledTimes(1);
  });

  it('clears the interval on unmount', async () => {
    const { unmount } = renderHook(() => useRoutePolling('job-1'));
    await flush();
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(apiClient.getRouteStatus).toHaveBeenCalledTimes(1);
  });

  it('ignores a stale in-flight response after the job changes', async () => {
    const d = deferred<RouteJob>();
    vi.mocked(apiClient.getRouteStatus).mockImplementation((id) =>
      id === 'job-A'
        ? d.promise
        : Promise.resolve({ id: 'job-B', status: 'PENDING', created_at: '' }),
    );

    const { rerender } = renderHook(({ id }: { id: string | null }) => useRoutePolling(id), {
      initialProps: { id: 'job-A' as string | null },
    });
    await flush(); // job-A poll is now in flight (unresolved)

    rerender({ id: 'job-B' });
    await flush();
    expect(useRouteStore.getState().jobStatus).toBe('PENDING');

    // job-A's late COMPLETED response must not overwrite job-B's state
    d.resolve({ id: 'job-A', status: 'COMPLETED', created_at: '', result: makeResult() });
    await flush();
    expect(useRouteStore.getState().jobStatus).toBe('PENDING');
    expect(useRouteStore.getState().result).toBeNull();
  });

  it('resets the transient-error budget when the job changes', async () => {
    vi.mocked(apiClient.getRouteStatus).mockRejectedValue(new Error('network'));

    const { rerender } = renderHook(({ id }: { id: string | null }) => useRoutePolling(id), {
      initialProps: { id: 'job-A' as string | null },
    });
    await flush(); // strike 1
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    }); // strike 2 (tolerated)
    expect(useRouteStore.getState().jobStatus).not.toBe('FAILED');

    // Switching jobs must reset the budget, so job-B tolerates a fresh blip
    rerender({ id: 'job-B' });
    await flush(); // job-B strike 1 — would be 3 (→ FAILED) if the counter leaked
    expect(useRouteStore.getState().jobStatus).not.toBe('FAILED');
  });

  it('resets the strike budget after a successful poll within the same job', async () => {
    // Keep jobStatus stable at PROCESSING so a PROCESSING success response does not
    // change status or re-run the effect — isolating the in-job success reset.
    useRouteStore.setState({ jobStatus: 'PROCESSING' });

    let calls = 0;
    vi.mocked(apiClient.getRouteStatus).mockImplementation(() => {
      calls += 1;
      if (calls === 3) {
        return Promise.resolve({ id: 'job-1', status: 'PROCESSING', created_at: '' });
      }
      return Promise.reject(new Error('network'));
    });

    renderHook(() => useRoutePolling('job-1'));
    await flush(); // strike 1
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); }); // strike 2
    expect(useRouteStore.getState().jobStatus).not.toBe('FAILED');

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); }); // success → reset
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); }); // strike 1
    // Without the success reset this would be strike 3 → FAILED
    expect(useRouteStore.getState().jobStatus).not.toBe('FAILED');

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); }); // strike 2
    expect(useRouteStore.getState().jobStatus).not.toBe('FAILED');
  });
});
