import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface Props {
  title: string;
  cols: string[];
  rows: (string | number)[][];
  emptyText?: string;
  onExport?: () => void;
  onRowClick?: (row: (string | number)[]) => void;
}

export const DataTable = ({
  title, cols, rows, emptyText = 'No data', onExport, onRowClick,
}: Props) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0">
      <CardTitle>{title}</CardTitle>
      {onExport && rows.length > 0 && (
        <Button variant="ghost" size="icon" onClick={onExport} title="Export CSV">
          <Download className="h-4 w-4" />
        </Button>
      )}
    </CardHeader>
    <CardContent>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>{cols.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow
                key={i}
                className={onRowClick ? 'cursor-pointer' : undefined}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
              >
                {r.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
);
