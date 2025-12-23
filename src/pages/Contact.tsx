import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("আপনার বার্তা পাঠানো হয়েছে। আমরা শীঘ্রই যোগাযোগ করব।");
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
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
                      <p className="text-sm text-muted-foreground">+৮৮০ ১৭০০-০০০০০০</p>
                      <p className="text-sm text-muted-foreground">+৮৮০ ১৮০০-০০০০০০</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">ইমেইল</h3>
                      <p className="text-sm text-muted-foreground">info@wafilife.com</p>
                      <p className="text-sm text-muted-foreground">support@wafilife.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">ঠিকানা</h3>
                      <p className="text-sm text-muted-foreground">
                        ৬০/এ, পুরানা পল্টন, ঢাকা-১০০০, বাংলাদেশ
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
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" className="btn-primary gap-2">
                    <Send className="w-4 h-4" />
                    বার্তা পাঠান
                  </Button>
                </form>
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
