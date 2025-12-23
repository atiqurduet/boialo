import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

const SignIn = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

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
              <form className="space-y-4">
                <div>
                  <Label htmlFor="email">ইমেইল বা ফোন নম্বর</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="আপনার ইমেইল বা ফোন নম্বর"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="password">পাসওয়ার্ড</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="আপনার পাসওয়ার্ড"
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
                <Button type="submit" className="w-full btn-primary">
                  লগইন করুন
                </Button>
              </form>
            ) : (
              /* Register Form */
              <form className="space-y-4">
                <div>
                  <Label htmlFor="name">পূর্ণ নাম</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="আপনার পূর্ণ নাম"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="reg-email">ইমেইল</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="আপনার ইমেইল"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">ফোন নম্বর</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="আপনার ফোন নম্বর"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="reg-password">পাসওয়ার্ড</Label>
                  <div className="relative mt-1">
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="একটি শক্তিশালী পাসওয়ার্ড"
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
                    <input type="checkbox" className="rounded border-border mt-0.5" />
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
                <Button type="submit" className="w-full btn-primary">
                  রেজিস্টার করুন
                </Button>
              </form>
            )}

            {/* Social Login */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card px-4 text-muted-foreground">অথবা</span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <Button variant="outline" className="w-full gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google দিয়ে {isLogin ? "লগইন" : "রেজিস্টার"}
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook দিয়ে {isLogin ? "লগইন" : "রেজিস্টার"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SignIn;
