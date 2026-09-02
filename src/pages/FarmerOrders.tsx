import { useEffect, useState } from "react";
import { listOrders, getCrop, getUser, updateOrder, getProfile, getOrderTracking } from "../api";
import { getImageUrl } from "../utils/imageUtils";
import FarmerLayout from "@/components/FarmerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const getDeliveryInfo = (order: any) => {
  if (!order?.delivery_info) return {};
  if (typeof order.delivery_info === 'string') {
    try {
      return JSON.parse(order.delivery_info);
    } catch {
      return {};
    }
  }
  return order.delivery_info;
};

const getDeliveryMethodLabel = (order: any) => {
  const info = getDeliveryInfo(order);
  const method = info?.deliveryMethod || info?.delivery_method || info?.method || order?.delivery_service || 'pickup';

  if (method === 'pickup') return 'Pickup order';
  if (method === 'farmer-delivery' || method === 'farmer') return 'Self-delivery';
  if (method === 'company-delivery') return `Company delivery${info?.deliveryService ? ` (${info.deliveryService})` : ''}`;
  if (method === 'sendstack') return 'Company delivery (Sendstack)';
  return 'Pickup order';
};

const getDeliveryStageValue = (order: any) => {
  const deliveryStatus = (order?.delivery_status || '').toLowerCase();
  if (deliveryStatus.includes('delivered')) return 'delivered';
  if (deliveryStatus.includes('transit') || order?.status === 'dispatched') return 'in_transit';
  if (order?.status === 'ready_for_dispatch' || order?.status === 'packed') return 'ready';
  if (order?.status === 'pending_payment' || order?.status === 'confirmed' || order?.status === 'farmer_preparing' || order?.status === 'sent_to_operations_centre') return 'pending';
  return 'pending';
};

const downloadFarmerReceipt = (order: any, crop: any, buyer: any) => {
  const unitPrice = Number(crop?.price || 0);
  const total = unitPrice * Number(order.quantity || 0);
  const doc = new jsPDF();
  doc.setFillColor(32, 139, 75);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('AgroFresh GH', 20, 15);
  doc.setFontSize(10);
  doc.text('Farmer order record', 20, 24);
  doc.setTextColor(24, 48, 36);
  doc.setFontSize(18);
  doc.text('Purchase Receipt', 105, 47, { align: 'center' });
  autoTable(doc, {
    startY: 58,
    head: [['Order Information', 'Details']],
    body: [['Order ID', `#${order.id}`], ['Buyer', buyer?.name || 'Buyer'], ['Product', crop?.name || 'Produce'], ['Quantity', `${order.quantity} ${crop?.unit || 'unit(s)'}`], ['Status', String(order.status || '').toUpperCase()]],
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: [32, 139, 75], textColor: [255, 255, 255] },
    columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 124 } },
    styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak' }
  });
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [['Payment Summary', 'Amount']],
    body: [['Unit price', `GHS ${unitPrice.toFixed(2)}`], ['Total paid', `GHS ${total.toFixed(2)}`]],
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: [32, 139, 75], textColor: [255, 255, 255] },
    columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 62, halign: 'right' } },
    styles: { fontSize: 10, cellPadding: 4 }
  });
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text('Keep this digital copy for your records.', 105, 285, { align: 'center' });
  doc.save(`agrofresh-farmer-order-${order.id}.pdf`);
};

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
        <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 underline">Open courier tracking</a>
      )}
      {order.tracking_number && <div className="text-xs text-muted-foreground">Tracking number: {order.tracking_number}</div>}
      <button onClick={refreshStatus} className="ml-2 text-blue-600 underline">Refresh</button>
    </div>
  );
}

const FarmerOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [cropDetails, setCropDetails] = useState<{[key: number]: any}>({});
  const [buyerDetails, setBuyerDetails] = useState<{[key: number]: any}>({});
  const [updating, setUpdating] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [user, setUser] = useState<any>(null);

  const updateOrderStatus = async (orderId: number, nextStatus: string, nextDeliveryStatus?: string) => {
    setUpdating(orderId);
    const payload: any = { status: nextStatus };
    if (nextDeliveryStatus) payload.delivery_status = nextDeliveryStatus;
    
    try {
      const result = await updateOrder(orderId, payload);
      
      if (result?.error) {
        console.error('[FarmerOrders] Error updating status:', result.error);
        alert(`Failed to update status: ${result.error}`);
        setUpdating(null);
        return;
      }
      
      if (!result) {
        console.error('[FarmerOrders] No response from updateOrder');
        alert('Failed to update order status. Please try again.');
        setUpdating(null);
        return;
      }
      
      setOrders((prev) => prev.map((item) => item.id === orderId ? {
        ...item,
        status: nextStatus,
        delivery_status: nextDeliveryStatus || item.delivery_status
      } : item));
      
      console.log('[FarmerOrders] Status updated successfully:', { orderId, nextStatus });
    } catch (err) {
      console.error('[FarmerOrders] Exception updating order:', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to update order status'}`);
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending_payment': return 'secondary';
      case 'confirmed': return 'default';
      case 'farmer_preparing': return 'default';
      case 'sent_to_operations_centre': return 'default';
      case 'received_at_centre': return 'default';
      case 'quality_check': return 'default';
      case 'ready_for_dispatch': return 'default';
      case 'packed': return 'default';
      case 'dispatched': return 'default';
      case 'delivered': return 'default';
      case 'payout_ready': return 'default';
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
    <FarmerLayout>
        <div className="container mx-auto px-4 py-4 sm:py-8">
          <div className="bg-card/40 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-4 sm:mb-8">
            <div className="flex items-center gap-4 mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Orders for My Crops</h1>
            </div>
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
                <option value="pending_payment">Pending payment</option>
                <option value="confirmed">Confirmed</option>
                <option value="farmer_preparing">Preparing shipment</option>
                <option value="sent_to_operations_centre">Sent to centre</option>
                <option value="received_at_centre">Received at centre</option>
                <option value="quality_check">Quality check</option>
                <option value="ready_for_dispatch">Ready for dispatch</option>
                <option value="packed">Packed</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
                <option value="payout_ready">Payout ready</option>
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
              <option value="pending_payment">Pending payment</option>
              <option value="confirmed">Confirmed</option>
              <option value="farmer_preparing">Preparing shipment</option>
              <option value="sent_to_operations_centre">Sent to centre</option>
              <option value="received_at_centre">Received at centre</option>
              <option value="quality_check">Quality check</option>
              <option value="ready_for_dispatch">Ready for dispatch</option>
              <option value="packed">Packed</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="payout_ready">Payout ready</option>
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
                        src={getImageUrl(cropDetails[order.crop_id].image)}
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
                    <span className="font-medium">Delivery Method:</span> {getDeliveryMethodLabel(order)}
                  </div>
                  <DeliveryStatusCard order={order} />
                  <Button variant="outline" onClick={() => downloadFarmerReceipt(order, cropDetails[order.crop_id], buyerDetails[order.buyer_id])}>Download purchase receipt</Button>
                  <div className="text-sm">
                    <span className="font-medium">Delivery Address:</span> {getDeliveryInfo(order)?.address || getDeliveryInfo(order)?.pickupLocation || 'N/A'}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Order status</label>
                    {order.status === 'confirmed' ? (
                      <select
                        value={order.status}
                        disabled={updating === order.id}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="w-full border rounded px-3 py-2 bg-background"
                      >
                        <option value="confirmed">Ready to start preparation</option>
                        <option value="farmer_preparing">Mark as preparing now</option>
                      </select>
                    ) : order.status === 'farmer_preparing' ? (
                      <select
                        value={order.status}
                        disabled={updating === order.id}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="w-full border rounded px-3 py-2 bg-background"
                      >
                        <option value="farmer_preparing">Preparing shipment</option>
                        <option value="sent_to_operations_centre">Send to operations centre</option>
                      </select>
                    ) : (
                      <div className="border rounded px-3 py-2 bg-background text-muted-foreground">
                        {order.status === 'pending_payment' && 'Waiting for buyer payment...'}
                        {order.status === 'sent_to_operations_centre' && 'Sent to operations centre'}
                        {order.status === 'received_at_centre' && 'Received at operations centre'}
                        {order.status === 'quality_check' && 'Quality check in progress...'}
                        {order.status === 'ready_for_dispatch' && 'Ready for dispatch'}
                        {order.status === 'packed' && 'Packed'}
                        {order.status === 'dispatched' && 'Dispatched to buyer'}
                        {order.status === 'delivered' && 'Delivered to buyer'}
                        {order.status === 'payout_ready' && 'Payout ready'}
                        {order.status === 'paid' && 'Payment completed'}
                        {order.status === 'cancelled' && 'Order cancelled'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Delivery stage</label>
                    <select
                      value={getDeliveryStageValue(order)}
                      disabled={updating === order.id}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        if (nextValue === 'ready') {
                          updateOrderStatus(order.id, 'ready_for_dispatch', 'Ready for pickup');
                        } else if (nextValue === 'in_transit') {
                          updateOrderStatus(order.id, 'dispatched', 'In Transit');
                        } else if (nextValue === 'delivered') {
                          updateOrderStatus(order.id, 'delivered', 'Delivered');
                        } else {
                          updateOrderStatus(order.id, 'pending_payment', 'Pending');
                        }
                      }}
                      className="w-full border rounded px-3 py-2 bg-background"
                    >
                      <option value="pending">Pending</option>
                      <option value="ready">Ready</option>
                      <option value="in_transit">In Transit</option>
                      <option value="delivered">Delivered</option>
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
                    <th className="px-4 py-3 text-left text-sm font-medium">Receipt</th>
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
                              src={getImageUrl(cropDetails[order.crop_id].image)}
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
                        <div className="flex flex-col gap-2">
                          <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                          {order.status === 'confirmed' ? (
                            <select
                              value={order.status}
                              disabled={updating === order.id}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                              className="border rounded px-2 py-1 bg-background text-sm"
                            >
                              <option value="confirmed">Ready to prepare</option>
                              <option value="farmer_preparing">Start preparing</option>
                            </select>
                          ) : order.status === 'farmer_preparing' ? (
                            <select
                              value={order.status}
                              disabled={updating === order.id}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                              className="border rounded px-2 py-1 bg-background text-sm"
                            >
                              <option value="farmer_preparing">Preparing shipment</option>
                              <option value="sent_to_operations_centre">Send to centre</option>
                            </select>
                          ) : (
                            <span className="text-xs text-muted-foreground px-2 py-1">
                              {order.status === 'pending_payment' && 'Waiting for payment...'}
                              {order.status === 'sent_to_operations_centre' && 'In transit to centre'}
                              {order.status === 'received_at_centre' && 'At operations centre'}
                              {order.status === 'quality_check' && 'Quality check pending'}
                              {order.status === 'ready_for_dispatch' && 'Ready to ship'}
                              {order.status === 'packed' && 'Packed'}
                              {order.status === 'dispatched' && 'Shipped'}
                              {order.status === 'delivered' && 'Delivered'}
                              {order.status === 'payout_ready' && 'Ready for payout'}
                              {order.status === 'paid' && 'Paid'}
                              {order.status === 'cancelled' && 'Cancelled'}
                            </span>
                          )}
                          <select
                            value={getDeliveryStageValue(order)}
                            disabled={updating === order.id}
                            onChange={(e) => {
                              const nextValue = e.target.value;
                              if (nextValue === 'ready') {
                                updateOrderStatus(order.id, 'ready_for_dispatch', 'Ready for pickup');
                              } else if (nextValue === 'in_transit') {
                                updateOrderStatus(order.id, 'dispatched', 'In Transit');
                              } else if (nextValue === 'delivered') {
                                updateOrderStatus(order.id, 'delivered', 'Delivered');
                              } else {
                                updateOrderStatus(order.id, 'pending_payment', 'Pending');
                              }
                            }}
                            className="border rounded px-2 py-1 bg-background text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="ready">Ready</option>
                            <option value="in_transit">In Transit</option>
                            <option value="delivered">Delivered</option>
                          </select>
                          {updating === order.id && (
                            <span className="text-xs text-muted-foreground">Updating...</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{new Date(order.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{getDeliveryMethodLabel(order)}</td>
                      <td className="px-4 py-3 text-sm">{
                        order.tracking_url ? (
                          <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Track</a>
                        ) : 'N/A'
                      }</td>
                      <td className="px-4 py-3 text-sm"><Button size="sm" variant="outline" onClick={() => downloadFarmerReceipt(order, cropDetails[order.crop_id], buyerDetails[order.buyer_id])}>Download</Button></td>
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
    </FarmerLayout>
  );
};

export default FarmerOrders; 