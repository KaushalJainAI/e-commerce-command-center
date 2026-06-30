import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

interface ChartCardProps {
  title: string;
  description?: string;
  /** Height of the chart body in px. */
  height?: number;
  loading?: boolean;
  error?: boolean;
  /** True when there is genuinely no data to plot. */
  empty?: boolean;
  emptyText?: string;
  onExport?: () => void;
  children: ReactNode;
}

/**
 * Standard wrapper for every visualization: title/description, an optional CSV
 * export button, and consistent loading / error / empty states so individual
 * charts stay focused on rendering data.
 */
export const ChartCard = ({
  title, description, height = 300, loading, error, empty,
  emptyText = 'No data for this range', onExport, children,
}: ChartCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-start justify-between space-y-0">
      <div>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </div>
      {onExport && (
        <Button variant="ghost" size="icon" onClick={onExport} title="Export CSV">
          <Download className="h-4 w-4" />
        </Button>
      )}
    </CardHeader>
    <CardContent>
      <div style={{ height }} className="flex items-center justify-center">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : empty ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="w-full h-full">{children}</div>
        )}
      </div>
    </CardContent>
  </Card>
);
