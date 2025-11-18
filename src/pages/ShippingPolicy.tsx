import { useEffect, useState } from 'react';
import { getPolicy, updatePolicy } from '@/api/policies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

const ShippingPolicy = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const response = await getPolicy('shipping');
      setContent(response.data.content);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load shipping policy',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePolicy('shipping', content);
      toast({
        title: 'Success',
        description: 'Shipping policy updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save shipping policy',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shipping Policy</h1>
          <p className="text-muted-foreground">Manage your store's shipping policy</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policy Content</CardTitle>
          <CardDescription>
            Edit your shipping policy. This will be displayed to customers during checkout.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your shipping policy here..."
            className="min-h-[500px] font-mono"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ShippingPolicy;
