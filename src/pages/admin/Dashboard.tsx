import { Users, Package, ShoppingCart, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/admin/AdminLayout";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const stats = [
    {
      title: "Total Users",
      value: "1,247",
      change: "+12%",
      icon: Users,
      color: "text-primary"
    },
    {
      title: "Active Listings",
      value: "324",
      change: "+8%",
      icon: Package,
      color: "text-accent"
    },
    {
      title: "Orders Today",
      value: "89",
      change: "+23%",
      icon: ShoppingCart,
      color: "text-secondary"
    },
    {
      title: "Revenue (GHS)",
      value: "45,678",
      change: "+15%",
      icon: TrendingUp,
      color: "text-primary"
    }
  ];

  const recentActivity = [
    { id: 1, action: "New farmer registration", user: "Kwame Asante", time: "2 hours ago", status: "success" },
    { id: 2, action: "Crop listing expired", item: "Tomatoes - 50kg", time: "4 hours ago", status: "warning" },
    { id: 3, action: "Order completed", order: "#1234", time: "6 hours ago", status: "success" },
    { id: 4, action: "Payment processed", amount: "GHS 234", time: "8 hours ago", status: "success" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage your AgroFresh GH platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-primary">{stat.change}</span> from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions on your platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {activity.status === "success" ? (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-accent" />
                    )}
                    <div>
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.user || activity.item || activity.order || activity.amount}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage farmers and vendors</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate('/admin/users')}>View All Users</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Crop Listings</CardTitle>
              <CardDescription>Monitor active listings</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" onClick={() => navigate('/admin/crops')}>Manage Listings</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure platform settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary" onClick={() => navigate('/admin/settings')}>Open Settings</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
