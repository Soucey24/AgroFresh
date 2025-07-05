import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Mail, Lock, User } from "lucide-react";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import { login } from '../api';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = await login(email, password, role);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.role === "farmer") {
      navigate("/farmers");
    } else if (result.role === "buyer") {
      navigate("/buyers");
    } else if (result.role === "vendor") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
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
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="role" className="text-sm font-medium">Role</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full border rounded-md px-10 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="">Select role</option>
                    <option value="farmer">Farmer</option>
                    <option value="buyer">Buyer</option>
                    <option value="vendor">Admin</option>
                  </select>
                </div>
              </div>

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
              </div>

              <Button type="submit" className="w-full h-11">
                Sign In
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
