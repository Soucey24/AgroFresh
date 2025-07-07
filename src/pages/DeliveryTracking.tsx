import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const DeliveryTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/orders/${orderId}/tracking`)
      .then(res => res.json())
      .then(data => {
        setTrackingInfo(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading delivery tracking...</div>;
  }

  if (!trackingInfo) {
    return <div className="min-h-screen flex items-center justify-center">No tracking info found.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="max-w-lg w-full bg-card/40 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Delivery Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <strong>Order ID:</strong> {trackingInfo.orderId}<br />
            <strong>Status:</strong> {trackingInfo.status}<br />
            <strong>Last Updated:</strong> {new Date(trackingInfo.lastUpdated).toLocaleString()}<br />
            <ul className="mt-2 text-sm">
              {trackingInfo.history.map((h: any, i: number) => (
                <li key={i}>{h.status} - {new Date(h.timestamp).toLocaleString()}</li>
              ))}
            </ul>
          </div>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryTracking; 