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
import { lovable } from "@/integrations/lovable";
// Self-hosting-friendly: use native Supabase OAuth directly (bypasses Lovable broker).
// When running on Lovable Cloud, the Lovable auth gate still works with this flow
// as long as the Google provider is enabled in the backend Auth settings.
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const SignIn = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const { settings: siteSettings } = useSiteSettings();

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

  // Security settings from admin
  const [otpRequiredForNewCustomers, setOtpRequiredForNewCustomers] = useState(false);
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(true);

  // Fetch security settings
  useEffect(() => {
    const fetchSecuritySettings = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("setting_key, setting_value")
          .eq("category", "security")
          .in("setting_key", ["otp_required_for_new_customers", "social_login_google_enabled"]);
        
        if (error) throw error;
        
        data?.forEach(item => {
          const val = item.setting_value === true || item.setting_value === "true";
          if (item.setting_key === "otp_required_for_new_customers") {
            setOtpRequiredForNewCustomers(val);
          }
          if (item.setting_key === "social_login_google_enabled") {
            setGoogleLoginEnabled(val);
          }
        });
      } catch (err) {
        console.error("Error fetching security settings:", err);
      }
    };
    fetchSecuritySettings();
  }, []);

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

    // If OTP required for new customers, phone and verification is mandatory
    if (otpRequiredForNewCustomers) {
      if (!phone || phone.length < 11) {
        toast.error("ফোন নম্বর দিন (OTP যাচাই বাধ্যতামূলক)");
        return;
      }
      if (!phoneVerified) {
        toast.error("ফোন নম্বর OTP দিয়ে যাচাই করুন");
        return;
      }
    } else {
      // OTP not required - if phone entered, still verify it
      if (phone && !phoneVerified) {
        toast.error("ফোন নম্বর যাচাই করুন");
        return;
      }
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

  const isPhoneRequired = otpRequiredForNewCustomers;

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-xl p-8 shadow-sm">
            {/* Logo */}
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2">
                {siteSettings.header_logo ? (
                  <img src={siteSettings.header_logo} alt={siteSettings.site_name} className="h-10 object-contain" />
                ) : (
                  <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
                    <circle cx="20" cy="20" r="18" className="fill-primary" />
                    <path
                      d="M12 28V14l8 7-8 7zm8-7l8-7v14l-8-7z"
                      className="fill-primary-foreground"
                    />
                  </svg>
                )}
                <span className="text-3xl font-bold text-primary">{siteSettings.site_name}</span>
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
                  <Label htmlFor="phone">
                    ফোন নম্বর {isPhoneRequired ? "*" : ""}
                  </Label>
                  {isPhoneRequired && (
                    <p className="text-xs text-muted-foreground mt-0.5">OTP যাচাই বাধ্যতামূলক</p>
                  )}
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
                      আমি {siteSettings.site_name} এর{" "}
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

            {/* Social Login - conditionally shown based on admin settings */}
            {googleLoginEnabled && (
              <div className="mt-6">
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">অথবা</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={async () => {
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: "google",
                      options: {
                        redirectTo: `${window.location.origin}/`,
                      },
                    });
                    if (error) toast.error(error.message);
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google দিয়ে লগইন
                </Button>
              </div>
            )}

            <div className="mt-4 text-center text-sm text-muted-foreground">
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
