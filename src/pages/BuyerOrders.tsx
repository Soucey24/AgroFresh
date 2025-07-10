import { useEffect, useState } from "react";
import { listOrders, getCrop, getUser, getProfile } from "../api";
import { getImageUrl } from "../utils/imageUtils";
import Navigation from "@/components/Navigation";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BuyerOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [cropDetails, setCropDetails] = useState<{[key: number]: any}>({});
  const [farmerDetails, setFarmerDetails] = useState<{[key: number]: any}>({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [user, setUser] = useState<any>(null);

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
            <h1 className="text-3xl font-bold text-foreground mb-2">My Orders</h1>
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
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <table className="min-w-full divide-y divide-border bg-card/40 backdrop-blur-sm rounded-lg">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Order #</th>
                <th className="px-4 py-2 text-left">Crop</th>
                <th className="px-4 py-2 text-left">Farmer</th>
                <th className="px-4 py-2 text-left">Quantity</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Date</th>
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
                  <td className="px-4 py-2">{farmerDetails[cropDetails[order.crop_id]?.farmer_id]?.name || `ID ${cropDetails[order.crop_id]?.farmer_id}`}</td>
                  <td className="px-4 py-2">{order.quantity}</td>
                  <td className="px-4 py-2"><Badge>{order.status}</Badge></td>
                  <td className="px-4 py-2">{new Date(order.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BuyerOrders; 