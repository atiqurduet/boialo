import { useState } from 'react';
import { Share2, Facebook, Twitter, Copy, Check, MessageCircle, Instagram, Send, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  showWhatsAppOrder?: boolean;
  price?: number;
}

export const SocialShare = ({ url, title, description, image, showWhatsAppOrder, price }: SocialShareProps) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description || '');

  const whatsAppOrderText = price 
    ? `আমি এই পণ্যটি অর্ডার করতে চাই:\n\n📖 ${title}\n💰 মূল্য: ৳${price}\n🔗 ${fullUrl}`
    : `আমি এই পণ্যটি অর্ডার করতে চাই:\n\n📖 ${title}\n🔗 ${fullUrl}`;

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
    whatsappOrder: `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsAppOrderText)}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(image || '')}&description=${encodedTitle}`,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('লিংক কপি হয়েছে!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('লিংক কপি করা যায়নি');
    }
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], '_blank', 'width=600,height=400');
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* WhatsApp Order Button */}
      {showWhatsAppOrder && (
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
          onClick={() => handleShare('whatsappOrder')}
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp এ অর্ডার
        </Button>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 hover:text-primary transition-colors text-sm text-muted-foreground">
            <Share2 className="w-5 h-5" />
            শেয়ার করুন
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="grid gap-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10"
              onClick={() => handleShare('facebook')}
            >
              <Facebook className="w-5 h-5 text-blue-600" />
              <span>Facebook</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10"
              onClick={() => handleShare('whatsapp')}
            >
              <MessageCircle className="w-5 h-5 text-green-500" />
              <span>WhatsApp</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10"
              onClick={() => handleShare('telegram')}
            >
              <Send className="w-5 h-5 text-blue-500" />
              <span>Telegram</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10"
              onClick={() => handleShare('twitter')}
            >
              <Twitter className="w-5 h-5 text-sky-500" />
              <span>Twitter / X</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10"
              onClick={() => handleShare('pinterest')}
            >
              <Instagram className="w-5 h-5 text-pink-600" />
              <span>Pinterest</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
              <span>{copied ? 'কপি হয়েছে!' : 'লিংক কপি করুন'}</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
