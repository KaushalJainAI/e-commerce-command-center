import { useEffect, useState } from 'react';
import { getPolicy, updatePolicy } from '@/api/policies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

const ReturnPolicy = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const response = await getPolicy('return');
      setContent(response.data.content);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load return policy',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePolicy('return', content);
      toast({
        title: 'Success',
        description: 'Return policy updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save return policy',
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
          <h1 className="text-3xl font-bold">Return Policy</h1>
          <p className="text-muted-foreground">Manage your store's return policy</p>
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
            Edit your return policy. This will be displayed to customers on your store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your return policy here..."
            className="min-h-[500px] font-mono"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ReturnPolicy;
