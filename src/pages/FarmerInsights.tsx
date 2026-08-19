import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import FarmerLayout from "@/components/FarmerLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import RatingWidget from "@/components/RatingWidget";
import { 
  getCrop, 
  getCropPredictions, 
  forecastCropPrice, 
  recommendCropSellingTime,
  calculateCropFreshness,
  predictHarvestForCrop,
  analyzeCropQuality 
} from "../api";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Calendar, TrendingUp, ShieldCheck, RefreshCw, Upload, Clock } from "lucide-react";

const FarmerInsights: React.FC = () => {
  const { cropId } = useParams();
  const id = Number(cropId || 0);
  const { toast } = useToast();

  const [crop, setCrop] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [priceForecast, setPriceForecast] = useState<any>(null);
  const [sellingRecommendation, setSellingRecommendation] = useState<any>(null);
  const [freshnessInfo, setFreshnessInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states for manual triggers
  const [harvestDate, setHarvestDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [storageCondition, setStorageCondition] = useState<string>('room_temp');
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);

  const fetchAllData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [cropRes, predRes, priceRes, sellRes] = await Promise.all([
        getCrop(id),
        getCropPredictions(id),
        forecastCropPrice(id, 85, 'good', 7),
        recommendCropSellingTime(id, 85, 'good')
      ]);

      if (!cropRes.error) setCrop(cropRes);
      if (!predRes.error) setPredictions(predRes);
      if (!priceRes.error) setPriceForecast(priceRes.data || priceRes);
      if (!sellRes.error) setSellingRecommendation(sellRes.data || sellRes);

      if (cropRes && cropRes.plantingDate) {
        const freshRes = await calculateCropFreshness(id, harvestDate, storageCondition);
        if (!freshRes.error) setFreshnessInfo(freshRes.data || freshRes);
      }
    } catch (err: any) {
      console.error("Error loading insights:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [id]);

  const handlePredictHarvest = async () => {
    try {
      const res = await predictHarvestForCrop(id);
      if (!res.error) {
        toast({ title: "Harvest Prediction Updated", description: `Estimated: ${res.prediction?.estimated_harvest || 'Success'}` });
        fetchAllData();
      } else {
        toast({ title: "Prediction Failed", description: res.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCalculateFreshness = async () => {
    try {
      const res = await calculateCropFreshness(id, harvestDate, storageCondition);
      if (!res.error) {
        setFreshnessInfo(res.data || res);
        toast({ title: "Freshness Recalculated", description: `Score: ${res.data?.freshness_score || 'Updated'}` });
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleQualityScan = async () => {
    if (!scanFile) return;
    setAnalyzing(true);
    try {
      const res = await analyzeCropQuality(id, scanFile);
      if (!res.error) {
        toast({ title: "Quality Analysis Complete", description: `Quality Score: ${res.analysis?.quality_score}%` });
        fetchAllData();
      } else {
        toast({ title: "Analysis Failed", description: res.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  if (!id) {
    return (
      <FarmerLayout>
        <div className="container mx-auto p-4 text-center">Invalid crop selection.</div>
      </FarmerLayout>
    );
  }

  return (
    <FarmerLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-500" />
              AI Insights & Market Analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Smart quality scoring, harvest predictions, freshness calculator, and price trends.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAllData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link to="/farmers">
              <Button variant="ghost" size="sm">Back to My Crops</Button>
            </Link>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Crop Overview & AI Badges */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{crop?.name || 'Crop Overview'}</span>
                {crop?.category && <Badge variant="secondary">{crop.category}</Badge>}
              </CardTitle>
              <CardDescription>Key product specifications & AI assessment</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && !crop ? (
                <div className="py-8 text-center text-muted-foreground">Loading crop analytics...</div>
              ) : crop ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-lg">
                    <div>
                      <span className="text-xs text-muted-foreground block">Price</span>
                      <span className="text-lg font-bold text-emerald-600">GH₵{crop.price}</span>
                      <span className="text-xs text-muted-foreground"> / {crop.unit || 'kg'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Available Stock</span>
                      <span className="text-lg font-semibold">{crop.quantity} {crop.unit || 'kg'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Quality Score</span>
                      <span className="text-lg font-bold text-blue-600">
                        {crop.qualityScore ? `${crop.qualityScore}%` : 'Pending scan'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Freshness Status</span>
                      <Badge className="mt-1" variant={crop.freshnessStatus === 'fresh' ? 'default' : 'outline'}>
                        {crop.freshnessStatus || 'Good'}
                      </Badge>
                    </div>
                  </div>

                  {/* AI Quality Scan Module */}
                  <div className="border rounded-lg p-4 space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      YOLOv5 AI Quality Scanner
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Upload a fresh photo of your crop to run computer vision quality & defect detection.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setScanFile(e.target.files?.[0] || null)}
                        className="text-xs"
                      />
                      <Button 
                        size="sm" 
                        onClick={handleQualityScan} 
                        disabled={!scanFile || analyzing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        {analyzing ? 'Scanning...' : 'Run Quality Scan'}
                      </Button>
                    </div>
                  </div>

                  {/* Historical AI Log */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      AI Predictions Log
                    </h4>
                    {predictions?.predictions?.length ? (
                      <div className="divide-y text-xs border rounded-md max-h-48 overflow-y-auto">
                        {predictions.predictions.map((p: any, idx: number) => (
                          <div key={idx} className="p-2.5 flex items-center justify-between">
                            <div>
                              <span className="font-medium capitalize">{p.prediction_type || p.metric}</span>
                              {p.confidence_score && (
                                <span className="ml-2 text-muted-foreground">({Math.round(p.confidence_score * 100)}% confidence)</span>
                              )}
                            </div>
                            <span className="font-mono text-emerald-600 font-semibold">{p.predicted_value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No historical predictions logged yet.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-destructive">Failed to load crop details.</div>
              )}
            </CardContent>
          </Card>

          {/* Customer Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>Ratings & Reviews</CardTitle>
              <CardDescription>Buyer ratings and feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <RatingWidget cropId={id} />
            </CardContent>
          </Card>
        </div>

        {/* Prediction Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Harvest Predictor */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                Harvest Predictor
              </CardTitle>
              <CardDescription className="text-xs">Estimate harvest timing from planting date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Planting Date:</span>
                <span className="font-medium">{crop?.plantingDate || 'Not specified'}</span>
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={handlePredictHarvest}>
                Run Harvest Prediction
              </Button>
            </CardContent>
          </Card>

          {/* Freshness Calculator */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Freshness & Shelf-Life
              </CardTitle>
              <CardDescription className="text-xs">Calculate storage shelf-life remaining</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <Label className="text-xs">Harvest Date</Label>
                <Input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Storage Condition</Label>
                <Select value={storageCondition} onValueChange={setStorageCondition}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room_temp">Room Temp</SelectItem>
                    <SelectItem value="refrigerated">Refrigerated</SelectItem>
                    <SelectItem value="optimal">Optimal Storage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleCalculateFreshness}>
                Calculate Freshness
              </Button>

              {freshnessInfo && (
                <div className="mt-3 p-2 bg-muted/40 rounded text-xs space-y-1">
                  <div><strong>Freshness Score:</strong> {freshnessInfo.freshness_score}%</div>
                  <div><strong>Status:</strong> <span className="capitalize font-semibold">{freshnessInfo.status}</span></div>
                  <div><strong>Days Remaining:</strong> {freshnessInfo.days_remaining} days</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price Forecast & Recommendation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Price Forecast & Advice
              </CardTitle>
              <CardDescription className="text-xs">Market trend & recommended sale date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {priceForecast ? (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold block">7-Day Price Forecast</span>
                  <div className="text-lg font-bold text-emerald-600">GH₵{priceForecast.forecasted_price}</div>
                  <span className="text-xs text-muted-foreground block">Base: GH₵{priceForecast.base_price}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Loading price forecast...</div>
              )}

              {sellingRecommendation && (
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800 space-y-1 text-xs">
                  <span className="font-semibold text-blue-700 dark:text-blue-300">Optimal Selling Date:</span>
                  <div className="font-medium text-foreground">{sellingRecommendation.recommended_selling_date}</div>
                  <div className="text-muted-foreground">
                    Expected gain: <strong className="text-emerald-600">+GH₵{sellingRecommendation.expected_gain}</strong>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FarmerLayout>
  );
};

export default FarmerInsights;
