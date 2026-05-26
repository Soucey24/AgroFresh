import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RatingWidget from "@/components/RatingWidget";
import { getCrop, getCropPredictions, forecastCropPrice } from "../api";

const FarmerInsights: React.FC = () => {
  const { cropId } = useParams();
  const id = Number(cropId || 0);
  const [crop, setCrop] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [priceForecast, setPriceForecast] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    getCrop(id).then(data => { if (!data.error) setCrop(data); });
    getCropPredictions(id).then(data => { if (!data.error) setPredictions(data); });
    forecastCropPrice(id, 85, 'good', 7).then(data => { if (!data.error) setPriceForecast(data); });
  }, [id]);

  if (!id) return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto p-4">Invalid crop id</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Farmer Insights</h1>
          <Link to="/farmers">
            <Button variant="ghost">Back to Dashboard</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Crop Overview</CardTitle>
              <CardDescription>Key information and ML outputs</CardDescription>
            </CardHeader>
            <CardContent>
              {crop ? (
                <div className="space-y-3 text-sm">
                  <div><strong>Name:</strong> {crop.name}</div>
                  <div><strong>Category:</strong> {crop.category}</div>
                  <div><strong>Quantity:</strong> {crop.quantity} {crop.unit || 'kg'}</div>
                  <div><strong>Price:</strong> GH₵{crop.price}</div>
                  <div><strong>Expiry:</strong> {crop.expiryDate}</div>
                  <div className="flex items-center gap-3">
                    <strong>Rating:</strong>
                    {crop.averageRating != null ? (
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-muted/40 px-2 py-0.5 text-sm">{crop.averageRating.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">({crop.reviewCount || 0} reviews)</div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No reviews yet</div>
                    )}
                  </div>

                  <div className="pt-2">
                    <h4 className="font-medium">Predictions</h4>
                    {predictions?.predictions?.length ? (
                      <ul className="text-sm list-disc list-inside">
                        {predictions.predictions.map((p: any, i: number) => (
                          <li key={i}>{p.type || p.metric}: {p.predicted_value ?? JSON.stringify(p)}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-muted-foreground">No predictions available</div>
                    )}
                  </div>

                  <div className="pt-2">
                    <h4 className="font-medium">Price Forecast (7d)</h4>
                    {priceForecast?.data ? (
                      <div className="text-sm">
                        Base: GH₵{priceForecast.data.base_price} • Forecast: GH₵{priceForecast.data.forecasted_price}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No price forecast</div>
                    )}
                  </div>
                </div>
              ) : (
                <div>Loading...</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ratings & Reviews</CardTitle>
              <CardDescription>Customer feedback for this crop</CardDescription>
            </CardHeader>
            <CardContent>
              <RatingWidget cropId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FarmerInsights;
