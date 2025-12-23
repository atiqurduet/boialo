import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { FileText } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main>
        {/* Hero Section */}
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
              <section>
                <h2 className="text-xl font-bold mb-4">১. সেবার শর্তাবলী</h2>
                <p className="text-muted-foreground">
                  WafiLife.com এ প্রবেশ করে বা এর সেবা ব্যবহার করে আপনি এই শর্তাবলী মেনে নিচ্ছেন। এই শর্তাবলী সময়ে সময়ে পরিবর্তিত হতে পারে এবং পরিবর্তনগুলো ওয়েবসাইটে প্রকাশের সাথে সাথে কার্যকর হবে।
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-4">২. অ্যাকাউন্ট ও নিবন্ধন</h2>
                <p className="text-muted-foreground">
                  অ্যাকাউন্ট তৈরি করার সময় আপনাকে সঠিক ও সম্পূর্ণ তথ্য প্রদান করতে হবে। আপনার অ্যাকাউন্টের নিরাপত্তা বজায় রাখা আপনার দায়িত্ব। অ্যাকাউন্টের যেকোনো অননুমোদিত ব্যবহারের জন্য আমরা দায়ী নই।
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-4">৩. অর্ডার ও মূল্য</h2>
                <p className="text-muted-foreground">
                  সকল মূল্য বাংলাদেশী টাকায় প্রদর্শিত এবং পরিবর্তনশীল। আমরা যেকোনো সময় মূল্য পরিবর্তনের অধিকার সংরক্ষণ করি। অর্ডার নিশ্চিত করার আগে মূল্য যাচাই করে নিন।
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-4">৪. ডেলিভারি</h2>
                <p className="text-muted-foreground">
                  আমরা বাংলাদেশের সকল জেলায় ডেলিভারি সেবা প্রদান করি। ডেলিভারির সময় এলাকা ও পণ্যের প্রাপ্যতার উপর নির্ভর করে। প্রাকৃতিক দুর্যোগ বা অন্যান্য অনিয়ন্ত্রিত পরিস্থিতিতে ডেলিভারি বিলম্বিত হতে পারে।
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-4">৫. রিটার্ন ও রিফান্ড</h2>
                <p className="text-muted-foreground">
                  ত্রুটিপূর্ণ বা ভুল পণ্যের ক্ষেত্রে পণ্য প্রাপ্তির ৩ দিনের মধ্যে রিটার্ন করা যাবে। রিফান্ড মূল পেমেন্ট মেথডে ৫-৭ কার্যদিবসের মধ্যে প্রক্রিয়া করা হবে।
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-4">৬. বুদ্ধিবৃত্তিক সম্পত্তি</h2>
                <p className="text-muted-foreground">
                  এই ওয়েবসাইটের সকল কন্টেন্ট, লোগো, ছবি এবং ডিজাইন WafiLife এর সম্পত্তি এবং কপিরাইট আইন দ্বারা সুরক্ষিত। অনুমতি ছাড়া কোনো কন্টেন্ট ব্যবহার নিষিদ্ধ।
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-4">৭. যোগাযোগ</h2>
                <p className="text-muted-foreground">
                  এই শর্তাবলী সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন:<br />
                  ইমেইল: legal@wafilife.com<br />
                  ফোন: +৮৮০ ১৭০০-০০০০০০
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
