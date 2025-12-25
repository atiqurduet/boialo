import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("অবৈধ বা মেয়াদোত্তীর্ণ লিঙ্ক");
        navigate("/forgot-password");
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error("সব ফিল্ড পূরণ করুন");
      return;
    }

    if (password.length < 6) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("পাসওয়ার্ড মিলছে না");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
      toast.success("পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-xl p-8 shadow-sm">
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-1">
                <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
                  <circle cx="20" cy="20" r="18" className="fill-primary" />
                  <path d="M12 28V14l8 7-8 7zm8-7l8-7v14l-8-7z" className="fill-primary-foreground" />
                </svg>
                <span className="text-3xl font-bold text-primary">WafiLife</span>
              </Link>
            </div>

            {success ? (
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h2 className="text-xl font-semibold">পাসওয়ার্ড পরিবর্তন হয়েছে</h2>
                <p className="text-muted-foreground">
                  আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। এখন লগইন করতে পারবেন।
                </p>
                <Link to="/signin">
                  <Button className="mt-4">লগইন করুন</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h2 className="text-xl font-semibold">নতুন পাসওয়ার্ড সেট করুন</h2>
                  <p className="text-muted-foreground text-sm mt-2">
                    আপনার নতুন পাসওয়ার্ড দিন
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="password">নতুন পাসওয়ার্ড</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="কমপক্ষে ৬ অক্ষর"
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
                  <div>
                    <Label htmlFor="confirmPassword">পাসওয়ার্ড নিশ্চিত করুন</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="আবার পাসওয়ার্ড দিন"
                      className="mt-1"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        পরিবর্তন হচ্ছে...
                      </>
                    ) : (
                      "পাসওয়ার্ড পরিবর্তন করুন"
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ResetPassword;
