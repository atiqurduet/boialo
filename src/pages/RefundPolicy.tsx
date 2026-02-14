import { useQuery } from "@tanstack/react-query";
import { SafeHTML } from "@/components/SafeHTML";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";

const RefundPolicy = () => {
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["refund-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refund_policies")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">রিফান্ড পলিসি</h1>
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : policies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>কোনো রিফান্ড পলিসি পাওয়া যায়নি।</p>
          </div>
        ) : (
          <div className="space-y-8">
            {policies.map((policy) => (
              <section key={policy.id} className="prose prose-lg max-w-none">
                <h2 className="text-xl font-semibold mb-4">{policy.title_bn}</h2>
                <SafeHTML 
                  className="text-muted-foreground whitespace-pre-wrap"
                  html={policy.content_bn}
                />
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default RefundPolicy;
