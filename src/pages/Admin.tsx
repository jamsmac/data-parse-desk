import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { UsersTable } from "@/components/admin/UsersTable";
import { SystemLogsTable } from "@/components/admin/SystemLogsTable";
import { Shield } from "lucide-react";

export default function Admin() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Панель Администратора</h1>
        </div>
        <p className="text-muted-foreground">
          Управление пользователями, кредитами и системной статистикой
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="dashboard">Статистика</TabsTrigger>
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="logs">Логи</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <DashboardStats />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UsersTable />
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <SystemLogsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
