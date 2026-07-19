import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getOrders, updateOrder, deleteOrder, cancelOrder, downloadOrderInvoice, downloadPackingSlip, uploadDeliveryBill, deleteDeliveryBill, viewDeliveryBill, Order, OrderStatus, OrderFilters, PaymentMethod } from '@/api/orders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Filter, Eye, Ban, FileDown, Upload, Receipt, MessageCircle, Printer, Download } from 'lucide-react';
import { exportOrdersCsv } from '@/api/bulk';
import { PageHelp } from '@/components/PageHelp';

const PAGE_SIZE = 12; // must match backend REST_FRAMEWORK PAGE_SIZE

// The backend runs in IST (TIME_ZONE='Asia/Kolkata') and filters orders on
// created_at__date in that timezone, so the date presets must be built from the
// IST calendar day — not the browser/UTC day, which would be off by one for
// admins working near midnight. `en-CA` formats as YYYY-MM-DD.
const IST_TODAY = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const istDateDaysAgo = (days: number) => {
  const [y, m, d] = IST_TODAY().split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().slice(0, 10);
};

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [savingTracking, setSavingTracking] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadingSlipId, setDownloadingSlipId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [uploadingBill, setUploadingBill] = useState(false);
  const billInputRef = useRef<HTMLInputElement>(null);
  // Dashboard action buttons deep-link here with e.g. /orders?status=pending —
  // seed the initial filters from the URL so the list arrives pre-filtered.
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<OrderFilters>(() => {
    const initial: OrderFilters = {};
    const status = searchParams.get('status');
    if (status) initial.status = status as OrderStatus;
    const search = searchParams.get('search');
    if (search) initial.search = search;
    return initial;
  });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Refetch from the server whenever the filters or page change. Filtering and
  // sorting run in the DB (not the browser), so results are correct across the
  // whole order history, not just the currently loaded page.
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await getOrders(filters, page);
      const data = response.data;
      if (Array.isArray(data)) {
        // Unpaginated fallback (shouldn't happen with server pagination on).
        setOrders(data);
        setTotalCount(data.length);
      } else {
        setOrders(data.results || []);
        setTotalCount(data.count || 0);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Changing a filter must send the user back to page 1, otherwise a narrower
  // result set could leave them stranded on a now-empty page.
  const updateFilters = (next: OrderFilters) => {
    setPage(1);
    setFilters(next);
  };

  const handleUpdateStatus = async (orderId: number, status: OrderStatus) => {
    try {
      const { data } = await updateOrder(orderId, { status });
      toast({ title: 'Success', description: 'Order status updated' });
      setViewingOrder((prev) => (prev && prev.id === orderId ? { ...prev, status: data.status } : prev));
      fetchOrders();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive',
      });
    }
  };

  // One-button workflow: each status has exactly one sensible next step, so the
  // admin never has to pick from a 7-option dropdown (that lives under
  // "Advanced" in the order dialog for corrections only).
  const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
    pending: 'confirmed',
    confirmed: 'processing',
    processing: 'shipped',
    shipped: 'delivering',
    delivering: 'delivered',
  };
  const NEXT_STEP_LABEL: Partial<Record<OrderStatus, string>> = {
    confirmed: 'Confirm order',
    processing: 'Start packing',
    shipped: 'Mark as shipped',
    delivering: 'Out for delivery',
    delivered: 'Mark as delivered',
  };
  const NEXT_STEP_SENTENCE: Partial<Record<OrderStatus, string>> = {
    confirmed: 'confirm this order? The customer will get an email that you are preparing it.',
    processing: 'start packing this order?',
    shipped: 'mark this order as shipped? The customer will be emailed.',
    delivering: 'mark this order as out for delivery?',
    delivered: 'mark this order as delivered? This completes the order.',
  };

  const handleAdvanceStatus = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    if (!confirm(`${order.order_number} — do you want to ${NEXT_STEP_SENTENCE[next] || `move this order to "${next}"?`}`)) return;
    await handleUpdateStatus(order.id, next);
  };

  // Click-to-WhatsApp: opens a chat with the customer, message pre-filled from
  // the order's current status. Pure link — no WhatsApp API involved.
  const waLink = (order: Order) => {
    const digits = (order.phone_number || '').replace(/\D/g, '');
    if (!digits) return null;
    const withCc = digits.length === 10 ? `91${digits}` : digits;
    const tracking = (order.tracking_number || '').trim();
    let text: string;
    if (order.status === 'shipped' || order.status === 'delivering') {
      text = `Hello! Your Nidhi Masala order ${order.order_number} is on its way.` +
        (tracking ? ` Tracking ID: ${tracking}.` : '') + ' Thank you for shopping with us!';
    } else if (order.status === 'delivered') {
      text = `Hello! Your Nidhi Masala order ${order.order_number} has been delivered. We hope you enjoy it!`;
    } else {
      text = `Hello! Thank you for your Nidhi Masala order ${order.order_number}. We are preparing it and will update you soon.`;
    }
    return `https://wa.me/${withCc}?text=${encodeURIComponent(text)}`;
  };

  const handleCancelOrder = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await cancelOrder(id);
      toast({ title: 'Success', description: 'Order cancelled' });
      fetchOrders();
    } catch (error) {
      // The axios interceptor normalizes the backend message onto `error.message`.
      toast({
        title: 'Error',
        description: error instanceof Error && error.message ? error.message : 'Failed to cancel order',
        variant: 'destructive',
      });
    }
  };

  // Soft-delete: moves the order to the Recycle Bin (recoverable), rather than
  // destroying it. Distinct from Cancel, which restocks and notifies.
  const handleDeleteOrder = async (id: number) => {
    if (!confirm('Move this order to the Recycle Bin? You can restore it later.')) return;
    try {
      await deleteOrder(id);
      toast({ title: 'Moved to Recycle Bin', description: 'The order can be restored from the Recycle Bin.' });
      fetchOrders();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error && error.message ? error.message : 'Failed to delete order',
        variant: 'destructive',
      });
    }
  };

  // Download the GST tax invoice / bill PDF for an order. Reuses the same
  // backend endpoint the storefront uses; staff access is enforced server-side.
  const handleDownloadInvoice = async (order: Order) => {
    try {
      setDownloadingId(order.id);
      await downloadOrderInvoice(order.id, order.order_number);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error && error.message ? error.message : 'Failed to download bill',
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Export the CURRENTLY FILTERED order list to CSV (the server applies the
  // same filters), so "export what I'm looking at" just works.
  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string | number> = {};
      if (filters.status) params.status = filters.status;
      if (filters.paymentMethod) params.payment_method = filters.paymentMethod;
      if (filters.minAmount != null) params.min_amount = filters.minAmount;
      if (filters.maxAmount != null) params.max_amount = filters.maxAmount;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      if (filters.sortBy) params.ordering = filters.sortBy;
      if (filters.search?.trim()) params.search = filters.search.trim();
      await exportOrdersCsv(params);
    } catch {
      toast({ title: 'Error', description: 'Failed to export orders', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPackingSlip = async (order: Order) => {
    try {
      setDownloadingSlipId(order.id);
      await downloadPackingSlip(order.id, order.order_number);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error && error.message ? error.message : 'Failed to download packing slip',
        variant: 'destructive',
      });
    } finally {
      setDownloadingSlipId(null);
    }
  };

  const openViewDialog = (order: Order) => {
    setViewingOrder(order);
    setTrackingInput(order.tracking_number || '');
    setDialogOpen(true);
  };

  // --- Delivery bill (admin-only) ---
  // Upload/replace the courier receipt for the order currently open in the
  // dialog. The file is stored privately and only ever streamed back to staff.
  const handleUploadBill = async (file: File) => {
    if (!viewingOrder) return;
    try {
      setUploadingBill(true);
      const { data } = await uploadDeliveryBill(viewingOrder.id, file);
      const updated: Order = {
        ...viewingOrder,
        has_delivery_bill: true,
        delivery_bill_uploaded_at: data.delivery_bill_uploaded_at,
      };
      setViewingOrder(updated);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      toast({ title: 'Uploaded', description: 'Delivery bill saved.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error && error.message ? error.message : 'Failed to upload delivery bill',
        variant: 'destructive',
      });
    } finally {
      setUploadingBill(false);
      if (billInputRef.current) billInputRef.current.value = '';
    }
  };

  const handleViewBill = async (order: Order) => {
    try {
      await viewDeliveryBill(order.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error && error.message ? error.message : 'Failed to open delivery bill',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBill = async () => {
    if (!viewingOrder) return;
    if (!confirm('Remove the uploaded delivery bill for this order?')) return;
    try {
      await deleteDeliveryBill(viewingOrder.id);
      const updated: Order = {
        ...viewingOrder,
        has_delivery_bill: false,
        delivery_bill_uploaded_at: null,
      };
      setViewingOrder(updated);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      toast({ title: 'Removed', description: 'Delivery bill deleted.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error && error.message ? error.message : 'Failed to remove delivery bill',
        variant: 'destructive',
      });
    }
  };

  const handleSaveTracking = async () => {
    if (!viewingOrder) return;
    const value = trackingInput.trim();
    if (value === (viewingOrder.tracking_number || '')) return;
    try {
      setSavingTracking(true);
      const { data } = await updateOrder(viewingOrder.id, { tracking_number: value });
      toast({
        title: 'Success',
        description: value ? 'Tracking number saved — customer notified' : 'Tracking number cleared',
      });
      setViewingOrder(data);
      fetchOrders();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save tracking number',
        variant: 'destructive',
      });
    } finally {
      setSavingTracking(false);
    }
  };

  const getStatusBadgeColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivering: 'bg-cyan-100 text-cyan-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Manage customer orders</p>
      </div>
      <PageHelp>
        Every order is here. Use the green "Next step" button on each order to move
        it forward (Confirm → Pack → Ship → Deliver). Tap an order to see its
        items, print a packing slip, or message the customer on WhatsApp.
      </PageHelp>
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search order # / customer…"
            className="w-56"
            value={filters.search || ''}
            onChange={(e) => updateFilters({ ...filters, search: e.target.value || undefined })}
          />
          <Button variant="outline" onClick={() => setFilterOpen(true)}>
            <Filter className="mr-2 h-4 w-4" />
            Filter & Sort
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Preparing…' : 'Export'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customer_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{order.items?.length || 0} items</TableCell>
                    <TableCell className="font-medium">₹{parseFloat(String(order.total || 0)).toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{order.payment_method || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeColor(order.status)}`}>
                          {order.status}
                        </span>
                        {NEXT_STATUS[order.status] && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleAdvanceStatus(order)}
                          >
                            {NEXT_STEP_LABEL[NEXT_STATUS[order.status]!]} →
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openViewDialog(order)} title="View order">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadInvoice(order)}
                        disabled={downloadingId === order.id}
                        title="Download bill (PDF tax invoice)"
                      >
                        <FileDown className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={order.status === 'cancelled' || order.status === 'delivered'}
                        title="Cancel order (restocks & notifies customer)"
                      >
                        <Ban className="h-4 w-4 text-amber-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteOrder(order.id)}
                        title="Move to Recycle Bin"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Server-side pagination — filters/sort already applied in the DB */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} • {totalCount} order{totalCount === 1 ? '' : 's'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={loading || page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter & Sort Orders</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select
                value={filters.status || ''}
                onValueChange={(value) => updateFilters({ ...filters, status: value as OrderStatus || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivering">Delivering</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select
                value={filters.paymentMethod || ''}
                onValueChange={(value) => updateFilters({ ...filters, paymentMethod: (value as PaymentMethod) || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="COD">COD</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sort By</Label>
              <Select value={filters.sortBy || ''} onValueChange={(value) => updateFilters({ ...filters, sortBy: value as any || undefined })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sorting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="highestTotal">Highest Total</SelectItem>
                  <SelectItem value="lowestTotal">Lowest Total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Order Date</Label>
              <div className="flex flex-wrap gap-2 mt-1 mb-2">
                {([
                  { label: 'Today', days: 0 },
                  { label: 'Last 7 days', days: 6 },
                  { label: 'Last 30 days', days: 29 },
                ] as const).map(({ label, days }) => {
                  const to = IST_TODAY();
                  const from = istDateDaysAgo(days);
                  const active = filters.dateFrom === from && filters.dateTo === to;
                  return (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      onClick={() => updateFilters({ ...filters, dateFrom: from, dateTo: to })}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => updateFilters({ ...filters, dateFrom: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => updateFilters({ ...filters, dateTo: e.target.value || undefined })}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Min Amount</Label>
                <Input
                  type="number"
                  placeholder="₹0"
                  value={filters.minAmount || ''}
                  onChange={(e) => updateFilters({ ...filters, minAmount: parseFloat(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label>Max Amount</Label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={filters.maxAmount || ''}
                  onChange={(e) => updateFilters({ ...filters, maxAmount: parseFloat(e.target.value) || undefined })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { updateFilters({}); setFilterOpen(false); }}>
              Clear Filters
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {viewingOrder?.order_number} • {new Date(viewingOrder?.created_at || '').toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              })} at {new Date(viewingOrder?.created_at || '').toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </DialogDescription>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className={`inline-block px-2 py-1 rounded text-sm ${getStatusBadgeColor(viewingOrder.status)}`}>
                    {viewingOrder.status}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-medium">{viewingOrder.payment_method || 'N/A'}</p>
                </div>
              </div>

              {/* The one obvious next action for this order. */}
              <div className="flex flex-wrap gap-2">
                {NEXT_STATUS[viewingOrder.status] && (
                  <Button onClick={() => handleAdvanceStatus(viewingOrder)}>
                    {NEXT_STEP_LABEL[NEXT_STATUS[viewingOrder.status]!]} →
                  </Button>
                )}
                {waLink(viewingOrder) && (
                  <Button asChild variant="outline" className="text-green-700 border-green-300">
                    <a href={waLink(viewingOrder)!} target="_blank" rel="noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp customer
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPackingSlip(viewingOrder)}
                  disabled={downloadingSlipId === viewingOrder.id}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {downloadingSlipId === viewingOrder.id ? 'Preparing…' : 'Packing slip'}
                </Button>
              </div>

              {/* Rare corrections only — hidden so the everyday flow stays one button. */}
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Advanced: set status manually
                </summary>
                <div className="mt-2 max-w-xs">
                  <Select
                    value={viewingOrder.status}
                    onValueChange={(value: OrderStatus) => handleUpdateStatus(viewingOrder.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivering">Delivering</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use only to correct a mistake. To cancel, use the cancel button in the list.
                  </p>
                </div>
              </details>

              <div>
                <Label className="text-muted-foreground">Shipping Address</Label>
                <p className="font-medium">{viewingOrder.shipping_address}</p>
              </div>
              
              {viewingOrder.phone_number && (
                <div>
                  <Label className="text-muted-foreground">Phone Number</Label>
                  <p className="font-medium">{viewingOrder.phone_number}</p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Tracking Number</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Enter courier tracking number"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                  />
                  <Button
                    onClick={handleSaveTracking}
                    disabled={savingTracking || trackingInput.trim() === (viewingOrder.tracking_number || '')}
                  >
                    {savingTracking ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Saving a tracking number emails the customer that their order has shipped.
                </p>
              </div>

              {/* Delivery bill — admin-only. Stored privately; never shown to the customer. */}
              <div>
                <Label className="text-muted-foreground">Delivery Bill (admin only)</Label>
                <input
                  ref={billInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadBill(file);
                  }}
                />
                <div className="flex flex-wrap gap-2 mt-1">
                  {viewingOrder.has_delivery_bill ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleViewBill(viewingOrder)}>
                        <Receipt className="mr-2 h-4 w-4" />
                        View Bill
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => billInputRef.current?.click()}
                        disabled={uploadingBill}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploadingBill ? 'Uploading…' : 'Replace'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDeleteBill} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => billInputRef.current?.click()}
                      disabled={uploadingBill}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingBill ? 'Uploading…' : 'Upload Bill'}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {viewingOrder.has_delivery_bill && viewingOrder.delivery_bill_uploaded_at
                    ? `Uploaded ${new Date(viewingOrder.delivery_bill_uploaded_at).toLocaleString('en-IN')}. `
                    : ''}
                  PDF, JPG, PNG or WebP (max 10 MB). Only visible to admins.
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground">Order Items</Label>
                <div className="mt-2 border rounded-lg divide-y">
                  {viewingOrder.items?.map((item) => (
                    <div key={item.id} className="p-3 flex justify-between">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">₹{parseFloat(String(item.total || 0)).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{parseFloat(String(viewingOrder.subtotal || 0)).toFixed(2)}</span>
                </div>
                {viewingOrder.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₹{parseFloat(String(viewingOrder.discount || 0)).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>₹{parseFloat(String(viewingOrder.tax || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>₹{parseFloat(String(viewingOrder.total || 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {viewingOrder && (
              <Button
                variant="outline"
                onClick={() => handleDownloadInvoice(viewingOrder)}
                disabled={downloadingId === viewingOrder.id}
              >
                <FileDown className="mr-2 h-4 w-4" />
                {downloadingId === viewingOrder.id ? 'Downloading…' : 'Download Bill'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
