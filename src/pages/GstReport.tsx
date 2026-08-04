import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getHsnCoverage, getHsnSummary, exportHsnSummaryCsv,
} from '@/api/gst';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, AlertTriangle, Loader2 } from 'lucide-react';
import { PageHelp } from '@/components/PageHelp';
import { TableSkeleton } from '@/components/TableSkeleton';

/** Inclusive [from, to] for the PREVIOUS calendar month — the period GSTR-1 is
 *  filed for. Matches the backend's default so the screen and a bare API call
 *  show the same thing. */
const lastMonth = () => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: iso(start), to: iso(end) };
};

const money = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const GstReport = () => {
  const defaults = lastMonth();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  // The applied range, separate from the inputs, so typing a date doesn't fire
  // a query per keystroke on what is a table-scanning report.
  const [range, setRange] = useState(defaults);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['hsn-summary', range.from, range.to],
    queryFn: () => getHsnSummary(range.from, range.to),
  });
  const { data: coverage } = useQuery({
    queryKey: ['hsn-coverage'],
    queryFn: getHsnCoverage,
  });

  const download = async () => {
    setDownloading(true);
    try {
      await exportHsnSummaryCsv(range.from, range.to);
    } catch {
      toast({ title: 'Could not download the CSV', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">GST — HSN summary</h1>
          <p className="text-sm text-muted-foreground">
            HSN-wise summary of outward supplies, for GSTR-1 Table 12.
          </p>
        </div>
        <Button onClick={download} disabled={downloading}>
          {downloading
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Download className="mr-2 h-4 w-4" />}
          Download CSV
        </Button>
      </div>

      <PageHelp>
        <p>
          For every HSN code you sold in the period: how many packs, the value
          net of GST, and the GST on it. That is what Table 12 of GSTR-1 asks
          for, and it cannot be worked out from the tax rate alone — 5% covers
          many different headings.
        </p>
        <p>
          Figures come from the codes stored on each order line at the time of
          sale, so re-classifying a product today never changes a period you
          have already filed. <strong>Cancelled and deleted orders are
          excluded.</strong> Refunds are shown separately and are{' '}
          <strong>not</strong> subtracted — a refund is a credit note and
          belongs in Table 9B, not here.
        </p>
        <p>
          Every GST column here is tax <strong>collected from customers</strong>{' '}
          on your outward supplies. It is not what you pay: that is this less
          the input credit on everything you bought, which this system doesn't
          track. Take these numbers into your accounting software and settle the
          liability there.
        </p>
      </PageHelp>

      {/* Work list first: a hole in the classification makes every number below
          incomplete, so it must not sit under the table where it can be missed. */}
      {!!coverage?.unclassified_count && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {coverage.unclassified_count} product
              {coverage.unclassified_count === 1 ? '' : 's'} have no HSN code
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="text-muted-foreground">
              Their sales appear below under "NOT CLASSIFIED". Set a code on each
              from the product form.
            </p>
            <p>{coverage.unclassified.map(p => p.name).join(', ')}</p>
          </CardContent>
        </Card>
      )}

      {!!coverage?.rate_mismatch_count && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {coverage.rate_mismatch_count} product
              {coverage.rate_mismatch_count === 1 ? '' : 's'} charge a rate that
              differs from their HSN code
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p className="text-muted-foreground">
              Published rates as of {coverage.rates_as_of}. This can be
              deliberate — check each one and change the rate on the product form
              if it isn't.
            </p>
            <ul className="space-y-1">
              {coverage.rate_mismatch.map(p => (
                <li key={p.id}>
                  <strong>{p.name}</strong> — charging {p.tax_rate}%, but{' '}
                  {p.hsn_code} ({p.description}) is {p.expected_rate}%.
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={from}
                     onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={to}
                     onChange={e => setTo(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => setRange({ from, to })}>
              Show
            </Button>
            {summary && (
              <p className="text-sm text-muted-foreground pb-2">
                {summary.order_count} order{summary.order_count === 1 ? '' : 's'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <TableSkeleton />
          ) : !summary?.rows.length ? (
            <p className="text-sm text-muted-foreground">
              No supplies in this period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HSN / SAC</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">UQC</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Taxable value</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.rows.map(row => (
                  <TableRow
                    key={`${row.hsn_code}-${row.rate}`}
                    className={row.is_unclassified ? 'bg-amber-500/10' : undefined}
                  >
                    <TableCell className="font-mono">
                      {row.hsn_code || 'NOT CLASSIFIED'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.description}
                    </TableCell>
                    <TableCell className="text-center">{row.uqc}</TableCell>
                    <TableCell className="text-right">
                      {row.is_service ? '—' : row.quantity}
                    </TableCell>
                    <TableCell className="text-right">{row.rate}%</TableCell>
                    <TableCell className="text-right">
                      {money(row.taxable_value)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(row.tax_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(row.total_value)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">
                    {summary.totals.quantity}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right">
                    {money(summary.totals.taxable_value)}
                  </TableCell>
                  <TableCell className="text-right">
                    {money(summary.totals.tax_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {money(summary.totals.total_value)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}

          {!!summary?.refunded_in_period.amount && (
            <p className="text-xs text-muted-foreground mt-4">
              Refunds recorded in this period (credit notes — reported in Table
              9B, <strong>not</strong> netted off above):{' '}
              {money(summary.refunded_in_period.amount)}, including GST of{' '}
              {money(summary.refunded_in_period.tax)}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GstReport;
