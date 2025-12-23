import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Link } from "react-router-dom";
import { Search, Book } from "lucide-react";
import { useState } from "react";

const authors = [
  { id: "1", name: "শাইখ মুহাম্মাদ আবদুর রহমান", bookCount: 45, image: "https://ui-avatars.com/api/?name=শাইখ&background=dc2626&color=fff&size=128" },
  { id: "2", name: "হা মীম নাজীবুল্লাহ", bookCount: 32, image: "https://ui-avatars.com/api/?name=হা+মীম&background=dc2626&color=fff&size=128" },
  { id: "3", name: "কামরুল আনাম খান", bookCount: 28, image: "https://ui-avatars.com/api/?name=কামরুল&background=dc2626&color=fff&size=128" },
  { id: "4", name: "খুবাইব মাহমুদ", bookCount: 15, image: "https://ui-avatars.com/api/?name=খুবাইব&background=dc2626&color=fff&size=128" },
  { id: "5", name: "রেজাউল করিম", bookCount: 42, image: "https://ui-avatars.com/api/?name=রেজাউল&background=dc2626&color=fff&size=128" },
  { id: "6", name: "মাওলানা আবদুর রশীদ তারাপাশী", bookCount: 18, image: "https://ui-avatars.com/api/?name=তারাপাশী&background=dc2626&color=fff&size=128" },
  { id: "7", name: "সুজন বড়ুয়া", bookCount: 22, image: "https://ui-avatars.com/api/?name=সুজন&background=dc2626&color=fff&size=128" },
  { id: "8", name: "রাজু আলাউদ্দিন", bookCount: 35, image: "https://ui-avatars.com/api/?name=রাজু&background=dc2626&color=fff&size=128" },
  { id: "9", name: "মুফতি জামাল হোসেন", bookCount: 55, image: "https://ui-avatars.com/api/?name=জামাল&background=dc2626&color=fff&size=128" },
  { id: "10", name: "ড. মুহাম্মাদ ইকবাল", bookCount: 67, image: "https://ui-avatars.com/api/?name=ইকবাল&background=dc2626&color=fff&size=128" },
  { id: "11", name: "শাইখ আবু বকর যাকারিয়া", bookCount: 89, image: "https://ui-avatars.com/api/?name=যাকারিয়া&background=dc2626&color=fff&size=128" },
  { id: "12", name: "মাওলানা তারিক জামিল", bookCount: 12, image: "https://ui-avatars.com/api/?name=তারিক&background=dc2626&color=fff&size=128" },
];

const Authors = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAuthors = authors.filter((author) =>
    author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">লেখকগণ</h1>
          <p className="text-muted-foreground">আমাদের সংগ্রহে থাকা সকল লেখকদের তালিকা</p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="লেখকের নাম দিয়ে খুঁজুন..."
              className="search-input pr-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Authors Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {filteredAuthors.map((author) => (
            <Link
              key={author.id}
              to={`/shop?author=${author.id}`}
              className="bg-card rounded-xl p-4 text-center hover:shadow-lg transition-all group"
            >
              <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-muted">
                <img
                  src={author.image}
                  alt={author.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
              </div>
              <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                {author.name}
              </h3>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Book className="w-3 h-3" />
                <span>{author.bookCount} টি বই</span>
              </div>
            </Link>
          ))}
        </div>

        {filteredAuthors.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">কোনো লেখক পাওয়া যায়নি</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Authors;
