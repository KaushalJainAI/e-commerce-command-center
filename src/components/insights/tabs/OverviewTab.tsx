import { useOverview } from '@/hooks/useInsights';
import type { DateRange } from '@/api/analytics';
import { KpiCard } from '../KpiCard';
import { ChartCard } from '../ChartCard';
import { DataTable } from '../DataTable';
import { TimeSeriesChart } from '../charts/TimeSeriesChart';
import { FunnelChart } from '../charts/FunnelChart';
import { DonutChart } from '../charts/DonutChart';
import { inr, num } from '../format';

export const OverviewTab = ({ range }: { range: DateRange }) => {
  const { data, isLoading, isError } = useOverview(range);
  const k = data?.kpis;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard title="Revenue" value={inr(k?.revenue ?? 0)} delta={k?.revenue_delta_pct} hint="vs prev" />
        <KpiCard title="Orders" value={num(k?.orders ?? 0)} delta={k?.orders_delta_pct} hint="vs prev" />
        <KpiCard title="Avg Order Value" value={inr(k?.aov ?? 0)} />
        <KpiCard title="Repeat Rate" value={`${k?.repeat_rate_pct ?? 0}%`} />
        <KpiCard title="Anon Page Views" value={num(k?.anon_page_views ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue & orders" loading={isLoading} error={isError}
          empty={!isLoading && (data?.revenue_series.length ?? 0) === 0}>
          <TimeSeriesChart data={data?.revenue_series ?? []} />
        </ChartCard>
        <ChartCard title="Conversion funnel" description="Logged-in journey"
          loading={isLoading} error={isError}
          empty={!isLoading && (data?.funnel.length ?? 0) === 0}>
          <FunnelChart stages={data?.funnel ?? []} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DataTable title="Top products"
          cols={['Product', 'Revenue']}
          rows={(data?.top_products ?? []).map((p) => [p.name, inr(p.revenue)])} />
        <ChartCard title="Anonymous by device" height={260}
          loading={isLoading} error={isError}
          empty={!isLoading && (data?.anon_by_device.length ?? 0) === 0}>
          <DonutChart data={(data?.anon_by_device ?? []).map((d) => ({ label: d.device, value: d.count }))} />
        </ChartCard>
        <ChartCard title="Anonymous by source" height={260}
          loading={isLoading} error={isError}
          empty={!isLoading && (data?.anon_by_source.length ?? 0) === 0}>
          <DonutChart data={(data?.anon_by_source ?? []).map((d) => ({ label: d.source, value: d.count }))} />
        </ChartCard>
      </div>
    </div>
  );
};
