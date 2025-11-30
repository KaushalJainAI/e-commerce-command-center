import { useEffect, useState } from 'react';
import { getCoupons, getCoupon, createCoupon, updateCoupon, deleteCoupon, Coupon } from '@/api/coupons';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const Coupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_percent: '',
    valid_until: '',
    is_active: true,
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await getCoupons();
      setCoupons(response.data || []);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load coupons',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: formData.code,
        discount_percent: parseFloat(formData.discount_percent) || 0,
        is_active: formData.is_active,
        valid_until: formData.valid_until || null,
      };

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, payload);
        toast({ title: 'Success', description: 'Coupon updated successfully' });
      } else {
        await createCoupon(payload);
        toast({ title: 'Success', description: 'Coupon created successfully' });
      }
      setDialogOpen(false);
      resetForm();
      fetchCoupons();
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save coupon',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    const newStatus = !coupon.is_active;

    // Optimistic update
    setCoupons(prevCoupons =>
      prevCoupons.map(c =>
        c.id === coupon.id ? { ...c, is_active: newStatus } : c
      )
    );

    try {
      await updateCoupon(coupon.id, { is_active: newStatus });
      toast({
        title: 'Success',
        description: `Coupon marked as ${newStatus ? 'active' : 'inactive'}`,
      });

      if (editingCoupon && editingCoupon.id === coupon.id) {
        setEditingCoupon({ ...editingCoupon, is_active: newStatus });
        setFormData(prev => ({ ...prev, is_active: newStatus }));
      }
    } catch (error) {
      console.error('Toggle error:', error);

      // Revert on error
      setCoupons(prevCoupons =>
        prevCoupons.map(c =>
          c.id === coupon.id ? { ...c, is_active: !newStatus } : c
        )
      );

      toast({
        title: 'Error',
        description: 'Failed to update coupon status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Delete coupon "${coupon.code}"?`)) return;

    try {
      await deleteCoupon(coupon.id);
      toast({ title: 'Success', description: 'Coupon deleted successfully' });
      fetchCoupons();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete coupon',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = async (coupon: Coupon) => {
    setEditingCoupon(coupon);
    try {
      const fullCoupon = await getCoupon(coupon.id);
      setEditingCoupon(fullCoupon);
      
      // Format date for input type="date" (YYYY-MM-DD)
      const formattedDate = fullCoupon.valid_until 
        ? fullCoupon.valid_until.split('T')[0] 
        : '';

      setFormData({
        code: fullCoupon.code,
        discount_percent: String(fullCoupon.discount_percent),
        valid_until: formattedDate,
        is_active: fullCoupon.is_active ?? true,
      });
      setDialogOpen(true);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load coupon details',
        variant: 'destructive',
      });
      setEditingCoupon(null);
    }
  };

  const resetForm = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      discount_percent: '',
      valid_until: '',
      is_active: true,
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No expiry';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isExpired = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="text-muted-foreground">Create and manage discount codes</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Coupon
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium font-mono">{coupon.code}</TableCell>
                  <TableCell className="text-green-600 font-semibold">
                    {coupon.discount_percent}% OFF
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className={isExpired(coupon.valid_until) ? 'text-red-600' : ''}>
                        {formatDate(coupon.valid_until)}
                      </span>
                      {isExpired(coupon.valid_until) && (
                        <span className="text-xs text-red-500">Expired</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={
                      `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        coupon.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`
                    }>
                      {coupon.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(coupon)}
                      title="Edit coupon"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleStatus(coupon)}
                      title={coupon.is_active ? 'Deactivate coupon' : 'Activate coupon'}
                      className={
                        coupon.is_active
                          ? 'hover:bg-green-500/10 text-green-600 hover:text-green-700'
                          : 'hover:bg-red-500/10 text-red-600 hover:text-red-700'
                      }
                    >
                      {coupon.is_active
                        ? <ToggleRight className="h-5 w-5" />
                        : <ToggleLeft className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(coupon)}
                      title="Delete coupon"
                      className="hover:bg-red-500/10 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {coupons.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No coupons found.</p>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}</DialogTitle>
            <DialogDescription>
              {editingCoupon ? 'Update coupon details' : 'Create a new discount coupon'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Coupon Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  required
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Will be automatically converted to uppercase
                </p>
              </div>

              <div>
                <Label htmlFor="discount_percent">Discount Percentage * (%)</Label>
                <Input
                  id="discount_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                  placeholder="10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="valid_until">Valid Until</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty for no expiry date
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingCoupon ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Coupons;
