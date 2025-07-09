import { useEffect, useState } from "react";
import { listOrders, getCrop, getUser, updateOrder, getProfile, getOrderTracking } from "../api";
import Navigation from "@/components/Navigation";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function DeliveryStatusCard({ order }) {
  const [status, setStatus] = useState(order.delivery_status);
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url);
  const refreshStatus = async () => {
    const tracking = await getOrderTracking(order.id);
    setStatus(tracking.status);
    setTrackingUrl(tracking.tracking_url);
  };
  return (
    <div>
      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${status === 'Delivered' ? 'bg-green-100 text-green-800' : status === 'In Transit' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{status || 'N/A'}</span>
      {trackingUrl && (
        <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 underline">Track</a>
      )}
      <button onClick={refreshStatus} className="ml-2 text-blue-600 underline">Refresh</button>
    </div>
  );
}

const FarmerOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [cropDetails, setCropDetails] = useState<{[key: number]: any}>({});
  const [buyerDetails, setBuyerDetails] = useState<{[key: number]: any}>({});
  const [updating, setUpdating] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [user, setUser] = useState<any>(null);

  // Helper function to get badge variant based on status
  const getStatusBadgeVariant = (status: string) => {
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

  useEffect(() => {
    getProfile().then(setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    listOrders().then(async data => {
      if (Array.isArray(data)) {
        console.log('All orders from backend:', data);
        console.log('Logged-in user:', user);
        
        // Fetch crop and buyer details for each order
        const cropMap = {};
        const buyerMap = {};
        for (const order of data) {
          if (order.crop_id && !cropMap[order.crop_id]) {
            cropMap[order.crop_id] = await getCrop(order.crop_id);
          }
          if (order.buyer_id && !buyerMap[order.buyer_id]) {
            buyerMap[order.buyer_id] = await getUser(order.buyer_id);
          }
        }
        setCropDetails(cropMap);
        setBuyerDetails(buyerMap);
        
        // Filter orders for this farmer - check both farmer_id and if the crop belongs to this farmer
        const myOrders = data.filter(order => {
          // Direct match on farmer_id
          if (order.farmer_id === user.id) return true;
          
          // Check if the crop belongs to this farmer
          const crop = cropMap[order.crop_id];
          if (crop && crop.farmer_id === user.id) return true;
          
          return false;
        });
        
        console.log('Filtered orders for farmer:', myOrders);
        setOrders(myOrders);
      }
    });
  }, [user]);

  const filteredOrders = orders.filter(order =>
    (statusFilter === 'all' || order.status === statusFilter)
  );

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundSlideshow />
      <div className="relative z-10">
        <Navigation />
        <div className="container mx-auto px-4 py-4 sm:py-8">
          <div className="bg-card/40 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-4 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Orders for My Crops</h1>
            <p className="text-sm sm:text-base text-muted-foreground">View all orders placed for your crops</p>
          </div>
          
          {/* Mobile Filter */}
          <div className="block sm:hidden mb-4">
            <div className="bg-card/40 backdrop-blur-sm rounded-lg p-4">
              <label htmlFor="statusFilterMobile" className="block text-sm font-medium mb-2">Filter by Status:</label>
              <select
                id="statusFilterMobile"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-background"
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
          </div>

          {/* Desktop Filter */}
          <div className="hidden sm:flex items-center gap-4 mb-4">
            <label htmlFor="statusFilter" className="text-sm font-medium">Filter by Status:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border rounded px-2 py-1 bg-background"
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

          {/* Mobile Card Layout */}
          <div className="block sm:hidden space-y-4">
            {filteredOrders.map(order => (
              <Card key={order.id} className="bg-card/40 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Crop Information */}
                  <div className="flex items-center gap-3">
                    {cropDetails[order.crop_id]?.image ? (
                      <img
                        src={cropDetails[order.crop_id].image.startsWith('http') ? cropDetails[order.crop_id].image : `http://localhost:4000${cropDetails[order.crop_id].image}`}
                        alt={cropDetails[order.crop_id]?.name}
                        className="w-12 h-12 rounded-lg object-cover"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-xs">
                        No Image
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium">{cropDetails[order.crop_id]?.name || `Crop ID ${order.crop_id}`}</h4>
                      <p className="text-sm text-muted-foreground">Quantity: {order.quantity}</p>
                      {cropDetails[order.crop_id]?.expiring_date && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(cropDetails[order.crop_id].expiring_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Buyer Information */}
                  <div className="text-sm">
                    <span className="font-medium">Buyer:</span> {buyerDetails[order.buyer_id]?.name || `ID ${order.buyer_id}`}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Delivery Method:</span> {
                      (() => {
                        let info = order.delivery_info;
                        if (typeof info === 'string') info = JSON.parse(info);
                        if (info?.deliveryMethod === 'vdl') return 'VDL Fulfilment';
                        if (info?.deliveryMethod === 'sendstack') return 'Sendstack';
                        return 'N/A';
                      })()
                    }
                  </div>
                  <DeliveryStatusCard order={order} />
                  <div className="text-sm">
                    <span className="font-medium">Delivery Address:</span> {
                      (() => {
                        let info = order.delivery_info;
                        if (typeof info === 'string') info = JSON.parse(info);
                        return info?.address || 'N/A';
                      })()
                    }
                  </div>

                  {/* Status Update */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Update Status</label>
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
                      className="w-full border rounded px-3 py-2 bg-background"
                    >
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
                    {updating === order.id && (
                      <p className="text-xs text-muted-foreground">Updating...</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden sm:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border bg-card/40 backdrop-blur-sm rounded-lg">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Order #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Crop</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Buyer</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Quantity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Delivery Method</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-medium">{order.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {cropDetails[order.crop_id]?.image ? (
                            <img
                              src={cropDetails[order.crop_id].image.startsWith('http') ? cropDetails[order.crop_id].image : `http://localhost:4000${cropDetails[order.crop_id].image}`}
                              alt={cropDetails[order.crop_id]?.name}
                              className="w-10 h-10 rounded-lg object-cover"
                              onError={e => (e.currentTarget.style.display = 'none')}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-xs">
                              No Image
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{cropDetails[order.crop_id]?.name || `Crop ID ${order.crop_id}`}</div>
                            {cropDetails[order.crop_id]?.expiring_date && (
                              <div className="text-xs text-muted-foreground">
                                Expires: {new Date(cropDetails[order.crop_id].expiring_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{buyerDetails[order.buyer_id]?.name || `ID ${order.buyer_id}`}</td>
                      <td className="px-4 py-3 text-sm">{order.quantity}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
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
                            className="border rounded px-2 py-1 bg-background text-sm"
                          >
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
                          {updating === order.id && (
                            <span className="text-xs text-muted-foreground">Updating...</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{new Date(order.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{
                        (() => {
                          let info = order.delivery_info;
                          if (typeof info === 'string') info = JSON.parse(info);
                          if (info?.deliveryMethod === 'vdl') return 'VDL Fulfilment';
                          if (info?.deliveryMethod === 'sendstack') return 'Sendstack';
                          return 'N/A';
                        })()
                      }</td>
                      <td className="px-4 py-3 text-sm">{
                        order.tracking_url ? (
                          <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Track</a>
                        ) : 'N/A'
                      }</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State */}
          {filteredOrders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No orders found with the selected status.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmerOrders; 