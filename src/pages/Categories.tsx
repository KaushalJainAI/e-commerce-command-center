import { useEffect, useState } from 'react';
import {
  getCategories, createCategory, updateCategory, deleteCategory, Category,
} from '@/api/categories';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { checkImageFile } from '@/lib/imageCheck';
import { Plus, Edit, EyeOff, Eye } from 'lucide-react';

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCategories = async () => {
    const res = await getCategories();
    setCategories(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const resetForm = () => {
    setEditing(null);
    setFormData({ name: '', description: '' });
    setImageFile(null);
    setImagePreview(null);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setFormData({ name: category.name, description: category.description || '' });
    setImageFile(null);
    setImagePreview(category.image || null);
    setDialogOpen(true);
  };

  const handleImageSelect = async (file: File | undefined) => {
    if (!file) return;
    const check = await checkImageFile(file);
    if (!check.ok) {
      toast({ title: 'Photo problem', description: check.error, variant: 'destructive' });
      return;
    }
    if (check.warning) {
      toast({ title: 'Small photo', description: check.warning });
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Name needed', description: 'Please type a category name first.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.append('name', formData.name.trim());
      form.append('description', formData.description);
      if (imageFile) form.append('image', imageFile);
      if (editing) {
        await updateCategory(editing.slug || editing.id, form);
        toast({ title: 'Saved', description: `"${formData.name}" updated.` });
      } else {
        await createCategory(form);
        toast({ title: 'Created', description: `Category "${formData.name}" added.` });
      }
      setDialogOpen(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error && error.message ? error.message : 'Could not save the category.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // "Delete" is a soft hide on the backend (is_active=False) — say so plainly.
  const handleHide = async (category: Category) => {
    if (!confirm(`Hide "${category.name}" from the store? Its products stay safe — you can show the category again any time.`)) return;
    try {
      await deleteCategory(category.slug || category.id);
      toast({ title: 'Hidden', description: `"${category.name}" is no longer shown in the store.` });
      fetchCategories();
    } catch {
      toast({ title: 'Error', description: 'Could not hide the category.', variant: 'destructive' });
    }
  };

  const handleShow = async (category: Category) => {
    try {
      await updateCategory(category.slug || category.id, { is_active: true });
      toast({ title: 'Visible again', description: `"${category.name}" is shown in the store.` });
      fetchCategories();
    } catch {
      toast({ title: 'Error', description: 'Could not update the category.', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Categories group your products in the store (e.g. Whole Spices, Powders).
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>All Categories</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Visible?</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No categories yet. Click "Add Category" to create your first one.
                  </TableCell>
                </TableRow>
              )}
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    {category.image && (
                      <img src={category.image} alt={category.name}
                        className="h-8 w-8 rounded-full object-cover" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-muted-foreground">
                    {category.description || '—'}
                  </TableCell>
                  <TableCell>
                    {category.is_active !== false
                      ? <span className="text-green-600 text-sm">Shown</span>
                      : <span className="text-muted-foreground text-sm">Hidden</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(category)} title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                    {category.is_active !== false ? (
                      <Button variant="ghost" size="icon" onClick={() => handleHide(category)}
                        title="Hide from store">
                        <EyeOff className="h-4 w-4 text-amber-600" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => handleShow(category)}
                        title="Show in store">
                        <Eye className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Change the details and press Save.' : 'Give the category a name customers will understand.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cat-name">Name *</Label>
              <Input
                id="cat-name"
                placeholder="e.g. Whole Spices"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cat-desc">Description (optional)</Label>
              <Textarea
                id="cat-desc"
                placeholder="A short line about what's in this category"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cat-image">Photo (optional)</Label>
              <Input
                id="cat-image"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e.target.files?.[0])}
              />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-2 h-24 w-24 rounded object-cover border" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;
