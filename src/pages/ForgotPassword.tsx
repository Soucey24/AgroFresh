import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import BackgroundSlideshow from '@/components/BackgroundSlideshow';
import { requestPasswordReset, resetPassword } from '../api';
import { toast } from '@/components/ui/sonner';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await requestPasswordReset(email);
      if (result.error) return setError(result.error);
      setPhone(result.phone || 'your phone');
      setStep('reset');
      toast.success('Reset code sent', { description: `Check the phone ending in ${result.phone || 'your phone'}.` });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await resetPassword(otpCode, newPassword);
      if (result.error) return setError(result.error);
      toast.success('Password reset successfully');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  return <div className="relative flex min-h-screen items-center justify-center p-4"><BackgroundSlideshow /><Card className="relative z-10 w-full max-w-md bg-card/80 backdrop-blur-sm"><CardHeader className="text-center"><Leaf className="mx-auto mb-3 h-10 w-10 text-primary" /><CardTitle>Reset your password</CardTitle><CardDescription>{step === 'email' ? 'Enter your account email to receive a reset code.' : `Enter the code sent to ${phone}.`}</CardDescription></CardHeader><CardContent><form onSubmit={step === 'email' ? handleRequest : handleReset} className="space-y-4">{step === 'email' ? <div><Label htmlFor="email">Email</Label><div className="relative mt-1"><Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="email" type="email" className="pl-10" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></div> : <><div><Label htmlFor="reset-otp">Verification code</Label><Input id="reset-otp" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit code" value={otpCode} onChange={(event) => setOtpCode(event.target.value)} required /></div><div><Label htmlFor="new-password">New password</Label><div className="relative mt-1"><LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="new-password" type="password" minLength={8} className="pl-10" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></div></div></>}{error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}<Button className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{step === 'email' ? 'Send reset code' : 'Reset password'}</Button></form><p className="mt-5 text-center text-sm text-muted-foreground"><Link to="/login" className="text-primary hover:underline">Back to login</Link></p></CardContent></Card></div>;
};

export default ForgotPassword;
