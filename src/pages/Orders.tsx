import { useEffect, useState } from 'react';
import { getOrders, updateOrder, deleteOrder, cancelOrder, Order, OrderStatus, OrderFilters } from '@/api/orders';
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
import { Edit, Trash2, Filter, Eye } from 'lucide-react';

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [filters, setFilters] = useState<OrderFilters>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, filters]);

  const fetchOrders = async () => {
    try {
      const response = await getOrders();
      // Handle both array and paginated response
      const ordersData = Array.isArray(response.data) ? response.data : (response.data as any).results || [];
      setOrders(ordersData);
      setFilteredOrders(ordersData);
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

  const applyFilters = () => {
    let filtered = [...orders];

    if (filters.status) {
      filtered = filtered.filter(o => o.status === filters.status);
    }
    if (filters.paymentMethod) {
      filtered = filtered.filter(o => o.payment_method === filters.paymentMethod);
    }
    if (filters.minAmount) {
      filtered = filtered.filter(o => o.total >= (filters.minAmount || 0));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(o => o.total <= (filters.maxAmount || Infinity));
    }

    // Sorting
    if (filters.sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (filters.sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (filters.sortBy === 'highestTotal') {
      filtered.sort((a, b) => b.total - a.total);
    } else if (filters.sortBy === 'lowestTotal') {
      filtered.sort((a, b) => a.total - b.total);
    }

    setFilteredOrders(filtered);
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

  const openViewDialog = (order: Order) => {
    setViewingOrder(order);
    setDialogOpen(true);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage customer orders</p>
        </div>
        <Button variant="outline" onClick={() => setFilterOpen(true)}>
          <Filter className="mr-2 h-4 w-4" />
          Filter & Sort
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders ({filteredOrders.length})</CardTitle>
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
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
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
                      <Button variant="ghost" size="icon" onClick={() => openViewDialog(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={order.status === 'cancelled' || order.status === 'delivered'}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
                onValueChange={(value) => setFilters({ ...filters, status: value as OrderStatus || undefined })}
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
              <Label>Sort By</Label>
              <Select value={filters.sortBy || ''} onValueChange={(value) => setFilters({ ...filters, sortBy: value as any || undefined })}>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Amount</Label>
                <Input
                  type="number"
                  placeholder="₹0"
                  value={filters.minAmount || ''}
                  onChange={(e) => setFilters({ ...filters, minAmount: parseFloat(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label>Max Amount</Label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={filters.maxAmount || ''}
                  onChange={(e) => setFilters({ ...filters, maxAmount: parseFloat(e.target.value) || undefined })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFilters({}); setFilterOpen(false); }}>
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
