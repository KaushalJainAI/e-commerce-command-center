import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BarChart3,
  Package,
  Layers,
  FolderOpen,
  LayoutList,
  Star,
  Table2,
  ShoppingCart,
  Receipt,
  Ticket,
  User,
  Users,
  MessagesSquare,
  Mail,
  Trash2,
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
  { title: 'Insights', url: '/insights', icon: BarChart3 },
  { title: 'Products', url: '/products', icon: Package },
  { title: 'Categories', url: '/categories', icon: FolderOpen },
  { title: 'Sections', url: '/sections', icon: LayoutList },
  { title: 'Combos', url: '/combos', icon: Layers },
  { title: 'Reviews', url: '/reviews', icon: Star },
  { title: 'Bulk Price & Stock', url: '/bulk-edit', icon: Table2 },
  { title: 'Orders', url: '/orders', icon: ShoppingCart },
  { title: 'GST / HSN', url: '/gst', icon: Receipt },
  { title: 'Customers', url: '/customers', icon: Users },
  { title: 'Coupons', url: '/coupons', icon: Ticket },
  { title: 'Recycle Bin', url: '/recycle-bin', icon: Trash2 },
  { title: 'Admin Info', url: '/admin-info', icon: User },
  { title: 'Contact', url: '/contact', icon: Mail },
  { title: 'Conversations', url: '/conversations', icon: MessagesSquare },
];

export function AdminSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const { logout, user } = useAuth();
  const currentPath = location.pathname;

  // Match sub-routes too: on /customers/5 the "Customers" item must still read
  // as the current section (exact equality left the whole menu unhighlighted).
  const isActive = (path: string) =>
    currentPath === path || currentPath.startsWith(`${path}/`);
  const isCollapsed = state === 'collapsed';

  // On phones the sidebar is a drawer over the page. Tapping a link used to
  // navigate *behind* it, leaving the admin looking at the menu they just used
  // and having to dismiss it by hand.
  const closeOnMobile = () => { if (isMobile) setOpenMobile(false); };

  // Get display name from user profile
  const displayName = user 
    ? (user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}` 
        : user.username || user.email)
    : 'Admin';

  return (
    <Sidebar className="transition-all duration-300">
      <SidebarContent>
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
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
                      onClick={closeOnMobile}
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
