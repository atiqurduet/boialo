import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const NewsletterSection = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    setEmail("");
  };

  return (
    <section className="bg-gradient-to-r from-primary to-primary/80 py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-primary-foreground">
            <div className="w-16 h-16 bg-primary-foreground/20 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold">নিউজলেটার সাবস্ক্রাইব করুন</h3>
              <p className="text-sm md:text-base opacity-90">নতুন বই ও অফারের আপডেট পেতে সাবস্ক্রাইব করুন</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="flex w-full md:w-auto gap-2">
            <Input
              type="email"
              placeholder="আপনার ইমেইল লিখুন"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 md:w-80 bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/60"
            />
            <Button type="submit" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">সাবস্ক্রাইব</span>
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};
