import { useState } from "react";
import { Star, Loader2, ImagePlus, X } from "lucide-react";
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
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.error("সর্বোচ্চ ৫টি ছবি আপলোড করা যাবে");
      return;
    }

    const validFiles = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} - ফাইল সাইজ ৫MB এর বেশি`);
        return false;
      }
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} - শুধুমাত্র ছবি আপলোড করুন`);
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];
    setUploading(true);

    const urls: string[] = [];
    for (const file of images) {
      const ext = file.name.split(".").pop();
      const path = `reviews/${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file);

      if (error) {
        console.error("Upload error:", error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      urls.push(urlData.publicUrl);
    }

    setUploading(false);
    return urls;
  };

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
      const { data: userOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", user.id);

      if (!userOrders || userOrders.length === 0) {
        toast.error("শুধুমাত্র যারা এই পণ্যটি কিনেছেন তারাই রিভিউ দিতে পারবেন");
        setSubmitting(false);
        return;
      }

      const orderIds = userOrders.map(o => o.id);
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("id")
        .eq("product_id", productId)
        .in("order_id", orderIds);

      if (!orderItems || orderItems.length === 0) {
        toast.error("শুধুমাত্র যারা এই পণ্যটি কিনেছেন তারাই রিভিউ দিতে পারবেন");
        setSubmitting(false);
        return;
      }

      // Upload images
      const imageUrls = await uploadImages();

      const { error } = await supabase
        .from("reviews")
        .insert({
          user_id: user.id,
          product_id: productId,
          rating,
          title: title.trim() || null,
          comment: comment.trim() || null,
          is_verified_purchase: true,
          images: imageUrls,
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

      {/* Image Upload */}
      <div>
        <Label>ছবি যোগ করুন (সর্বোচ্চ ৫টি)</Label>
        <div className="flex flex-wrap gap-3 mt-2">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
              <img src={preview} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-0.5 right-0.5 p-0.5 bg-destructive text-destructive-foreground rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <ImagePlus className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground mt-1">ছবি</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
            </label>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting || uploading}>
          {submitting || uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {uploading ? "ছবি আপলোড হচ্ছে..." : "জমা হচ্ছে..."}
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
