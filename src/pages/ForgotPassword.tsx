import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { settings: siteSettings } = useSiteSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("ইমেইল দিন");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হয়েছে");
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
              <Link to="/" className="inline-flex items-center gap-2">
                {siteSettings.header_logo ? (
                  <img src={siteSettings.header_logo} alt={siteSettings.site_name} className="h-10 object-contain" />
                ) : (
                  <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
                    <circle cx="20" cy="20" r="18" className="fill-primary" />
                    <path d="M12 28V14l8 7-8 7zm8-7l8-7v14l-8-7z" className="fill-primary-foreground" />
                  </svg>
                )}
                <span className="text-3xl font-bold text-primary">{siteSettings.site_name}</span>
              </Link>
            </div>

            {sent ? (
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h2 className="text-xl font-semibold">ইমেইল পাঠানো হয়েছে</h2>
                <p className="text-muted-foreground">
                  আপনার ইমেইলে পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হয়েছে। অনুগ্রহ করে আপনার ইনবক্স চেক করুন।
                </p>
                <Link to="/signin">
                  <Button variant="outline" className="mt-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    লগইন পেজে ফিরে যান
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h2 className="text-xl font-semibold">পাসওয়ার্ড ভুলে গেছেন?</h2>
                  <p className="text-muted-foreground text-sm mt-2">
                    আপনার ইমেইল দিন, আমরা পাসওয়ার্ড রিসেট লিঙ্ক পাঠাব
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        পাঠানো হচ্ছে...
                      </>
                    ) : (
                      "রিসেট লিঙ্ক পাঠান"
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link to="/signin" className="text-primary hover:underline text-sm">
                    <ArrowLeft className="w-4 h-4 inline mr-1" />
                    লগইন পেজে ফিরে যান
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ForgotPassword;
