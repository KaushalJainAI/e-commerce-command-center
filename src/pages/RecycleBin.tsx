import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminData, useInvalidate } from '@/hooks/useAdminData';
import { TableSkeleton } from '@/components/TableSkeleton';
import { getProducts, updateProduct, Product } from '@/api/products';
import { getCombos, updateCombo, Combo } from '@/api/combos';
import { getDeletedOrders, restoreOrder, Order } from '@/api/orders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { RotateCcw, Loader2, AlertTriangle } from 'lucide-react';

// Keep in sync with the backend RECYCLE_BIN_RETENTION_DAYS setting.
const RETENTION_DAYS = 30;

const RecycleBin = () => {
  // Track the id currently being restored so we can disable just that button.
  const [restoringKey, setRestoringKey] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();

  const queryKey = ['recycle-bin'];
  const { data, isInitialLoading, refreshing } = useAdminData(queryKey, async () => {
    const [productsRes, combosRes, ordersRes] = await Promise.all([
      getProducts(),
      getCombos(),
      getDeletedOrders(),
    ]);
    // Deleted products/combos are the soft-deleted (is_active = false) ones —
    // DELETE on those endpoints deactivates rather than destroys.
    return {
      products: productsRes.data.filter((p) => p.is_active === false),
      combos: combosRes.data.filter((c) => c.is_active === false),
      orders: ordersRes,
    };
  });
  const inactiveProducts = data?.products ?? [];
  const inactiveCombos = data?.combos ?? [];
  const deletedOrders = data?.orders ?? [];

  /** Drop the restored row from the cached bin without a full reload. */
  const dropFromBin = (patch: (d: NonNullable<typeof data>) => NonNullable<typeof data>) =>
    queryClient.setQueryData(queryKey, (prev: typeof data) => (prev ? patch(prev) : prev));

  const handleRestoreProduct = async (product: Product) => {
    setRestoringKey(`product-${product.id}`);
    try {
      await updateProduct(product.slug, { is_active: true });
      dropFromBin(d => ({ ...d, products: d.products.filter(p => p.id !== product.id) }));
      // The product is live again — the Products page's cache is now stale.
      invalidate(['products']);
      toast({ title: 'Restored', description: `"${product.name}" is active again.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to restore product', variant: 'destructive' });
    } finally {
      setRestoringKey(null);
    }
  };

  const handleRestoreCombo = async (combo: Combo) => {
    setRestoringKey(`combo-${combo.id}`);
    try {
      await updateCombo(combo.slug, { is_active: true });
      dropFromBin(d => ({ ...d, combos: d.combos.filter(c => c.id !== combo.id) }));
      invalidate(['combos']);
      toast({ title: 'Restored', description: `"${combo.name}" is active again.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to restore combo', variant: 'destructive' });
    } finally {
      setRestoringKey(null);
    }
  };

  const handleRestoreOrder = async (order: Order) => {
    setRestoringKey(`order-${order.id}`);
    try {
      await restoreOrder(order.id);
      dropFromBin(d => ({ ...d, orders: d.orders.filter(o => o.id !== order.id) }));
      invalidate(['orders'], ['dashboard']);
      toast({ title: 'Restored', description: `${order.order_number} is back in Orders.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to restore order', variant: 'destructive' });
    } finally {
      setRestoringKey(null);
    }
  };

  const RestoreButton = ({ itemKey, onClick }: { itemKey: string; onClick: () => void }) => (
    <Button variant="outline" size="sm" onClick={onClick} disabled={restoringKey === itemKey}>
      {restoringKey === itemKey ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <RotateCcw className="mr-2 h-4 w-4" />
      )}
      Restore
    </Button>
  );

  const emptyRow = (cols: number, label: string) => (
    <TableRow>
      <TableCell colSpan={cols} className="text-center text-muted-foreground py-12">
        {label}
      </TableCell>
    </TableRow>
  );

  if (isInitialLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-9 w-48" />
        <TableSkeleton rows={6} columns={4} />
      </div>
    );
  }

  return (
    <div className={`space-y-6 p-6 transition-opacity ${refreshing ? 'opacity-60' : 'opacity-100'}`}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recycle Bin</h1>
        <p className="text-muted-foreground">
          Restore deactivated products &amp; combos, and soft-deleted orders.
        </p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Items are deleted permanently after {RETENTION_DAYS} days</AlertTitle>
        <AlertDescription>
          Anything moved here is kept for {RETENTION_DAYS} days from the day you
          delete it, then removed for good and cannot be recovered. The countdown
          is per item, so restore anything you want to keep before its {RETENTION_DAYS}
          {' '}days are up.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products ({inactiveProducts.length})</TabsTrigger>
          <TabsTrigger value="combos">Combos ({inactiveCombos.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({deletedOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Inactive Products</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.image && (
                          <img src={product.image} alt={product.name} className="h-8 w-8 rounded-full object-cover" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category_name || '—'}</TableCell>
                      <TableCell className="text-right">
                        <RestoreButton itemKey={`product-${product.id}`} onClick={() => handleRestoreProduct(product)} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {inactiveProducts.length === 0 && emptyRow(4, 'No inactive products')}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="combos">
          <Card>
            <CardHeader>
              <CardTitle>Inactive Combos</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveCombos.map((combo) => (
                    <TableRow key={combo.id}>
                      <TableCell>
                        {combo.image && (
                          <img src={combo.image} alt={combo.name} className="h-8 w-8 rounded-full object-cover" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{combo.name}</TableCell>
                      <TableCell>{combo.items?.length || 0} products</TableCell>
                      <TableCell className="text-right">
                        <RestoreButton itemKey={`combo-${combo.id}`} onClick={() => handleRestoreCombo(combo)} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {inactiveCombos.length === 0 && emptyRow(4, 'No inactive combos')}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Deleted Orders</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.customer_name || 'Guest'}</TableCell>
                      <TableCell className="font-mono">₹{Number(order.total).toFixed(2)}</TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell className="text-right">
                        <RestoreButton itemKey={`order-${order.id}`} onClick={() => handleRestoreOrder(order)} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {deletedOrders.length === 0 && emptyRow(5, 'Recycle bin is empty')}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RecycleBin;
