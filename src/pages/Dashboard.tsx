import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getDashboardStats, DashboardStats,
  getDashboardActions, DashboardActions,
} from '@/api/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package, ShoppingCart, MessagesSquare, AlertTriangle,
  IndianRupee, PackageCheck, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/** One "needs your attention" card: plain sentence + a button that jumps
 *  straight to the pre-filtered page where the admin can act. */
interface ActionItem {
  key: string;
  count: number;
  sentence: string;
  buttonLabel: string;
  to: string;
  icon: typeof ShoppingCart;
  urgent?: boolean;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [actions, setActions] = useState<DashboardActions | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, actionsRes] = await Promise.all([
          getDashboardStats(),
          getDashboardActions(),
        ]);
        setStats(statsRes.data);
        setActions(actionsRes.data);
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load dashboard',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    // Keep the inbox fresh while the page is open.
    const timer = setInterval(async () => {
      try {
        const res = await getDashboardActions();
        setActions(res.data);
      } catch { /* silent — next tick will retry */ }
    }, 60_000);
    return () => clearInterval(timer);
  }, [toast]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
  }

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const actionItems: ActionItem[] = !actions ? [] : [
    {
      key: 'confirm',
      count: actions.orders_to_confirm,
      sentence: `${plural(actions.orders_to_confirm, 'new order')} waiting for you to confirm.`,
      buttonLabel: 'Confirm orders',
      to: '/orders?status=pending',
      icon: ShoppingCart,
      urgent: true,
    },
    {
      key: 'ship',
      count: actions.orders_to_ship,
      sentence: `${plural(actions.orders_to_ship, 'order')} to pack and ship.`,
      buttonLabel: 'View orders',
      to: '/orders?status=confirmed',
      icon: PackageCheck,
    },
    {
      key: 'stock',
      count: actions.low_stock_count,
      sentence: `${plural(actions.low_stock_count, 'product')} almost out of stock${
        actions.low_stock_items.length
          ? ` — ${actions.low_stock_items.slice(0, 3).map(i => i.name).join(', ')}${actions.low_stock_count > 3 ? '…' : ''}`
          : ''
      }.`,
      buttonLabel: 'Restock products',
      to: '/products?stock=low',
      icon: Package,
    },
    {
      key: 'chats',
      count: actions.chats_waiting,
      sentence: `${plural(actions.chats_waiting, 'customer')} waiting for a chat reply.`,
      buttonLabel: 'Reply now',
      to: '/conversations',
      icon: MessagesSquare,
      urgent: true,
    },
    {
      key: 'stuck',
      count: actions.stuck_payments,
      sentence: `${plural(actions.stuck_payments, 'online payment')} looking stuck — these fix themselves automatically, but keep an eye out.`,
      buttonLabel: 'View orders',
      to: '/orders?status=pending',
      icon: AlertTriangle,
    },
  ].filter(item => item.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}!</h1>
        <p className="text-muted-foreground">Here's how your store is doing today.</p>
      </div>

      {/* Today at a glance */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's sales</CardTitle>
            <IndianRupee className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{Number(actions?.today_revenue || 0).toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's orders</CardTitle>
            <ShoppingCart className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{actions?.today_orders ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Action inbox */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Needs your attention</h2>
        {actionItems.length === 0 ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
            <CardContent className="flex items-center gap-3 py-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold">All caught up! 🎉</p>
                <p className="text-sm text-muted-foreground">
                  Nothing needs your attention right now.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {actionItems.map(item => (
              <Card key={item.key} className={item.urgent ? 'border-amber-300' : undefined}>
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon className={`h-6 w-6 flex-shrink-0 ${item.urgent ? 'text-amber-600' : 'text-primary'}`} />
                    <p className="font-medium">{item.sentence}</p>
                  </div>
                  <Button onClick={() => navigate(item.to)} className="flex-shrink-0">
                    {item.buttonLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">{order.customerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{Number(order.totalAmount).toFixed(2)}</p>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground">No recent orders</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
