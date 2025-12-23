import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ProductCard } from "@/components/ProductCard";
import { sampleProducts } from "@/data/products";
import { Clock, BookOpen, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const preorderProducts = sampleProducts.slice(0, 6).map((p) => ({
  ...p,
  isPreorder: true,
  releaseDate: "৩০ ডিসেম্বর, ২০২৫",
}));

const Preorder = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent to-accent/80 rounded-2xl p-8 mb-8 text-accent-foreground">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-accent-foreground/20 rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">প্রি-অর্ডার</h1>
              <p className="opacity-90">আগাম অর্ডার করুন, প্রথমে পান!</p>
            </div>
          </div>
          <p className="max-w-2xl opacity-90">
            নতুন প্রকাশিত হতে যাওয়া বইগুলো আগেই অর্ডার করে রাখুন। প্রকাশের সাথে সাথে আপনার কাছে পৌঁছে যাবে।
          </p>
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {[
            {
              icon: BookOpen,
              title: "বই নির্বাচন করুন",
              desc: "প্রি-অর্ডার তালিকা থেকে পছন্দের বই বেছে নিন",
            },
            {
              icon: Clock,
              title: "অর্ডার করুন",
              desc: "এখনই অর্ডার করুন এবং প্রথম পেতে নাম লেখান",
            },
            {
              icon: Bell,
              title: "প্রথমে পান",
              desc: "বই প্রকাশের সাথে সাথে আপনার ঠিকানায়",
            },
          ].map((step, index) => (
            <div key={index} className="bg-card rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Products */}
        <h2 className="text-2xl font-bold mb-6">প্রি-অর্ডার বই</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {preorderProducts.map((product) => (
            <div key={product.id} className="relative">
              <div className="absolute top-2 right-2 z-10 bg-accent text-accent-foreground px-2 py-1 rounded-md text-xs font-medium">
                প্রি-অর্ডার
              </div>
              <ProductCard product={product} />
              <div className="bg-muted/50 rounded-b-lg px-3 py-2 text-xs text-muted-foreground flex items-center gap-1 -mt-1">
                <Clock className="w-3 h-3" />
                প্রকাশ: {product.releaseDate}
              </div>
            </div>
          ))}
        </div>

        {/* Notify CTA */}
        <div className="mt-12 bg-muted/30 rounded-xl p-8 text-center">
          <Bell className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="font-bold text-xl mb-2">নতুন প্রি-অর্ডারের আপডেট পান</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            নতুন কোনো বই প্রি-অর্ডারে এলে সবার আগে জানতে সাবস্ক্রাইব করুন
          </p>
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="আপনার ইমেইল"
              className="flex-1 px-4 py-2 border border-border rounded-lg"
            />
            <Button className="btn-primary">সাবস্ক্রাইব</Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Preorder;
