import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ChevronDown, Search, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

const faqs = [
  { category: "অর্ডার ও ডেলিভারি", questions: [
    { q: "অর্ডার করার পর কতদিনে পণ্য পাব?", a: "ঢাকার ভিতরে ১-২ কার্যদিবস এবং ঢাকার বাইরে ৩-৫ কার্যদিবসের মধ্যে পণ্য পৌঁছে যাবে।" },
    { q: "ডেলিভারি চার্জ কত?", a: "ঢাকার ভিতরে ৬০ টাকা এবং ঢাকার বাইরে ১২০ টাকা। ৪৯৯ টাকার উপরে অর্ডারে ঢাকার ভিতরে ডেলিভারি ফ্রি!" },
    { q: "আমার অর্ডার ট্র্যাক করব কীভাবে?", a: "অর্ডার কনফার্ম হলে আপনাকে SMS এবং ইমেইলে ট্র্যাকিং নম্বর পাঠানো হবে।" },
  ]},
  { category: "পেমেন্ট", questions: [
    { q: "কোন কোন পেমেন্ট মেথড সাপোর্ট করেন?", a: "আমরা বিকাশ, নগদ, রকেট, ভিসা/মাস্টারকার্ড এবং ক্যাশ অন ডেলিভারি সাপোর্ট করি।" },
    { q: "ক্যাশ অন ডেলিভারি আছে কি?", a: "হ্যাঁ, সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা পাবেন।" },
    { q: "পেমেন্ট নিরাপদ কি?", a: "অবশ্যই! আমরা SSL সিকিউরড পেমেন্ট গেটওয়ে ব্যবহার করি।" },
  ]},
  { category: "রিটার্ন ও রিফান্ড", questions: [
    { q: "পণ্য রিটার্ন করতে পারব কি?", a: "হ্যাঁ, পণ্য প্রাপ্তির ৩ দিনের মধ্যে রিটার্ন করতে পারবেন যদি পণ্যে কোনো ত্রুটি থাকে।" },
    { q: "রিফান্ড কতদিনে পাব?", a: "রিটার্ন পণ্য আমাদের কাছে পৌঁছানোর ৫-৭ কার্যদিবসের মধ্যে রিফান্ড প্রসেস করা হয়।" },
  ]},
  { category: "অ্যাকাউন্ট", questions: [
    { q: "অ্যাকাউন্ট তৈরি করা কি বাধ্যতামূলক?", a: "না, আপনি গেস্ট হিসেবেও অর্ডার করতে পারবেন।" },
    { q: "পাসওয়ার্ড ভুলে গেলে কী করব?", a: "লগইন পেজে 'পাসওয়ার্ড ভুলে গেছেন?' লিংকে ক্লিক করে ইমেইলে রিসেট লিংক পাবেন।" },
  ]},
];

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const filteredFaqs = faqs.map((category) => ({
    ...category,
    questions: category.questions.filter((q) => q.q.toLowerCase().includes(searchQuery.toLowerCase()) || q.a.toLowerCase().includes(searchQuery.toLowerCase())),
  })).filter((category) => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-background animate-page-in">
      <AnnouncementBar />
      <Header />
      <main>
        <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
          <div className="container text-center">
            <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-80" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">সাধারণ জিজ্ঞাসা</h1>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">প্রায়শই জিজ্ঞাসিত প্রশ্নের উত্তর খুঁজে পান</p>
          </div>
        </section>
        <div className="container py-12">
          <div className="max-w-xl mx-auto mb-10">
            <div className="relative">
              <Input type="text" placeholder="প্রশ্ন খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 py-6 text-lg" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            </div>
          </div>
          <div className="max-w-3xl mx-auto space-y-8">
            {filteredFaqs.map((category, catIndex) => (
              <div key={catIndex}>
                <h2 className="font-bold text-lg mb-4 text-primary">{category.category}</h2>
                <div className="space-y-3">
                  {category.questions.map((faq, qIndex) => {
                    const id = `${catIndex}-${qIndex}`;
                    const isOpen = openItems.includes(id);
                    return (
                      <div key={qIndex} className="bg-card rounded-xl shadow-sm overflow-hidden">
                        <button onClick={() => toggleItem(id)} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors">
                          <span className="font-medium">{faq.q}</span>
                          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isOpen && <div className="px-4 pb-4 text-muted-foreground animate-fade-in">{faq.a}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {filteredFaqs.length === 0 && <div className="text-center py-12"><p className="text-muted-foreground">কোনো প্রশ্ন পাওয়া যায়নি</p></div>}
          <div className="max-w-xl mx-auto mt-12 bg-muted/30 rounded-xl p-8 text-center">
            <h3 className="font-bold text-lg mb-2">আপনার প্রশ্নের উত্তর পাননি?</h3>
            <p className="text-muted-foreground mb-4">আমাদের সাথে সরাসরি যোগাযোগ করুন, আমরা সাহায্য করতে প্রস্তুত।</p>
            <a href="/contact" className="btn-primary inline-block">যোগাযোগ করুন</a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
