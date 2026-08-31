import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Mail, Lock } from "lucide-react";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import { login, resendLoginOtp, verifyLoginOtp } from '../api';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.requiresOtp) {
      setMaskedPhone(result.phone || 'your phone');
      setOtpStep(true);
      toast({ title: 'Verification code sent', description: `Enter the code sent to ${result.phone || 'your phone'}.` });
      return;
    }
    finishLogin(result);
  };

  const finishLogin = (result: any) => {
    toast({ title: 'Signed in', description: 'Welcome back!' });
    if (result.role === "farmer") {
      if (result.verificationStatus === 'not_submitted' || result.verificationStatus === 'rejected') {
        navigate(`/verify-farmer?id=${result.id}`);
      } else {
        navigate("/farmers");
      }
    } else if (result.role === "buyer") {
      navigate("/buyers");
    } else if (result.role === "operations") {
      navigate("/operations");
    } else if (result.role === "admin" || result.role === "vendor") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await verifyLoginOtp(otp);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    finishLogin(result);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    const result = await resendLoginOtp(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
    else toast({ title: 'Code resent', description: 'A new login code was sent to your phone.' });
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4 sm:p-6">
      <BackgroundSlideshow />
      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <Leaf className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Welcome Back</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Sign in to your AgroFresh GH account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={otpStep ? handleOtpVerification : handleLogin} className="space-y-4">
              {!otpStep ? <>
              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <Link to="/forgot-password" className="mt-2 inline-block text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              </> : <>
                <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">A verification code was sent to {maskedPhone}.</div>
                <div>
                  <Label htmlFor="otp">Verification code</Label>
                  <Input id="otp" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} required />
                  <Button type="button" variant="link" className="px-0 text-sm" onClick={handleResendOtp} disabled={loading}>Resend code</Button>
                </div>
              </>}
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...
                  </>
                ) : (
                  otpStep ? 'Verify and Sign In' : 'Sign In'
                )}
              </Button>
            </form>

            {error && (
              <div className="text-red-500 text-sm text-center p-3 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
