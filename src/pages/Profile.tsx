import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Mail, Phone, LogOut, Camera, MapPin, Lock, Calendar, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().min(1, "নাম আবশ্যক").max(100),
  email: z.string().email("সঠিক ইমেইল দিন"),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  division: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে"),
  newPassword: z.string().min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে"),
  confirmPassword: z.string().min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "পাসওয়ার্ড মিলছে না",
  path: ["confirmPassword"],
});

interface Profile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  division: string | null;
  country: string | null;
  date_of_birth: string | null;
  gender: string | null;
}

const divisions = [
  "ঢাকা",
  "চট্টগ্রাম",
  "রাজশাহী",
  "খুলনা",
  "বরিশাল",
  "সিলেট",
  "রংপুর",
  "ময়মনসিংহ",
];

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    email: "",
    phone: "",
    avatar_url: "",
    address: "",
    city: "",
    postal_code: "",
    division: "",
    country: "Bangladesh",
    date_of_birth: "",
    gender: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEmailVerified = user?.email_confirmed_at != null;

  useEffect(() => {
    if (!user) {
      navigate("/signin");
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          avatar_url: data.avatar_url || "",
          address: data.address || "",
          city: data.city || "",
          postal_code: data.postal_code || "",
          division: data.division || "",
          country: data.country || "Bangladesh",
          date_of_birth: data.date_of_birth || "",
          gender: data.gender || "",
        });
      } else {
        setProfile((prev) => ({
          ...prev,
          email: user.email || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("প্রোফাইল লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      profileSchema.parse(profile);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          address: profile.address,
          city: profile.city,
          postal_code: profile.postal_code,
          division: profile.division,
          country: profile.country,
          date_of_birth: profile.date_of_birth || null,
          gender: profile.gender,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Also update auth user metadata so header reflects new name immediately
      await supabase.auth.updateUser({
        data: { full_name: profile.full_name }
      });

      toast.success("প্রোফাইল আপডেট হয়েছে!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("প্রোফাইল আপডেট করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      passwordSchema.parse(passwords);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      });

      if (error) throw error;

      toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে!");
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    toast.success("সাইন আউট হয়েছে");
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;

    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
      toast.success("যাচাইকরণ ইমেইল পাঠানো হয়েছে");
    } catch (error: any) {
      console.error("Error resending verification:", error);
      toast.error(error.message || "ইমেইল পাঠাতে সমস্যা হয়েছে");
    } finally {
      setResendingEmail(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-6">আমার প্রোফাইল</h1>

          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="py-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={profile.avatar_url || ""} alt={profile.full_name || "User"} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user) return;
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error("ফাইল সাইজ ২MB এর বেশি হতে পারবে না");
                          return;
                        }
                        try {
                          const ext = file.name.split('.').pop();
                          const path = `${user.id}/avatar.${ext}`;
                          const { error: upErr } = await supabase.storage
                            .from('avatars')
                            .upload(path, file, { upsert: true });
                          if (upErr) throw upErr;
                          const { data: urlData } = supabase.storage
                            .from('avatars')
                            .getPublicUrl(path);
                          const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
                          setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
                          await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
                          toast.success("অবতার আপলোড হয়েছে!");
                        } catch (err) {
                          console.error(err);
                          toast.error("অবতার আপলোড করতে সমস্যা হয়েছে");
                        }
                      }}
                    />
                  </label>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{profile.full_name || "User"}</h3>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">ব্যক্তিগত তথ্য</TabsTrigger>
              <TabsTrigger value="shipping">শিপিং ঠিকানা</TabsTrigger>
              <TabsTrigger value="security">নিরাপত্তা</TabsTrigger>
            </TabsList>

            {/* Personal Information Tab */}
            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    ব্যক্তিগত তথ্য
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">পূর্ণ নাম *</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="আপনার পূর্ণ নাম"
                        className="mt-1"
                        value={profile.full_name || ""}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      />
                      {errors.full_name && <p className="text-sm text-destructive mt-1">{errors.full_name}</p>}
                    </div>

                    <div>
                      <Label htmlFor="email">ইমেইল *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="আপনার ইমেইল"
                        className="mt-1"
                        value={profile.email || ""}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      />
                      {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <Label htmlFor="phone">ফোন নম্বর</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="01XXXXXXXXX"
                        className="mt-1"
                        value={profile.phone || ""}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="gender">লিঙ্গ</Label>
                      <Select
                        value={profile.gender || ""}
                        onValueChange={(value) => setProfile({ ...profile, gender: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="লিঙ্গ নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">পুরুষ</SelectItem>
                          <SelectItem value="female">মহিলা</SelectItem>
                          <SelectItem value="other">অন্যান্য</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="dob">জন্ম তারিখ</Label>
                      <Input
                        id="dob"
                        type="date"
                        className="mt-1"
                        value={profile.date_of_birth || ""}
                        onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button onClick={handleSave} className="w-full" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        সংরক্ষণ করা হচ্ছে...
                      </>
                    ) : (
                      "প্রোফাইল আপডেট করুন"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shipping Address Tab */}
            <TabsContent value="shipping">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    শিপিং ঠিকানা
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="address">সম্পূর্ণ ঠিকানা</Label>
                    <Input
                      id="address"
                      type="text"
                      placeholder="বাসা নং, রাস্তা, এলাকা"
                      className="mt-1"
                      value={profile.address || ""}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">শহর</Label>
                      <Input
                        id="city"
                        type="text"
                        placeholder="আপনার শহর"
                        className="mt-1"
                        value={profile.city || ""}
                        onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="postal_code">পোস্টাল কোড</Label>
                      <Input
                        id="postal_code"
                        type="text"
                        placeholder="১২৩৪"
                        className="mt-1"
                        value={profile.postal_code || ""}
                        onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="division">বিভাগ</Label>
                      <Select
                        value={profile.division || ""}
                        onValueChange={(value) => setProfile({ ...profile, division: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          {divisions.map((div) => (
                            <SelectItem key={div} value={div}>
                              {div}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="country">দেশ</Label>
                      <Input
                        id="country"
                        type="text"
                        className="mt-1"
                        value={profile.country || "Bangladesh"}
                        onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button onClick={handleSave} className="w-full" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        সংরক্ষণ করা হচ্ছে...
                      </>
                    ) : (
                      "ঠিকানা সংরক্ষণ করুন"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              {/* Email Verification Status */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    ইমেইল যাচাইকরণ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isEmailVerified ? (
                        <>
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">ইমেইল যাচাই হয়েছে</p>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">ইমেইল যাচাই করা হয়নি</p>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                          </div>
                        </>
                      )}
                    </div>
                    {!isEmailVerified && (
                      <Button variant="outline" size="sm" onClick={handleResendVerification} disabled={resendingEmail}>
                        {resendingEmail ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-1" />
                            আবার পাঠান
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {!isEmailVerified && (
                    <p className="text-sm text-muted-foreground mt-3 bg-muted p-3 rounded-lg">
                      আপনার ইমেইল যাচাই করতে ইনবক্স চেক করুন। যাচাইকরণ লিঙ্ক না পেলে "আবার পাঠান" বাটনে ক্লিক করুন।
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Password Change */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    পাসওয়ার্ড পরিবর্তন
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">বর্তমান পাসওয়ার্ড</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="বর্তমান পাসওয়ার্ড"
                      className="mt-1"
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    />
                    {errors.currentPassword && <p className="text-sm text-destructive mt-1">{errors.currentPassword}</p>}
                  </div>

                  <div>
                    <Label htmlFor="newPassword">নতুন পাসওয়ার্ড</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="নতুন পাসওয়ার্ড"
                      className="mt-1"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    />
                    {errors.newPassword && <p className="text-sm text-destructive mt-1">{errors.newPassword}</p>}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">পাসওয়ার্ড নিশ্চিত করুন</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="পাসওয়ার্ড নিশ্চিত করুন"
                      className="mt-1"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    />
                    {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>}
                  </div>

                  <Button onClick={handlePasswordChange} className="w-full" disabled={changingPassword}>
                    {changingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        পরিবর্তন করা হচ্ছে...
                      </>
                    ) : (
                      "পাসওয়ার্ড পরিবর্তন করুন"
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Sign Out */}
              <Card>
                <CardContent className="py-4">
                  <Button
                    variant="outline"
                    onClick={handleSignOut}
                    className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    সাইন আউট
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
