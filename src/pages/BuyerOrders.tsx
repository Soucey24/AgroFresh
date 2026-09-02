import { useEffect, useState } from "react";
import { createComplaint, createReview, listOrders, getCrop, getUser, getProfile } from "../api";
import { getImageUrl } from "../utils/imageUtils";
import Navigation from "@/components/Navigation";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flag, Star } from "lucide-react";
import { FileText, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BuyerOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [cropDetails, setCropDetails] = useState<{[key: number]: any}>({});
  const [farmerDetails, setFarmerDetails] = useState<{[key: number]: any}>({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [user, setUser] = useState<any>(null);
  const [complaintOrder, setComplaintOrder] = useState<any>(null);
  const [complaintCategory, setComplaintCategory] = useState('Quality issue');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);

  const getReceiptCrop = (order: any) => order.crop || cropDetails[order.crop_id] || {};
  const getDeliveryInfo = (order: any) => {
    if (!order.delivery_info) return {};
    if (typeof order.delivery_info === 'object') return order.delivery_info;
    try {
      return JSON.parse(order.delivery_info);
    } catch {
      return {};
    }
  };

  const getDeliveryMethodLabel = (order: any) => {
    const delivery = getDeliveryInfo(order);
    const method = delivery.deliveryMethod || delivery.delivery_method || order.delivery_service || 'collection-point';
    if (method === 'collection-point' || method === 'pickup') return 'Collection point';
    if (method === 'home-delivery') return 'Home delivery';
    if (method === 'business-delivery') return 'Business delivery';
    if (method === 'farmer-delivery') return 'Farmer delivery';
    if (method === 'company-delivery') return 'Logistics delivery';
    return String(method).replace('-', ' ');
  };

  const downloadReceipt = (order: any) => {
    const crop = getReceiptCrop(order);
    const quantity = Number(order.quantity || 0);
    const unitPrice = Number(crop.price || 0);
    const total = quantity * unitPrice;
    const delivery = getDeliveryInfo(order);
    const deliveryMethod = String(delivery.deliveryMethod || 'N/A')
      .replaceAll('-', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const currency = (value: number) => `GHS ${value.toFixed(2)}`;
    const doc = new jsPDF();

    doc.setFillColor(32, 139, 75);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('AgroFresh GH', 20, 15);
    doc.setFontSize(10);
    doc.text('Order receipt and payment confirmation', 20, 24);
    doc.setTextColor(24, 48, 36);
    doc.setFontSize(18);
    doc.text('Order Receipt', 105, 47, { align: 'center' });

    autoTable(doc, {
      startY: 58,
      head: [['Order Information', 'Details']],
      body: [
        ['Order ID', `#${order.id}`],
        ['Date', new Date(order.created_at).toLocaleString()],
        ['Status', String(order.status || '').toUpperCase()],
        ['Farmer', order.farmer?.name || 'AgroFresh farmer']
      ],
      margin: { left: 14, right: 14 },
      headStyles: { fillColor: [32, 139, 75], textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 124 } },
      styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak' }
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['Item', 'Qty', 'Unit Price', 'Total']],
      body: [[crop.name || 'Fresh produce', `${quantity} ${crop.unit || 'unit(s)'}`, currency(unitPrice), currency(total)]],
      margin: { left: 14, right: 14 },
      headStyles: { fillColor: [32, 139, 75], textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 32 }, 2: { cellWidth: 40 }, 3: { cellWidth: 40 } },
      styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak' }
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 5,
      body: [['', '', 'Total paid:', currency(total)]],
      margin: { left: 14, right: 14 },
      columnStyles: { 2: { cellWidth: 72, halign: 'right' }, 3: { cellWidth: 40, halign: 'right' } },
      styles: { fontSize: 11, fontStyle: 'bold', cellPadding: 4 }
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['Delivery Information', 'Details']],
      body: [
        ['Name', delivery.fullName || 'N/A'],
        ['Phone', delivery.phone || 'N/A'],
        ['Address', delivery.address || delivery.pickupLocation || 'N/A'],
        ['Method', deliveryMethod]
      ],
      margin: { left: 14, right: 14 },
      headStyles: { fillColor: [32, 139, 75], textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 124 } },
      styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak' }
    });
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for choosing AgroFresh GH.', 105, 285, { align: 'center' });
    doc.save(`agrofresh-receipt-${order.id}.pdf`);
    toast.success('Receipt downloaded');
  };

  const submitComplaint = async () => {
    if (!complaintDescription.trim()) return toast.error('Please describe the issue before submitting.');
    setSubmitting(true);
    try {
      const result = await createComplaint({ order_id: complaintOrder.id, category: complaintCategory, description: complaintDescription });
      if (result.error) return toast.error(result.error);
      setFeedback('Complaint submitted to the AgroFresh support team.');
      toast.success('Complaint submitted', { description: 'The support team will review your report.' });
      setComplaintOrder(null);
      setComplaintDescription('');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReview = async () => {
    setSubmitting(true);
    try {
      const result = await createReview(reviewOrder.crop_id, { rating: reviewRating, comment: reviewComment });
      if (result.error) return toast.error(result.error);
      setFeedback('Thanks. Your review helps buyers trust this farmer.');
      toast.success('Review submitted', { description: 'Your feedback helps build trust on AgroFresh.' });
      setReviewOrder(null);
      setReviewComment('');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    getProfile().then(setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    listOrders().then(async data => {
      if (Array.isArray(data)) {
        // Only show orders for this buyer
        const myOrders = data.filter(order => order.buyer_id === user.id);
        setOrders(myOrders);
        // Fetch crop and farmer details for each order
        const cropMap = {};
        const farmerMap = {};
        for (const order of myOrders) {
          if (order.crop_id && !cropMap[order.crop_id]) {
            const crop = await getCrop(order.crop_id);
            cropMap[order.crop_id] = crop;
            if (crop.farmer_id && !farmerMap[crop.farmer_id]) {
              farmerMap[crop.farmer_id] = await getUser(crop.farmer_id);
            }
          }
        }
        setCropDetails(cropMap);
        setFarmerDetails(farmerMap);
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
        <div className="container mx-auto px-4 py-8">
          <div className="bg-card/40 backdrop-blur-sm rounded-lg p-6 mb-8">
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
              <h1 className="text-3xl font-bold text-foreground">My Orders</h1>
            </div>
            <p className="text-muted-foreground">View your recent and past orders</p>
          </div>
          <div className="mb-4 flex items-center gap-4">
            <label htmlFor="statusFilter">Filter by Status:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="all">All Statuses</option>
              <option value="pending_payment">Pending payment</option>
              <option value="confirmed">Confirmed</option>
              <option value="farmer_preparing">Preparing shipment</option>
              <option value="sent_to_operations_centre">Sent to centre</option>
              <option value="received_at_centre">Received at centre</option>
              <option value="quality_check">Quality check</option>
              <option value="ready_for_dispatch">Ready for dispatch</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="payout_ready">Payout ready</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {feedback && <p className="mb-4 rounded-md bg-primary/10 p-3 text-sm text-primary">{feedback}</p>}
          <table className="min-w-full divide-y divide-border bg-card/40 backdrop-blur-sm rounded-lg">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Order #</th>
                <th className="px-4 py-2 text-left">Crop</th>
                <th className="px-4 py-2 text-left">Farmer</th>
                <th className="px-4 py-2 text-left">Quantity</th>
                <th className="px-4 py-2 text-left">Delivery</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Trust actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} className="border-b">
                  <td className="px-4 py-2">{order.id}</td>
                  <td className="px-4 py-2 flex items-center gap-2">
                    {cropDetails[order.crop_id]?.image ? (
                      <img 
                        src={getImageUrl(cropDetails[order.crop_id].image)} 
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
                  <td className="px-4 py-2">
                    {order.farmer?.name ||
                      farmerDetails[order.farmer_id || cropDetails[order.crop_id]?.farmer_id]?.name ||
                      (order.farmer_id || cropDetails[order.crop_id]?.farmer_id
                        ? `ID ${order.farmer_id || cropDetails[order.crop_id]?.farmer_id}`
                        : 'Farmer information unavailable')}
                  </td>
                  <td className="px-4 py-2">{order.quantity}</td>
                  <td className="px-4 py-2">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{getDeliveryMethodLabel(order)}</div>
                      {order.tracking_url ? (
                        <div className="space-y-1">
                          {order.tracking_number && <div className="text-xs text-muted-foreground">Tracking: {order.tracking_number}</div>}
                          <a href={order.tracking_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Track delivery</a>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{order.delivery_status || 'Awaiting dispatch'}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2"><Badge>{order.status}</Badge></td>
                  <td className="px-4 py-2">{new Date(order.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      {['paid', 'completed', 'delivered'].includes(order.status) && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setReceiptOrder(order)}>
                            <FileText className="mr-1 h-3 w-3" /> Receipt
                          </Button>
                        </>
                      )}
                      {['paid', 'completed', 'delivered'].includes(order.status) && (
                        <Button size="sm" variant="outline" onClick={() => setReviewOrder(order)}>
                          <Star className="mr-1 h-3 w-3" /> Review
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setComplaintOrder(order)}>
                        <Flag className="mr-1 h-3 w-3" /> Report
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {receiptOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReceiptOrder(null)}>
              <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto" onClick={(event) => event.stopPropagation()}>
                <CardHeader className="border-b bg-emerald-700 text-white">
                  <CardTitle>AgroFresh GH Receipt</CardTitle>
                  <p className="text-sm text-emerald-50">Order #{receiptOrder.id} · {String(receiptOrder.status).toUpperCase()}</p>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><div className="text-xs text-muted-foreground">Product</div><div className="font-semibold">{getReceiptCrop(receiptOrder).name || 'Fresh produce'}</div></div>
                    <div><div className="text-xs text-muted-foreground">Farmer</div><div className="font-semibold">{receiptOrder.farmer?.name || 'AgroFresh farmer'}</div></div>
                    <div><div className="text-xs text-muted-foreground">Quantity</div><div>{receiptOrder.quantity} {getReceiptCrop(receiptOrder).unit || 'unit(s)'}</div></div>
                    <div><div className="text-xs text-muted-foreground">Date</div><div>{new Date(receiptOrder.created_at).toLocaleString()}</div></div>
                  </div>
                  <div className="border-t pt-4"><div className="text-sm text-muted-foreground">Total paid</div><div className="text-2xl font-bold text-primary">GH₵ {(Number(receiptOrder.quantity || 0) * Number(getReceiptCrop(receiptOrder).price || 0)).toFixed(2)}</div></div>
                  <div className="rounded-md bg-muted/40 p-3 text-sm"><div className="font-semibold">Delivery</div><div>{getDeliveryInfo(receiptOrder).fullName || 'N/A'}</div><div>{getDeliveryInfo(receiptOrder).address || getDeliveryInfo(receiptOrder).pickupLocation || 'N/A'}</div><div>{getDeliveryInfo(receiptOrder).phone || 'N/A'}</div></div>
                  <div className="flex flex-col gap-2 sm:flex-row"><Button className="flex-1" onClick={() => downloadReceipt(receiptOrder)}><Download className="mr-2 h-4 w-4" /> Download PDF</Button><Button variant="outline" className="flex-1" onClick={() => setReceiptOrder(null)}>Close</Button></div>
                </CardContent>
              </Card>
            </div>
          )}
          {(complaintOrder || reviewOrder) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <Card className="w-full max-w-md">
                <CardHeader><CardTitle>{complaintOrder ? `Report order #${complaintOrder.id}` : 'Review your purchase'}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {complaintOrder ? (
                    <>
                      <select className="w-full rounded-md border p-2" value={complaintCategory} onChange={(event) => setComplaintCategory(event.target.value)}>
                        <option>Quality issue</option><option>Late delivery</option><option>Wrong quantity</option><option>Farmer conduct</option><option>Other</option>
                      </select>
                      <textarea className="min-h-28 w-full rounded-md border p-2" placeholder="Describe what happened" value={complaintDescription} onChange={(event) => setComplaintDescription(event.target.value)} />
                      <div className="flex gap-2"><Button onClick={submitComplaint} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit complaint'}</Button><Button variant="outline" onClick={() => setComplaintOrder(null)} disabled={submitting}>Cancel</Button></div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} stars`} onClick={() => setReviewRating(value)}><Star className={`h-6 w-6 ${value <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} /></button>)}</div>
                      <textarea className="min-h-28 w-full rounded-md border p-2" placeholder="Share your experience" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} />
                      <div className="flex gap-2"><Button onClick={submitReview} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit review'}</Button><Button variant="outline" onClick={() => setReviewOrder(null)} disabled={submitting}>Cancel</Button></div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerOrders; 