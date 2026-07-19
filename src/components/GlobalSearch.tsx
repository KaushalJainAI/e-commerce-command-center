import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSearch, GlobalSearchResults } from '@/api/adminSearch';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart, Package, User, Ticket, Loader2 } from 'lucide-react';

/** One search box for the whole panel: type an order number, customer name or
 *  phone, product, or coupon code — click a result to jump to it. */
export const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounced fetch: wait for the admin to stop typing.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await globalSearch(q);
        setResults(res.data);
        setOpen(true);
      } catch {
        setResults(null);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close when clicking anywhere else.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  const isEmpty =
    results &&
    !results.orders.length && !results.products.length &&
    !results.customers.length && !results.coupons.length;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="py-1">
      <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );

  const Row = ({ icon: Icon, main, sub, onClick }: {
    icon: typeof Search; main: string; sub?: string; onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
    >
      <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <span className="truncate font-medium">{main}</span>
      {sub && <span className="ml-auto flex-shrink-0 text-xs text-muted-foreground">{sub}</span>}
    </button>
  );

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative">
        {searching
          ? <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          : <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />}
        <Input
          placeholder="Search orders, products, customers…"
          className="pl-8 h-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results) setOpen(true); }}
        />
      </div>

      {open && results && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-[70vh] overflow-y-auto rounded-md border bg-popover shadow-lg">
          {isEmpty && (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">
              Nothing found for “{query.trim()}”.
            </p>
          )}
          {results.orders.length > 0 && (
            <Section title="Orders">
              {results.orders.map(o => (
                <Row
                  key={`o-${o.id}`}
                  icon={ShoppingCart}
                  main={`${o.order_number} — ${o.customer}`}
                  sub={`₹${o.total} · ${o.status}`}
                  onClick={() => go(`/orders?search=${o.id}`)}
                />
              ))}
            </Section>
          )}
          {results.products.length > 0 && (
            <Section title="Products">
              {results.products.map(p => (
                <Row
                  key={`p-${p.id}`}
                  icon={Package}
                  main={p.name}
                  sub={`₹${p.price} · ${p.stock} in stock`}
                  onClick={() => go(`/products?search=${encodeURIComponent(p.name)}`)}
                />
              ))}
            </Section>
          )}
          {results.customers.length > 0 && (
            <Section title="Customers">
              {results.customers.map(c => (
                <Row
                  key={`c-${c.id}`}
                  icon={User}
                  main={c.name}
                  sub={c.phone || c.email}
                  onClick={() => go(`/customers/${c.id}`)}
                />
              ))}
            </Section>
          )}
          {results.coupons.length > 0 && (
            <Section title="Coupons">
              {results.coupons.map(c => (
                <Row
                  key={`cp-${c.id}`}
                  icon={Ticket}
                  main={c.code}
                  sub={c.is_active ? 'active' : 'inactive'}
                  onClick={() => go('/coupons')}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
};
