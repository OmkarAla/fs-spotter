export const dateInTimeZone = (timeZone: string, date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

export const timeInTimeZone = (timeZone: string, date = new Date()): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

export const timeZoneLabel = (timeZone: string, date = new Date()): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'short',
  })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value ?? timeZone;

export const addDays = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

export const monthMatrix = (year: number, month: number): Array<string | null> => {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leading = first.getUTCDay();
  const cells: Array<string | null> = Array(leading).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(
      `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};
