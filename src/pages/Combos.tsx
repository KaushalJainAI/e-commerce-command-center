import { useEffect, useState } from 'react';
import { getCombos, getCombo, createCombo, updateCombo, Combo, ComboItem } from '@/api/combos';
import { getProducts, Product } from '@/api/products';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, ToggleLeft, ToggleRight, X } from 'lucide-react';


const Combos = () => {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    items: [] as { product: string; quantity: number }[],
    price: '',
    discount_price: '',
    is_active: true,
    is_featured: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const [combosRes, productsRes] = await Promise.all([getCombos(), getProducts()]);
        setCombos(combosRes.data || []);
        const activeProducts = productsRes.data.filter((p) => p.is_active);
        setProducts(activeProducts);
        setAllProducts(productsRes.data);
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load combos or products',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [toast]);

  const fetchCombos = async () => {
    try {
      const response = await getCombos();
      setCombos(response.data || []);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load combos',
        variant: 'destructive',
      });
    }
  };

  const fetchAllProducts = async () => {
    try {
      const response = await getProducts();
      setAllProducts(response.data);
      setProducts(response.data.filter((p) => p.is_active));
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive',
      });
    }
  };

  const parseNumberOrZero = (value: string) => {
    const n = parseFloat(value);
    return Number.isNaN(n) ? 0 : n;
  };

  const buildFormData = () => {
    const form = new FormData();
    form.append('name', formData.name);
    if (formData.slug && !editingCombo) form.append('slug', formData.slug);
    if (formData.description) form.append('description', formData.description);
    form.append('price', String(parseNumberOrZero(formData.price)));
    if (formData.discount_price) {
      form.append('discount_price', String(parseNumberOrZero(formData.discount_price)));
    }
    form.append('is_active', String(formData.is_active));
    form.append('is_featured', String(formData.is_featured));
    
    // Build items array - use product ID (not slug)
    const items = formData.items
      .filter((i) => i.product !== '')
      .map((i) => ({ 
        product: i.product,  // This should be the product ID
        quantity: i.quantity || 1 
      }));
    
    // Always append items as JSON string
    form.append('items', JSON.stringify(items));
    
    if (imageFile) form.append('image', imageFile);
    
    return form;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate items
    const validItems = formData.items.filter((i) => i.product !== '');
    if (validItems.length === 0) {
      toast({
        title: 'Validation error',
        description: 'Please add at least one product to the combo',
        variant: 'destructive',
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      const form = buildFormData();
      
      if (editingCombo) {
        await updateCombo(editingCombo.slug, form);
        toast({ title: 'Success', description: 'Combo updated successfully' });
      } else {
        await createCombo(form);
        toast({ title: 'Success', description: 'Combo created successfully' });
      }
      
      setDialogOpen(false);
      resetForm();
      fetchCombos();
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save combo',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };
const handleToggleStatus = async (combo: Combo) => {
  const newStatus = !combo.is_active;
  
  // Optimistic update
  setCombos(prevCombos => 
    prevCombos.map(c => 
      c.id === combo.id ? { ...c, is_active: newStatus } : c
    )
  );
  
  try {
    // Send as JSON instead of FormData for simple updates
    await updateCombo(combo.slug, { is_active: newStatus });
    
    toast({
      title: 'Success',
      description: `Combo marked as ${newStatus ? 'active' : 'inactive'}`,
    });
    
    if (editingCombo && editingCombo.id === combo.id) {
      setEditingCombo({ ...editingCombo, is_active: newStatus });
      setFormData(prev => ({ ...prev, is_active: newStatus }));
    }
  } catch (error) {
    console.error('Toggle status error:', error);
    // Revert on error
    setCombos(prevCombos => 
      prevCombos.map(c => 
        c.id === combo.id ? { ...c, is_active: !newStatus } : c
      )
    );
    
    toast({
      title: 'Error',
      description: 'Failed to update combo status',
      variant: 'destructive',
    });
  }
};


  const addProductToCombo = async () => {
    await fetchAllProducts();
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 1 }],
    }));
  };

  const removeProductFromCombo = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (
    index: number,
    field: 'product' | 'quantity',
    value: string | number,
  ) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  const openEditDialog = async (combo: Combo) => {
    setEditingCombo(combo);
    
    try {
      await fetchAllProducts();
      
      // Fetch full combo details using slug
      const fullCombo = await getCombo(combo.slug);
      
      // Map items - use product ID from the response
      const mappedItems = (fullCombo.items || []).map((i: ComboItem) => ({
        product: String(i.product),  // This is the product ID
        quantity: i.quantity,
      }));
      
      setEditingCombo(fullCombo);
      setFormData({
        name: fullCombo.name,
        slug: fullCombo.slug,
        description: fullCombo.description || '',
        items: mappedItems,
        price: fullCombo.price ?? '',
        discount_price: fullCombo.discount_price ?? '',
        is_active: fullCombo.is_active,
        is_featured: fullCombo.is_featured || false,
      });
      setImageFile(null);
      setImagePreview(fullCombo.image || null);
      setDialogOpen(true);
    } catch (error) {
      console.error('Failed to load combo:', error);
      toast({
        title: 'Error',
        description: 'Failed to load combo details',
        variant: 'destructive',
      });
      setEditingCombo(null);
    }
  };

  const resetForm = () => {
    setEditingCombo(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      items: [],
      price: '',
      discount_price: '',
      is_active: true,
      is_featured: false,
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const formatMoney = (value: string | number | undefined) => {
    if (value === undefined || value === null) return null;
    const n = typeof value === 'number' ? value : parseFloat(value);
    if (Number.isNaN(n)) return null;
    return n.toFixed(2);
  };

  // Get product by ID from allProducts
  const getProductById = (productId: string) => {
    return allProducts.find(p => String(p.id) === String(productId));
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Combos</h1>
          <p className="text-muted-foreground">Manage product combinations</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Combo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Combos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combos.map((combo) => {
                const price = formatMoney(combo.price);
                const discount = formatMoney(combo.discount_price);
                return (
                  <TableRow key={combo.id}>
                    <TableCell>
                      {combo.image && (
                        <img
                          src={combo.image}
                          alt={combo.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{combo.name}</TableCell>
                    <TableCell>{combo.items?.length || 0} products</TableCell>
                    <TableCell className="font-mono">
                      {price !== null ? `₹${price}` : '—'}
                    </TableCell>
                    <TableCell className="font-mono">
                      {discount !== null ? `₹${discount}` : '—'}
                    </TableCell>
                    <TableCell>
                      <span className={
                        `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          combo.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`
                      }>
                        {combo.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEditDialog(combo)} 
                        title="Edit combo"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(combo)}
                        title={combo.is_active ? 'Deactivate combo' : 'Activate combo'}
                        className={
                          combo.is_active
                            ? 'hover:bg-green-500/10 text-green-600 hover:text-green-700'
                            : 'hover:bg-red-500/10 text-red-600 hover:text-red-700'
                        }
                      >
                        {combo.is_active
                          ? <ToggleRight className="h-5 w-5" />
                          : <ToggleLeft className="h-5 w-5" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {combos.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No combos found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCombo ? 'Edit Combo' : 'Add New Combo'}</DialogTitle>
            <DialogDescription>
              {editingCombo ? 'Update combo information' : 'Create a new combo'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="Combo" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground text-center px-2">No image</span>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="image">Combo image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Upload a clear combo image.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Combo name"
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="combo-slug"
                  disabled={!!editingCombo}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Combo description"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="discount_price">Discount Price</Label>
                <Input
                  id="discount_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount_price}
                  onChange={e => setFormData({ ...formData, discount_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Products in Combo *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addProductToCombo}>
                  <Plus className="h-4 w-4 mr-1" /> Add Product
                </Button>
              </div>
              
              {formData.items.map((item, index) => {
                const selectedProduct = getProductById(item.product);
                const isProductMissing = item.product !== '' && !selectedProduct;
                
                return (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 space-y-3 ${isProductMissing ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className="flex-1 space-y-3">
                        <div>
                          <Label htmlFor={`product-${index}`}>
                            Product {isProductMissing && <span className="text-red-600">(Not Available)</span>}
                          </Label>
                          <Select
                            value={item.product === '' ? '' : item.product}
                            onValueChange={value => updateItem(index, 'product', value)}
                          >
                            <SelectTrigger id={`product-${index}`} className={isProductMissing ? 'border-red-500' : ''}>
                              <SelectValue placeholder={isProductMissing
                                ? `Product ID: ${item.product} (Not Found)`
                                : "Select product"} />
                            </SelectTrigger>
                            <SelectContent>
                              {allProducts.map(product => (
                                <SelectItem key={product.id} value={String(product.id)}>
                                  {product.name} {product.weight ? `- ${product.weight}` : ''}
                                  {!product.is_active && ' (Inactive)'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isProductMissing && (
                            <p className="text-xs text-red-600 mt-1">
                              This product no longer exists. Please select a different product or remove this item.
                            </p>
                          )}
                        </div>
                        
                        {selectedProduct && !isProductMissing && (
                          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                            {selectedProduct.image &&
                              <img src={selectedProduct.image} alt={selectedProduct.name} className="h-12 w-12 rounded object-cover" />}
                            <div className="flex-1 text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{selectedProduct.name}</span>
                                {selectedProduct.in_stock
                                  ? <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">In Stock</span>
                                  : <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">Out of Stock</span>}
                              </div>
                              <div className="text-muted-foreground flex gap-4">
                                <span>Price: ₹{parseFloat(selectedProduct.price).toFixed(2)}</span>
                                <span>Weight: {selectedProduct.weight}</span>
                                <span>Stock: {selectedProduct.stock}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="w-24">
                        <Label htmlFor={`quantity-${index}`}>Qty</Label>
                        <Input
                          id={`quantity-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e =>
                            updateItem(index, 'quantity',
                              Number.isNaN(parseInt(e.target.value, 10))
                                ? 1
                                : parseInt(e.target.value, 10)
                            )
                          }
                          placeholder="1"
                        />
                        {selectedProduct && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ₹{(parseFloat(selectedProduct.price) * item.quantity).toFixed(2)}
                          </p>
                        )}
                      </div>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProductFromCombo(index)}
                        className="text-destructive hover:text-destructive mt-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {formData.items.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No products added. Click "Add Product" to add products to this combo.
                </p>
              )}
              
              {formData.items.length > 0 && (
                <div className="border-t pt-3 mt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Total Product Value:</span>
                    <span className="font-mono font-semibold">
                      ₹{formData.items.reduce((total, item) => {
                        const product = getProductById(item.product);
                        if (product)
                          return total + (parseFloat(product.price) * item.quantity);
                        return total;
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This is the sum of individual product prices. Set your combo price below.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={e => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_featured" className="cursor-pointer">Featured</Label>
              </div>
            </div>
            
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : (editingCombo ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Combos;
