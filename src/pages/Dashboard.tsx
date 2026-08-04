import { useNavigate } from 'react-router-dom';
import { useAdminData } from '@/hooks/useAdminData';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getDashboardStats, DashboardStats,
  getDashboardActions, DashboardActions,
} from '@/api/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package, ShoppingCart, MessagesSquare, AlertTriangle,
  IndianRupee, PackageCheck, CheckCircle2, ArrowRight, MailOpen, MessageCircle,
  Banknote, Receipt, Truck,
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

/** Mirrors the real dashboard's shape so the layout doesn't jump when data lands. */
const DashboardSkeleton = () => (
  <div className="space-y-6" aria-busy="true">
    <Skeleton className="h-9 w-64" />
    <div className="grid gap-4 grid-cols-2">
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
    <Skeleton className="h-6 w-48" />
    <div className="space-y-3">
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
    </div>
    <Skeleton className="h-48" />
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: stats, isInitialLoading: statsLoading } =
    useAdminData(['dashboard', 'stats'], () => getDashboardStats().then(r => r.data));
  // The action inbox polls itself so a new order shows up without a reload.
  const { data: actions, isInitialLoading: actionsLoading } = useAdminData(
    ['dashboard', 'actions'],
    () => getDashboardActions().then(r => r.data),
    { refetchInterval: 60_000 },
  );

  if (statsLoading || actionsLoading) {
    return <DashboardSkeleton />;
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
      key: 'unread-chats',
      count: actions.unread_chats,
      sentence: `${plural(actions.unread_chats, 'unread conversation')} — the customer wrote last and nobody has replied.`,
      buttonLabel: 'Open chats',
      to: '/conversations',
      icon: MessageCircle,
      urgent: true,
    },
    {
      key: 'contacts',
      count: actions.new_contacts,
      sentence: `${plural(actions.new_contacts, 'unread contact message')} from the Contact Us form.`,
      buttonLabel: 'Read messages',
      to: '/contact?status=new',
      icon: MailOpen,
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
            <p className="text-xs text-muted-foreground mt-1">
              Includes GST ₹{Number(actions?.today_gst_collected || 0).toLocaleString('en-IN')}
            </p>
            {/* The headline stays GROSS — it is what reconciles against gateway
                settlements — but gross alone reads as net, so the netted figure
                is stated whenever refunds actually moved it. */}
            {Number(actions?.today_revenue || 0) !== Number(actions?.today_net_revenue || 0) && (
              <p className="text-xs text-orange-600 mt-0.5">
                ₹{Number(actions?.today_net_revenue || 0).toLocaleString('en-IN')} net of refunds
              </p>
            )}
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

      {/* GST + delivery economics.
          The GST tile reports two FACTS and stops: what we sold, and what tax
          we collected on it. It deliberately does not answer "how much do I
          owe" — that needs input credit on every purchase (ingredients,
          packaging, courier, rent), none of which this system tracks. Deciding
          what to pay is the owner's call, made in their books. */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">GST collected this month</CardTitle>
            <Receipt className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {/* Lead with the NET figure — collected minus reversed by refunds —
                because that is the tax actually still in hand. The gross
                number is broken out underneath so the two reconcile. */}
            <div className="text-3xl font-bold">
              ₹{Number(actions?.mtd_gst_net_collected || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ₹{Number(actions?.today_gst_net_collected || 0).toLocaleString('en-IN')} today
            </p>
            <div className="mt-2 space-y-0.5 text-xs">
              {/* The sales side of the same fact: tax collected means nothing
                  without the value it was collected on. */}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sold (excl. GST)</span>
                <span>₹{Number(actions?.mtd_taxable_sales || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST collected on it</span>
                <span>₹{Number(actions?.mtd_gst_collected || 0).toLocaleString('en-IN')}</span>
              </div>
              {Number(actions?.mtd_gst_refunded || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Returned with refunds</span>
                  <span className="text-orange-600">
                    −₹{Number(actions.mtd_gst_refunded).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              {/* GST we PAID Razorpay on their fee — the one input credit this
                  system has evidence for. Listed separately, never subtracted:
                  netting one input out of many would turn an honest fact into
                  a fake payable. */}
              {Number(actions?.mtd_gateway_tax || 0) > 0 && (
                <div className="flex justify-between border-t pt-0.5">
                  <span className="text-muted-foreground">
                    GST you paid on gateway fees
                  </span>
                  <span className="text-green-600">
                    ₹{Number(actions.mtd_gateway_tax).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
              What you sold and the tax you took on it. <strong>This is not a
              payable figure</strong> — what you remit is this less input credit
              on your purchases, which lives in your books, not here. The
              gateway GST above is one such credit, shown for you to carry over.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivery today</CardTitle>
            <Truck className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Collected</span>
              <span className="font-semibold">
                ₹{Number(actions?.today_shipping_collected || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Courier cost</span>
              <span className="font-semibold">
                ₹{Number(actions?.today_shipping_cost || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-1">
              <span className="text-muted-foreground">Margin</span>
              <span
                className={
                  Number(actions?.today_shipping_margin || 0) >= 0
                    ? 'font-bold text-green-600'
                    : 'font-bold text-red-600'
                }
              >
                ₹{Number(actions?.today_shipping_margin || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              {actions?.today_shipping_cost_recorded
                ? `Avg ₹${Number(actions.today_avg_shipping_cost || 0).toLocaleString('en-IN')} across ${actions.today_shipping_cost_recorded} order${actions.today_shipping_cost_recorded === 1 ? '' : 's'} with a cost recorded.`
                : 'No courier costs recorded today — add them on each order to see real margin.'}
            </p>
          </CardContent>
        </Card>

        {/* COD cash. Revenue above is accrued at order date whether or not the
            money arrived; this tile is the other half — what is actually in
            hand. Cash sitting with a courier for weeks is the single easiest
            thing to lose track of in a COD business. */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">COD cash</CardTitle>
            <Banknote className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div
              className={`text-2xl font-bold ${
                Number(actions?.cod_pending_amount || 0) > 0 ? 'text-amber-600' : ''
              }`}
            >
              ₹{Number(actions?.cod_pending_amount || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground">
              Uncollected across {actions?.cod_pending_count || 0} dispatched order
              {actions?.cod_pending_count === 1 ? '' : 's'}
            </p>
            {!!actions?.cod_pending_aged_count && (
              <p className="text-xs font-medium text-red-600">
                {actions.cod_pending_aged_count} older than 7 days — chase these.
              </p>
            )}
            <div className="flex justify-between text-sm border-t pt-1">
              <span className="text-muted-foreground">Confirmed today</span>
              <span className="font-semibold text-green-600">
                ₹{Number(actions?.cod_collected_today || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              Tick <strong>Paid in cash</strong> on an order once the money is in
              hand. Until then it can't be refunded either.
            </p>
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
