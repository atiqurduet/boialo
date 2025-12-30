import { useState } from 'react';
import { Share2, Facebook, Twitter, Copy, Check, MessageCircle } from 'lucide-react';
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
}

export const SocialShare = ({ url, title, description, image }: SocialShareProps) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description || '');

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 hover:text-primary transition-colors text-sm text-muted-foreground">
          <Share2 className="w-5 h-5" />
          বন্ধুদের সাথে শেয়ার করুন
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
            onClick={() => handleShare('twitter')}
          >
            <Twitter className="w-5 h-5 text-sky-500" />
            <span>Twitter</span>
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
  );
};
