import { Link } from 'react-router-dom';
import { AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import type { BenchmarkResult, ISODate } from '@/types';

export interface QuantityMismatch {
  ticker: string;
  history: number;
  live: number;
}

interface Props {
  unpricedTickers: string[];
  mismatches: QuantityMismatch[];
  shortfall: BenchmarkResult['shortfall'];
  benchmarkStartsOn: ISODate | null;
  benchmarkShortLabel: string;
  accountCurrency: string;
}

const qtyFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });
const fmtQty = (q: number): string => qtyFormat.format(q);

/** Everything that makes the numbers above approximate, stated explicitly. */
export function PortfolioBenchmarkNotices({
  unpricedTickers,
  mismatches,
  shortfall,
  benchmarkStartsOn,
  benchmarkShortLabel,
  accountCurrency,
}: Props) {
  return (
    <div className="space-y-2">
      {unpricedTickers.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Some holdings couldn&apos;t be priced</AlertTitle>
          <AlertDescription>
            <p>
              {unpricedTickers.map((t, i) => (
                <span key={t}>
                  {i > 0 && ', '}
                  <Link to={`/stock/${t}`} className="underline underline-offset-2">
                    {t}
                  </Link>
                </span>
              ))}{' '}
              {unpricedTickers.length === 1 ? 'has' : 'have'} no Yahoo price history or exchange rate and{' '}
              {unpricedTickers.length === 1 ? 'is' : 'are'} valued at the last fill price, so &quot;My account&quot;
              is approximate. Set a Yahoo ticker on the stock&apos;s page, or check your{' '}
              <Link to="/settings" className="underline underline-offset-2">
                settings
              </Link>
              .
            </p>
          </AlertDescription>
        </Alert>
      )}

      {mismatches.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>History doesn&apos;t match live positions</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {mismatches.map((m) => (
                <li key={m.ticker}>
                  {m.ticker}: history {fmtQty(m.history)}, live {fmtQty(m.live)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {shortfall && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Benchmark account emptied on {shortfall.date}; {formatCurrency(shortfall.amount, accountCurrency)} of the
            withdrawal couldn&apos;t be covered
          </AlertDescription>
        </Alert>
      )}

      {benchmarkStartsOn && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {benchmarkShortLabel} price history starts on {benchmarkStartsOn}; earlier days use that first price.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
