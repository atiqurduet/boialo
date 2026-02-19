import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface RelatedProduct {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  brand: string | null;
  images: any;
  product_type: string;
}

interface RelatedProductsProps {
  currentProductId: string;
  categoryId: string | null;
  productType: string;
  limit?: number;
}

export const RelatedProducts = ({
  currentProductId,
  categoryId,
  productType,
  limit = 4,
}: RelatedProductsProps) => {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('universal_products')
          .select('id, name_bn, name_en, slug, price, original_price, discount_percent, brand, images, product_type')
          .eq('is_active', true)
          .neq('id', currentProductId)
          .limit(limit);

        // First try to get products from the same category
        if (categoryId) {
          query = query.eq('category_id', categoryId);
        } else {
          // If no category, get products from the same product type
          query = query.eq('product_type', productType);
        }

        const { data, error } = await query;

        if (error) throw error;

        // If we didn't get enough products from the same category, get more from the same type
        if (data && data.length < limit && categoryId) {
          const remainingCount = limit - data.length;
          const existingIds = data.map(p => p.id);
          
          const { data: moreData } = await supabase
            .from('universal_products')
            .select('id, name_bn, name_en, slug, price, original_price, discount_percent, brand, images, product_type')
            .eq('is_active', true)
            .eq('product_type', productType)
            .not('id', 'in', `(${[currentProductId, ...existingIds].join(',')})`)
            .limit(remainingCount);

          if (moreData) {
            setProducts([...data, ...moreData]);
          } else {
            setProducts(data);
          }
        } else {
          setProducts(data || []);
        }
      } catch (error) {
        console.error('Error fetching related products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedProducts();
  }, [currentProductId, categoryId, productType, limit]);

  const getProductImage = (product: RelatedProduct): string => {
    if (!product.images) return '/placeholder.svg';
    if (typeof product.images === 'string') return product.images;
    if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
    return '/placeholder.svg';
  };

  if (loading) {
    return (
      <section className="mt-12">
        <h2 className="text-xl font-bold mb-6">সম্পর্কিত পণ্য</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">সম্পর্কিত পণ্য</h2>
        <Link
          to={`/category/${productType}`}
          className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
        >
          আরও দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/universal-product/${product.slug}`}
            className="group bg-card rounded-lg border overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="relative aspect-square overflow-hidden">
              {product.discount_percent && product.discount_percent > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute top-2 right-2 z-10"
                >
                  -{product.discount_percent}%
                </Badge>
              )}
              <img
                src={getProductImage(product)}
                alt={product.name_bn}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                {product.name_bn}
              </h3>
              {product.brand && (
                <p className="text-xs text-muted-foreground mb-2">{product.brand}</p>
              )}
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold">৳{product.price}</span>
                {product.original_price && product.original_price > product.price && (
                  <span className="text-muted-foreground line-through text-xs">
                    ৳{product.original_price}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
