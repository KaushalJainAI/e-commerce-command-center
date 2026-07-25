import { Outlet } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { GlobalSearch } from './GlobalSearch';

const AdminLayout = () => {
  // Any in-flight query anywhere in the panel. Pages no longer blank themselves
  // while loading, so this thin bar is what tells the admin work is happening.
  const fetching = useIsFetching() > 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-10 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b bg-background px-3 sm:px-6">
            <div
              aria-hidden
              className={`absolute inset-x-0 top-0 h-0.5 bg-primary transition-opacity duration-200 ${
                fetching ? 'animate-pulse opacity-100' : 'opacity-0'
              }`}
            />
            <SidebarTrigger />
            <h2 className="hidden md:block text-sm sm:text-lg font-semibold truncate">E-Commerce Admin</h2>
            <GlobalSearch />
          </header>
          <main className="flex-1 p-3 sm:p-6 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
