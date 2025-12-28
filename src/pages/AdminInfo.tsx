import { useEffect, useState } from 'react';
import { getAdminInfo, updateAdminInfo, AdminInfo as AdminInfoType } from '@/api/admin';
import { 
  getReceivableAccounts, 
  createReceivableAccount, 
  updateReceivableAccount, 
  ReceivableAccount 
} from '@/api/receivableAccounts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, User, Loader2, CreditCard } from 'lucide-react';

const AdminInfo = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [accountData, setAccountData] = useState<ReceivableAccount | null>(null);
  const [accountForm, setAccountForm] = useState({
    account_holder_name: '',
    upi_id: '',
    bank_name: '',
    bank_account_number: '',
    ifsc_code: '',
    branch_name: '',
    contact_email: '',
    contact_phone: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [adminResponse, accountsResponse] = await Promise.all([
        getAdminInfo(),
        getReceivableAccounts()
      ]);

      const adminData = adminResponse.data;
      setFormData({
        first_name: adminData.first_name || '',
        last_name: adminData.last_name || '',
        email: adminData.email || '',
        username: adminData.username || '',
        phone: adminData.phone || '',
        address: adminData.address || '',
        city: adminData.city || '',
        state: adminData.state || '',
        pincode: adminData.pincode || '',
      });

      // Use first receivable account if exists
      if (accountsResponse.data && accountsResponse.data.length > 0) {
        const acc = accountsResponse.data[0];
        setAccountData(acc);
        setAccountForm({
          account_holder_name: acc.account_holder_name || '',
          upi_id: acc.upi_id || '',
          bank_name: acc.bank_name || '',
          bank_account_number: acc.bank_account_number || '',
          ifsc_code: acc.ifsc_code || '',
          branch_name: acc.branch_name || '',
          contact_email: acc.contact_email || '',
          contact_phone: acc.contact_phone || '',
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin info',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updateData: Partial<AdminInfoType> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      };

      await updateAdminInfo(updateData);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    try {
      if (accountData?.id) {
        await updateReceivableAccount(accountData.id, accountForm);
      } else {
        const newAccount = await createReceivableAccount(accountForm);
        setAccountData(newAccount);
      }
      toast({
        title: 'Success',
        description: 'Payment details saved successfully',
      });
    } catch (error) {
      console.error('Failed to save payment details:', error);
      toast({
        title: 'Error',
        description: 'Failed to save payment details',
        variant: 'destructive',
      });
    } finally {
      setSavingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile and payment details</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>Your personal information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={formData.email} disabled className="bg-muted" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Payment/Receivable Account Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-full">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>Your UPI and bank account for receiving payments</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                <Input
                  id="account_holder_name"
                  value={accountForm.account_holder_name}
                  onChange={(e) => setAccountForm({ ...accountForm, account_holder_name: e.target.value })}
                  required
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="upi_id">UPI ID *</Label>
                <Input
                  id="upi_id"
                  value={accountForm.upi_id}
                  onChange={(e) => setAccountForm({ ...accountForm, upi_id: e.target.value })}
                  required
                  placeholder="name@upi"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={accountForm.bank_name}
                  onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                  placeholder="State Bank of India"
                />
              </div>
              <div>
                <Label htmlFor="branch_name">Branch Name</Label>
                <Input
                  id="branch_name"
                  value={accountForm.branch_name}
                  onChange={(e) => setAccountForm({ ...accountForm, branch_name: e.target.value })}
                  placeholder="Main Branch"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bank_account_number">Bank Account Number</Label>
                <Input
                  id="bank_account_number"
                  value={accountForm.bank_account_number}
                  onChange={(e) => setAccountForm({ ...accountForm, bank_account_number: e.target.value })}
                  placeholder="1234567890"
                />
              </div>
              <div>
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <Input
                  id="ifsc_code"
                  value={accountForm.ifsc_code}
                  onChange={(e) => setAccountForm({ ...accountForm, ifsc_code: e.target.value.toUpperCase() })}
                  placeholder="SBIN0001234"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={accountForm.contact_email}
                  onChange={(e) => setAccountForm({ ...accountForm, contact_email: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={accountForm.contact_phone}
                  onChange={(e) => setAccountForm({ ...accountForm, contact_phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <Button type="submit" disabled={savingAccount} className="bg-green-600 hover:bg-green-700">
              {savingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {savingAccount ? 'Saving...' : 'Save Payment Details'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInfo;
