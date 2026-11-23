import type { ISODate, HistoryRange } from '@/types';

const toUtc = (d: ISODate): Date => new Date(`${d}T00:00:00Z`);
const toIso = (d: Date): ISODate => d.toISOString().slice(0, 10);

export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  const end = toUtc(to).getTime();
  for (let t = toUtc(from).getTime(); t <= end; t += 86_400_000) {
    out.push(toIso(new Date(t)));
  }
  return out;
}

function subtractMonths(date: ISODate, months: number): ISODate {
  const d = toUtc(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return toIso(d);
}

export function rangeStartDate(range: HistoryRange, today: ISODate, firstDate: ISODate): ISODate {
  let start: ISODate;
  switch (range) {
    case '1M':
      start = subtractMonths(today, 1);
      break;
    case '3M':
      start = subtractMonths(today, 3);
      break;
    case '1Y':
      start = subtractMonths(today, 12);
      break;
    case 'YTD':
      start = `${today.slice(0, 4)}-01-01`;
      break;
    case 'ALL':
      start = firstDate;
      break;
  }
  return start < firstDate ? firstDate : start;
}
