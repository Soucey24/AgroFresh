import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Clock, Shield, CreditCard, Building2, Smartphone } from "lucide-react";
import { createPayment, getPaymentStatus, verifyPaystackPayment } from '../api';
import { toast } from "@/components/ui/sonner";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  orderId: number;
  deliveryInfo: any;
  userEmail?: string;
  onPaymentSuccess: () => void;
  onPaymentFailure?: () => void;
}

const PaymentModal = ({ isOpen, onClose, amount, orderId, deliveryInfo, userEmail, onPaymentSuccess, onPaymentFailure }: PaymentModalProps) => {
  const [paymentMethod] = useState("paystack");
  const [paymentChannel, setPaymentChannel] = useState<'card' | 'bank' | 'mobile_money'>('card');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paymentId && paymentStatus === 'processing') {
      // Poll for payment status every 2 seconds
      statusIntervalRef.current = setInterval(async () => {
        try {
          const status = await getPaymentStatus(paymentId);
          let resolvedStatus = status.status;
          if (resolvedStatus !== 'completed' && paymentReference) {
            try {
              const verified = await verifyPaystackPayment(paymentReference);
              if (verified?.status === 'completed') {
                resolvedStatus = 'completed';
              }
            } catch (verificationError) {
              console.error('Payment verification poll failed:', verificationError);
            }
          }

          if (resolvedStatus === 'completed') {
            setPaymentStatus('completed');
            setStatusMessage("Payment completed successfully!");
            if (statusIntervalRef.current !== null) {
              clearInterval(statusIntervalRef.current);
            }
            setTimeout(() => {
              onPaymentSuccess();
              onClose();
            }, 2000);
          } else if (resolvedStatus === 'failed') {
            setPaymentStatus('failed');
            setStatusMessage("Payment failed. Please try again.");
            if (statusIntervalRef.current !== null) {
              clearInterval(statusIntervalRef.current);
            }
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
  }, [paymentId, paymentReference, paymentStatus, onPaymentSuccess, onClose]);

  const handlePayment = async () => {
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    const resolvedEmail = (userEmail || deliveryInfo?.email || '').trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!resolvedEmail || !emailPattern.test(resolvedEmail)) {
      const message = 'Your account email is missing or invalid. Please update your profile email before paying.';
      setPaymentStatus('failed');
      setStatusMessage(message);
      toast.error(message);
      return;
    }

    if (!phoneNumber && paymentMethod === 'paystack') {
      setPhoneNumber('');
    }

    setIsProcessing(true);
    setPaymentStatus('processing');
    setStatusMessage("Initiating Paystack payment...");

    try {
      const paymentData = {
        order_id: orderId,
        amount: amount,
        payment_method: paymentMethod,
        payment_channel: paymentChannel,
        phone_number: phoneNumber,
        email: resolvedEmail,
        delivery_info: deliveryInfo
      };

      const result = await createPayment(paymentData);
      if (result.error) {
        throw new Error(result.error);
      }

      setPaymentId(result.payment_id);
      setPaymentReference(result.reference_id || null);

      if (result.authorization_url) {
        setCheckoutUrl(result.authorization_url);
        setStatusMessage('Opening secure Paystack checkout inside the app...');
        return;
      }

      setStatusMessage('Payment initiated. Please wait while we confirm your transaction...');
      if (result.reference_id) {
        try {
          const verified = await verifyPaystackPayment(String(result.reference_id));
          if (verified?.status === 'completed') {
            setPaymentStatus('completed');
            setStatusMessage('Payment completed successfully!');
            setTimeout(() => {
              onPaymentSuccess();
              onClose();
            }, 1500);
            return;
          }
        } catch (error) {
          console.error('Initial verification failed:', error);
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      const message = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      setStatusMessage(message || "Payment failed. Please try again.");
      toast.error(message || "Payment failed. Please try again.");
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

  const handleModalClose = () => {
    if (paymentStatus !== 'completed' && onPaymentFailure) {
      onPaymentFailure();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-xl sm:text-2xl">Complete Payment</CardTitle>
          <CardDescription className="text-base sm:text-lg">
            Total Amount: <span className="font-bold text-primary">GH₵ {(Number(amount) || 0).toFixed(2)}</span>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Payment Status Display */}
          {paymentStatus !== 'idle' && !checkoutUrl && (
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

          {checkoutUrl && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
              Secure Paystack checkout
            </div>
          )}

          {/* Paystack-only checkout */}
          {paymentStatus === 'idle' && !checkoutUrl && (
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Pay with Paystack</p>
              <p>Choose a payment method, then complete payment securely inside this app.</p>
              <div className="grid grid-cols-3 gap-2 pt-2" role="radiogroup" aria-label="Payment method">
                {[
                  { value: 'card' as const, label: 'Card', icon: CreditCard },
                  { value: 'bank' as const, label: 'Bank', icon: Building2 },
                  { value: 'mobile_money' as const, label: 'Mobile money', icon: Smartphone },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={paymentChannel === value}
                    onClick={() => setPaymentChannel(value)}
                    className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-md border p-2 text-xs transition-colors ${paymentChannel === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {checkoutUrl && (
            <div className="overflow-hidden rounded-lg border bg-background">
              <iframe
                title="Paystack Checkout"
                src={checkoutUrl}
                className="h-[420px] w-full border-0"
                allow="payment *; geolocation *; microphone *; camera *"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            {paymentStatus === 'idle' && !checkoutUrl && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleModalClose}
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
                    `Pay GH₵ ${(Number(amount) || 0).toFixed(2)}`
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
                  setPaymentReference(null);
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
