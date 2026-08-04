import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminData } from '@/hooks/useAdminData';
import { TableSkeleton } from '@/components/TableSkeleton';
import { CustomerPicker } from '@/components/CustomerPicker';
import {
  getCoupons, getCoupon, createCoupon, updateCoupon, deleteCoupon, validateCoupon,
  formatDiscount, Coupon, CouponFormData, DiscountType,
} from '@/api/coupons';
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
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Users, User } from 'lucide-react';

/** Blank form. `assigned_user === null` means the coupon is public. */
const EMPTY_FORM = {
  code: '',
  discount_type: 'percent' as DiscountType,
  discount_percent: '',
  discount_amount: '',
  assigned_user: null as number | null,
  assigned_user_email: null as string | null,
  minimum_order_amount: '',
  max_usage: '',
  valid_until: '',
  is_active: true,
};

const Coupons = () => {
  const {
    data: coupons = [], isInitialLoading, refreshing, refetch: fetchCoupons,
  } = useAdminData(['coupons'], () => getCoupons().then(r => r.data || []));
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [checkCode, setCheckCode] = useState('');
  const [checking, setChecking] = useState(false);

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mirror the serializer's percent/fixed contract client-side so a bad value
    // gets a pointed message instead of a generic 400.
    if (formData.discount_type === 'percent') {
      const pct = Number(formData.discount_percent);
      if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
        toast({
          title: 'Invalid discount',
          description: 'A percentage coupon needs a whole number between 1 and 100.',
          variant: 'destructive',
        });
        return;
      }
    } else {
      const amount = Number(formData.discount_amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast({
          title: 'Invalid discount',
          description: 'A fixed coupon needs a positive ₹ amount.',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      const payload: CouponFormData = {
        code: formData.code.trim(),
        discount_type: formData.discount_type,
        // Always send both, the unused one as null — otherwise a coupon
        // switched from ₹ to % (or back) keeps a stale value in the other field.
        discount_percent: formData.discount_type === 'percent'
          ? Number(formData.discount_percent) : null,
        discount_amount: formData.discount_type === 'fixed'
          ? formData.discount_amount : null,
        assigned_user: formData.assigned_user,
        is_active: formData.is_active,
        valid_until: formData.valid_until || null,
        max_usage: formData.max_usage.trim() === '' ? null : Number(formData.max_usage),
        minimum_order_amount: formData.minimum_order_amount.trim() || '0',
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
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save coupon',
        variant: 'destructive',
      });
    }
  };

  /** Patch one coupon's active flag in the cached list (optimistic + revert). */
  const setCouponActive = (id: number, isActive: boolean) =>
    queryClient.setQueryData(['coupons'], (prev: Coupon[] | undefined) =>
      prev?.map(c => (c.id === id ? { ...c, is_active: isActive } : c)));

  const handleToggleStatus = async (coupon: Coupon) => {
    const newStatus = !coupon.is_active;

    // Optimistic update, straight into the cache so the switch flips instantly.
    setCouponActive(coupon.id, newStatus);

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
      setCouponActive(coupon.id, !newStatus);

      toast({
        title: 'Error',
        description: 'Failed to update coupon status',
        variant: 'destructive',
      });
    }
  };

  const handleCheckCode = async () => {
    const code = checkCode.trim();
    if (!code) return;
    setChecking(true);
    try {
      const result = await validateCoupon(code);
      if (result.valid) {
        // Spell out the conditions: /validate/ deliberately ignores per-checkout
        // limits (assignment, minimum order), so "valid" alone can mislead.
        const c = result.coupon;
        const conditions = c ? [
          c.assigned_user_email ? `only ${c.assigned_user_email}` : null,
          Number(c.minimum_order_amount) > 0
            ? `minimum order ₹${Number(c.minimum_order_amount).toLocaleString('en-IN')}` : null,
        ].filter(Boolean) : [];
        toast({
          title: `"${code}" is valid`,
          description: conditions.length
            ? `Active and redeemable, subject to: ${conditions.join(', ')}.`
            : 'This coupon exists, is active, and is redeemable.',
        });
      } else {
        toast({
          title: `"${code}" is not usable`,
          description: result.reason || result.error || 'This coupon cannot be redeemed.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      // 404 → coupon doesn't exist; surface the backend message when present.
      // APIError (extends Error) carries the backend message on `.message`.
      const msg = error instanceof Error && error.message ? error.message : 'Coupon not found.';
      toast({ title: `"${code}" not found`, description: msg, variant: 'destructive' });
    } finally {
      setChecking(false);
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
        discount_type: fullCoupon.discount_type || 'percent',
        // Each nullable field maps to '' rather than the string "null" — the old
        // form stringified null and then posted NaN→0, which the model's
        // MinValueValidator(1) rejected, making fixed coupons unsaveable.
        discount_percent: fullCoupon.discount_percent != null
          ? String(fullCoupon.discount_percent) : '',
        discount_amount: fullCoupon.discount_amount != null
          ? String(fullCoupon.discount_amount) : '',
        assigned_user: fullCoupon.assigned_user ?? null,
        assigned_user_email: fullCoupon.assigned_user_email ?? null,
        minimum_order_amount: Number(fullCoupon.minimum_order_amount) > 0
          ? String(fullCoupon.minimum_order_amount) : '',
        max_usage: fullCoupon.max_usage != null ? String(fullCoupon.max_usage) : '',
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
    setFormData(EMPTY_FORM);
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

  /** The conditions cell: minimum order and usage cap, whichever are set. */
  const conditionLines = (coupon: Coupon) => {
    const lines: string[] = [];
    const min = Number(coupon.minimum_order_amount);
    if (min > 0) lines.push(`Min order ₹${min.toLocaleString('en-IN')}`);
    lines.push(coupon.max_usage != null
      ? `Used ${coupon.usage_count}/${coupon.max_usage}`
      : `Used ${coupon.usage_count} · no cap`);
    return lines;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <CardTitle>Check a Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <Label htmlFor="check-code">Coupon code</Label>
              <Input
                id="check-code"
                value={checkCode}
                onChange={(e) => setCheckCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCheckCode(); } }}
                placeholder="SAVE20"
                className="font-mono"
              />
            </div>
            <Button type="button" onClick={handleCheckCode} disabled={checking || !checkCode.trim()}>
              {checking ? 'Checking…' : 'Check'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Verify a code exists and is redeemable (active, not expired, under its usage limit).
            Customer restrictions and minimum-order amounts are reported but not treated
            as failures — they depend on who is buying.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
        </CardHeader>
        <CardContent
          className={`overflow-x-auto transition-opacity ${refreshing ? 'opacity-60' : 'opacity-100'}`}
        >
          {isInitialLoading ? <TableSkeleton rows={5} columns={7} /> : (
          <>
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Available to</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium font-mono">{coupon.code}</TableCell>
                  <TableCell className="text-green-600 font-semibold whitespace-nowrap">
                    {formatDiscount(coupon)}
                  </TableCell>
                  <TableCell>
                    {coupon.assigned_user ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                        title={`Only ${coupon.assigned_user_email || `customer #${coupon.assigned_user}`} can redeem this code`}
                      >
                        <User className="h-3 w-3 shrink-0" />
                        <span className="max-w-[180px] truncate">
                          {coupon.assigned_user_email || `Customer #${coupon.assigned_user}`}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" /> Everyone
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs text-muted-foreground">
                      {conditionLines(coupon).map(line => <span key={line}>{line}</span>)}
                    </div>
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
          </>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}</DialogTitle>
            <DialogDescription>
              {editingCoupon ? 'Update coupon details' : 'Create a new discount coupon'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label htmlFor="discount_type">Discount Type *</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(v) => setFormData({ ...formData, discount_type: v as DiscountType })}
                >
                  <SelectTrigger id="discount_type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formData.discount_type === 'percent' ? (
                <div>
                  <Label htmlFor="discount_percent">Discount Percentage * (%)</Label>
                  <Input
                    id="discount_percent"
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                    placeholder="10"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Whole number between 1 and 100
                  </p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="discount_amount">Discount Amount * (₹)</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                    placeholder="100"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Flat ₹ off, capped at the order subtotal
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="minimum_order_amount">Minimum Order Amount (₹)</Label>
                <Input
                  id="minimum_order_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minimum_order_amount}
                  onChange={(e) => setFormData({ ...formData, minimum_order_amount: e.target.value })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for no minimum
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_usage">Maximum Uses</Label>
                <Input
                  id="max_usage"
                  type="number"
                  step="1"
                  min="1"
                  value={formData.max_usage}
                  onChange={(e) => setFormData({ ...formData, max_usage: e.target.value })}
                  placeholder="Unlimited"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editingCoupon
                    ? `Redeemed ${editingCoupon.usage_count} time(s) so far. Set 1 for a single-use coupon.`
                    : 'Total redemptions across all customers. Set 1 for a single-use coupon.'}
                </p>
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
            </div>

            <div>
              <Label htmlFor="assigned_user">Restrict to One Customer</Label>
              <CustomerPicker
                id="assigned_user"
                value={formData.assigned_user}
                valueLabel={formData.assigned_user_email}
                onChange={(id, email) =>
                  setFormData({ ...formData, assigned_user: id, assigned_user_email: email })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty and any customer can redeem the code. Pick someone and only
                that account can — everyone else is told the coupon isn't available to them.
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
