import React, { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  dateInTimeZone,
  monthMatrix,
  timeInTimeZone,
  timeZoneLabel,
} from '../utils/datetime';

interface DeparturePickerProps {
  timeZone: string | null;
  date: string;
  time: string;
  onChange: (date: string, time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, '0'),
);
const MINUTES = ['00', '15', '30', '45'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const nextQuarterHour = (timeZone: string): { date: string; time: string } => {
  const today = dateInTimeZone(timeZone);
  const [hour, minute] = timeInTimeZone(timeZone).split(':').map(Number);
  let totalMinutes = Math.ceil((hour * 60 + minute + 1) / 15) * 15;
  let date = today;

  if (totalMinutes >= 24 * 60) {
    totalMinutes = 0;
    date = addDays(today, 1);
  }

  const nextHour = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const nextMinute = String(totalMinutes % 60).padStart(2, '0');
  return { date, time: `${nextHour}:${nextMinute}` };
};

export const DeparturePicker: React.FC<DeparturePickerProps> = ({
  timeZone,
  date,
  time,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const today = timeZone ? dateInTimeZone(timeZone) : '';
  const maxDate = today ? addDays(today, 14) : '';
  const initial = date || today;
  const [viewYear, setViewYear] = useState(() =>
    Number(initial.slice(0, 4) || '0'),
  );
  const [viewMonth, setViewMonth] = useState(() =>
    Number(initial.slice(5, 7) || '1') - 1,
  );

  useEffect(() => {
    if (!timeZone || (date && time)) return;
    const next = nextQuarterHour(timeZone);
    onChange(next.date, next.time);
  }, [timeZone, date, time, onChange]);

  useEffect(() => {
    if (!date) return;
    setViewYear(Number(date.slice(0, 4)));
    setViewMonth(Number(date.slice(5, 7)) - 1);
  }, [date]);

  const cells = useMemo(
    () => monthMatrix(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  if (!timeZone) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#F8FAFC]">Departure</span>
        <p className="text-sm text-slate-500">Select an origin first.</p>
      </div>
    );
  }

  const monthLabel = new Date(Date.UTC(viewYear, viewMonth, 1)).toLocaleString(
    'en-US',
    { month: 'long', year: 'numeric', timeZone: 'UTC' },
  );

  const moveMonth = (delta: number) => {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  };

  const chooseDate = (isoDate: string) => {
    onChange(isoDate, time);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[#F8FAFC]">Departure</span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Choose departure date"
          onClick={() => setOpen((value) => !value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-[#F8FAFC]"
        >
          {date || 'Select date'}
        </button>
        <select
          aria-label="Departure hour"
          value={time ? time.slice(0, 2) : ''}
          onChange={(event) =>
            onChange(date, `${event.target.value}:${time.slice(3, 5) || '00'}`)
          }
          className="rounded-md border border-slate-700 bg-slate-900 p-2 text-[#F8FAFC]"
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>
        <select
          aria-label="Departure minute"
          value={time ? time.slice(3, 5) : ''}
          onChange={(event) =>
            onChange(date, `${time.slice(0, 2) || '00'}:${event.target.value}`)
          }
          className="rounded-md border border-slate-700 bg-slate-900 p-2 text-[#F8FAFC]"
        >
          {MINUTES.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">
          {timeZoneLabel(timeZone)}
        </span>
      </div>

      {open && (
        <div className="w-72 rounded-md border border-slate-700 bg-slate-950 p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => moveMonth(-1)}
              className="px-2 text-slate-300"
            >
              &lt;
            </button>
            <span className="text-sm font-medium text-[#F8FAFC]">
              {monthLabel}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => moveMonth(1)}
              className="px-2 text-slate-300"
            >
              &gt;
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((isoDate, index) =>
              isoDate ? (
                <button
                  type="button"
                  key={isoDate}
                  aria-label={isoDate}
                  disabled={isoDate < today || isoDate > maxDate}
                  aria-pressed={isoDate === date}
                  onClick={() => chooseDate(isoDate)}
                  className="rounded p-1 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
                >
                  {Number(isoDate.slice(8, 10))}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
};
