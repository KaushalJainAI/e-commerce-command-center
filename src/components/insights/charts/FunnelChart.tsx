import { num, pct } from '../format';

export interface Stage {
  stage: string;
  count: number;
  pct_of_top: number | null;
  step_conversion_pct: number | null;
}

const LABELS: Record<string, string> = {
  view: 'Product views',
  add_to_cart: 'Added to cart',
  checkout_started: 'Checkout started',
  purchase: 'Purchased',
  page_view: 'Page views',
  product_view: 'Product views',
  checkout_completed: 'Checkout completed',
};

interface Props {
  stages: Stage[];
  color?: string;
}

/**
 * Funnel as proportional bars (width = % of top stage) with absolute counts and
 * step-conversion between stages. Clearer than a generic bar chart for an
 * ordered drop-off, and renders without a chart lib so labels never clip.
 */
export const FunnelChart = ({ stages, color = '#6366f1' }: Props) => (
  <div className="flex h-full flex-col justify-center gap-3 py-2">
    {stages.map((s, i) => {
      const width = s.pct_of_top ?? 0;
      return (
        <div key={s.stage}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">{LABELS[s.stage] ?? s.stage}</span>
            <span className="text-muted-foreground">
              {num(s.count)}
              {s.pct_of_top !== null && <span className="ml-2">{pct(s.pct_of_top)}</span>}
            </span>
          </div>
          <div className="h-7 w-full rounded bg-muted">
            <div
              className="flex h-7 items-center rounded px-2 text-xs font-medium text-white transition-all"
              style={{ width: `${Math.max(width, 3)}%`, backgroundColor: color }}
            />
          </div>
          {i > 0 && s.step_conversion_pct !== null && (
            <div className="mt-0.5 text-right text-xs text-muted-foreground">
              ↳ {pct(s.step_conversion_pct)} from previous
            </div>
          )}
        </div>
      );
    })}
  </div>
);
