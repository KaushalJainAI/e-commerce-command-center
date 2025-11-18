import { useEffect, useState } from 'react';
import { getProducts, restoreProduct, Product } from '@/api/products';
import { getCombos, restoreCombo, Combo } from '@/api/combos';
import { getOrders, restoreOrder, Order } from '@/api/orders';
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
import { RotateCcw } from 'lucide-react';

const RecycleBin = () => {
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([]);
  const [deletedCombos, setDeletedCombos] = useState<Combo[]>([]);
  const [deletedOrders, setDeletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDeletedItems();
  }, []);

  const fetchDeletedItems = async () => {
    try {
      const [productsRes, combosRes, ordersRes] = await Promise.all([
        getProducts(),
        getCombos(),
        getOrders(),
      ]);

      setDeletedProducts(productsRes.data.filter(p => p.deleted));
      setDeletedCombos(combosRes.data.filter(c => c.deleted));
      setDeletedOrders(ordersRes.data.filter(o => o.deleted));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load deleted items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreProduct = async (id: string) => {
    try {
      await restoreProduct(id);
      toast({ title: 'Success', description: 'Product restored successfully' });
      fetchDeletedItems();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to restore product',
        variant: 'destructive',
      });
    }
  };

  const handleRestoreCombo = async (id: string) => {
    try {
      await restoreCombo(id);
      toast({ title: 'Success', description: 'Combo restored successfully' });
      fetchDeletedItems();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to restore combo',
        variant: 'destructive',
      });
    }
  };

  const handleRestoreOrder = async (id: string) => {
    try {
      await restoreOrder(id);
      toast({ title: 'Success', description: 'Order restored successfully' });
      fetchDeletedItems();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to restore order',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recycle Bin</h1>
        <p className="text-muted-foreground">Restore or permanently delete items</p>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList>
          <TabsTrigger value="products">Products ({deletedProducts.length})</TabsTrigger>
          <TabsTrigger value="combos">Combos ({deletedCombos.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({deletedOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Deleted Products</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>${product.price.toFixed(2)}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreProduct(product.id)}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {deletedProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No deleted products
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="combos">
          <Card>
            <CardHeader>
              <CardTitle>Deleted Combos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedCombos.map((combo) => (
                    <TableRow key={combo.id}>
                      <TableCell className="font-medium">{combo.name}</TableCell>
                      <TableCell>${combo.price.toFixed(2)}</TableCell>
                      <TableCell>{combo.discount}%</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreCombo(combo.id)}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {deletedCombos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No deleted combos
                      </TableCell>
                    </TableRow>
                  )}
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
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreOrder(order.id)}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {deletedOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No deleted orders
                      </TableCell>
                    </TableRow>
                  )}
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
