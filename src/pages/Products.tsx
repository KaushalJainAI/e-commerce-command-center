import { useEffect, useState } from 'react';
import { getProducts, getProduct, createProduct, updateProduct, Product, ProductImage, createProductImage, deleteProductImage } from '@/api/products';
import { getCategories, Category } from '@/api/categories';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, ToggleLeft, ToggleRight, X, ImagePlus, Loader2 } from 'lucide-react';

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    category: '',
    spice_form: '',
    price: '',
    discount_price: '',
    stock: '',
    weight: '',
    origin_country: '',
    organic: false,
    shelf_life: '',
    ingredients: '',
    is_active: true,
    is_featured: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Gallery images state
  const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
  const [newGalleryImages, setNewGalleryImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          getProducts(),
          getCategories(),
        ]);
        setProducts(productsRes.data || []);
        setCategories(categoriesRes.data || []);
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load products or categories',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [toast]);

  const fetchProducts = async () => {
    try {
      const response = await getProducts();
      setProducts(response.data || []);
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
    if (formData.slug) form.append('slug', formData.slug);
    if (formData.description) form.append('description', formData.description);
    if (formData.category) form.append('category', formData.category);
    if (formData.spice_form) form.append('spice_form', formData.spice_form);
    form.append('price', String(parseNumberOrZero(formData.price)));
    if (formData.discount_price) form.append('discount_price', String(parseNumberOrZero(formData.discount_price)));
    form.append('stock', String(parseInt(formData.stock) || 0));
    if (formData.weight) form.append('weight', formData.weight);
    if (formData.origin_country) form.append('origin_country', formData.origin_country);
    form.append('organic', String(formData.organic));
    if (formData.shelf_life) form.append('shelf_life', formData.shelf_life);
    if (formData.ingredients) form.append('ingredients', formData.ingredients);
    form.append('is_active', String(formData.is_active));
    form.append('is_featured', String(formData.is_featured));
    if (imageFile) form.append('image', imageFile);
    return form;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const form = buildFormData();
      let productId: number;
      
      if (editingProduct) {
        await updateProduct(editingProduct.slug, form);
        productId = editingProduct.id;
        toast({ title: 'Success', description: 'Product updated successfully' });
      } else {
        const newProduct = await createProduct(form);
        productId = newProduct.id;
        toast({ title: 'Success', description: 'Product created successfully' });
      }
      
      // Upload gallery images if any
      if (newGalleryImages.length > 0) {
        await uploadGalleryImages(productId);
      }
      
      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save product',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (product: Product) => {
    const newStatus = !product.is_active;
    
    // Optimistic update - update UI immediately
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.id === product.id ? { ...p, is_active: newStatus } : p
      )
    );
    
    try {
      // Create FormData for the update
      const formData = new FormData();
      formData.append('is_active', String(newStatus));
      
      await updateProduct(product.slug, formData);
      toast({
        title: 'Success',
        description: `Product marked as ${newStatus ? 'active' : 'inactive'}`,
      });
      
      // Also update editingProduct if it's the same product being edited
      if (editingProduct && editingProduct.id === product.id) {
        setEditingProduct({ ...editingProduct, is_active: newStatus });
        setFormData(prev => ({ ...prev, is_active: newStatus }));
      }
    } catch (error) {
      console.error('Toggle error:', error);
      
      // Revert optimistic update on error
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === product.id ? { ...p, is_active: !newStatus } : p
        )
      );
      
      toast({
        title: 'Error',
        description: 'Failed to update product status',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = async (product: Product) => {
    setEditingProduct(product);
    try {
      const fullProduct = await getProduct(product.slug);
      setEditingProduct(fullProduct);
      setFormData({
        name: fullProduct.name,
        slug: fullProduct.slug,
        description: fullProduct.description || '',
        category: String(fullProduct.category),
        spice_form: fullProduct.spice_form || '',
        price: fullProduct.price ?? '',
        discount_price: fullProduct.discount_price ?? '',
        stock: String(fullProduct.stock ?? 0),
        weight: fullProduct.weight || '',
        origin_country: fullProduct.origin_country || 'India',
        organic: fullProduct.organic || false,
        shelf_life: fullProduct.shelf_life || '',
        ingredients: fullProduct.ingredients || '',
        is_active: fullProduct.is_active ?? true,
        is_featured: fullProduct.is_featured || false,
      });
      setImageFile(null);
      setImagePreview(fullProduct.image || null);
      // Set gallery images from product
      setGalleryImages(fullProduct.images || []);
      setNewGalleryImages([]);
      setDialogOpen(true);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load product details',
        variant: 'destructive',
      });
      setEditingProduct(null);
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      category: '',
      spice_form: '',
      price: '',
      discount_price: '',
      stock: '',
      weight: '',
      origin_country: '',
      organic: false,
      shelf_life: '',
      ingredients: '',
      is_active: true,
      is_featured: false,
    });
    setImageFile(null);
    setImagePreview(null);
    // Reset gallery images
    setGalleryImages([]);
    setNewGalleryImages([]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Gallery image handlers
  const handleGalleryImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newImages = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setNewGalleryImages(prev => [...prev, ...newImages]);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleRemoveNewGalleryImage = (index: number) => {
    setNewGalleryImages(prev => {
      // Revoke URL to prevent memory leak
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDeleteExistingGalleryImage = async (imageId: number) => {
    try {
      await deleteProductImage(imageId);
      setGalleryImages(prev => prev.filter(img => img.id !== imageId));
      toast({ title: 'Success', description: 'Gallery image deleted' });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete gallery image',
        variant: 'destructive',
      });
    }
  };

  const uploadGalleryImages = async (productId: number) => {
    if (newGalleryImages.length === 0) return;
    
    setUploadingGallery(true);
    try {
      for (const img of newGalleryImages) {
        await createProductImage(productId, img.file, '');
      }
      toast({ title: 'Success', description: `${newGalleryImages.length} gallery image(s) uploaded` });
    } catch {
      toast({
        title: 'Error',
        description: 'Some gallery images failed to upload',
        variant: 'destructive',
      });
    } finally {
      setUploadingGallery(false);
    }
  };

  const formatMoney = (value: string | number | undefined) => {
    if (value === undefined || value === null) return null;
    const n = typeof value === 'number' ? value : parseFloat(value);
    if (Number.isNaN(n)) return null;
    return n.toFixed(2);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const price = formatMoney(product.price);
                const discount = formatMoney(product.discount_price);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category_name || '—'}</TableCell>
                    <TableCell className="font-mono">
                      {discount !== null ? (
                        <div className="space-y-0.5">
                          <div className="line-through text-xs text-muted-foreground">₹{price}</div>
                          <div className="text-green-600 font-semibold">₹{discount}</div>
                        </div>
                      ) : (
                        `₹${price}`
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`${product.stock && product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.stock || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={
                        `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          product.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`
                      }>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEditDialog(product)} 
                        title="Edit product"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(product)}
                        title={product.is_active ? 'Deactivate product' : 'Activate product'}
                        className={
                          product.is_active
                            ? 'hover:bg-green-500/10 text-green-600 hover:text-green-700'
                            : 'hover:bg-red-500/10 text-red-600 hover:text-red-700'
                        }
                      >
                        {product.is_active
                          ? <ToggleRight className="h-5 w-5" />
                          : <ToggleLeft className="h-5 w-5" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found.</p>
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
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update product information' : 'Create a new product'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="Product" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground text-center px-2">No image</span>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="image">Product image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Upload a clear product image.</p>
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
                  placeholder="Product name"
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="product-slug"
                  disabled={!!editingProduct}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={value => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="spice_form">Spice Form</Label>
                <Input
                  id="spice_form"
                  value={formData.spice_form}
                  onChange={e => setFormData({ ...formData, spice_form: e.target.value })}
                  placeholder="Powder, Whole, Ground"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
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

              <div>
                <Label htmlFor="stock">Stock *</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: e.target.value })}
                  required
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  value={formData.weight}
                  onChange={e => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="100g, 1kg"
                />
              </div>

              <div>
                <Label htmlFor="origin_country">Origin Country</Label>
                <Input
                  id="origin_country"
                  value={formData.origin_country}
                  onChange={e => setFormData({ ...formData, origin_country: e.target.value })}
                  placeholder="India"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shelf_life">Shelf Life</Label>
                <Input
                  id="shelf_life"
                  value={formData.shelf_life}
                  onChange={e => setFormData({ ...formData, shelf_life: e.target.value })}
                  placeholder="12 months"
                />
              </div>

              <div>
                <Label htmlFor="ingredients">Ingredients</Label>
                <Input
                  id="ingredients"
                  value={formData.ingredients}
                  onChange={e => setFormData({ ...formData, ingredients: e.target.value })}
                  placeholder="Turmeric, Salt"
                />
              </div>
            </div>

            {/* Gallery Images Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Gallery Images</Label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryImageAdd}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span><ImagePlus className="mr-2 h-4 w-4" /> Add Images</span>
                  </Button>
                </label>
              </div>
              
              {/* Image Grid */}
              <div className="grid grid-cols-4 gap-3">
                {/* Existing gallery images */}
                {galleryImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.image}
                      alt={img.alt_text || 'Gallery image'}
                      className="h-24 w-full object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteExistingGalleryImage(img.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {/* New images to upload */}
                {newGalleryImages.map((img, index) => (
                  <div key={`new-${index}`} className="relative group">
                    <img
                      src={img.preview}
                      alt={`New image ${index + 1}`}
                      className="h-24 w-full object-cover rounded-lg border border-dashed border-primary"
                    />
                    <div className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">New</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewGalleryImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {/* Empty state */}
                {galleryImages.length === 0 && newGalleryImages.length === 0 && (
                  <div className="col-span-4 text-center py-6 text-muted-foreground text-sm border rounded-lg border-dashed">
                    No gallery images. Click "Add Images" to upload.
                  </div>
                )}
              </div>
              
              {uploadingGallery && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading gallery images...
                </div>
              )}
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="organic"
                  checked={formData.organic}
                  onChange={e => setFormData({ ...formData, organic: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="organic" className="cursor-pointer">Organic</Label>
              </div>

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
              <Button type="submit">
                {editingProduct ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
