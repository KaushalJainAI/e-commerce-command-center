import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getCustomers, getCustomer, Customer, CustomerDetail,
} from '@/api/customers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, ArrowLeft, Phone, Mail, MapPin, MessageCircle, Download, ChevronRight } from 'lucide-react';
import { exportCustomersCsv } from '@/api/bulk';
import { useIsMobile } from '@/hooks/use-mobile';

const PAGE_SIZE = 12; // matches backend REST_FRAMEWORK PAGE_SIZE

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** wa.me link — WhatsApp wants digits only, with country code (assume India). */
const waLink = (phone: string | null) => {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const withCc = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCc}`;
};

const Customers = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // List mode: refetch when search (debounced) or page changes.
  useEffect(() => {
    if (id) return;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await getCustomers(search, page);
        setCustomers(res.data.results || []);
        setTotalCount(res.data.count || 0);
      } catch {
        toast({ title: 'Error', description: 'Failed to load customers', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [id, search, page, toast]);

  // Detail mode.
  useEffect(() => {
    if (!id) { setDetail(null); return; }
    setLoading(true);
    getCustomer(id)
      .then(res => setDetail(res.data))
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load customer', variant: 'destructive' });
        navigate('/customers');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, toast]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
  }

  // ---------- Detail view ----------
  if (id && detail) {
    const wa = waLink(detail.phone);
    return (
      <div className="space-y-6 p-6">
        <Button variant="ghost" onClick={() => navigate('/customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> All customers
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{detail.name}</h1>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {detail.email}</p>
              {detail.phone && (
                <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {detail.phone}</p>
              )}
              {detail.address && (
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {detail.address}</p>
              )}
              <p>Customer since {formatDate(detail.created_at)}</p>
            </div>
          </div>
          {wa && (
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <a href={wa} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
              </a>
            </Button>
          )}
        </div>

        <div className="grid gap-4 grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Orders placed</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{detail.order_count}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total spent</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">₹{Number(detail.total_spent).toLocaleString('en-IN')}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Order history</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            {detail.orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No orders yet.</p>
            ) : (
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.orders.map(o => (
                    <TableRow
                      key={o.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/orders?search=${o.id}`)}
                    >
                      <TableCell className="font-medium">{o.order_number}</TableCell>
                      <TableCell>{formatDate(o.created_at)}</TableCell>
                      <TableCell>{o.payment_method || '—'}</TableCell>
                      <TableCell className="capitalize">{o.status}</TableCell>
                      <TableCell className="text-right font-mono">₹{o.total_amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- List view ----------
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Find a customer by name, phone, or email to see their orders.
          </p>
        </div>
        <Button variant="outline" onClick={() => exportCustomersCsv()}>
          <Download className="mr-2 h-4 w-4" /> Export to Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, or email…"
              className="pl-8"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {customers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {search ? 'No customers match your search.' : 'No customers yet.'}
            </p>
          ) : isMobile ? (
            // Mobile: stacked cards instead of a wide horizontally-scrolling table.
            <div className="space-y-2">
              {customers.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="flex w-full items-center justify-between rounded-lg border p-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.phone || c.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.order_count} order{c.order_count === 1 ? '' : 's'} · ₹{Number(c.total_spent).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead className="text-right">Total spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map(c => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/customers/${c.id}`)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">{c.phone || '—'}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </TableCell>
                    <TableCell>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</TableCell>
                    <TableCell>{c.order_count}</TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{Number(c.total_spent).toLocaleString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} customers)
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

export default Customers;
