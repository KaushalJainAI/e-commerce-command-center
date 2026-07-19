import { useEffect, useState } from 'react';
import { getAllReviews, setReviewHidden, deleteReview, Review, PaginatedReviews } from '@/api/reviews';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Star, EyeOff, Eye, Trash2 } from 'lucide-react';

const PAGE_SIZE = 12; // matches backend REST_FRAMEWORK PAGE_SIZE

const Stars = ({ rating }: { rating: number }) => (
  <span className="inline-flex">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} className={`h-4 w-4 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
    ))}
  </span>
);

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchReviews = async () => {
    try {
      const res = await getAllReviews(page);
      if (Array.isArray(res.data)) {
        setReviews(res.data);
        setTotalCount(res.data.length);
      } else {
        const data = res.data as PaginatedReviews;
        setReviews(data.results || []);
        setTotalCount(data.count || 0);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load reviews', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleHidden = async (review: Review) => {
    const hiding = !review.is_hidden;
    if (hiding && !confirm(`Hide this review of "${review.item_name}" from the store? The customer keeps their review, but other shoppers won't see it.`)) return;
    try {
      await setReviewHidden(review.id, hiding);
      setReviews(prev => prev.map(r => (r.id === review.id ? { ...r, is_hidden: hiding } : r)));
      toast({
        title: hiding ? 'Hidden' : 'Visible again',
        description: hiding ? 'Shoppers will no longer see this review.' : 'This review is shown in the store again.',
      });
    } catch {
      toast({ title: 'Error', description: 'Could not update the review.', variant: 'destructive' });
    }
  };

  const handleDelete = async (review: Review) => {
    if (!confirm(`Permanently delete this review of "${review.item_name}"? This cannot be undone — hiding is usually enough.`)) return;
    try {
      await deleteReview(review.id);
      toast({ title: 'Deleted', description: 'The review has been removed.' });
      fetchReviews();
    } catch {
      toast({ title: 'Error', description: 'Could not delete the review.', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground">
          What customers say about your products. Hide a review to remove it from the store without deleting it.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>All Reviews</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Shown?</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No reviews yet.
                  </TableCell>
                </TableRow>
              )}
              {reviews.map(review => (
                <TableRow key={review.id} className={review.is_hidden ? 'opacity-60' : undefined}>
                  <TableCell className="font-medium">{review.item_name}</TableCell>
                  <TableCell><Stars rating={review.rating} /></TableCell>
                  <TableCell className="max-w-[280px]">
                    <p className="font-medium truncate">{review.title}</p>
                    {review.comment && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{review.comment}</p>
                    )}
                  </TableCell>
                  <TableCell>{review.user_name}</TableCell>
                  <TableCell>{new Date(review.created_at).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>
                    {review.is_hidden
                      ? <span className="text-muted-foreground text-sm">Hidden</span>
                      : <span className="text-green-600 text-sm">Shown</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => toggleHidden(review)}
                      title={review.is_hidden ? 'Show in store' : 'Hide from store'}>
                      {review.is_hidden
                        ? <Eye className="h-4 w-4 text-green-600" />
                        : <EyeOff className="h-4 w-4 text-amber-600" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(review)}
                      title="Delete permanently">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} reviews)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reviews;
