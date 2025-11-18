import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Layers,
  Network,
  ShoppingCart,
  Trash2,
  Ticket,
  Truck,
  RotateCcw,
  User,
  MessageSquare,
  LogOut,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Products', url: '/products', icon: Package },
  { title: 'Combos', url: '/combos', icon: Layers },
  { title: 'Product Graph', url: '/graph', icon: Network },
  { title: 'Orders', url: '/orders', icon: ShoppingCart },
  { title: 'Recycle Bin', url: '/recycle-bin', icon: Trash2 },
  { title: 'Coupons', url: '/coupons', icon: Ticket },
  { title: 'Shipping Policy', url: '/shipping-policy', icon: Truck },
  { title: 'Return Policy', url: '/return-policy', icon: RotateCcw },
  { title: 'Admin Info', url: '/admin-info', icon: User },
  { title: 'Chat Support', url: '/chat', icon: MessageSquare },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { logout } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar className="transition-all duration-300">
      <SidebarContent>
        <div className="p-4">
          <div className="flex items-center gap-3">
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-sidebar-foreground">Admin Panel</h1>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={cn(isCollapsed && 'sr-only')}>
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent',
                        isActive(item.url) && 'bg-sidebar-accent text-sidebar-primary'
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-destructive transition-colors hover:bg-sidebar-accent"
                  >
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span>Logout</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
