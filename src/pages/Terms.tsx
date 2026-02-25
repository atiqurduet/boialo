import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { FileText } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background animate-page-in">
      <AnnouncementBar />
      <Header />
      <main>
        <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
          <div className="container text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-80" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">শর্তাবলী</h1>
            <p className="text-lg opacity-90">সর্বশেষ আপডেট: ডিসেম্বর ২০২৫</p>
          </div>
        </section>
        <div className="container py-12">
          <div className="max-w-3xl mx-auto prose prose-sm md:prose-base">
            <div className="bg-card rounded-xl p-6 md:p-8 shadow-sm space-y-6">
              <section><h2 className="text-xl font-bold mb-4">১. সেবার শর্তাবলী</h2><p className="text-muted-foreground">আমাদের ওয়েবসাইটে প্রবেশ করে বা এর সেবা ব্যবহার করে আপনি এই শর্তাবলী মেনে নিচ্ছেন।</p></section>
              <section><h2 className="text-xl font-bold mb-4">২. অ্যাকাউন্ট ও নিবন্ধন</h2><p className="text-muted-foreground">অ্যাকাউন্ট তৈরি করার সময় আপনাকে সঠিক ও সম্পূর্ণ তথ্য প্রদান করতে হবে।</p></section>
              <section><h2 className="text-xl font-bold mb-4">৩. অর্ডার ও মূল্য</h2><p className="text-muted-foreground">সকল মূল্য বাংলাদেশী টাকায় প্রদর্শিত এবং পরিবর্তনশীল।</p></section>
              <section><h2 className="text-xl font-bold mb-4">৪. ডেলিভারি</h2><p className="text-muted-foreground">আমরা বাংলাদেশের সকল জেলায় ডেলিভারি সেবা প্রদান করি।</p></section>
              <section><h2 className="text-xl font-bold mb-4">৫. রিটার্ন ও রিফান্ড</h2><p className="text-muted-foreground">ত্রুটিপূর্ণ বা ভুল পণ্যের ক্ষেত্রে পণ্য প্রাপ্তির ৩ দিনের মধ্যে রিটার্ন করা যাবে।</p></section>
              <section><h2 className="text-xl font-bold mb-4">৬. বুদ্ধিবৃত্তিক সম্পত্তি</h2><p className="text-muted-foreground">এই ওয়েবসাইটের সকল কন্টেন্ট কপিরাইট আইন দ্বারা সুরক্ষিত।</p></section>
              <section><h2 className="text-xl font-bold mb-4">৭. যোগাযোগ</h2><p className="text-muted-foreground">ইমেইল: legal@boialo.com<br />ফোন: +৮৮০ ১৭০০-০০০০০০</p></section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
