import { useEffect, useState } from 'react';
import { getOrders, updateOrder, deleteOrder, cancelOrder, Order, OrderStatus, OrderFilters, PaymentMethod } from '@/api/orders';
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
import { Edit, Trash2, Filter, Eye, Ban } from 'lucide-react';

const PAGE_SIZE = 12; // must match backend REST_FRAMEWORK PAGE_SIZE

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [savingTracking, setSavingTracking] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({});
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
      await updateOrder(orderId, { status });
      toast({ title: 'Success', description: 'Order status updated' });
      fetchOrders();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive',
      });
    }
  };

  const handleCancelOrder = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await cancelOrder(id);
      toast({ title: 'Success', description: 'Order cancelled' });
      fetchOrders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to cancel order',
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete order',
        variant: 'destructive',
      });
    }
  };

  const openViewDialog = (order: Order) => {
    setViewingOrder(order);
    setTrackingInput(order.tracking_number || '');
    setDialogOpen(true);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage customer orders</p>
        </div>
        <div className="flex items-center gap-2">
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
                      <Select
                        value={order.status}
                        onValueChange={(value: OrderStatus) => handleUpdateStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeColor(order.status)}`}>
                            {order.status}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivering">Delivering</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openViewDialog(order)} title="View order">
                        <Eye className="h-4 w-4" />
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
