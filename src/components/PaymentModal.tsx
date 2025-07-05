import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  CreditCard, 
  Banknote, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock,
  AlertCircle,
  Shield
} from "lucide-react";
import { createPayment, getPaymentStatus, simulatePaymentCompletion } from '../api';
import { toast } from "@/components/ui/sonner";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  orderId: number;
  deliveryInfo: any;
  onPaymentSuccess: () => void;
}

const PaymentModal = ({ isOpen, onClose, amount, orderId, deliveryInfo, onPaymentSuccess }: PaymentModalProps) => {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (paymentId && paymentStatus === 'processing') {
      // Poll for payment status every 2 seconds
      statusIntervalRef.current = setInterval(async () => {
        try {
          const status = await getPaymentStatus(paymentId);
          if (status.status === 'completed') {
            setPaymentStatus('completed');
            setStatusMessage("Payment completed successfully!");
            clearInterval(statusIntervalRef.current!);
            setTimeout(() => {
              onPaymentSuccess();
              onClose();
            }, 2000);
          } else if (status.status === 'failed') {
            setPaymentStatus('failed');
            setStatusMessage("Payment failed. Please try again.");
            clearInterval(statusIntervalRef.current!);
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }, 2000);
    }

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, [paymentId, paymentStatus, onPaymentSuccess, onClose]);

  const handlePayment = async () => {
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if ((paymentMethod.includes('momo') || paymentMethod.includes('cash') || paymentMethod.includes('money')) && !phoneNumber) {
      toast.error("Please enter your phone number");
      return;
    }

    if (paymentMethod === 'card' && (!cardNumber || !expiryDate || !cvv)) {
      toast.error("Please fill in all card details");
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');
    setStatusMessage("Initiating payment...");

    try {
      const paymentData = {
        order_id: orderId,
        amount: amount,
        payment_method: paymentMethod,
        phone_number: phoneNumber,
        delivery_info: deliveryInfo
      };

      const result = await createPayment(paymentData);
      
      if (result.error) {
        throw new Error(result.error);
      }

      setPaymentId(result.payment_id);
      setStatusMessage("Payment initiated. Please complete the payment on your device...");

      // For demo purposes, simulate payment completion after 5 seconds
      setTimeout(async () => {
        try {
          await simulatePaymentCompletion(result.payment_id, 'completed');
        } catch (error) {
          console.error('Error simulating payment completion:', error);
        }
      }, 5000);

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      setStatusMessage(error.message || "Payment failed. Please try again.");
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Clock className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'processing':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-xl sm:text-2xl">Complete Payment</CardTitle>
          <CardDescription className="text-base sm:text-lg">
            Total Amount: <span className="font-bold text-primary">GH₵ {amount.toFixed(2)}</span>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Payment Status Display */}
          {paymentStatus !== 'idle' && (
            <div className={`p-4 rounded-lg border ${getStatusColor()} flex items-center gap-3`}>
              {getStatusIcon()}
              <div>
                <div className="font-medium">
                  {paymentStatus === 'processing' && 'Processing Payment...'}
                  {paymentStatus === 'completed' && 'Payment Successful!'}
                  {paymentStatus === 'failed' && 'Payment Failed'}
                </div>
                <div className="text-sm opacity-90">{statusMessage}</div>
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          {paymentStatus === 'idle' && (
            <div>
              <Label className="text-sm font-medium">Select Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mtn-momo">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      MTN Mobile Money
                    </div>
                  </SelectItem>
                  <SelectItem value="vodafone-cash">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Vodafone Cash
                    </div>
                  </SelectItem>
                  <SelectItem value="airteltigo-money">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      AirtelTigo Money
                    </div>
                  </SelectItem>
                  <SelectItem value="card">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Credit/Debit Card
                    </div>
                  </SelectItem>
                  <SelectItem value="bank-transfer">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Bank Transfer
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Mobile Money Fields */}
          {paymentStatus === 'idle' && (paymentMethod === "mtn-momo" || paymentMethod === "vodafone-cash" || paymentMethod === "airteltigo-money") && (
            <div>
              <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0XX XXX XXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-2"
                required
              />
              <p className="text-xs text-muted-foreground mt-2">
                You will receive a prompt on your phone to complete the payment
              </p>
            </div>
          )}

          {/* Card Payment Fields */}
          {paymentStatus === 'idle' && paymentMethod === "card" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="cardNumber" className="text-sm font-medium">Card Number</Label>
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  maxLength={19}
                  className="mt-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="expiry" className="text-sm font-medium">Expiry Date</Label>
                  <Input
                    id="expiry"
                    type="text"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    maxLength={5}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="cvv" className="text-sm font-medium">CVV</Label>
                  <Input
                    id="cvv"
                    type="text"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    maxLength={3}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bank Transfer Details */}
          {paymentStatus === 'idle' && paymentMethod === "bank-transfer" && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Transfer Details:</p>
              <div className="bg-muted p-3 rounded text-sm">
                <p><strong>Bank:</strong> AgroFresh Bank</p>
                <p><strong>Account:</strong> 1234567890</p>
                <p><strong>Reference:</strong> ORDER-{orderId}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Please include the reference number in your transfer description
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            {paymentStatus === 'idle' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handlePayment}
                  className="flex-1"
                  disabled={!paymentMethod || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay GH₵ ${amount.toFixed(2)}`
                  )}
                </Button>
              </>
            )}
            
            {paymentStatus === 'failed' && (
              <Button 
                onClick={() => {
                  setPaymentStatus('idle');
                  setStatusMessage("");
                  setPaymentId(null);
                }}
                className="w-full"
              >
                Try Again
              </Button>
            )}
          </div>

          {/* Security Notice */}
          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Shield className="h-3 w-3" />
              <span>Secure Payment</span>
            </div>
            <p>Your payment information is encrypted and secure</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentModal;
