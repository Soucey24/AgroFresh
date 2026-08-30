import { useEffect, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, XCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { analyzeQuality, completeQualityCheck } from "@/api";

type QualityCheckProps = {
  order: {
    id: number;
    crop_id: number;
    quantity: number;
    status: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

export const QualityCheckForm = ({ order, isOpen, onClose, onComplete }: QualityCheckProps) => {
  const [step, setStep] = useState<"capture" | "review" | "decision">("capture");
  const [loading, setLoading] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [message, setMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | "partial">("approved");
  const [notes, setNotes] = useState("");
  const [quantityAccepted, setQuantityAccepted] = useState(order.quantity);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep("capture");
      setImageBase64("");
      setMessage("");
      setAnalysisResult(null);
      setDecision("approved");
      setNotes("");
      setQuantityAccepted(order.quantity);
      setRejectionReason("");
    }
  }, [isOpen, order.quantity]);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage("Processing image...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImageBase64(base64);

      try {
        const result = await analyzeQuality(order.id, order.crop_id, base64);
        if (result?.error) {
          setMessage(`Error: ${result.error}`);
        } else {
          setAnalysisResult(result);
          setMessage("");
          setStep("review");
        }
      } catch (err) {
        setMessage(`Failed to analyze: ${err}`);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitQualityDecision = async () => {
    if (!analysisResult?.quality_check_id) {
      setMessage("Missing quality check ID");
      return;
    }

    setLoading(true);
    setMessage("Processing quality decision...");

    try {
      const decisionData = {
        notes,
        quantity_accepted: quantityAccepted,
        quantity_rejected: order.quantity - quantityAccepted,
        reason: rejectionReason
      };

      const result = await completeQualityCheck(
        analysisResult.quality_check_id,
        order.id,
        decision,
        decisionData
      );

      if (result?.error) {
        setMessage(`Error: ${result.error}`);
      } else {
        setMessage(`Quality check completed: ${decision}`);
        setTimeout(() => {
          onComplete();
          onClose();
        }, 1500);
      }
    } catch (err) {
      setMessage(`Failed to save decision: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const qualityScore = analysisResult?.quality_score || 0;
  const defects = analysisResult?.defects || [];
  const recommendation = analysisResult?.recommendation || "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quality Check - Order #{order.id}</DialogTitle>
          <DialogDescription>Assess produce quality using AI freshness analysis</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* STEP 1: CAPTURE IMAGE */}
          {step === "capture" && (
            <div className="space-y-4">
              <div className="rounded-md border-2 border-dashed border-gray-300 p-8 text-center">
                <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="mb-4 text-sm text-gray-600">
                  Upload a clear photo or video of the produce for freshness analysis
                </p>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleImageCapture}
                  disabled={loading}
                  className="mx-auto max-w-xs"
                />
                {loading && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW ANALYSIS */}
          {step === "review" && analysisResult && (
            <div className="space-y-4">
              {imageBase64 && (
                <div className="rounded-md bg-gray-100 p-4">
                  <img src={imageBase64} alt="Produce" className="max-h-40 mx-auto rounded" />
                </div>
              )}

              {/* Quality Score Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>AI Analysis Result</span>
                    {qualityScore >= 75 ? (
                      <Badge className="bg-green-100 text-green-800">GOOD</Badge>
                    ) : qualityScore >= 50 ? (
                      <Badge className="bg-yellow-100 text-yellow-800">FAIR</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">POOR</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Quality Score</p>
                    <p className="text-2xl font-bold">{qualityScore.toFixed(1)}/100</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Recommendation</p>
                    <p className="text-sm font-medium">{recommendation}</p>
                  </div>

                  {defects.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Detected Issues</p>
                      <div className="space-y-1">
                        {defects.map((defect: any, idx: number) => (
                          <div key={idx} className="text-sm flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            {typeof defect === "string" ? defect : defect.type || "Unknown"}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult.color_analysis && (
                    <div className="text-sm">
                      <p className="text-gray-600 mb-1">Color Analysis</p>
                      <p>Brightness: {analysisResult.color_analysis.brightness?.toFixed(2)}</p>
                      <p>Saturation: {analysisResult.color_analysis.saturation?.toFixed(2)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Decision Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Make Decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={decision === "approved" ? "default" : "outline"}
                      onClick={() => setDecision("approved")}
                      className="flex flex-col items-center gap-2 h-auto py-3"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs">Approved</span>
                    </Button>
                    <Button
                      variant={decision === "partial" ? "default" : "outline"}
                      onClick={() => setDecision("partial")}
                      className="flex flex-col items-center gap-2 h-auto py-3"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">Partial</span>
                    </Button>
                    <Button
                      variant={decision === "rejected" ? "destructive" : "outline"}
                      onClick={() => setDecision("rejected")}
                      className="flex flex-col items-center gap-2 h-auto py-3"
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="text-xs">Rejected</span>
                    </Button>
                  </div>

                  {/* Quantity Adjustment for Partial */}
                  {decision === "partial" && (
                    <div>
                      <label className="text-sm font-medium">Quantity to Accept</label>
                      <Input
                        type="number"
                        min={1}
                        max={order.quantity}
                        value={quantityAccepted}
                        onChange={(e) => setQuantityAccepted(Number(e.target.value))}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {order.quantity - quantityAccepted} units will be rejected
                      </p>
                    </div>
                  )}

                  {/* Rejection Reason for Rejected */}
                  {decision === "rejected" && (
                    <div>
                      <label className="text-sm font-medium">Reason for Rejection</label>
                      <Input
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="e.g., Over-ripe, visible mold, bruising"
                        className="mt-1"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any additional comments about this quality check..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>

              {message && (
                <div className="text-sm text-yellow-700 bg-yellow-100 p-3 rounded">
                  {message}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setStep("capture")}>
                  Retake Photo
                </Button>
                <Button onClick={handleSubmitQualityDecision} disabled={loading}>
                  {loading ? "Processing..." : "Submit Quality Decision"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
