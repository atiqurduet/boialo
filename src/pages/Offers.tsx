import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { sampleProducts } from "@/data/products";
import { Flame, Clock, Tag } from "lucide-react";
import { AnnouncementBar } from "@/components/AnnouncementBar";

const offerProducts = sampleProducts.filter((p) => p.discount && p.discount > 0);

const Offers = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-8 mb-8 text-primary-foreground">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary-foreground/20 rounded-full flex items-center justify-center">
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">আজকের অফার</h1>
              <p className="opacity-90">সর্বোচ্চ ৭০% পর্যন্ত ছাড়!</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>মেয়াদ: ৩১ ডিসেম্বর, ২০২৫</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <span>{offerProducts.length} টি পণ্য</span>
            </div>
          </div>
        </div>

        {/* Offer Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "৫০%+ ছাড়", count: offerProducts.filter(p => p.discount && p.discount >= 50).length, color: "bg-primary" },
            { label: "৪০-৫০% ছাড়", count: offerProducts.filter(p => p.discount && p.discount >= 40 && p.discount < 50).length, color: "bg-accent" },
            { label: "২০-৪০% ছাড়", count: offerProducts.filter(p => p.discount && p.discount >= 20 && p.discount < 40).length, color: "bg-orange-500" },
            { label: "১০-২০% ছাড়", count: offerProducts.filter(p => p.discount && p.discount >= 10 && p.discount < 20).length, color: "bg-blue-500" },
          ].map((category, index) => (
            <div key={index} className="bg-card rounded-xl p-4 text-center hover:shadow-lg transition-shadow cursor-pointer">
              <div className={`w-12 h-12 ${category.color} text-white rounded-full flex items-center justify-center mx-auto mb-2 text-lg font-bold`}>
                {category.count}
              </div>
              <p className="font-medium text-sm">{category.label}</p>
            </div>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {offerProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {offerProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">বর্তমানে কোনো অফার নেই</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Offers;
