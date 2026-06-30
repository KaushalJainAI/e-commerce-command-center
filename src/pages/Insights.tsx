import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDateRange } from '@/hooks/useDateRange';
import { InsightsToolbar } from '@/components/insights/InsightsToolbar';
import { OverviewTab } from '@/components/insights/tabs/OverviewTab';
import { SalesTab } from '@/components/insights/tabs/SalesTab';
import { FunnelTab } from '@/components/insights/tabs/FunnelTab';
import { SearchTab } from '@/components/insights/tabs/SearchTab';
import { CustomersTab } from '@/components/insights/tabs/CustomersTab';
import { AnonymousTab } from '@/components/insights/tabs/AnonymousTab';

const Insights = () => {
  const controls = useDateRange();
  const { range, previousRange, compare } = controls;
  const queryClient = useQueryClient();

  // Manual refresh: invalidate all insights queries so they refetch.
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['insights'] });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Insights</h1>
          <p className="text-muted-foreground">Sales and behavioral analytics</p>
        </div>
        <InsightsToolbar controls={controls} onRefresh={refresh} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="anonymous">Potential Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab range={range} /></TabsContent>
        <TabsContent value="sales">
          <SalesTab range={range} previousRange={previousRange} compare={compare} />
        </TabsContent>
        <TabsContent value="funnel"><FunnelTab range={range} /></TabsContent>
        <TabsContent value="search"><SearchTab range={range} /></TabsContent>
        <TabsContent value="customers"><CustomersTab range={range} /></TabsContent>
        <TabsContent value="anonymous"><AnonymousTab range={range} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Insights;
