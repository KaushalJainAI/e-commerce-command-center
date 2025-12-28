import { useEffect, useState } from 'react';
import { 
  getContactSubmissions, 
  updateContactSubmission, 
  markContactAsRead,
  replyToContact,
  deleteContactSubmission,
  ContactSubmission 
} from '@/api/support';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Eye, Trash2, Mail, Reply, CheckCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

type StatusFilter = 'all' | 'new' | 'read' | 'replied' | 'closed';

const ContactSubmissions = () => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingSubmission, setViewingSubmission] = useState<ContactSubmission | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyNotes, setReplyNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await getContactSubmissions();
      // Handle both array and paginated response
      const data = Array.isArray(response.data) 
        ? response.data 
        : (response.data as any).results || [];
      setSubmissions(data);
    } catch (error) {
      console.error('Failed to load submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contact submissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (submission: ContactSubmission) => {
    try {
      await markContactAsRead(submission.id);
      toast({ title: 'Success', description: 'Marked as read' });
      fetchSubmissions();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark as read',
        variant: 'destructive',
      });
    }
  };

  const handleReply = async () => {
    if (!viewingSubmission) return;
    try {
      await replyToContact(viewingSubmission.id, replyNotes);
      toast({ title: 'Success', description: 'Reply saved' });
      setReplyDialogOpen(false);
      setReplyNotes('');
      fetchSubmissions();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save reply',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (submission: ContactSubmission) => {
    if (!confirm(`Delete submission from "${submission.name}"?`)) return;
    try {
      await deleteContactSubmission(submission.id);
      toast({ title: 'Success', description: 'Submission deleted' });
      fetchSubmissions();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete submission',
        variant: 'destructive',
      });
    }
  };

  const openViewDialog = (submission: ContactSubmission) => {
    setViewingSubmission(submission);
    setDialogOpen(true);
    // Auto-mark as read when viewing
    if (submission.status === 'new') {
      handleMarkRead(submission);
    }
  };

  const openReplyDialog = (submission: ContactSubmission) => {
    setViewingSubmission(submission);
    setReplyNotes(submission.admin_notes || '');
    setReplyDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      new: { variant: 'default', label: 'New' },
      read: { variant: 'secondary', label: 'Read' },
      replied: { variant: 'outline', label: 'Replied' },
      closed: { variant: 'outline', label: 'Closed' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredSubmissions = submissions.filter(s => 
    statusFilter === 'all' || s.status === statusFilter
  );

  const newCount = submissions.filter(s => s.status === 'new').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contact Submissions</h1>
          <p className="text-muted-foreground">
            Manage messages from the contact form
            {newCount > 0 && (
              <Badge variant="destructive" className="ml-2">{newCount} new</Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchSubmissions}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Messages ({filteredSubmissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No submissions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id} className={submission.status === 'new' ? 'bg-primary/5' : ''}>
                    <TableCell className="font-medium">{submission.name}</TableCell>
                    <TableCell>{submission.email}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{submission.subject}</TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    <TableCell>{format(new Date(submission.created_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openViewDialog(submission)} title="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openReplyDialog(submission)} title="Reply">
                        <Reply className="h-4 w-4" />
                      </Button>
                      {submission.status === 'new' && (
                        <Button variant="ghost" size="icon" onClick={() => handleMarkRead(submission)} title="Mark as read">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(submission)}
                        className="text-destructive hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>
              From {viewingSubmission?.name} • {viewingSubmission?.created_at && format(new Date(viewingSubmission.created_at), 'dd MMM yyyy, hh:mm a')}
            </DialogDescription>
          </DialogHeader>
          {viewingSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{viewingSubmission.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{viewingSubmission.phone || 'N/A'}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Subject</Label>
                <p className="font-medium">{viewingSubmission.subject}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Message</Label>
                <p className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap">{viewingSubmission.message}</p>
              </div>
              {viewingSubmission.admin_notes && (
                <div>
                  <Label className="text-muted-foreground">Admin Notes</Label>
                  <p className="mt-1 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-green-800 dark:text-green-300 whitespace-pre-wrap">
                    {viewingSubmission.admin_notes}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setDialogOpen(false); openReplyDialog(viewingSubmission!); }}>
              <Reply className="h-4 w-4 mr-2" /> Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to {viewingSubmission?.name}</DialogTitle>
            <DialogDescription>
              Add notes about your reply. This will also mark the submission as replied.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reply-notes">Admin Notes</Label>
              <Textarea
                id="reply-notes"
                value={replyNotes}
                onChange={(e) => setReplyNotes(e.target.value)}
                placeholder="e.g., Replied via email on 25 Dec..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReply}>Save Reply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactSubmissions;
