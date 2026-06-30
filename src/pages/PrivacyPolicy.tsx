import { useEffect, useState } from 'react';
import { getPolicy, updatePolicy } from '@/api/policies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const PrivacyPolicy = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const response = await getPolicy('privacy');
      setContent(response.data.content || '');
      setNotConfigured(false);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setNotConfigured(true);
        setContent('');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load privacy policy',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'Policy content cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await updatePolicy('privacy', content);
      setNotConfigured(false);
      toast({
        title: 'Success',
        description: notConfigured ? 'Privacy policy created successfully' : 'Privacy policy updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save privacy policy',
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
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground">Shown to customers at signup and in the footer</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : notConfigured ? 'Create Policy' : 'Save Changes'}
        </Button>
      </div>

      {notConfigured && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Policy Not Configured</AlertTitle>
          <AlertDescription>
            No privacy policy has been created yet. Enter your policy content below and click "Create Policy" to set it up.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Policy Content</CardTitle>
          <CardDescription>
            Edit your privacy policy. It should describe what data you collect — including
            logged-in behavioral tracking for recommendations and anonymous aggregate analytics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your privacy policy here..."
            className="min-h-[500px] font-mono"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;
