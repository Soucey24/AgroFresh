import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Camera, IdCard, MapPinPlus, Check, ChevronRight, X, Loader2 } from 'lucide-react';
import BackgroundSlideshow from '@/components/BackgroundSlideshow';
import { createFarmerVerification } from '../api_verification';
import { getProfile } from '@/api';
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
  const [ghanaCardFront, setGhanaCardFront] = useState<File | null>(null);
  const [ghanaCardBack, setGhanaCardBack] = useState<File | null>(null);
  const [diditCompleted, setDiditCompleted] = useState(false);
  const [fdaDocument, setFdaDocument] = useState<File | null>(null);
  const [fdaRegistrationNumber, setFdaRegistrationNumber] = useState('');
  const [yearsFarming, setYearsFarming] = useState('');
  const [cropsProduced, setCropsProduced] = useState('');
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

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    getProfile().then((profile) => {
      if (mounted && profile?.verificationStatus === 'approved') {
        navigate('/farmers', { replace: true });
      }
    }).catch((profileError) => {
      console.error('Could not load farmer verification status:', profileError);
    });

    return () => {
      mounted = false;
    };
  }, [navigate, userId]);

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
      if (!ghanaCardFront || !ghanaCardBack) return setError('Please upload clear images of the front and back of your Ghana Card');
    } else if (step === 2) {
      if (!photoBlob) return setError('Please capture or select a clear selfie before continuing');
    } else if (step === 3) {
      if (!fdaRegistrationNumber || !fdaDocument || !yearsFarming || !cropsProduced) return setError('Please complete your FDA, farming history, and crop details');
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
    if (!ghanaCardFront || !ghanaCardBack || !photoBlob || !fdaDocument || !fdaRegistrationNumber || !yearsFarming || !cropsProduced) {
      return setError('Please complete all steps');
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('user_id', String(userId || ''));
      form.append('phone', phone);
      form.append('ghana_card_front', ghanaCardFront);
      form.append('ghana_card_back', ghanaCardBack);
      form.append('fda_document', fdaDocument);
      form.append('fda_registration_number', fdaRegistrationNumber.trim());
      form.append('years_farming', yearsFarming);
      form.append('crops_produced', cropsProduced.trim());
      form.append('farmers_association_address', associationAddress.trim());
      form.append('region', locationDetails.region || '');
      form.append('district', locationDetails.district || '');
      form.append('town_village', locationDetails.townVillage || '');
      if (photoBlob) form.append('photo', photoBlob, 'farmer_photo.jpg');

      const res = await createFarmerVerification(userId, form);
      if (res.error) {
        setError(res.error || 'Verification submission failed');
        toast({ title: 'Verification failed', description: res.error || 'Submission failed' });
      } else if (res.fallback) {
        // Saved to local file because DB or storage unavailable
        toast({ title: 'Saved locally', description: `Verification saved to server fallback: ${res.path || 'server'}` });
        setTimeout(() => navigate('/farmers'), 1400);
      } else if (res.success) {
        setDiditCompleted(true);
        toast({ title: 'Verification submitted', description: 'Your identity was checked and your application is pending review.' });
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
              Step {step} of 3
            </div>
            <CardTitle className="text-3xl">Farmer Verification</CardTitle>
            <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
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
                      <h3 className="text-xl font-semibold">Secure identity verification</h3>
                      <p className="text-sm text-muted-foreground">
                        Complete the Didit identity check below. It includes Ghana Card and face verification.
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <p className="font-medium text-primary">Identity documents</p>
                    <p className="text-sm text-muted-foreground">Upload clear images of both sides of your Ghana Card. AgroFresh sends them securely to Didit for verification.</p>
                    <Label htmlFor="ghana-card-front">Ghana Card front</Label>
                    <Input id="ghana-card-front" type="file" accept="image/*" onChange={(e) => setGhanaCardFront(e.target.files?.[0] || null)} />
                    <Label htmlFor="ghana-card-back">Ghana Card back</Label>
                    <Input id="ghana-card-back" type="file" accept="image/*" onChange={(e) => setGhanaCardBack(e.target.files?.[0] || null)} />
                  </div>
                  {/* Voice guidance removed */}
                </div>
              )}

              {/* Step 2: Didit face verification */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Camera className="h-8 w-8 text-green-500" />
                    <div>
                      <h3 className="text-xl font-semibold">Your Photo</h3>
                      <p className="text-sm text-muted-foreground">
                        Didit face verification
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">Take a clear selfie in good lighting. Didit will check the selfie against your Ghana Card and perform liveness checks when you submit.</p>
                  {!cameraActive && !photoPreview && <Button type="button" onClick={() => setCameraActive(true)} className="w-full">Open camera</Button>}
                  {cameraActive && <div className="space-y-3">
                    <video ref={videoRef} className="w-full rounded-lg border bg-black" autoPlay playsInline muted />
                    <div className="flex gap-3">
                      <Button type="button" onClick={takePhoto} className="flex-1">Take selfie</Button>
                      <Button type="button" variant="outline" onClick={() => setCameraActive(false)}>Cancel</Button>
                    </div>
                  </div>}
                  {!cameraActive && <>
                    <Label htmlFor="selfie">Or select a selfie</Label>
                    <Input id="selfie" type="file" accept="image/*" capture="user" onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setPhotoBlob(file);
                      setPhotoPreview(file ? URL.createObjectURL(file) : '');
                    }} />
                  </>}
                  {photoPreview && <img src={photoPreview} alt="Selfie preview" className="max-h-64 w-full rounded-lg object-cover" />}
                </div>
              )}

              {/* Step 3: FDA and farming history */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <IdCard className="h-8 w-8 text-orange-500" />
                    <div>
                      <h3 className="text-xl font-semibold">Farm and FDA details</h3>
                      <p className="text-sm text-muted-foreground">
                        Tell us what you farm and upload your FDA certificate.
                      </p>
                    </div>
                  </div>
                  <Label htmlFor="fda-number">FDA registration number</Label>
                  <Input id="fda-number" value={fdaRegistrationNumber} onChange={(e) => setFdaRegistrationNumber(e.target.value)} placeholder="FDA registration number" />
                  <Label htmlFor="fda-document">FDA certificate/document</Label>
                  <Input id="fda-document" type="file" accept="image/*,.pdf" onChange={(e) => setFdaDocument(e.target.files?.[0] || null)} />
                  <Label htmlFor="years-farming">Years farming</Label>
                  <Input id="years-farming" type="number" min="0" value={yearsFarming} onChange={(e) => setYearsFarming(e.target.value)} />
                  <Label htmlFor="crops-produced">Crops produced</Label>
                  <Input id="crops-produced" value={cropsProduced} onChange={(e) => setCropsProduced(e.target.value)} placeholder="e.g. maize, tomatoes, cassava" />
                  <Label htmlFor="association">Farmers association (optional)</Label>
                  <Input id="association" value={associationAddress} onChange={(e) => setAssociationAddress(e.target.value)} placeholder="Optional association name and address" />
                  {/* Voice guidance removed */}
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

                {step < 3 ? (
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
