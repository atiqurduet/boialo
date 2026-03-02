import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, Mail, MapPin, Clock, Send, MessageCircle, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast.error("সকল প্রয়োজনীয় ফিল্ড পূরণ করুন।");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error("সঠিক ইমেইল দিন।");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("contact_messages" as any).insert({
        name: formData.name.trim().slice(0, 200),
        email: formData.email.trim().slice(0, 255),
        phone: formData.phone.trim().slice(0, 20) || null,
        subject: formData.subject.trim().slice(0, 500),
        message: formData.message.trim().slice(0, 5000),
      } as any);

      if (error) throw error;

      setIsSubmitted(true);
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      toast.success("আপনার বার্তা সফলভাবে পাঠানো হয়েছে। আমরা শীঘ্রই যোগাযোগ করব।");
      
      // Reset success state after 5 seconds
      setTimeout(() => setIsSubmitted(false), 5000);
    } catch (err) {
      console.error("Contact form error:", err);
      toast.error("বার্তা পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="যোগাযোগ করুন"
        description="বইআলো তে যোগাযোগ করুন। আমাদের সাথে ফোন, ইমেইল বা মেসেজের মাধ্যমে যোগাযোগ করতে পারবেন।"
        keywords="বইআলো যোগাযোগ, contact boialo, অনলাইন বই শপ যোগাযোগ"
        canonicalUrl="https://boialo.com/contact"
        breadcrumbs={[
          { name: 'হোম', url: '/' },
          { name: 'যোগাযোগ', url: '/contact' },
        ]}
      />
      <AnnouncementBar />
      <Header />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">যোগাযোগ করুন</h1>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              আমরা আপনার কথা শুনতে চাই। যেকোনো প্রশ্ন বা পরামর্শ জানাতে পারেন।
            </p>
          </div>
        </section>

        <div className="container py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-card rounded-xl p-6 shadow-sm">
                <h2 className="font-bold text-lg mb-6">যোগাযোগের তথ্য</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">ফোন</h3>
                      <p className="text-sm text-muted-foreground">+৮৮০ ১৭১৪-০০৫৯৮৬</p>
                      <p className="text-sm text-muted-foreground">+৮৮০ ১৯১৮-৬০২০১৭</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">ইমেইল</h3>
                      <p className="text-sm text-muted-foreground">info@boialo.com</p>
                      <p className="text-sm text-muted-foreground">support@boialo.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">ঠিকানা</h3>
                      <p className="text-sm text-muted-foreground">
                        141,1/বি, দক্ষিন পীরেরবাগ,মিরপুর, ঢাকা-১২১৬, বাংলাদেশ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">অফিস সময়</h3>
                      <p className="text-sm text-muted-foreground">শনি - বৃহস্পতি</p>
                      <p className="text-sm text-muted-foreground">সকাল ১০টা - সন্ধ্যা ৬টা</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Contact */}
              <div className="bg-accent/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MessageCircle className="w-6 h-6 text-accent" />
                  <h3 className="font-bold">দ্রুত সাহায্য</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  জরুরি সাহায্যের জন্য আমাদের হটলাইনে কল করুন অথবা Facebook-এ মেসেজ করুন।
                </p>
                <Button className="w-full gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Messenger-এ যোগাযোগ
                </Button>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-xl p-6 md:p-8 shadow-sm">
                <h2 className="font-bold text-xl mb-6">বার্তা পাঠান</h2>
                
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">বার্তা পাঠানো হয়েছে!</h3>
                    <p className="text-muted-foreground">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">আপনার নাম *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="পূর্ণ নাম"
                          required
                          maxLength={200}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">ইমেইল *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="your@email.com"
                          required
                          maxLength={255}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">ফোন নম্বর</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="০১৭XXXXXXXX"
                          maxLength={20}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="subject">বিষয় *</Label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder="বার্তার বিষয়"
                          required
                          maxLength={500}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="message">বার্তা *</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="আপনার বার্তা লিখুন..."
                        rows={6}
                        required
                        maxLength={5000}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        {formData.message.length}/5000
                      </p>
                    </div>
                    <Button type="submit" className="btn-primary gap-2" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          পাঠানো হচ্ছে...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          বার্তা পাঠান
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
