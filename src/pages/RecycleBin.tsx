// import { useEffect, useState } from 'react';
// import { getProducts, updateProduct, Product } from '@/api/products';
// import { getCombos, updateCombo, Combo } from '@/api/combos';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table';
// import { useToast } from '@/hooks/use-toast';
// import { RotateCcw } from 'lucide-react';

// const RecycleBin = () => {
//   const [inactiveProducts, setInactiveProducts] = useState<Product[]>([]);
//   const [inactiveCombos, setInactiveCombos] = useState<Combo[]>([]);
//   const [loading, setLoading] = useState(true);
//   const { toast } = useToast();

//   useEffect(() => {
//     fetchInactiveItems();
//   }, []);

//   const fetchInactiveItems = async () => {
//     try {
//       const [productsRes, combosRes] = await Promise.all([
//         getProducts(),
//         getCombos(),
//       ]);

//       // Filter for inactive items (is_active = false)
//       setInactiveProducts(productsRes.data.filter(p => !p.is_active));
//       setInactiveCombos(combosRes.data.filter(c => !c.is_active));
//     } catch (error) {
//       toast({
//         title: 'Error',
//         description: 'Failed to load inactive items',
//         variant: 'destructive',
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleRestoreProduct = async (slug: string) => {
//     try {
//       await updateProduct(slug, { is_active: true });
//       toast({ title: 'Success', description: 'Product restored successfully' });
//       fetchInactiveItems();
//     } catch (error) {
//       toast({
//         title: 'Error',
//         description: 'Failed to restore product',
//         variant: 'destructive',
//       });
//     }
//   };

//   const handleRestoreCombo = async (slug: string) => {
//     try {
//       await updateCombo(slug, { is_active: true });
//       toast({ title: 'Success', description: 'Combo restored successfully' });
//       fetchInactiveItems();
//     } catch (error) {
//       toast({
//         title: 'Error',
//         description: 'Failed to restore combo',
//         variant: 'destructive',
//       });
//     }
//   };

//   if (loading) {
//     return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
//   }

//   return (
//     <div className="space-y-6 p-6">
//       <div>
//         <h1 className="text-3xl font-bold tracking-tight">Recycle Bin</h1>
//         <p className="text-muted-foreground">Restore inactive items back to active status</p>
//       </div>

//       <Tabs defaultValue="products" className="w-full">
//         <TabsList>
//           <TabsTrigger value="products">Products ({inactiveProducts.length})</TabsTrigger>
//           <TabsTrigger value="combos">Combos ({inactiveCombos.length})</TabsTrigger>
//         </TabsList>

//         <TabsContent value="products">
//           <Card>
//             <CardHeader>
//               <CardTitle>Inactive Products</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Name</TableHead>
//                     <TableHead>Price</TableHead>
//                     <TableHead>Stock</TableHead>
//                     <TableHead>Category</TableHead>
//                     <TableHead className="text-right">Actions</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {inactiveProducts.map((product) => (
//                     <TableRow key={product.id}>
//                       <TableCell className="font-medium">{product.name}</TableCell>
//                       <TableCell className="font-mono">${product.price.toFixed(2)}</TableCell>
//                       <TableCell className="font-mono">{product.stock}</TableCell>
//                       <TableCell>{product.category || 'Uncategorized'}</TableCell>
//                       <TableCell className="text-right">
//                         <Button
//                           variant="outline"
//                           size="sm"
//                           onClick={() => handleRestoreProduct(product.slug)}
//                         >
//                           <RotateCcw className="mr-2 h-4 w-4" />
//                           Restore
//                         </Button>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                   {inactiveProducts.length === 0 && (
//                     <TableRow>
//                       <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
//                         No inactive products
//                       </TableCell>
//                     </TableRow>
//                   )}
//                 </TableBody>
//               </Table>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="combos">
//           <Card>
//             <CardHeader>
//               <CardTitle>Inactive Combos</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Name</TableHead>
//                     <TableHead>Products</TableHead>
//                     <TableHead>Price</TableHead>
//                     <TableHead>Discount Price</TableHead>
//                     <TableHead className="text-right">Actions</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {inactiveCombos.map((combo) => (
//                     <TableRow key={combo.id}>
//                       <TableCell className="font-medium">{combo.name}</TableCell>
//                       <TableCell>{combo.products.length} products</TableCell>
//                       <TableCell className="font-mono">${combo.price.toFixed(2)}</TableCell>
//                       <TableCell className="font-mono">
//                         {combo.discount_price ? `$${combo.discount_price.toFixed(2)}` : '-'}
//                       </TableCell>
//                       <TableCell className="text-right">
//                         <Button
//                           variant="outline"
//                           size="sm"
//                           onClick={() => handleRestoreCombo(combo.slug)}
//                         >
//                           <RotateCcw className="mr-2 h-4 w-4" />
//                           Restore
//                         </Button>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                   {inactiveCombos.length === 0 && (
//                     <TableRow>
//                       <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
//                         No inactive combos
//                       </TableCell>
//                     </TableRow>
//                   )}
//                 </TableBody>
//               </Table>
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// };

// export default RecycleBin;
