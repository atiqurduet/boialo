import { useState } from "react";
import { Mail, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error("সঠিক ইমেইল ঠিকানা দিন");
      return;
    }

    setLoading(true);
    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('email_subscribers')
        .select('id, status')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (existing) {
        if (existing.status === 'subscribed') {
          toast.info("আপনি ইতিমধ্যে সাবস্ক্রাইব করেছেন");
        } else {
          // Resubscribe
          await supabase
            .from('email_subscribers')
            .update({ 
              status: 'subscribed', 
              unsubscribed_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
          toast.success("আবার সাবস্ক্রাইব করা হয়েছে!");
        }
      } else {
        // New subscriber
        const { error } = await supabase
          .from('email_subscribers')
          .insert({
            email: email.trim().toLowerCase(),
            source: 'newsletter_form',
            status: 'subscribed'
          });

        if (error) throw error;
        toast.success("সফলভাবে সাবস্ক্রাইব করা হয়েছে!");
      }

      setEmail("");
    } catch (error: any) {
      console.error('Newsletter subscription error:', error);
      toast.error("সাবস্ক্রাইব করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
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
              disabled={loading}
              className="flex-1 md:w-80 bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/60"
            />
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{loading ? 'সাবস্ক্রাইব হচ্ছে...' : 'সাবস্ক্রাইব'}</span>
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};
