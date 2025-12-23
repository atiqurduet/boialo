import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Link } from "react-router-dom";
import { BookOpen, Users, Award, Heart, MapPin } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">আমাদের সম্পর্কে</h1>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              বাংলাদেশের সবচেয়ে বড় অনলাইন বই ও লাইফস্টাইল শপ
            </p>
          </div>
        </section>

        {/* Story Section */}
        <section className="container py-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">আমাদের গল্প</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  WafiLife ২০১৫ সালে যাত্রা শুরু করে একটি ছোট বইয়ের দোকান হিসেবে। আমাদের লক্ষ্য ছিল মানসম্মত ইসলামিক ও শিক্ষামূলক বই সবার কাছে পৌঁছে দেওয়া।
                </p>
                <p>
                  আজ আমরা বাংলাদেশের অন্যতম বৃহত্তম অনলাইন বুকশপ, যেখানে ৫০,০০০+ বই এবং ১,০০০+ প্রকাশনীর সংগ্রহ রয়েছে।
                </p>
                <p>
                  আমরা শুধু বই বিক্রি করি না, আমরা জ্ঞান ও সংস্কৃতি ছড়িয়ে দিতে চাই প্রতিটি ঘরে ঘরে।
                </p>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-8 shadow-lg">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">৫০,০০০+</div>
                  <p className="text-sm text-muted-foreground">বইয়ের সংগ্রহ</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">১,০০০+</div>
                  <p className="text-sm text-muted-foreground">প্রকাশনী</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">৫,০০,০০০+</div>
                  <p className="text-sm text-muted-foreground">সন্তুষ্ট গ্রাহক</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">৬৪</div>
                  <p className="text-sm text-muted-foreground">জেলায় ডেলিভারি</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="bg-muted/30 py-12">
          <div className="container">
            <h2 className="text-3xl font-bold text-center mb-10">আমাদের মূল্যবোধ</h2>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { icon: BookOpen, title: "মানসম্মত বই", desc: "প্রকাশক থেকে সরাসরি সংগৃহীত ১০০% অরিজিনাল বই" },
                { icon: Users, title: "গ্রাহক সেবা", desc: "২৪/৭ গ্রাহক সেবা এবং দ্রুত সমস্যা সমাধান" },
                { icon: Award, title: "বিশ্বস্ততা", desc: "৯ বছরের অভিজ্ঞতা এবং লক্ষাধিক সন্তুষ্ট গ্রাহক" },
                { icon: Heart, title: "ভালোবাসা", desc: "বই ও পাঠকদের প্রতি গভীর ভালোবাসা" },
              ].map((value, index) => (
                <div key={index} className="bg-card rounded-xl p-6 text-center">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Location Section */}
        <section className="container py-12">
          <div className="bg-card rounded-xl p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">আমাদের অফিস</h3>
                <p className="text-muted-foreground">
                  ৬০/এ, পুরানা পল্টন, ঢাকা-১০০০, বাংলাদেশ
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  অফিস সময়: শনি-বৃহস্পতি, সকাল ১০টা - সন্ধ্যা ৬টা
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
