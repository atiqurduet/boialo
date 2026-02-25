import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCompare } from "@/contexts/CompareContext";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft } from "lucide-react";

const Compare = () => {
  const { items, removeFromCompare, clearCompare } = useCompare();

  const fields: { key: string; label: string }[] = [
    { key: "author", label: "লেখক" },
    { key: "publisher", label: "প্রকাশনী" },
    { key: "category", label: "ক্যাটাগরি" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background animate-page-in">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">পণ্য তুলনা</h1>
            <p className="text-muted-foreground text-sm">{items.length}টি পণ্য তুলনায় আছে</p>
          </div>
          <div className="flex gap-2">
            <Link to="/shop"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />শপে ফিরুন</Button></Link>
            {items.length > 0 && <Button variant="destructive" size="sm" onClick={clearCompare}>সব মুছুন</Button>}
          </div>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-16"><p className="text-muted-foreground mb-4">তুলনায় কোন পণ্য নেই</p><Link to="/shop"><Button>পণ্য বাছুন</Button></Link></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr><th className="p-4 text-left text-sm font-medium text-muted-foreground w-32">বৈশিষ্ট্য</th>
                {items.map(item => (<th key={item.id} className="p-4 text-center min-w-[200px]"><div className="relative">
                  <button onClick={() => removeFromCompare(item.id)} className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"><X className="w-3 h-3" /></button>
                  <Link to={`/product/${item.slug}`}><img src={item.image} alt={item.name} className="w-32 h-40 object-cover rounded-lg mx-auto mb-2" /><p className="font-medium text-sm hover:text-primary transition-colors line-clamp-2">{item.name}</p></Link>
                </div></th>))}
              </tr></thead>
              <tbody>
                <tr className="border-t"><td className="p-4 text-sm font-medium text-muted-foreground">মূল্য</td>
                  {items.map(item => (<td key={item.id} className="p-4 text-center"><span className="text-lg font-bold text-primary">৳{item.price}</span>
                    {item.originalPrice && item.originalPrice > item.price && <span className="text-muted-foreground line-through text-sm ml-2">৳{item.originalPrice}</span>}</td>))}
                </tr>
                {fields.map(field => (<tr key={field.key} className="border-t"><td className="p-4 text-sm font-medium text-muted-foreground">{field.label}</td>
                  {items.map(item => (<td key={item.id} className="p-4 text-center text-sm">{item[field.key] || "—"}</td>))}</tr>))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Compare;
