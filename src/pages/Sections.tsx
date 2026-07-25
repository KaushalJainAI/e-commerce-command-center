import { useState } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import { TableSkeleton } from '@/components/TableSkeleton';
import {
  getSections, createSection, updateSection, hideSection,
  getSectionProducts, setSectionProducts,
  ProductSection, SectionProduct,
} from '@/api/sections';
import { getProducts, Product } from '@/api/products';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, EyeOff, Eye, ArrowUp, ArrowDown, X, ListOrdered } from 'lucide-react';

const SECTION_TYPES = [
  { value: 'special', label: 'Our Specials' },
  { value: 'new', label: 'Newly Launched' },
  { value: 'trending', label: 'Trending Now' },
  { value: 'bestseller', label: 'Best Sellers' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'custom', label: 'Custom Section' },
];

const Sections = () => {
  const { toast } = useToast();
  // Products are shared with the Products page — same cache key, so opening
  // this page after that one costs nothing.
  const { data: allProducts = [] } =
    useAdminData(['products'], () => getProducts().then(r => r.data));
  const {
    data: sections = [], isInitialLoading, refreshing, refetch: fetchAll,
  } = useAdminData(['sections'], () => getSections());

  // Create/edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductSection | null>(null);
  const [formData, setFormData] = useState({ name: '', section_type: 'custom', max_products: '12' });
  const [saving, setSaving] = useState(false);

  // "Arrange products" dialog
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const [arrangeSection, setArrangeSection] = useState<ProductSection | null>(null);
  const [items, setItems] = useState<SectionProduct[]>([]);
  const [addProductId, setAddProductId] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', section_type: 'custom', max_products: '12' });
    setDialogOpen(true);
  };

  const openEdit = (section: ProductSection) => {
    setEditing(section);
    setFormData({
      name: section.name,
      section_type: section.section_type,
      max_products: String(section.max_products ?? 12),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Name needed', description: 'Please type a section name first.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        section_type: formData.section_type,
        max_products: parseInt(formData.max_products) || 12,
      };
      if (editing) {
        await updateSection(editing.id, payload);
        toast({ title: 'Saved', description: `"${payload.name}" updated.` });
      } else {
        await createSection(payload);
        toast({ title: 'Created', description: `Section "${payload.name}" added to the homepage.` });
      }
      setDialogOpen(false);
      fetchAll();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error && error.message ? error.message : 'Could not save the section.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleHide = async (section: ProductSection) => {
    if (!confirm(`Hide "${section.name}" from the homepage? Its products stay in place — you can show it again any time.`)) return;
    try {
      await hideSection(section.id);
      toast({ title: 'Hidden', description: `"${section.name}" is no longer on the homepage.` });
      fetchAll();
    } catch {
      toast({ title: 'Error', description: 'Could not hide the section.', variant: 'destructive' });
    }
  };

  const handleShow = async (section: ProductSection) => {
    try {
      await updateSection(section.id, { is_active: true });
      toast({ title: 'Visible again', description: `"${section.name}" is back on the homepage.` });
      fetchAll();
    } catch {
      toast({ title: 'Error', description: 'Could not update the section.', variant: 'destructive' });
    }
  };

  // ---- Arrange products ----
  const openArrange = async (section: ProductSection) => {
    setArrangeSection(section);
    setArrangeOpen(true);
    setItems(await getSectionProducts(section.id));
  };

  const move = (index: number, delta: -1 | 1) => {
    setItems(prev => {
      const next = [...prev];
      const j = index + delta;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const removeItem = (id: number) => setItems(prev => prev.filter(i => i.id !== id));

  const addItem = () => {
    const pid = parseInt(addProductId);
    if (!pid) return;
    if (items.some(i => i.id === pid)) {
      toast({ title: 'Already added', description: 'That product is already in this section.' });
      return;
    }
    const p = allProducts.find(pr => pr.id === pid);
    if (!p) return;
    setItems(prev => [...prev, {
      id: p.id, name: p.name, image: p.image || null,
      position: prev.length, is_active: p.is_active !== false,
    }]);
    setAddProductId('');
  };

  const saveOrder = async () => {
    if (!arrangeSection) return;
    setSavingOrder(true);
    try {
      await setSectionProducts(arrangeSection.id, items.map(i => i.id));
      toast({ title: 'Saved', description: `"${arrangeSection.name}" now shows ${items.length} products in this order.` });
      setArrangeOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error && error.message ? error.message : 'Could not save the product order.',
        variant: 'destructive',
      });
    } finally {
      setSavingOrder(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-9 w-64" />
        <TableSkeleton rows={4} columns={2} />
      </div>
    );
  }

  return (
    <div className={`space-y-6 p-6 transition-opacity ${refreshing ? 'opacity-60' : 'opacity-100'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Homepage Sections</h1>
          <p className="text-muted-foreground">
            Sections are the product rows on your store's homepage (e.g. Best Sellers).
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Section
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No sections yet. Click "Add Section" to create your first homepage row.
            </CardContent>
          </Card>
        )}
        {sections.map(section => (
          <Card key={section.id} className={section.is_active ? undefined : 'opacity-60'}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">{section.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {SECTION_TYPES.find(t => t.value === section.section_type)?.label || section.section_type}
                  {' · '}shows up to {section.max_products} products
                  {!section.is_active && ' · hidden'}
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => openArrange(section)}>
                <ListOrdered className="mr-2 h-4 w-4" /> Arrange products
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openEdit(section)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
              {section.is_active ? (
                <Button variant="ghost" size="sm" className="text-amber-600" onClick={() => handleHide(section)}>
                  <EyeOff className="mr-2 h-4 w-4" /> Hide
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handleShow(section)}>
                  <Eye className="mr-2 h-4 w-4" /> Show
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create / edit section */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Section' : 'Add Section'}</DialogTitle>
            <DialogDescription>
              A section is a row of products on the homepage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sec-name">Name *</Label>
              <Input
                id="sec-name"
                placeholder="e.g. Festival Favourites"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={formData.section_type}
                onValueChange={(v) => setFormData({ ...formData, section_type: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sec-max">Maximum products shown</Label>
              <Input
                id="sec-max"
                type="number"
                min={1}
                value={formData.max_products}
                onChange={(e) => setFormData({ ...formData, max_products: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add section'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Arrange products */}
      <Dialog open={arrangeOpen} onOpenChange={setArrangeOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Arrange: {arrangeSection?.name}</DialogTitle>
            <DialogDescription>
              Use the arrows to change the order customers see. The top product shows first.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Select value={addProductId} onValueChange={setAddProductId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Add a product to this section…" />
              </SelectTrigger>
              <SelectContent>
                {allProducts
                  .filter(p => !items.some(i => i.id === p.id))
                  .map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={addItem} disabled={!addProductId}>Add</Button>
          </div>

          <div className="space-y-1">
            {items.length === 0 && (
              <p className="text-center text-muted-foreground py-6 text-sm">
                No products in this section yet — add some above.
              </p>
            )}
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2 rounded border p-2">
                <span className="w-6 text-center text-sm text-muted-foreground">{index + 1}</span>
                {item.image && (
                  <img src={item.image} alt="" className="h-8 w-8 rounded object-cover" />
                )}
                <span className="flex-1 truncate text-sm font-medium">
                  {item.name}
                  {!item.is_active && <span className="ml-1 text-xs text-amber-600">(hidden product)</span>}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0}
                  onClick={() => move(index, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                  onClick={() => removeItem(item.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setArrangeOpen(false)}>Cancel</Button>
            <Button onClick={saveOrder} disabled={savingOrder}>
              {savingOrder ? 'Saving…' : 'Save order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sections;
