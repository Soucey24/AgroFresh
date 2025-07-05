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
import { createOrder } from '../api';
import { useToast } from "@/components/ui/use-toast";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  farmer: string;
}

const Checkout = () => {
  const navigate = useNavigate();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState({
    fullName: "",
    phone: "",
    address: "",
    specialInstructions: ""
  });
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState<number | null>(null);
  const { toast } = useToast();

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
  const deliveryFee = 15.00;
  const total = subtotal + deliveryFee;

  const handleProceedToPayment = async () => {
    if (!deliveryInfo.fullName || !deliveryInfo.phone || !deliveryInfo.address) {
      toast({ 
        title: "Missing Information", 
        description: "Please fill in all required delivery information.",
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
          delivery_info: deliveryInfo
        });
        if (orderResult.error) {
          throw new Error(`Failed to create order for ${item.name}: ${orderResult.error}`);
        }
        createdOrders.push(orderResult);
      }
      
      // Use the first order ID for payment (or create a combined order)
      const primaryOrderId = createdOrders[0].id;
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
      // Orders are already created, just clear the cart and redirect
      localStorage.removeItem('cart');
      toast({ 
        title: "Order Placed Successfully!", 
        description: "Your order has been confirmed and payment processed.",
      });
      
      setTimeout(() => navigate("/buyer-orders"), 1500);
    } catch (error) {
      console.error('Error handling payment success:', error);
      toast({ 
        title: "Error", 
        description: "Payment was successful but there was an issue. Please contact support.",
        variant: "destructive"
      });
    }
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
                    <div className="flex justify-between text-sm sm:text-base">
                      <span>Delivery Fee</span>
                      <span>GH₵ {deliveryFee.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base sm:text-lg">
                      <span>Total</span>
                      <span>GH₵ {total.toFixed(2)}</span>
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

                  <Button 
                    onClick={handleProceedToPayment} 
                    className="w-full h-11"
                  >
                    Proceed to Payment - GH₵ {total.toFixed(2)}
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
          amount={total}
          orderId={orderId}
          deliveryInfo={deliveryInfo}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default Checkout;
