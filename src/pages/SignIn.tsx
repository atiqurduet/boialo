import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Eye, EyeOff, Loader2, Phone, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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

  // OTP states
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const formatPhoneNumber = (phoneNumber: string): string => {
    let formatted = phoneNumber.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
      formatted = '88' + formatted;
    } else if (!formatted.startsWith('88')) {
      formatted = '88' + formatted;
    }
    return formatted;
  };

  const sendOtp = async () => {
    if (!phone || phone.length < 11) {
      toast.error("সঠিক ফোন নম্বর দিন");
      return;
    }

    setOtpLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { action: 'send', phone: formattedPhone }
      });

      if (error) throw error;

      if (data.success) {
        toast.success("OTP পাঠানো হয়েছে");
        setResendTimer(60);
        setShowOtpDialog(true);
        
        // For testing - show OTP in toast if returned (only in dev/no SMS provider)
        if (data.otp) {
          toast.info(`টেস্ট OTP: ${data.otp}`, { duration: 10000 });
        }
      } else {
        throw new Error(data.error || 'OTP পাঠাতে সমস্যা হয়েছে');
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || "OTP পাঠাতে সমস্যা হয়েছে");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error("৬ ডিজিটের OTP দিন");
      return;
    }

    setOtpLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { action: 'verify', phone: formattedPhone, otp: otpCode }
      });

      if (error) throw error;

      if (data.success) {
        toast.success("ফোন নম্বর যাচাই হয়েছে");
        setPhoneVerified(true);
        setShowOtpDialog(false);
        setOtpCode("");
      } else {
        throw new Error(data.error || 'OTP যাচাই ব্যর্থ');
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || "OTP যাচাই ব্যর্থ");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("সব ফিল্ড পূরণ করুন");
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("ভুল ইমেইল বা পাসওয়ার্ড");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("স্বাগতম!");
      navigate("/");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error("সব প্রয়োজনীয় ফিল্ড পূরণ করুন");
      return;
    }

    if (password.length < 6) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে");
      return;
    }

    if (!agreeTerms) {
      toast.error("শর্তাবলী মেনে নিন");
      return;
    }

    if (phone && !phoneVerified) {
      toast.error("ফোন নম্বর যাচাই করুন");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("এই ইমেইল আগে থেকেই রেজিস্টার্ড");
      } else {
        toast.error(error.message);
      }
    } else {
      // Update profile with phone if verified
      if (phone && phoneVerified) {
        const formattedPhone = formatPhoneNumber(phone);
        setTimeout(async () => {
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await supabase.from('profiles').update({ phone: formattedPhone }).eq('id', newUser.id);
          }
        }, 1000);
      }
      toast.success("অ্যাকাউন্ট তৈরি হয়েছে!");
      navigate("/");
    }
  };

  // Reset phone verification when phone changes
  useEffect(() => {
    if (phoneVerified) {
      setPhoneVerified(false);
    }
  }, [phone]);

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
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={loading || phoneVerified}
                      className="flex-1"
                    />
                    {phone && phone.length >= 11 && (
                      phoneVerified ? (
                        <Button type="button" variant="outline" disabled className="gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          যাচাই হয়েছে
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" onClick={sendOtp} disabled={otpLoading}>
                          {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4 mr-1" />}
                          OTP পাঠান
                        </Button>
                      )
                    )}
                  </div>
                  {phoneVerified && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> ফোন নম্বর যাচাই সম্পন্ন
                    </p>
                  )}
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

      {/* OTP Verification Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">ফোন যাচাই করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-center text-muted-foreground text-sm">
              {formatPhoneNumber(phone)} নম্বরে পাঠানো ৬ ডিজিটের কোড দিন
            </p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={verifyOtp} className="w-full" disabled={otpLoading || otpCode.length !== 6}>
              {otpLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              যাচাই করুন
            </Button>
            <div className="text-center">
              {resendTimer > 0 ? (
                <p className="text-sm text-muted-foreground">{resendTimer} সেকেন্ড পর আবার পাঠান</p>
              ) : (
                <Button variant="link" onClick={sendOtp} disabled={otpLoading} className="text-sm">
                  আবার OTP পাঠান
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default SignIn;
