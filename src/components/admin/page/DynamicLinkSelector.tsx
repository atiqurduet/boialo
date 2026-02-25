import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Link2, ExternalLink } from 'lucide-react';

interface DynamicLinkSelectorProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
}

type LinkType = 'custom' | 'page' | 'category' | 'product' | 'universal_category' | 'offer' | 'blog';

export const DynamicLinkSelector = ({
  value,
  onChange,
  label = 'লিংক',
  placeholder = '/shop',
}: DynamicLinkSelectorProps) => {
  const [linkType, setLinkType] = useState<LinkType>('custom');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch pages
  const { data: pages } = useQuery({
    queryKey: ['selector-pages'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pages')
        .select('id, title_bn, slug')
        .eq('status', 'published')
        .order('title_bn');
      return data || [];
    },
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['selector-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name_bn, slug')
        .eq('is_active', true)
        .order('name_bn');
      return data || [];
    },
  });

  // Fetch universal categories
  const { data: universalCategories } = useQuery({
    queryKey: ['selector-universal-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('universal_categories')
        .select('id, name_bn, slug, product_type')
        .eq('is_active', true)
        .order('name_bn');
      return data || [];
    },
  });

  // Fetch offers
  const { data: offers } = useQuery({
    queryKey: ['selector-offers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('offers')
        .select('id, name_bn, slug')
        .eq('is_active', true)
        .order('name_bn');
      return data || [];
    },
  });

  // Fetch blog posts
  const { data: blogPosts } = useQuery({
    queryKey: ['selector-blog-posts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title_bn, slug')
        .eq('status', 'published')
        .order('title_bn');
      return data || [];
    },
  });

  const handleSelectLink = (type: LinkType, selectedValue: string) => {
    let url = '';
    switch (type) {
      case 'page':
        url = `/page/${selectedValue}`;
        break;
      case 'category':
        url = `/categories/${selectedValue}`;
        break;
      case 'universal_category':
        url = `/shop?category=${selectedValue}`;
        break;
      case 'offer':
        url = `/offers/${selectedValue}`;
        break;
      case 'blog':
        url = `/blog/${selectedValue}`;
        break;
      default:
        url = selectedValue;
    }
    onChange(url);
    setIsOpen(false);
  };

  const linkTypeLabels: Record<LinkType, string> = {
    custom: 'কাস্টম URL',
    page: 'পেজ',
    category: 'বই ক্যাটাগরি',
    universal_category: 'প্রোডাক্ট ক্যাটাগরি',
    offer: 'অফার',
    blog: 'ব্লগ পোস্ট',
    product: 'প্রোডাক্ট',
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon">
              <Link2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>লিংক টাইপ</Label>
                <Select value={linkType} onValueChange={(v) => setLinkType(v as LinkType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(linkTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {linkType === 'custom' && (
                <div className="space-y-2">
                  <Label>কাস্টম URL</Label>
                  <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="/shop, https://..."
                  />
                  <div className="flex flex-wrap gap-1">
                    {['/shop', '/categories', '/offers', '/about', '/contact'].map((url) => (
                      <Button
                        key={url}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectLink('custom', url)}
                      >
                        {url}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {linkType === 'page' && (
                <div className="space-y-2">
                  <Label>পেজ সিলেক্ট করুন</Label>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {pages?.map((page) => (
                      <Button
                        key={page.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleSelectLink('page', page.slug)}
                      >
                        {page.title_bn}
                      </Button>
                    ))}
                    {!pages?.length && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        কোনো পাবলিশড পেজ নেই
                      </p>
                    )}
                  </div>
                </div>
              )}

              {linkType === 'category' && (
                <div className="space-y-2">
                  <Label>ক্যাটাগরি সিলেক্ট করুন</Label>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {categories?.map((cat) => (
                      <Button
                        key={cat.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleSelectLink('category', cat.slug)}
                      >
                        {cat.name_bn}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {linkType === 'universal_category' && (
                <div className="space-y-2">
                  <Label>প্রোডাক্ট ক্যাটাগরি সিলেক্ট করুন</Label>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {universalCategories?.map((cat) => (
                      <Button
                        key={cat.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleSelectLink('universal_category', cat.slug)}
                      >
                        {cat.name_bn}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({cat.product_type})
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {linkType === 'offer' && (
                <div className="space-y-2">
                  <Label>অফার সিলেক্ট করুন</Label>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {offers?.map((offer) => (
                      <Button
                        key={offer.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleSelectLink('offer', offer.slug)}
                      >
                        {offer.name_bn}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {linkType === 'blog' && (
                <div className="space-y-2">
                  <Label>ব্লগ পোস্ট সিলেক্ট করুন</Label>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {blogPosts?.map((post) => (
                      <Button
                        key={post.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleSelectLink('blog', post.slug)}
                      >
                        {post.title_bn}
                      </Button>
                    ))}
                    {!blogPosts?.length && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        কোনো পাবলিশড ব্লগ পোস্ট নেই
                      </p>
                    )}
                  </div>
                </div>
              )}

              {linkType === 'product' && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  প্রোডাক্ট সার্চ শীঘ্রই আসছে। <br />
                  এখন কাস্টম URL ব্যবহার করুন: <br />
                  <code className="text-xs">/product/[slug]</code>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {value && value.startsWith('http') && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          এক্সটার্নাল লিংক
        </p>
      )}
    </div>
  );
};
