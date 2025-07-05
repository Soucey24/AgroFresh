import { useState, useEffect } from "react";
import { Search, Filter, Eye, CheckCircle, XCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/admin/AdminLayout";
import { listOrders, getCrop, getUser, updateOrder } from "../../api";

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [cropDetails, setCropDetails] = useState<{[key: number]: any}>({});
  const [buyerDetails, setBuyerDetails] = useState<{[key: number]: any}>({});
  const [farmerDetails, setFarmerDetails] = useState<{[key: number]: any}>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    listOrders().then(async data => {
      if (Array.isArray(data)) {
        setOrders(data);
        // Fetch crop, buyer, and farmer details for each order
        const cropMap = {};
        const buyerMap = {};
        const farmerMap = {};
        for (const order of data) {
          if (order.crop_id && !cropMap[order.crop_id]) {
            const crop = await getCrop(order.crop_id);
            cropMap[order.crop_id] = crop;
            if (crop.farmer_id && !farmerMap[crop.farmer_id]) {
              farmerMap[crop.farmer_id] = await getUser(crop.farmer_id);
            }
          }
          if (order.buyer_id && !buyerMap[order.buyer_id]) {
            buyerMap[order.buyer_id] = await getUser(order.buyer_id);
          }
        }
        setCropDetails(cropMap);
        setBuyerDetails(buyerMap);
        setFarmerDetails(farmerMap);
      }
    });
  }, []);

  const filteredOrders = orders.filter(order =>
    (statusFilter === 'all' || order.status === statusFilter) &&
    (
      order.id.toString().includes(searchTerm) ||
      (order.crop?.toLowerCase?.().includes(searchTerm.toLowerCase()) ?? false) ||
      (order.farmer?.toLowerCase?.().includes(searchTerm.toLowerCase()) ?? false) ||
      (order.vendor?.toLowerCase?.().includes(searchTerm.toLowerCase()) ?? false)
    )
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-primary text-primary-foreground";
      case "In Transit":
        return "bg-accent text-accent-foreground";
      case "Pending":
        return "bg-secondary text-secondary-foreground";
      case "Cancelled":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="h-4 w-4" />;
      case "In Transit":
        return <Package className="h-4 w-4" />;
      case "Cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Order Management</h1>
            <p className="text-muted-foreground">Track and manage all orders on the platform</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders, crops, farmers, or vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={() => alert('Filter dialog coming soon!')}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Order Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">156</div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent">23</div>
              <p className="text-sm text-muted-foreground">In Transit</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-secondary">45</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-destructive">8</div>
              <p className="text-sm text-muted-foreground">Cancelled</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Filter */}
        <div className="mb-4 flex items-center gap-4">
          <label htmlFor="statusFilter">Filter by Status:</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Orders ({filteredOrders.length})</CardTitle>
            <CardDescription>Monitor all order activity on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <table className="min-w-full divide-y divide-border bg-card/40 backdrop-blur-sm rounded-lg">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Order #</th>
                    <th className="px-4 py-2 text-left">Crop</th>
                    <th className="px-4 py-2 text-left">Buyer</th>
                    <th className="px-4 py-2 text-left">Farmer</th>
                    <th className="px-4 py-2 text-left">Quantity</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="border-b">
                      <td className="px-4 py-2">{order.id}</td>
                      <td className="px-4 py-2 flex items-center gap-2">
                        {cropDetails[order.crop_id]?.image ? (
                          <img
                            src={cropDetails[order.crop_id].image.startsWith('http') ? cropDetails[order.crop_id].image : `http://localhost:4000${cropDetails[order.crop_id].image}`}
                            alt={cropDetails[order.crop_id]?.name}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={e => (e.currentTarget.style.display = 'none')}
                          />
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-xs">
                            No Image
                          </div>
                        )}
                        {cropDetails[order.crop_id]?.name || `Crop ID ${order.crop_id}`}
                      </td>
                      <td className="px-4 py-2">{buyerDetails[order.buyer_id]?.name || `ID ${order.buyer_id}`}</td>
                      <td className="px-4 py-2">{farmerDetails[cropDetails[order.crop_id]?.farmer_id]?.name || `ID ${cropDetails[order.crop_id]?.farmer_id}`}</td>
                      <td className="px-4 py-2">{order.quantity}</td>
                      <td className="px-4 py-2">
                        <Badge>{order.status}</Badge>
                        <select
                          value={order.status}
                          disabled={updating === order.id}
                          onChange={async (e) => {
                            setUpdating(order.id);
                            const result = await updateOrder(order.id, { status: e.target.value });
                            if (!result.error) {
                              setOrders(orders.map(o => o.id === order.id ? { ...o, status: e.target.value } : o));
                            }
                            setUpdating(null);
                          }}
                          className="ml-2 border rounded px-2 py-1"
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">{new Date(order.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Orders;
