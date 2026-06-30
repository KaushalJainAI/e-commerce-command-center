import { useSales } from '@/hooks/useInsights';
import type { DateRange } from '@/api/analytics';
import { KpiCard } from '../KpiCard';
import { ChartCard } from '../ChartCard';
import { DataTable } from '../DataTable';
import { TimeSeriesChart } from '../charts/TimeSeriesChart';
import { useCsvExport } from '@/hooks/useCsvExport';
import { inr, num } from '../format';

interface Props {
  range: DateRange;
  previousRange: DateRange;
  compare: boolean;
}

export const SalesTab = ({ range, previousRange, compare }: Props) => {
  const { data, isLoading, isError } = useSales(range);
  const prev = useSales(previousRange, compare);
  const exportCsv = useCsvExport();
  const k = data?.kpis;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Revenue" value={inr(k?.revenue ?? 0)} delta={k?.revenue_delta_pct} hint="vs prev" />
        <KpiCard title="Orders" value={num(k?.orders ?? 0)} delta={k?.orders_delta_pct} hint="vs prev" />
        <KpiCard title="Avg Order Value" value={inr(k?.aov ?? 0)} />
        <KpiCard title="Coupon Orders" value={num(k?.coupon_orders ?? 0)} hint={inr(k?.coupon_discount ?? 0) + ' off'} />
      </div>

      <ChartCard title="Revenue & orders over time"
        description={compare ? 'Dashed line = previous period' : undefined}
        height={340} loading={isLoading} error={isError}
        empty={!isLoading && (data?.series.length ?? 0) === 0}
        onExport={() => exportCsv('sales', ['Bucket', 'Revenue', 'Orders', 'Units'],
          (data?.series ?? []).map((s) => [s.bucket, s.revenue, s.orders, s.units]))}>
        <TimeSeriesChart data={data?.series ?? []} compareData={compare ? prev.data?.series : undefined} />
      </ChartCard>

      <div className="grid gap-4 md:grid-cols-2">
        <DataTable title="Top products"
          cols={['Product', 'Units', 'Revenue']}
          rows={(data?.top_products ?? []).map((p) => [p.name, num(p.units), inr(p.revenue)])}
          onExport={() => exportCsv('top_products', ['Product', 'Units', 'Revenue'],
            (data?.top_products ?? []).map((p) => [p.name, p.units, p.revenue]))} />
        <DataTable title="Top categories"
          cols={['Category', 'Units', 'Revenue']}
          rows={(data?.top_categories ?? []).map((c) => [c.name, num(c.units), inr(c.revenue)])}
          onExport={() => exportCsv('top_categories', ['Category', 'Units', 'Revenue'],
            (data?.top_categories ?? []).map((c) => [c.name, c.units, c.revenue]))} />
      </div>
    </div>
  );
};
