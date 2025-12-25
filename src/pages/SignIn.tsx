import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SignIn = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Welcome back!");
      navigate("/");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!agreeTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("This email is already registered");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Account created successfully!");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-xl p-8 shadow-sm">
            {/* Logo */}
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-1">
                <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
                  <circle cx="20" cy="20" r="18" className="fill-primary" />
                  <path
                    d="M12 28V14l8 7-8 7zm8-7l8-7v14l-8-7z"
                    className="fill-primary-foreground"
                  />
                </svg>
                <span className="text-3xl font-bold text-primary">WafiLife</span>
              </Link>
            </div>

            {/* Tabs */}
            <div className="flex mb-6 border-b border-border">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  isLogin
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                লগইন
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  !isLogin
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                রেজিস্টার
              </button>
            </div>

            {isLogin ? (
              /* Login Form */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">ইমেইল</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="আপনার ইমেইল"
                    className="mt-1"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="password">পাসওয়ার্ড</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="আপনার পাসওয়ার্ড"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-border" />
                    <span>আমাকে মনে রাখুন</span>
                  </label>
                  <Link to="/forgot-password" className="text-primary hover:underline">
                    পাসওয়ার্ড ভুলে গেছেন?
                  </Link>
                </div>
                <Button type="submit" className="w-full btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      অপেক্ষা করুন...
                    </>
                  ) : (
                    "লগইন করুন"
                  )}
                </Button>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="name">পূর্ণ নাম *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="আপনার পূর্ণ নাম"
                    className="mt-1"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="reg-email">ইমেইল *</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="আপনার ইমেইল"
                    className="mt-1"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">ফোন নম্বর</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="আপনার ফোন নম্বর"
                    className="mt-1"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="reg-password">পাসওয়ার্ড *</Label>
                  <div className="relative mt-1">
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="একটি শক্তিশালী পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="text-sm">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-border mt-0.5"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                    />
                    <span>
                      আমি WafiLife এর{" "}
                      <Link to="/terms" className="text-primary hover:underline">
                        শর্তাবলী
                      </Link>{" "}
                      এবং{" "}
                      <Link to="/privacy" className="text-primary hover:underline">
                        গোপনীয়তা নীতি
                      </Link>{" "}
                      মেনে নিচ্ছি
                    </span>
                  </label>
                </div>
                <Button type="submit" className="w-full btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      অপেক্ষা করুন...
                    </>
                  ) : (
                    "রেজিস্টার করুন"
                  )}
                </Button>
              </form>
            )}

            {/* Social Login - Removed for now as OAuth is not configured */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {isLogin ? (
                <p>
                  অ্যাকাউন্ট নেই?{" "}
                  <button
                    onClick={() => setIsLogin(false)}
                    className="text-primary hover:underline"
                  >
                    রেজিস্টার করুন
                  </button>
                </p>
              ) : (
                <p>
                  ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
                  <button
                    onClick={() => setIsLogin(true)}
                    className="text-primary hover:underline"
                  >
                    লগইন করুন
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SignIn;
