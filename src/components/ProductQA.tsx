import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ThumbsUp, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProductQAProps {
  productId: string;
}

export function ProductQA({ productId }: ProductQAProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["product-questions", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_questions")
        .select("*")
        .eq("product_id", productId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const submitQuestion = useMutation({
    mutationFn: async (q: string) => {
      if (!user) throw new Error("Login required");
      const { error } = await supabase.from("product_questions").insert({
        product_id: productId,
        user_id: user.id,
        question: q,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setQuestion("");
      toast.success("আপনার প্রশ্ন জমা হয়েছে। অ্যাডমিন উত্তর দিলে দেখা যাবে।");
      queryClient.invalidateQueries({ queryKey: ["product-questions", productId] });
    },
    onError: () => toast.error("প্রশ্ন জমা দিতে সমস্যা হয়েছে"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    if (!user) {
      toast.error("প্রশ্ন করতে লগইন করুন");
      return;
    }
    submitQuestion.mutate(question.trim());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5" />
          প্রশ্ন ও উত্তর ({questions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ask Question Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            placeholder={user ? "আপনার প্রশ্ন লিখুন..." : "প্রশ্ন করতে লগইন করুন"}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[60px]"
            disabled={!user}
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0"
            disabled={!user || !question.trim() || submitQuestion.isPending}
          >
            {submitQuestion.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Questions List */}
        {isLoading ? (
          <p className="text-muted-foreground text-center py-4">লোড হচ্ছে...</p>
        ) : questions.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            এই প্রোডাক্টে এখনো কোন প্রশ্ন করা হয়নি। প্রথম প্রশ্ন করুন!
          </p>
        ) : (
          <div className="space-y-4">
            {questions.map((q: any) => (
              <div key={q.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">প্রঃ {q.question}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(q.created_at).toLocaleDateString("bn-BD")}
                    </p>
                  </div>
                  {q.helpful_count > 0 && (
                    <Badge variant="secondary" className="shrink-0">
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      {q.helpful_count}
                    </Badge>
                  )}
                </div>
                {q.answer && (
                  <div className="bg-muted/50 rounded-md p-3 mt-2">
                    <p className="text-sm font-medium text-primary mb-1">উঃ</p>
                    <p className="text-sm text-foreground">{q.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
