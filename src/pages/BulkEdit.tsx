import { useEffect, useMemo, useState } from 'react';
import {
  getBulkProducts, applyBulkChanges, importProductsCsv, exportProductsCsv,
  BulkProductRow, BulkChange, ImportPreview,
} from '@/api/bulk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, Save, Download, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';

// A single field edit keyed by product id.
type Edits = Record<number, { price?: string; discount_price?: string; stock?: string }>;

const BulkEdit = () => {
  const [rows, setRows] = useState<BulkProductRow[]>([]);
  const [edits, setEdits] = useState<Edits>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { toast } = useToast();

  // Import wizard state
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const fetchRows = async () => {
    try {
      const res = await getBulkProducts();
      setRows(res.data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load products', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.name.toLowerCase().includes(q) || r.category_name.toLowerCase().includes(q));
  }, [rows, search]);

  const setEdit = (id: number, field: 'price' | 'discount_price' | 'stock', value: string) => {
    setEdits(prev => {
      const row = rows.find(r => r.id === id)!;
      const original = String(field === 'stock' ? row.stock : row[field] ?? '');
      const next = { ...prev, [id]: { ...prev[id], [field]: value } };
      // Drop the edit if it matches the original again (no longer dirty).
      if (value === original) {
        delete next[id][field];
        if (Object.keys(next[id]).length === 0) delete next[id];
      }
      return next;
    });
  };

  const isDirty = (id: number, field: 'price' | 'discount_price' | 'stock') =>
    edits[id]?.[field] !== undefined;

  const cellValue = (row: BulkProductRow, field: 'price' | 'discount_price' | 'stock') => {
    const edited = edits[row.id]?.[field];
    if (edited !== undefined) return edited;
    return String(field === 'stock' ? row.stock : row[field] ?? '');
  };

  // A plain-language description of every pending change, for the review step.
  const changeList = useMemo(() => {
    const list: { name: string; description: string }[] = [];
    for (const [idStr, fields] of Object.entries(edits)) {
      const id = Number(idStr);
      const row = rows.find(r => r.id === id);
      if (!row) continue;
      const parts: string[] = [];
      if (fields.price !== undefined) parts.push(`price ₹${row.price || 0} → ₹${fields.price}`);
      if (fields.discount_price !== undefined)
        parts.push(`discount ${row.discount_price ? `₹${row.discount_price}` : 'none'} → ${fields.discount_price ? `₹${fields.discount_price}` : 'none'}`);
      if (fields.stock !== undefined) parts.push(`stock ${row.stock} → ${fields.stock}`);
      if (parts.length) list.push({ name: row.name, description: parts.join(', ') });
    }
    return list;
  }, [edits, rows]);

  const applyEdits = async () => {
    const changes: BulkChange[] = Object.entries(edits).map(([id, fields]) => ({
      id: Number(id),
      ...fields,
    }));
    if (changes.length === 0) return;
    setSaving(true);
    try {
      const res = await applyBulkChanges(changes);
      toast({ title: 'Saved', description: `${res.data.applied} product${res.data.applied === 1 ? '' : 's'} updated.` });
      setEdits({});
      setReviewOpen(false);
      fetchRows();
    } catch (error: unknown) {
      // The apply endpoint returns per-row errors on 400.
      const errs = (error as { response?: { data?: { errors?: { error: string }[] } } })?.response?.data?.errors;
      const msg = errs?.length ? errs.map(e => e.error).join(' ') : 'Could not save changes.';
      toast({ title: 'Nothing saved', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ---- Import wizard ----
  const openImport = () => { setPreview(null); setImportOpen(true); };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const res = await importProductsCsv(file);
      setPreview(res.data);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Could not read the file.';
      toast({ title: 'Import problem', description: msg, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const applyImport = async () => {
    if (!preview) return;
    const changes: BulkChange[] = preview.rows
      .filter(r => r.id && !r.error && Object.keys(r.changes).length)
      .map(r => ({ id: r.id as number, ...r.changes }));
    if (changes.length === 0) return;
    setImporting(true);
    try {
      const res = await applyBulkChanges(changes);
      toast({ title: 'Import done', description: `${res.data.applied} product${res.data.applied === 1 ? '' : 's'} updated from your file.` });
      setImportOpen(false);
      setPreview(null);
      fetchRows();
    } catch {
      toast({ title: 'Error', description: 'Could not apply the imported changes.', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
  }

  const dirtyCount = Object.keys(edits).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Price &amp; Stock</h1>
          <p className="text-muted-foreground">
            Change many prices or stock levels at once. Edit the boxes, then review and save.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportProductsCsv()}>
            <Download className="mr-2 h-4 w-4" /> Export to Excel
          </Button>
          <Button variant="outline" onClick={openImport}>
            <Upload className="mr-2 h-4 w-4" /> Import from Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Find a product…" className="pl-8"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button disabled={dirtyCount === 0} onClick={() => setReviewOpen(true)}>
              <Save className="mr-2 h-4 w-4" />
              Review &amp; save{dirtyCount ? ` (${dirtyCount})` : ''}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-32">Price (₹)</TableHead>
                <TableHead className="w-32">Discount (₹)</TableHead>
                <TableHead className="w-28">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.category_name || '—'}</TableCell>
                  <TableCell>
                    <Input
                      type="number" inputMode="decimal"
                      className={isDirty(row.id, 'price') ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : ''}
                      value={cellValue(row, 'price')}
                      onChange={(e) => setEdit(row.id, 'price', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" inputMode="decimal" placeholder="none"
                      className={isDirty(row.id, 'discount_price') ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : ''}
                      value={cellValue(row, 'discount_price')}
                      onChange={(e) => setEdit(row.id, 'discount_price', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" inputMode="numeric"
                      className={isDirty(row.id, 'stock') ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : ''}
                      value={cellValue(row, 'stock')}
                      onChange={(e) => setEdit(row.id, 'stock', e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review step */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review your changes</DialogTitle>
            <DialogDescription>
              This will change {changeList.length} product{changeList.length === 1 ? '' : 's'}. Check the list, then save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {changeList.map((c, i) => (
              <div key={i} className="rounded border p-2 text-sm">
                <span className="font-medium">{c.name}</span>: {c.description}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Keep editing</Button>
            <Button onClick={applyEdits} disabled={saving}>
              {saving ? 'Saving…' : `Save ${changeList.length} change${changeList.length === 1 ? '' : 's'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import wizard */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from Excel</DialogTitle>
            <DialogDescription>
              Upload a CSV file with a <b>name</b> column plus any of <b>price</b>, <b>discount_price</b>, <b>stock</b>.
              Tip: use "Export to Excel" first to get the right format.
            </DialogDescription>
          </DialogHeader>

          {!preview ? (
            <div className="space-y-3">
              <Input type="file" accept=".csv,text/csv"
                onChange={(e) => handleFile(e.target.files?.[0])} disabled={importing} />
              {importing && <p className="text-sm text-muted-foreground">Reading your file…</p>}
              <p className="text-xs text-muted-foreground">
                In Excel: File → Save As → choose "CSV (Comma delimited)".
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> {preview.ok_count} ready
                </span>
                {preview.error_count > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-4 w-4" /> {preview.error_count} with problems (skipped)
                  </span>
                )}
              </div>
              <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                {preview.rows.map((r, i) => (
                  <div key={i} className={`rounded border p-2 text-sm ${r.error ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : ''}`}>
                    <span className="font-medium">{r.name}</span>
                    {r.error
                      ? <span className="text-amber-700"> — {r.error}</span>
                      : <span className="text-muted-foreground"> — {Object.entries(r.changes).map(([k, v]) => `${k.replace('_', ' ')}: ${v || 'none'}`).join(', ')}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setPreview(null); }}>Cancel</Button>
            {preview && (
              <Button onClick={applyImport} disabled={importing || preview.ok_count === 0}>
                {importing ? 'Applying…' : `Apply ${preview.ok_count} change${preview.ok_count === 1 ? '' : 's'}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkEdit;
