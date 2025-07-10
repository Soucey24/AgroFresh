import { useState, useEffect } from "react";
import { Search, Filter, Eye, CheckCircle, XCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/admin/AdminLayout";
import { getAdminOrders, getOrderStats, getOrderTracking } from "../../api";

function DeliveryStatusCell({ order }) {
  const [status, setStatus] = useState(order.delivery_status);
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url);
  const refreshStatus = async () => {
    const tracking = await getOrderTracking(order.id);
    setStatus(tracking.status);
    setTrackingUrl(tracking.tracking_url);
  };
  return (
    <span>
      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${status === 'Delivered' ? 'bg-green-100 text-green-800' : status === 'In Transit' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{status || 'N/A'}</span>
      {trackingUrl && (
        <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 underline">Track</a>
      )}
      <button onClick={refreshStatus} className="ml-2 text-blue-600 underline">Refresh</button>
    </span>
  );
}

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState({
    completed: 0,
    inTransit: 0,
    pending: 0,
    cancelled: 0
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersData, statsData] = await Promise.all([
          getAdminOrders(),
          getOrderStats()
        ]);
        
        if (!ordersData.error) {
          setOrders(ordersData);
        }
        
        if (!statsData.error) {
          setOrderStats(statsData);
        }
      } catch (error) {
        console.error('Error fetching orders data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.crop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.farmer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'confirmed': return 'default';
      case 'preparing': return 'default';
      case 'ready': return 'default';
      case 'shipped': return 'default';
      case 'delivered': return 'default';
      case 'completed': return 'default';
      case 'paid': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading orders...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

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
              <div className="text-2xl font-bold text-primary">{orderStats.completed}</div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent">{orderStats.inTransit}</div>
              <p className="text-sm text-muted-foreground">In Transit</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-secondary">{orderStats.pending}</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-destructive">{orderStats.cancelled}</div>
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
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="paid">Paid</option>
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
              {filteredOrders.length > 0 ? (
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
                      <th className="px-4 py-2 text-left">Delivery Method</th>
                      <th className="px-4 py-2 text-left">Delivery Address</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => (
                      <tr key={order.id} className="border-b">
                        <td className="px-4 py-2">{order.id}</td>
                        <td className="px-4 py-2 flex items-center gap-2">
                          {order.crop_image ? (
                            <img
                              src={order.crop_image.startsWith('http') ? order.crop_image : `http://localhost:4000${order.crop_image}`}
                              alt={order.crop_name}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={e => (e.currentTarget.style.display = 'none')}
                            />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-xs">
                              No Image
                            </div>
                          )}
                          {order.crop_name || `Crop ID ${order.crop_id}`}
                        </td>
                        <td className="px-4 py-2">{order.buyer_name || `ID ${order.buyer_id}`}</td>
                        <td className="px-4 py-2">{order.farmer_name || `ID ${order.farmer_id}`}</td>
                        <td className="px-4 py-2">{order.quantity}</td>
                        <td className="px-4 py-2">
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">{new Date(order.created_at).toLocaleString()}</td>
                        <td className="px-4 py-2">
                          {(() => {
                            let info = order.delivery_info;
                            if (typeof info === 'string') info = JSON.parse(info);
                            if (info?.deliveryMethod === 'sendstack') return 'Sendstack';
                            return 'N/A';
                          })()}
                        </td>
                        <td className="px-4 py-2">
                          {(() => {
                            let info = order.delivery_info;
                            if (typeof info === 'string') info = JSON.parse(info);
                            return info?.address || 'N/A';
                          })()}
                        </td>
                        <td className="px-4 py-2">
                          <DeliveryStatusCell order={order} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' ? 'No orders found matching your criteria' : 'No orders available'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Orders;
