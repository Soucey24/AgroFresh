import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Camera, IdCard, MapPinPlus, Check, ChevronRight, X, Loader2 } from 'lucide-react';
import BackgroundSlideshow from '@/components/BackgroundSlideshow';
import { createFarmerVerification } from '../api_verification';
import { useToast } from '@/hooks/use-toast';

const FarmerVerification = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const userId = params.get('id');
  const prefilledPhone = params.get('phone') || '';

  // Wizard state
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState(prefilledPhone);
  const [ghanaCardNumber, setGhanaCardNumber] = useState('');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [associationAddress, setAssociationAddress] = useState('');
  const [exactLocation, setExactLocation] = useState('');
  const [locationDetails, setLocationDetails] = useState({
    region: '',
    district: '',
    townVillage: '',
  });

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState('');
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera setup & cleanup
  useEffect(() => {
    if (!cameraActive || step !== 2) return;
    startCamera();
    return () => {
      stopCamera();
    };
  }, [cameraActive, step, cameraFacingMode]);


  const isValidGhanaPhone = (value: string) => {
    const clean = value.replace(/\s+/g, '');
    return /^(?:\+233|233|0)(?:20|24|26|27|50|54|55|59)\d{7,8}$/.test(clean);
  };

  const startCamera = async () => {
    try {
      setError('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('This browser does not support camera capture. Please use Chrome or Edge on desktop or mobile.');
        setCameraActive(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: cameraFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setError('Camera access was blocked. Please allow camera permission in your browser and try again.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const switchCamera = () => {
    stopCamera();
    setCameraFacingMode((current) => current === 'user' ? 'environment' : 'user');
  };

  const takePhoto = () => {
    if (!canvasRef.current || !videoRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        setPhotoBlob(blob);
        setPhotoPreview(canvasRef.current!.toDataURL('image/jpeg'));
        setCameraActive(false);
        stopCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  const retakePhoto = () => {
    setPhotoBlob(null);
    setPhotoPreview('');
    setCameraActive(true);
  };

  // Voice guidance removed: keep function area empty to avoid runtime errors if referenced elsewhere

  const goNext = () => {
    if (step === 1) {
      if (!ghanaCardNumber) return setError('Please enter your Ghana card number');
    } else if (step === 2) {
      if (!photoBlob) return setError('Please take a photo');
    } else if (step === 3) {
      if (!associationAddress) return setError('Please enter your association address');
    } else if (step === 4) {
      if (!exactLocation.trim()) return setError('Please type the exact farm location');
    }
    setError('');
    setStep(step + 1);
  };

  const goBack = () => {
    setError('');
    if (step === 3) {
      stopCamera();
      setCameraActive(false);
    }
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userId) return setError('Missing user id');
    if (!ghanaCardNumber || !photoBlob || !associationAddress) {
      return setError('Please complete all steps');
    }
    if (!exactLocation.trim()) {
      return setError('Please type the exact farm location before submitting');
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('user_id', String(userId || ''));
      form.append('phone', phone);
      form.append('ghana_card_number', ghanaCardNumber);
      form.append('farmers_association_address', associationAddress.trim());
      form.append('location_text', exactLocation.trim());
      form.append('region', locationDetails.region || '');
      form.append('district', locationDetails.district || '');
      form.append('town_village', locationDetails.townVillage || '');
      form.append('photo', photoBlob, 'farmer_photo.jpg');

      const res = await createFarmerVerification(userId, form);
      if (res.error) {
        setError(res.error || 'Verification submission failed');
        toast({ title: 'Verification failed', description: res.error || 'Submission failed' });
      } else if (res.fallback) {
        // Saved to local file because DB or storage unavailable
        toast({ title: 'Saved locally', description: `Verification saved to server fallback: ${res.path || 'server'}` });
        setTimeout(() => navigate('/farmers'), 1400);
      } else if (res.success) {
        toast({ title: 'Verification submitted', description: 'Your verification is pending review' });
        setTimeout(() => navigate('/farmers'), 1200);
      } else {
        // Unexpected response
        setError('Unexpected server response');
        toast({ title: 'Verification failed', description: 'Unexpected server response' });
      }
    } catch (err: any) {
      setError(err?.message || 'Submission error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4">
      <BackgroundSlideshow />
      <div className="relative z-10 w-full max-w-2xl">
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center border-b">
            <div className="mb-2 text-sm font-medium text-muted-foreground">
              Step {step} of 4
            </div>
            <CardTitle className="text-3xl">Farmer Verification</CardTitle>
            <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Ghana Card */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <IdCard className="h-8 w-8 text-purple-500" />
                    <div>
                      <h3 className="text-xl font-semibold">Ghana Card Number</h3>
                      <p className="text-sm text-muted-foreground">
                        Found on your ID card (e.g., GHA-123456789-0)
                      </p>
                    </div>
                  </div>
                  <Input
                    value={ghanaCardNumber}
                    onChange={(e) => setGhanaCardNumber(e.target.value.toUpperCase())}
                    placeholder="GHA-123456789-0"
                    className="text-lg p-3 h-12 font-mono"
                    autoFocus
                  />
                  {/* Voice guidance removed */}
                </div>
              )}

              {/* Step 2: Take Photo */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Camera className="h-8 w-8 text-green-500" />
                    <div>
                      <h3 className="text-xl font-semibold">Your Photo</h3>
                      <p className="text-sm text-muted-foreground">
                        Take a clear photo of your face
                      </p>
                    </div>
                  </div>

                  {!cameraActive && !photoPreview && (
                    <Button
                      type="button"
                      className="w-full h-24 text-lg font-semibold bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setCameraActive(true);
                      }}
                    >
                      <Camera className="h-8 w-8 mr-2" /> Open Camera
                    </Button>
                  )}

                  {cameraActive && (
                    <div className="space-y-3">
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full aspect-video"
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full h-16 text-lg font-semibold bg-green-600 hover:bg-green-700"
                        onClick={takePhoto}
                      >
                        <Camera className="h-8 w-8 mr-2" /> Take Photo Now
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-12"
                        onClick={switchCamera}
                      >
                        <Camera className="h-5 w-5 mr-2" />
                        Switch to {cameraFacingMode === 'user' ? 'back' : 'front'} camera
                      </Button>
                    </div>
                  )}

                  {photoPreview && (
                    <div className="space-y-3">
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <img src={photoPreview} alt="Your photo" className="w-full aspect-video object-cover" />
                        <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                          <Check className="h-4 w-4" /> Saved
                        </div>
                      </div>
                      <Button type="button" variant="outline" className="w-full h-12" onClick={retakePhoto}>
                        <Camera className="h-5 w-5 mr-2" /> Take Another Photo
                      </Button>
                    </div>
                  )}

                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}

              {/* Step 3: Association Address */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPinPlus className="h-8 w-8 text-orange-500" />
                    <div>
                      <h3 className="text-xl font-semibold">Farmers Association</h3>
                      <p className="text-sm text-muted-foreground">
                        Name and address of your farmer group
                      </p>
                    </div>
                  </div>
                  <Input
                    value={associationAddress}
                    onChange={(e) => setAssociationAddress(e.target.value)}
                    placeholder="e.g., Ejisu Farmers Association, Kumasi"
                    className="text-lg p-3 h-12"
                    autoFocus
                  />
                  {/* Voice guidance removed */}
                </div>
              )}

              {/* Step 4: Location */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="h-8 w-8 text-red-500" />
                    <div>
                      <h3 className="text-xl font-semibold">Exact Farm Location</h3>
                      <p className="text-sm text-muted-foreground">
                        Type the precise location of the farm or business area
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exact-location">Exact location</Label>
                    <Input
                      id="exact-location"
                      value={exactLocation}
                      onChange={(e) => setExactLocation(e.target.value)}
                      placeholder="e.g. Besease, Bosome Freho District, Eastern Region, Ghana"
                      className="text-base p-3 h-12"
                      autoFocus
                    />
                  </div>

                  <p className="text-sm text-muted-foreground">
                    This should be the exact address or farm location as it should appear for buyers and delivery teams.
                  </p>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800 flex items-start gap-2">
                  <X className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center gap-3 pt-4">
                {step > 1 && (
                  <Button type="button" variant="outline" className="h-12 w-12" onClick={goBack}>
                    ←
                  </Button>
                )}

                {step < 4 ? (
                  <Button
                    type="button"
                    className="flex-1 h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
                    onClick={goNext}
                  >
                    Next <ChevronRight className="h-5 w-5 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-1 h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5 mr-2" /> Submit Verification
                      </>
                    )}
                  </Button>
                )}

                <Button type="button" variant="ghost" className="h-12" onClick={() => navigate('/')}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmerVerification;
