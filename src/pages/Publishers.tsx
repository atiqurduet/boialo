import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Link } from "react-router-dom";
import { Search, BookOpen } from "lucide-react";
import { useState } from "react";
import { publishers } from "@/data/products";

const allPublishers = [
  { id: "1", name: "ঐতিহ্য", count: 150, image: "https://ui-avatars.com/api/?name=ঐতিহ্য&background=14b8a6&color=fff&size=128" },
  { id: "2", name: "গার্ডিয়ান পাবলিকেশন্স", count: 131, image: "https://ui-avatars.com/api/?name=গার্ডিয়ান&background=14b8a6&color=fff&size=128" },
  { id: "3", name: "সন্দীপন প্রকাশন", count: 103, image: "https://ui-avatars.com/api/?name=সন্দীপন&background=14b8a6&color=fff&size=128" },
  { id: "4", name: "মাদারস", count: 83, image: "https://ui-avatars.com/api/?name=মাদারস&background=14b8a6&color=fff&size=128" },
  { id: "5", name: "ইলহাম ILHAM", count: 83, image: "https://ui-avatars.com/api/?name=ইলহাম&background=14b8a6&color=fff&size=128" },
  { id: "6", name: "কালান্তর প্রকাশনী", count: 74, image: "https://ui-avatars.com/api/?name=কালান্তর&background=14b8a6&color=fff&size=128" },
  { id: "7", name: "সমকালীন প্রকাশন", count: 68, image: "https://ui-avatars.com/api/?name=সমকালীন&background=14b8a6&color=fff&size=128" },
  { id: "8", name: "প্রচ্ছদ প্রকাশন", count: 59, image: "https://ui-avatars.com/api/?name=প্রচ্ছদ&background=14b8a6&color=fff&size=128" },
  { id: "9", name: "মক্তবা দারুল কালাম", count: 92, image: "https://ui-avatars.com/api/?name=মক্তবা&background=14b8a6&color=fff&size=128" },
  { id: "10", name: "ওয়াফি পাবলিকেশন্স", count: 125, image: "https://ui-avatars.com/api/?name=ওয়াফি&background=14b8a6&color=fff&size=128" },
  { id: "11", name: "রিয়াদুস সালেহিন", count: 47, image: "https://ui-avatars.com/api/?name=রিয়াদুস&background=14b8a6&color=fff&size=128" },
  { id: "12", name: "দারুল ইফতা", count: 38, image: "https://ui-avatars.com/api/?name=ইফতা&background=14b8a6&color=fff&size=128" },
];

const Publishers = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPublishers = allPublishers.filter((publisher) =>
    publisher.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">প্রকাশকগণ</h1>
          <p className="text-muted-foreground">বিশ্বস্ত প্রকাশনী থেকে সংগৃহীত বই</p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="প্রকাশকের নাম দিয়ে খুঁজুন..."
              className="search-input pr-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Publishers Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {filteredPublishers.map((publisher) => (
            <Link
              key={publisher.id}
              to={`/shop?publisher=${publisher.id}`}
              className="bg-card rounded-xl p-4 text-center hover:shadow-lg transition-all group"
            >
              <div className="w-20 h-20 mx-auto mb-3 rounded-xl overflow-hidden bg-accent/10">
                <img
                  src={publisher.image}
                  alt={publisher.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
              </div>
              <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                {publisher.name}
              </h3>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <BookOpen className="w-3 h-3" />
                <span>{publisher.count} টি বই</span>
              </div>
            </Link>
          ))}
        </div>

        {filteredPublishers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">কোনো প্রকাশক পাওয়া যায়নি</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Publishers;
