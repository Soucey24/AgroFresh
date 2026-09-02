import { useEffect, useState } from "react";
import { Loader2, MapPin, TrendingUp } from "lucide-react";
import FarmerLayout from "@/components/FarmerLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getFarmerMarketDemand } from "@/api";

const FarmerMarketDemand = () => {
  const [cropType, setCropType] = useState("tomato");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyzeDemand = async () => {
    if (!cropType.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await getFarmerMarketDemand(cropType.trim().toLowerCase());
      if (result?.error) {
        setError(result.error);
        setAnalysis(null);
      } else {
        setAnalysis(result);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to analyze market demand.");
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void analyzeDemand();
  }, []);

  return (
    <FarmerLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><TrendingUp className="h-4 w-4" /> Selling intelligence</p>
          <h1 className="text-3xl font-bold text-foreground">Market demand</h1>
          <p className="mt-1 text-muted-foreground">Find buyer locations with the strongest demand before your produce loses freshness.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Choose a crop</CardTitle>
            <CardDescription>Demand is ranked from historical orders, recent activity, and fulfilled sales.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={cropType} onChange={(event) => setCropType(event.target.value)} placeholder="e.g. tomato, carrot, cassava" onKeyDown={(event) => event.key === "Enter" && void analyzeDemand()} />
              <Button type="button" disabled={loading || !cropType.trim()} onClick={() => void analyzeDemand()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze demand
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        {analysis && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Crop analyzed</p><p className="text-xl font-semibold">{analysis.cropType}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Available stock near spoilage</p><p className="text-xl font-semibold">{analysis.nearSpoilageStock || 0} units</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Recommended buyer locations</CardTitle><CardDescription>Higher scores indicate stronger observed demand.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {analysis.candidateLocations?.length ? analysis.candidateLocations.map((candidate: any, index: number) => (
                  <div key={candidate.location} className="flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3"><MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" /><div><p className="font-medium">{index + 1}. {candidate.location}</p><p className="text-sm text-muted-foreground">{candidate.recentOrders} recent orders · {candidate.fulfilledOrders} fulfilled · {candidate.quantityOrdered} units ordered</p></div></div>
                    <Badge className="w-fit">Demand score {candidate.predictedDemandScore}</Badge>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No buyer locations have recorded demand for this crop yet.</p>}
              </CardContent>
            </Card>
            <p className="text-xs font-medium text-primary">Data source: {analysis.dataSource}</p>
          </>
        )}
      </div>
    </FarmerLayout>
  );
};

export default FarmerMarketDemand;
