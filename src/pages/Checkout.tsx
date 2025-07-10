import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, MapPin, Phone, User } from "lucide-react";
import PaymentModal from "@/components/PaymentModal";
import Navigation from "@/components/Navigation";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import { createOrder, updateOrderTracking } from '../api';
import { useToast } from "@/components/ui/use-toast";
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  farmer: string;
}

interface DeliveryInfo {
  fullName: string;
  phone: string;
  address: string;
  specialInstructions: string;
  deliveryMethod: "sendstack" | "";
}

// Extend jsPDF type to include lastAutoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: any;
  }
}

const Checkout = () => {
  const navigate = useNavigate();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    fullName: "",
    phone: "",
    address: "",
    specialInstructions: "",
    deliveryMethod: ""
  });
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState<number | null>(null);
  const { toast } = useToast();
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [showTracking, setShowTracking] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"sendstack" | "">("");

  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        const parsed = JSON.parse(storedCart);
        // Map to expected shape if needed
        if (parsed.length && parsed[0].crop) {
          setCartItems(parsed.map((item: any) => ({
            id: item.crop.id,
            name: item.crop.name,
            price: item.crop.price,
            quantity: item.quantity,
            unit: item.crop.unit,
            farmer: item.crop.farmer
          })));
        } else {
          setCartItems(parsed);
        }
      } catch {
        setCartItems([]);
      }
    }
  }, []);

  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

  const handleProceedToPayment = async () => {
    if (!deliveryInfo.fullName || !deliveryInfo.phone || !deliveryInfo.address) {
      toast({ 
        title: "Missing Information", 
        description: "Please fill in all required delivery information.",
        variant: "destructive"
      });
      return;
    }
    if (!deliveryMethod) {
      toast({ 
        title: "Select Delivery Method", 
        description: "Please choose a delivery method.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create actual orders for each cart item first
      const createdOrders = [];
      for (const item of cartItems) {
        const orderResult = await createOrder({ 
          crop_id: item.id, 
          quantity: item.quantity,
          delivery_info: { ...deliveryInfo, deliveryMethod }, // Save delivery method with delivery info
        });
        if (orderResult.error) {
          throw new Error(`Failed to create order for ${item.name}: ${orderResult.error}`);
        }
        createdOrders.push(orderResult);
      }

      // Integrate with selected delivery method and save tracking info
      const primaryOrderId = createdOrders[0].id;
      if (deliveryMethod === "sendstack") {
        try {
          const deliveryResult = await fetch('/api/orders/delivery', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              deliveryInfo,
              cartItems,
              orderId: primaryOrderId
            }),
          });
          
          if (!deliveryResult.ok) {
            console.warn('Delivery creation failed, but order was created successfully');
          }
        } catch (error) {
          console.error('Error creating delivery:', error);
          // Order was created successfully, delivery can be handled later
        }
      }
      // Save tracking info to the first order (or all orders if needed)
      // Use the first order ID for payment (or create a combined order)
      setOrderId(primaryOrderId);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error creating orders:', error);
      toast({ 
        title: "Error", 
        description: "Failed to create orders. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      localStorage.removeItem('cart');
      toast({ 
        title: "Order Placed Successfully!", 
        description: "Your order has been confirmed and payment processed.",
      });
      // Fetch order details for receipt
      const res = await fetch(`/api/orders/${orderId}`);
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        throw new Error('Order not found or server error');
      }
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const order = await res.json();
        setReceiptData(order);
        setShowReceipt(true);
      } else {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        throw new Error('Server returned non-JSON response');
      }
    } catch (error) {
      console.error('Error handling payment success:', error);
      toast({ 
        title: "Error", 
        description: "Payment was successful but there was an issue. Please contact support.",
        variant: "destructive"
      });
    }
  };

  const fetchTracking = async () => {
    if (!orderId) return;
    const res = await fetch(`/api/orders/${orderId}/tracking`);
    const tracking = await res.json();
    setTrackingInfo(tracking);
    setShowTracking(true);
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background relative">
        <BackgroundSlideshow />
        <div className="relative z-10">
          <Navigation />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
              <p className="text-muted-foreground mb-6">Add some fresh produce to your cart to continue.</p>
              <Button onClick={() => navigate('/buyers')}>
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showReceipt && receiptData) {
    const handleDownloadPDF = () => {
      const doc = new jsPDF();
      // Header with logo placeholder
      doc.setFillColor(34, 197, 94); // Green color
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('🌱 AgroFresh GH', 105, 18, { align: 'center' });
      doc.setFontSize(12);
      doc.text('Connecting Ghana\'s Farmers & Vendors', 105, 25, { align: 'center' });
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(20);
      doc.text('Order Receipt', 105, 45, { align: 'center' });
      doc.setFontSize(12);
      doc.text('Thank you for your purchase!', 105, 52, { align: 'center' });
      
      // Order details table
      autoTable(doc, {
        startY: 65,
        head: [['Order Information', 'Details']],
        body: [
          ['Order ID', receiptData.id.toString()],
          ['Status', receiptData.status],
          ['Date', new Date().toLocaleDateString()],
          ['Time', new Date().toLocaleTimeString()]
        ],
        headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
        styles: { fontSize: 10 }
      });
      
      // Delivery information
      let deliveryInfo: any = {};
      if (receiptData.delivery_info) {
        if (typeof receiptData.delivery_info === 'string') {
          deliveryInfo = JSON.parse(receiptData.delivery_info);
        } else {
          deliveryInfo = receiptData.delivery_info;
        }
      }
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Delivery Information', 'Details']],
        body: [
          ['Full Name', deliveryInfo.fullName || 'N/A'],
          ['Phone', deliveryInfo.phone || 'N/A'],
          ['Address', deliveryInfo.address || 'N/A'],
          ['Special Instructions', deliveryInfo.specialInstructions || 'None'],
          ['Delivery Method', deliveryInfo.deliveryMethod === 'sendstack' ? 'Sendstack' : 'N/A']
        ],
        headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
        styles: { fontSize: 10 }
      });
      
      // Order items table
      const orderItems = cartItems.map(item => [
        item.name,
        `${item.quantity} ${item.unit}`,
        `GH₵ ${item.price.toFixed(2)}`,
        `GH₵ ${(item.price * item.quantity).toFixed(2)}`
      ]);
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Item', 'Quantity', 'Unit Price', 'Total']],
        body: orderItems,
        headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
        styles: { fontSize: 10 }
      });
      
      // Add subtotal row
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 5,
        body: [['', '', 'Subtotal:', `GH₵ ${subtotal.toFixed(2)}`]],
        styles: { fontSize: 10, fontStyle: 'bold' }
      });
      
      // Tracking info
      if (receiptData.tracking_url) {
        doc.setFontSize(12);
        doc.textWithLink('Track Delivery', 105, (doc as any).lastAutoTable.finalY + 15, { url: receiptData.tracking_url, align: 'center' });
      }
      if (receiptData.delivery_status) {
        doc.setFontSize(10);
        doc.text(`Delivery Status: ${receiptData.delivery_status}`, 105, (doc as any).lastAutoTable.finalY + 25, { align: 'center' });
      }
      
      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for choosing AgroFresh GH!', 105, pageHeight - 20, { align: 'center' });
      doc.text('For support, contact: support@agrofreshgh.com', 105, pageHeight - 15, { align: 'center' });
      doc.text('www.agrofreshgh.com', 105, pageHeight - 10, { align: 'center' });
      
      doc.save(`agrofresh-receipt-${receiptData.id}.pdf`);
    };
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-lg w-full bg-card/40 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Order Receipt</CardTitle>
            <CardDescription>Thank you for your purchase!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <strong>Order ID:</strong> {receiptData.id}<br />
              <strong>Buyer:</strong> {receiptData.buyer_id}<br />
              <strong>Farmer:</strong> {receiptData.farmer_id}<br />
              <strong>Crop:</strong> {receiptData.crop_id}<br />
              <strong>Quantity:</strong> {receiptData.quantity}<br />
              <strong>Status:</strong> {receiptData.status}<br />
              <strong>Delivery Method:</strong> {
                (() => {
                  const info = receiptData.delivery_info && (typeof receiptData.delivery_info === 'string' ? JSON.parse(receiptData.delivery_info) : receiptData.delivery_info);
                  if (info?.deliveryMethod === 'sendstack') return 'Sendstack';
                  return 'N/A';
                })()
              }<br />
              {receiptData.tracking_url && (
                <>
                  <strong>Tracking:</strong> <a href={receiptData.tracking_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Track Delivery</a><br />
                </>
              )}
              {receiptData.delivery_status && (
                <><strong>Delivery Status:</strong> {receiptData.delivery_status}<br /></>
              )}
            </div>
            <Button onClick={handleDownloadPDF} className="mb-2">Download PDF Receipt</Button>
            <Button onClick={() => navigate(`/delivery-tracking/${receiptData.id}`)} className="mb-2">Track Delivery</Button>
            {showTracking && trackingInfo && (
              <div className="mt-4 p-3 bg-muted rounded">
                <strong>Tracking Status:</strong> {trackingInfo.status}<br />
                <strong>Last Updated:</strong> {new Date(trackingInfo.lastUpdated).toLocaleString()}<br />
                <ul className="mt-2 text-sm">
                  {trackingInfo.history.map((h: any, i: number) => (
                    <li key={i}>{h.status} - {new Date(h.timestamp).toLocaleString()}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundSlideshow />
      <div className="relative z-10">
        <Navigation />
        
        <div className="container mx-auto px-4 py-4 sm:py-8">
          <div className="bg-card/40 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Checkout</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Review your order and complete payment</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Order Summary */}
            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm sm:text-base">{item.name}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {item.quantity} {item.unit} × GH₵ {item.price}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          From: {item.farmer}
                        </p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="font-medium text-sm sm:text-base">
                          GH₵ {(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm sm:text-base">
                      <span>Subtotal</span>
                      <span>GH₵ {subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Information */}
            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <MapPin className="h-5 w-5" />
                  Delivery Information
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Where should we deliver your fresh produce?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="text-sm font-medium">Full Name *</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="Enter your full name"
                        value={deliveryInfo.fullName}
                        onChange={(e) => setDeliveryInfo({...deliveryInfo, fullName: e.target.value})}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium">Phone Number *</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="0XX XXX XXXX"
                        value={deliveryInfo.phone}
                        onChange={(e) => setDeliveryInfo({...deliveryInfo, phone: e.target.value})}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-sm font-medium">Delivery Address *</Label>
                    <textarea
                      id="address"
                      placeholder="Enter your full delivery address including landmarks"
                      value={deliveryInfo.address}
                      onChange={(e) => setDeliveryInfo({...deliveryInfo, address: e.target.value})}
                      className="w-full min-h-20 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="instructions" className="text-sm font-medium">Special Instructions (Optional)</Label>
                    <textarea
                      id="instructions"
                      placeholder="Any special delivery instructions..."
                      value={deliveryInfo.specialInstructions}
                      onChange={(e) => setDeliveryInfo({...deliveryInfo, specialInstructions: e.target.value})}
                      className="w-full min-h-16 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                    />
                  </div>

                  <Label className="mt-4">Delivery Method</Label>
                  <div className="flex flex-col gap-2 mb-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="sendstack"
                        checked={deliveryMethod === "sendstack"}
                        onChange={() => setDeliveryMethod("sendstack")}
                      />
                      Sendstack (Nationwide, Real-time Tracking)
                    </label>
                  </div>

                  <Button 
                    onClick={handleProceedToPayment} 
                    className="w-full h-11"
                  >
                    Proceed to Payment - GH₵ {subtotal.toFixed(2)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showPaymentModal && orderId && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={subtotal}
          orderId={orderId}
          deliveryInfo={deliveryInfo}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

// Delivery is now handled by the backend service

export default Checkout;
