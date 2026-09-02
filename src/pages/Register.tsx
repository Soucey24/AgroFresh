import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Leaf, User, Mail, Lock, MapPin, Loader2 } from "lucide-react";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import { register, resendRegistrationOtp, verifyRegistrationOtp } from '../api';
import { useToast } from '@/hooks/use-toast';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    surname: "",
    other_names: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "",
    location: "",
    digital_address: ""
  });
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');

  const isValidGhanaPhone = (value: string) => {
    const clean = value.replace(/\D/g, '');
    const localNumber = clean.startsWith('233') ? clean.slice(3) : clean.startsWith('0') ? clean.slice(1) : clean;
    return /^(?:20|23|24|25|26|27|28|29|50|53|54|55|56|57|58|59)\d{7}$/.test(localNumber);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!formData.first_name || !formData.surname) {
      setError("First name and surname are required.");
      return;
    }
    if (!phone) {
      setError("Please enter your phone number before continuing.");
      return;
    }
    if (!isValidGhanaPhone(phone)) {
      setError("Please enter a valid Ghana mobile number before continuing.");
      return;
    }
    // Call backend API
    setLoading(true);
    const result = await register({ ...formData, name: `${formData.first_name} ${formData.other_names} ${formData.surname}`.replace(/\s+/g, ' ').trim(), phone });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.requiresPhoneOtp) {
      setMaskedPhone(result.phone || 'your phone');
      setOtpStep(true);
      toast({ title: 'Phone verification required', description: `Enter the code sent to ${result.phone || 'your phone'}.` });
      return;
    }

    completeRegistration(result);
  };

  const completeRegistration = (result: any) => {
    toast({ title: 'Account created' });

    if (result.role === "farmer") {
      // Reuse the phone number already collected during registration
      const verificationPhone = encodeURIComponent(phone);
      navigate(`/verify-farmer?id=${result.id}&phone=${verificationPhone}`);
    } else if (result.role === "buyer") {
      navigate("/buyers");
    } else if (result.role === "admin" || result.role === "vendor") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const result = await verifyRegistrationOtp(otpCode);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    completeRegistration(result);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    const result = await resendRegistrationOtp();
    setLoading(false);
    if (result.error) setError(result.error);
    else toast({ title: 'Code resent', description: 'A new signup code was sent to your phone.' });
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4">
      <BackgroundSlideshow />
      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Leaf className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Join AgroFresh GH</CardTitle>
            <CardDescription>
              Create your account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={otpStep ? handleOtpSubmit : handleRegister} className="space-y-4">
              {otpStep ? (
                <>
                  <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">A verification code was sent to {maskedPhone}.</div>
                  <Label htmlFor="signup-otp">Phone verification code</Label>
                  <Input id="signup-otp" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit code" value={otpCode} onChange={(event) => setOtpCode(event.target.value)} required />
                  <Button type="button" variant="link" className="px-0 text-sm" onClick={handleResendOtp} disabled={loading}>Resend code</Button>
                </>
              ) : (
                <>
              <div>
                <Label htmlFor="first_name">First name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="first_name"
                    placeholder="Enter your first name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div><Label htmlFor="surname">Surname</Label><Input id="surname" placeholder="Enter your surname" value={formData.surname} onChange={(e) => setFormData({...formData, surname: e.target.value})} required /></div>
              <div><Label htmlFor="other_names">Other names (optional)</Label><Input id="other_names" placeholder="Other names" value={formData.other_names} onChange={(e) => setFormData({...formData, other_names: e.target.value})} /></div>
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="userType">I am a...</Label>
                <Select 
                  value={formData.userType} 
                  onValueChange={(value) => setFormData({...formData, userType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="farmer">Farmer</SelectItem>
                    <SelectItem value="buyer">Buyer (Restaurant/Individual)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Admin accounts are created by the platform team. If you are an admin, sign in with the dedicated admin account.
                </p>
              </div>

              <div className="space-y-3 rounded-md border border-dashed p-3 bg-muted/20">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="e.g. +233 20 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              {formData.userType === 'farmer' && (
                <div>
                  <Label htmlFor="location">Farm location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="e.g. Tamale, Northern Region"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="digital_address">Digital address (private)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="digital_address"
                    placeholder="GhanaPost GPS digital address"
                    value={formData.digital_address}
                    onChange={(e) => setFormData({ ...formData, digital_address: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
                </>
              )}

              {error && (
                <div className="text-red-500 text-sm mb-2 text-center">{error}</div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...
                  </>
                  ) : (
                  otpStep ? 'Verify phone and continue' : 'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
