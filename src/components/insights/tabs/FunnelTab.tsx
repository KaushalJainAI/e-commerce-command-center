import { useFunnel } from '@/hooks/useInsights';
import type { DateRange } from '@/api/analytics';
import { ChartCard } from '../ChartCard';
import { DataTable } from '../DataTable';
import { FunnelChart } from '../charts/FunnelChart';
import { useCsvExport } from '@/hooks/useCsvExport';
import { num, pct } from '../format';

export const FunnelTab = ({ range }: { range: DateRange }) => {
  const { data, isLoading, isError } = useFunnel(range);
  const exportCsv = useCsvExport();

  return (
    <div className="space-y-4">
      <ChartCard title="Conversion funnel (logged-in)"
        description="Stage counts and drop-off"
        height={360} loading={isLoading} error={isError}
        empty={!isLoading && (data?.stages.length ?? 0) === 0}>
        <FunnelChart stages={data?.stages ?? []} />
      </ChartCard>

      <DataTable title="Step conversion"
        cols={['Stage', 'Count', '% of top', 'Step %']}
        rows={(data?.stages ?? []).map((s) => [
          s.stage, num(s.count), pct(s.pct_of_top), pct(s.step_conversion_pct),
        ])}
        onExport={() => exportCsv('funnel', ['Stage', 'Count', 'PctOfTop', 'StepPct'],
          (data?.stages ?? []).map((s) => [s.stage, s.count, s.pct_of_top ?? '', s.step_conversion_pct ?? '']))} />
    </div>
  );
};
