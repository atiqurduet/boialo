import { useState, useEffect } from "react";
import { Star, Loader2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ReviewForm } from "./ReviewForm";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  profile?: {
    full_name: string | null;
  };
}

interface ProductReviewsProps {
  productId: string;
}

export const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile names for reviews
      const reviewsWithProfiles = await Promise.all(
        (data || []).map(async (review) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", review.user_id)
            .maybeSingle();
          
          return { ...review, profile };
        })
      );

      setReviews(reviewsWithProfiles);

      // Check if current user has a review
      if (user) {
        const existingReview = reviewsWithProfiles.find(r => r.user_id === user.id);
        setUserReview(existingReview || null);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmitted = () => {
    setShowForm(false);
    fetchReviews();
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 
      : 0,
  }));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderStars = (rating: number, size: "sm" | "lg" = "sm") => {
    const starSize = size === "lg" ? "w-6 h-6" : "w-4 h-4";
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">রেটিং ও রিভিউ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Average Rating */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <span className="text-5xl font-bold text-foreground">
                  {averageRating.toFixed(1)}
                </span>
                <div>
                  {renderStars(Math.round(averageRating), "lg")}
                  <p className="text-sm text-muted-foreground mt-1">
                    {reviews.length} টি রিভিউ
                  </p>
                </div>
              </div>
            </div>

            {/* Rating Breakdown */}
            <div className="space-y-2">
              {ratingCounts.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="w-3 text-sm text-muted-foreground">{rating}</span>
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <Progress value={percentage} className="flex-1 h-2" />
                  <span className="w-8 text-sm text-muted-foreground text-right">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Write Review Button */}
          {user && !userReview && (
            <div className="mt-6 pt-6 border-t border-border">
              {showForm ? (
                <ReviewForm
                  productId={productId}
                  onSuccess={handleReviewSubmitted}
                  onCancel={() => setShowForm(false)}
                />
              ) : (
                <Button onClick={() => setShowForm(true)}>
                  রিভিউ লিখুন
                </Button>
              )}
            </div>
          )}

          {user && userReview && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                আপনি ইতিমধ্যে এই পণ্যে রিভিউ দিয়েছেন।
              </p>
            </div>
          )}

          {!user && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                রিভিউ লিখতে <a href="/signin" className="text-primary hover:underline">লগইন করুন</a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews List */}
      {reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">সব রিভিউ ({reviews.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="pb-6 border-b border-border last:border-0 last:pb-0">
                <div className="flex items-start gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {review.profile?.full_name?.[0] || <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">
                        {review.profile?.full_name || "Anonymous"}
                      </span>
                      {review.is_verified_purchase && (
                        <Badge variant="secondary" className="text-xs">
                          যাচাইকৃত ক্রেতা
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(review.rating)}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                    {review.title && (
                      <h4 className="font-medium mt-2">{review.title}</h4>
                    )}
                    {review.comment && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {review.comment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {reviews.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">এই পণ্যে এখনো কোনো রিভিউ নেই।</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
