import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const reviewSchema = z.object({
  rating: z.number().min(1, "রেটিং দিন").max(5),
  title: z.string().max(100, "শিরোনাম ১০০ অক্ষরের বেশি হতে পারবে না").optional(),
  comment: z.string().max(1000, "মন্তব্য ১০০০ অক্ষরের বেশি হতে পারবে না").optional(),
});

interface ReviewFormProps {
  productId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ReviewForm = ({ productId, onSuccess, onCancel }: ReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    if (!user) {
      toast.error("রিভিউ দিতে লগইন করুন");
      return;
    }

    try {
      reviewSchema.parse({ rating, title, comment });
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    if (rating === 0) {
      setErrors({ rating: "রেটিং দিন" });
      return;
    }

    setSubmitting(true);

    try {
      // Check if user has purchased this product
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("id, order_id")
        .eq("product_id", productId);

      let isVerifiedPurchase = false;

      if (orderItems && orderItems.length > 0) {
        // Check if any of these orders belong to the user
        const orderIds = orderItems.map(item => item.order_id);
        const { data: userOrders } = await supabase
          .from("orders")
          .select("id")
          .eq("user_id", user.id)
          .in("id", orderIds);

        isVerifiedPurchase = (userOrders?.length || 0) > 0;
      }

      const { error } = await supabase
        .from("reviews")
        .insert({
          user_id: user.id,
          product_id: productId,
          rating,
          title: title.trim() || null,
          comment: comment.trim() || null,
          is_verified_purchase: isVerifiedPurchase,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("আপনি ইতিমধ্যে এই পণ্যে রিভিউ দিয়েছেন");
        } else {
          throw error;
        }
        return;
      }

      toast.success("রিভিউ সফলভাবে জমা হয়েছে!");
      onSuccess();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("রিভিউ জমা দিতে সমস্যা হয়েছে");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">আপনার রিভিউ লিখুন</h3>

      {/* Star Rating */}
      <div>
        <Label>রেটিং *</Label>
        <div className="flex gap-1 mt-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="p-1 transition-transform hover:scale-110"
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoveredRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-muted text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        {errors.rating && <p className="text-sm text-destructive mt-1">{errors.rating}</p>}
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="review-title">শিরোনাম</Label>
        <Input
          id="review-title"
          placeholder="রিভিউর শিরোনাম (ঐচ্ছিক)"
          className="mt-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
        />
        {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
      </div>

      {/* Comment */}
      <div>
        <Label htmlFor="review-comment">মন্তব্য</Label>
        <Textarea
          id="review-comment"
          placeholder="আপনার অভিজ্ঞতা শেয়ার করুন (ঐচ্ছিক)"
          className="mt-1"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
        />
        {errors.comment && <p className="text-sm text-destructive mt-1">{errors.comment}</p>}
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              জমা হচ্ছে...
            </>
          ) : (
            "রিভিউ জমা দিন"
          )}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          বাতিল
        </Button>
      </div>
    </div>
  );
};
