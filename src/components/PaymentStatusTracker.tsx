import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock, 
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { getPaymentStatus } from '../api';

interface PaymentStatusTrackerProps {
  paymentId: number;
  amount: number;
  onStatusChange?: (status: string) => void;
  showDetails?: boolean;
  autoRefresh?: boolean;
}

const PaymentStatusTracker = ({ 
  paymentId, 
  amount, 
  onStatusChange, 
  showDetails = true,
  autoRefresh = true 
}: PaymentStatusTrackerProps) => {
  const [status, setStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const result = await getPaymentStatus(paymentId);
      
      if (result.error) {
        throw new Error(result.error);
      }

      setStatus(result.status);
      setLastUpdated(new Date());
      setError(null);
      
      if (onStatusChange) {
        onStatusChange(result.status);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch payment status');
      console.error('Error fetching payment status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    if (autoRefresh && status !== 'completed' && status !== 'failed' && status !== 'cancelled') {
      intervalRef.current = setInterval(fetchStatus, 3000); // Poll every 3 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [paymentId, autoRefresh]);

  useEffect(() => {
    // Stop polling when payment is completed or failed
    if ((status === 'completed' || status === 'failed' || status === 'cancelled') && intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [status]);

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'processing':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'cancelled':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'completed':
        return 'Payment completed successfully';
      case 'failed':
        return 'Payment failed. Please try again.';
      case 'processing':
        return 'Payment is being processed...';
      case 'cancelled':
        return 'Payment was cancelled';
      case 'pending':
        return 'Payment is pending';
      default:
        return 'Payment status unknown';
    }
  };

  if (showDetails) {
    return (
      <Card className="bg-card/40 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            Payment Status
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            Tracking payment #{paymentId}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          ) : (
            <div className={`p-4 rounded-lg border ${getStatusColor()} flex items-center gap-3`}>
              {getStatusIcon()}
              <div className="flex-1">
                <div className="font-medium">{getStatusMessage()}</div>
                <div className="text-sm opacity-90">
                  Amount: GH₵ {amount.toFixed(2)}
                </div>
                {lastUpdated && (
                  <div className="text-xs opacity-75 mt-1">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
              </div>
              <Badge variant={status === 'completed' ? 'default' : 'secondary'}>
                {status.toUpperCase()}
              </Badge>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchStatus}
              disabled={loading}
              className="flex-1"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact version for inline use
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getStatusColor()}`}>
      {getStatusIcon()}
      <span className="font-medium">{status.toUpperCase()}</span>
      {loading && <Loader2 className="h-3 w-3 animate-spin" />}
    </div>
  );
};

export default PaymentStatusTracker; 