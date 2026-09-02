import { useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, XCircle, Loader, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [step, setStep] = useState<"capture" | "review">("capture");
  const [loading, setLoading] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [message, setMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | "partial">("approved");
  const [notes, setNotes] = useState("");
  const [quantityAccepted, setQuantityAccepted] = useState(order.quantity);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setShowCamera(false);
    setIsRecording(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    setStep("capture");
    setImageBase64("");
    setMessage("");
    setAnalysisResult(null);
    setDecision("approved");
    setNotes("");
    setQuantityAccepted(order.quantity);
    setRejectionReason("");
    setShowCamera(true);
  }, [isOpen, order.quantity]);

  useEffect(() => {
    if (!isOpen || !showCamera) return;

    let mounted = true;

    const attachCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setMessage("This browser does not support camera access.");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (err) {
        setMessage("Unable to access camera. Please allow camera permission and try again.");
      }
    };

    attachCamera();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [isOpen, showCamera, cameraFacing]);

  const isValidImageDataUrl = (value: string) => {
    return typeof value === "string" && value.startsWith("data:image/") && value.length > 200;
  };

  const prepareCapturedFrame = (base64: string) => {
    if (!isValidImageDataUrl(base64)) {
      setMessage("Unable to capture a valid image. Please try again.");
      return false;
    }

    setImageBase64(base64);
    setMessage("Image ready. Click Send for Quality Check.");
    return true;
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL("image/jpeg", 0.9);
    prepareCapturedFrame(base64);
  };

  const toggleVideoRecording = () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    const stream = cameraStreamRef.current;
    if (!stream || !videoRef.current) return;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64 = canvas.toDataURL("image/jpeg", 0.9);
      prepareCapturedFrame(base64);
    };

    recorder.start();
    setIsRecording(true);
  };

  const sendForQualityCheck = async () => {
    if (!isValidImageDataUrl(imageBase64)) {
      setMessage("No valid captured image found. Please capture first.");
      return;
    }

    setLoading(true);
    setMessage("Analyzing image...");

    try {
      const result = await analyzeQuality(order.id, order.crop_id, imageBase64);
      if (result?.error) {
        setMessage(`Error: ${result.error}`);
      } else {
        setAnalysisResult(result);
        setMessage("");
        setStep("review");
        stopCamera();
      }
    } catch (err) {
      setMessage(`Failed to analyze: ${err}`);
    } finally {
      setLoading(false);
    }
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
        reason: rejectionReason,
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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          stopCamera();
          onClose();
        }
      }}
    >
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quality Check - Order #{order.id}</DialogTitle>
          <DialogDescription>Assess crop quality using AI freshness analysis</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === "capture" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="rounded-md bg-black overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full bg-black"
                    style={{ maxHeight: "420px" }}
                  />
                </div>

                <div className="flex gap-2 justify-center">
                  <Button
                    variant={cameraFacing === "environment" ? "default" : "outline"}
                    onClick={() => setCameraFacing("environment")}
                    className="flex-1"
                  >
                    Rear Camera
                  </Button>
                  <Button
                    variant={cameraFacing === "user" ? "default" : "outline"}
                    onClick={() => setCameraFacing("user")}
                    className="flex-1"
                  >
                    Front Camera
                  </Button>
                </div>

                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={capturePhoto}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Camera className="h-4 w-4" />
                    Capture Crop
                  </Button>

                  <Button
                    onClick={toggleVideoRecording}
                    className={`flex-1 flex items-center justify-center gap-2 ${
                      isRecording ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    <Video className="h-4 w-4" />
                    {isRecording ? "Stop Crop Recording" : "Start Crop Recording"}
                  </Button>
                </div>

                {imageBase64 && (
                  <Button
                    onClick={sendForQualityCheck}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700"
                  >
                    <Camera className="h-4 w-4" />
                    Send Crop for Quality Check
                  </Button>
                )}

                <Button
                  onClick={() => {
                    stopCamera();
                    onClose();
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Close Camera
                </Button>

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-yellow-700 bg-yellow-100 p-3 rounded">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>{message}</span>
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {step === "review" && analysisResult && (
            <div className="space-y-4">
              {imageBase64 && (
                <div className="rounded-md bg-gray-100 p-4">
                  <img src={imageBase64} alt="Produce" className="max-h-40 mx-auto rounded" />
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                    <span>Produce Quality Analysis</span>
                    {qualityScore >= 75 ? (
                      <Badge className="bg-green-100 text-green-800">GOOD</Badge>
                    ) : qualityScore >= 50 ? (
                      <Badge className="bg-yellow-100 text-yellow-800">FAIR</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">POOR</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm sm:text-base">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Freshness Score</p>
                    <p className="text-xl sm:text-2xl font-bold break-words">{qualityScore.toFixed(1)}/100</p>
                  </div>

                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Assessment</p>
                    <p className="text-sm sm:text-base font-medium break-words">{recommendation}</p>
                  </div>

                  {defects.length > 0 && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium mb-2">Detected Issues</p>
                      <div className="space-y-1">
                        {defects.map((defect: any, idx: number) => (
                          <div key={idx} className="text-xs sm:text-sm flex items-start gap-2 text-red-600 break-words">
                            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{typeof defect === "string" ? defect : defect.type || "Unknown"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult.color_analysis && (
                    <div className="text-xs sm:text-sm break-words">
                      <p className="text-gray-600 mb-1">Color Analysis</p>
                      <p>Brightness: {analysisResult.color_analysis.brightness?.toFixed(2)}</p>
                      <p>Saturation: {analysisResult.color_analysis.saturation?.toFixed(2)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

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

                  {decision === "partial" && (
                    <div>
                      <label className="text-sm font-medium">Quantity to Accept</label>
                      <input
                        type="number"
                        min={1}
                        max={order.quantity}
                        value={quantityAccepted}
                        onChange={(e) => setQuantityAccepted(Number(e.target.value))}
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {order.quantity - quantityAccepted} units will be rejected
                      </p>
                    </div>
                  )}

                  {decision === "rejected" && (
                    <div>
                      <label className="text-sm font-medium">Reason for Rejection</label>
                      <input
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="e.g., Over-ripe, visible mold, bruising"
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  )}

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
