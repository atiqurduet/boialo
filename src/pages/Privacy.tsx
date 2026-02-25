import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Shield } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background animate-page-in">
      <AnnouncementBar />
      <Header />
      <main>
        <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
          <div className="container text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 opacity-80" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">গোপনীয়তা নীতি</h1>
            <p className="text-lg opacity-90">সর্বশেষ আপডেট: ডিসেম্বর ২০২৫</p>
          </div>
        </section>
        <div className="container py-12">
          <div className="max-w-3xl mx-auto prose prose-sm md:prose-base">
            <div className="bg-card rounded-xl p-6 md:p-8 shadow-sm space-y-6">
              <section><h2 className="text-xl font-bold mb-4">১. তথ্য সংগ্রহ</h2><p className="text-muted-foreground">আমরা আপনার সেবা উন্নত করতে নিম্নলিখিত তথ্য সংগ্রহ করি:</p><ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1"><li>ব্যক্তিগত তথ্য (নাম, ইমেইল, ফোন, ঠিকানা)</li><li>অর্ডার ও লেনদেনের তথ্য</li><li>ব্রাউজিং ও ব্যবহারের তথ্য</li><li>ডিভাইস ও প্রযুক্তিগত তথ্য</li></ul></section>
              <section><h2 className="text-xl font-bold mb-4">২. তথ্য ব্যবহার</h2><p className="text-muted-foreground">সংগৃহীত তথ্য নিম্নলিখিত উদ্দেশ্যে ব্যবহৃত হয়:</p><ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1"><li>অর্ডার প্রক্রিয়াকরণ ও ডেলিভারি</li><li>গ্রাহক সেবা প্রদান</li><li>পণ্য সুপারিশ ও ব্যক্তিগতকরণ</li><li>মার্কেটিং যোগাযোগ (আপনার অনুমতিক্রমে)</li></ul></section>
              <section><h2 className="text-xl font-bold mb-4">৩. তথ্য সুরক্ষা</h2><p className="text-muted-foreground">আমরা আপনার তথ্য সুরক্ষিত রাখতে উন্নত প্রযুক্তি ব্যবহার করি:</p><ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1"><li>SSL এনক্রিপশন</li><li>সুরক্ষিত সার্ভার</li><li>নিয়মিত নিরাপত্তা অডিট</li></ul></section>
              <section><h2 className="text-xl font-bold mb-4">৪. কুকিজ</h2><p className="text-muted-foreground">আমাদের ওয়েবসাইট কুকিজ ব্যবহার করে আপনার ব্রাউজিং অভিজ্ঞতা উন্নত করতে।</p></section>
              <section><h2 className="text-xl font-bold mb-4">৫. তৃতীয় পক্ষ</h2><p className="text-muted-foreground">আমরা আপনার তথ্য বিক্রি করি না। তবে সেবা প্রদানের জন্য বিশ্বস্ত অংশীদারদের সাথে প্রয়োজনীয় তথ্য শেয়ার করতে পারি।</p></section>
              <section><h2 className="text-xl font-bold mb-4">৬. আপনার অধিকার</h2><p className="text-muted-foreground">আপনার তথ্য দেখা, সংশোধন ও মুছে ফেলার অধিকার রয়েছে।</p></section>
              <section><h2 className="text-xl font-bold mb-4">৭. যোগাযোগ</h2><p className="text-muted-foreground">ইমেইল: privacy@boialo.com<br />ফোন: +৮৮০ ১৭০০-০০০০০০</p></section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
