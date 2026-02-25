import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart, Eye, Star, Minus, Plus } from "lucide-react";
import { useCartContext } from "@/contexts/CartContext";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { toast } from "sonner";

interface QuickViewProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  original_price?: number;
  discount_percent?: number;
  image?: string;
  category?: string;
  writer_name?: string;
  stock_quantity?: number;
  short_description?: string;
}

interface QuickViewModalProps {
  product: QuickViewProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickViewModal({ product, open, onOpenChange }: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCartContext();
  const { toggleWishlist, isInWishlist } = useWishlistContext();

  if (!product) return null;

  const isOutOfStock = product.stock_quantity !== undefined && product.stock_quantity <= 0;
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product.id);
    }
    toast.success(`${product.title} কার্টে যোগ হয়েছে`);
    setQuantity(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Quick View</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
            <img
              src={product.image || "/placeholder.svg"}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            {product.discount_percent && product.discount_percent > 0 && (
              <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
                -{product.discount_percent}%
              </Badge>
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <Badge variant="destructive" className="text-lg px-4 py-2">স্টক আউট</Badge>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col justify-between">
            <div>
              {product.category && (
                <p className="text-sm text-muted-foreground mb-1">{product.category}</p>
              )}
              <h2 className="text-xl font-bold text-foreground mb-2">{product.title}</h2>
              {product.writer_name && (
                <p className="text-sm text-muted-foreground mb-3">{product.writer_name}</p>
              )}

              {/* Price */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-primary">৳{product.price}</span>
                {product.original_price && product.original_price > product.price && (
                  <span className="text-lg text-muted-foreground line-through">
                    ৳{product.original_price}
                  </span>
                )}
              </div>

              {product.short_description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {product.short_description}
                </p>
              )}

              {/* Stock Status */}
              {product.stock_quantity !== undefined && (
                <p className={`text-sm mb-4 ${isOutOfStock ? 'text-destructive' : 'text-green-600'}`}>
                  {isOutOfStock ? 'স্টকে নেই' : `স্টকে আছে (${product.stock_quantity}টি)`}
                </p>
              )}

              {/* Quantity */}
              {!isOutOfStock && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm font-medium">পরিমাণ:</span>
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                className="w-full"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                কার্টে যোগ করুন
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => toggleWishlist(product.id)}
                >
                  <Heart className={`h-4 w-4 mr-2 ${inWishlist ? 'fill-destructive text-destructive' : ''}`} />
                  {inWishlist ? 'উইশলিস্টে আছে' : 'উইশলিস্ট'}
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <Link to={`/product/${product.slug}`} onClick={() => onOpenChange(false)}>
                    <Eye className="h-4 w-4 mr-2" />
                    বিস্তারিত
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
