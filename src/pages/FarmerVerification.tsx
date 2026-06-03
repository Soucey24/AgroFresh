import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Camera, IdCard, Phone, MapPinPlus, Check, ChevronRight, X, Loader2 } from 'lucide-react';
import BackgroundSlideshow from '@/components/BackgroundSlideshow';
import { createFarmerVerification } from '../api_verification';
import { useToast } from '@/hooks/use-toast';

const FarmerVerification = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const userId = params.get('id');

  // Wizard state
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [ghanaCardNumber, setGhanaCardNumber] = useState('');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [associationAddress, setAssociationAddress] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [locationDetails, setLocationDetails] = useState({
    region: '',
    district: '',
    townVillage: '',
  });
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera setup & cleanup
  useEffect(() => {
    if (!cameraActive || step !== 3) return;
    startCamera();
    return () => {
      stopCamera();
    };
  }, [cameraActive, step]);

  useEffect(() => {
    if (step === 5 && !latitude && !longitude && !locationLoading) {
      captureLocation();
    }
  }, [step, latitude, longitude, locationLoading]);

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setError('Cannot access camera. Please check permissions.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
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

  const captureLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError('Location is not supported on this device or browser.');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLatitude = position.coords.latitude.toFixed(6);
        const nextLongitude = position.coords.longitude.toFixed(6);
        setLatitude(nextLatitude);
        setLongitude(nextLongitude);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nextLatitude}&lon=${nextLongitude}`,
            {
              headers: {
                Accept: 'application/json',
              },
            }
          );
          const data = await response.json();
          const countryCode = (data?.address?.country_code || '').toLowerCase();
          if (countryCode !== 'gh' && (data?.address?.country || '').toLowerCase() !== 'ghana') {
            setLatitude('');
            setLongitude('');
            setLocationDetails({ region: '', district: '', townVillage: '' });
            setError('Please stand in Ghana and try again so we can capture the farm location.');
            return;
          }

          // Ghana-specific parsing: try several address fields to find the best match
          const addr = data?.address || {};
          const region = addr.state || addr.region || addr.state_district || addr['ISO3166-2-lvl4'] || '';
          const district = addr.county || addr.municipality || addr.district || addr.city_district || addr.subdivision || addr.county_code || '';
          const townVillage = addr.village || addr.town || addr.city || addr.hamlet || addr.suburb || addr.locality || '';

          // Fallback: try to parse display_name for more granular locality if empty
          let displayFallback = '';
          if ((!region || !district || !townVillage) && data?.display_name) {
            const parts = data.display_name.split(',').map((p: string) => p.trim());
            // Typical display_name: "Place, Suburb, District, Region, Ghana"
            if (parts.length >= 3) {
              const last = parts[parts.length - 1];
              const maybeCountry = last.toLowerCase();
              if (maybeCountry === 'ghana' || maybeCountry === 'republic of ghana') {
                // pick from the end: region = parts[-2], district = parts[-3], town = parts[0]
                displayFallback = parts.join(', ');
                if (!region) region = parts[parts.length - 2] || region;
                if (!district) district = parts[parts.length - 3] || district;
                if (!townVillage) townVillage = parts[0] || townVillage;
              }
            }
          }

          setLocationDetails({
            region: region || 'Unknown region',
            district: district || 'Unknown district',
            townVillage: townVillage || 'Unknown town/village',
          });
          setLocationConfirmed(false);
        } catch {
          setLocationDetails({
            region: 'Unknown region',
            district: 'Unknown district',
            townVillage: 'Unknown town/village',
          });
          setLocationConfirmed(false);
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setError('Could not get your real location. Please allow GPS/location access and try again.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const goNext = () => {
    if (step === 1) {
      if (!phone) return setError('Please enter your phone number');
    } else if (step === 2) {
      if (!ghanaCardNumber) return setError('Please enter your Ghana card number');
    } else if (step === 3) {
      if (!photoBlob) return setError('Please take a photo');
    } else if (step === 4) {
      if (!associationAddress) return setError('Please enter your association address');
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
    if (!phone || !ghanaCardNumber || !photoBlob || !associationAddress) {
      return setError('Please complete all steps');
    }
    if (!latitude || !longitude || !locationDetails.region || !locationDetails.district || !locationDetails.townVillage) {
      return setError('Please get your real location first');
    }
    if (!locationConfirmed) {
      return setError('Please confirm the location details before submitting');
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('phone', phone);
      form.append('ghana_card_number', ghanaCardNumber);
      form.append('farmers_association_address', associationAddress);
      form.append(
        'location_text',
        `Region: ${locationDetails.region}\nDistrict: ${locationDetails.district}\nTown/Village: ${locationDetails.townVillage}`
      );
      form.append('region', locationDetails.region);
      form.append('district', locationDetails.district);
      form.append('town_village', locationDetails.townVillage);
      if (latitude) form.append('latitude', latitude);
      if (longitude) form.append('longitude', longitude);
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
              Step {step} of 5
            </div>
            <CardTitle className="text-3xl">Farmer Verification</CardTitle>
            <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Phone */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-8 w-8 text-blue-500" />
                    <div>
                      <h3 className="text-xl font-semibold">Your Phone Number</h3>
                      <p className="text-sm text-muted-foreground">
                        We'll use this to contact you about your farm
                      </p>
                    </div>
                  </div>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +233 20 123 4567"
                    className="text-lg p-3 h-12"
                    autoFocus
                  />
                  {/* Voice guidance removed */}
                </div>
              )}

              {/* Step 2: Ghana Card */}
              {step === 2 && (
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

              {/* Step 3: Take Photo */}
              {step === 3 && (
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

              {/* Step 4: Association Address */}
              {step === 4 && (
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

              {/* Step 5: Location */}
              {step === 5 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="h-8 w-8 text-red-500" />
                    <div>
                      <h3 className="text-xl font-semibold">Your Real Farm Location</h3>
                      <p className="text-sm text-muted-foreground">
                        We will use your phone's GPS to capture the real location
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="w-full h-16 text-lg font-semibold bg-red-600 hover:bg-red-700"
                    onClick={captureLocation}
                    disabled={locationLoading}
                  >
                    {locationLoading ? (
                      <>
                        <Loader2 className="h-6 w-6 mr-2 animate-spin" /> Getting Location...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-6 w-6 mr-2" /> Get My Location
                      </>
                    )}
                  </Button>

                  {latitude && longitude && (
                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800 flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold text-green-900 dark:text-green-100">Location saved</p>
                        <p className="text-green-800 dark:text-green-200 font-mono text-xs">{latitude}, {longitude}</p>
                      </div>
                    </div>
                  )}

                  {locationDetails.region && locationDetails.district && locationDetails.townVillage && (
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Exact location details</p>
                      <div className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
                        <p><span className="font-semibold">Region:</span> {locationDetails.region}</p>
                        <p><span className="font-semibold">District:</span> {locationDetails.district}</p>
                        <p><span className="font-semibold">Town/Village:</span> {locationDetails.townVillage}</p>
                      </div>
                    </div>
                  )}

                  {locationDetails.region && locationDetails.district && locationDetails.townVillage && (
                    <Button
                      type="button"
                      className="w-full h-14 text-base font-semibold bg-blue-600 hover:bg-blue-700"
                      onClick={() => setLocationConfirmed(true)}
                    >
                      {locationConfirmed ? (
                        <>
                          <Check className="h-5 w-5 mr-2" /> Location Confirmed
                        </>
                      ) : (
                        <>
                          <Check className="h-5 w-5 mr-2" /> Confirm This Location
                        </>
                      )}
                    </Button>
                  )}

                  {locationConfirmed && (
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                      Location confirmed. You can now submit the verification.
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground">
                    We use your live GPS coordinates and the nearest place name. If it is wrong, tap <strong>Get My Location</strong> again and allow location access.
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

                {step < 5 ? (
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
                    disabled={loading || !locationConfirmed}
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
