import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";
import {
  ThumbsUp, MessageCircle, Share2, Send, MoreHorizontal, Globe,
  Heart, Eye, ChevronDown, ChevronUp, Image as ImageIcon, Bookmark,
  Facebook, Instagram, Twitter, Linkedin, Youtube, Smartphone, X
} from "lucide-react";

const PLATFORM_META: Record<string, { icon: any; color: string; name: string; bgClass: string }> = {
  facebook: { icon: Facebook, color: '#1877F2', name: 'Facebook', bgClass: 'bg-[#1877F2]' },
  instagram: { icon: Instagram, color: '#E4405F', name: 'Instagram', bgClass: 'bg-[#E4405F]' },
  twitter: { icon: Twitter, color: '#1DA1F2', name: 'Twitter/X', bgClass: 'bg-[#1DA1F2]' },
  telegram: { icon: Send, color: '#0088cc', name: 'Telegram', bgClass: 'bg-[#0088cc]' },
  linkedin: { icon: Linkedin, color: '#0A66C2', name: 'LinkedIn', bgClass: 'bg-[#0A66C2]' },
  youtube: { icon: Youtube, color: '#FF0000', name: 'YouTube', bgClass: 'bg-[#FF0000]' },
  tiktok: { icon: Smartphone, color: '#000000', name: 'TikTok', bgClass: 'bg-black' },
  whatsapp: { icon: MessageCircle, color: '#25D366', name: 'WhatsApp', bgClass: 'bg-[#25D366]' },
  pinterest: { icon: Globe, color: '#E60023', name: 'Pinterest', bgClass: 'bg-[#E60023]' },
};

const SocialFeedView = () => {
  const queryClient = useQueryClient();
  const [activePlatform, setActivePlatform] = useState<string>("all");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Fetch published posts with results
  const { data: posts = [] } = useQuery({
    queryKey: ['social-feed-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: postResults = [] } = useQuery({
    queryKey: ['social-feed-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_media_post_results')
        .select('*')
        .eq('status', 'success')
        .order('posted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['social-feed-comments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_media_comments')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['social-accounts-feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_media_accounts')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ post_result_id, comment_id, reply_text }: any) => {
      const { data, error } = await supabase.functions.invoke('social-media-reply', {
        body: { post_result_id, comment_id, reply_text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('রিপ্লাই পাঠানো হয়েছে');
      queryClient.invalidateQueries({ queryKey: ['social-feed-comments'] });
      setReplyingTo(null);
      setReplyInputs({});
    },
    onError: (err: any) => toast.error(err.message || 'রিপ্লাই ব্যর্থ'),
  });

  // Build feed items - one per platform result
  const feedItems = postResults
    .map((result) => {
      const post = posts.find((p) => p.id === result.post_id);
      if (!post) return null;
      return { ...result, post };
    })
    .filter(Boolean)
    .filter((item: any) => activePlatform === 'all' || item.platform === activePlatform);

  const connectedPlatforms = [...new Set(accounts.map((a) => a.platform))];

  const getTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: bn });
    } catch {
      return dateStr;
    }
  };

  const toggleComments = (resultId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(resultId)) next.delete(resultId);
      else next.add(resultId);
      return next;
    });
  };

  const handleReply = (resultId: string, commentId?: string) => {
    const text = replyInputs[resultId];
    if (!text?.trim()) return;
    replyMutation.mutate({ post_result_id: resultId, comment_id: commentId, reply_text: text });
  };

  return (
    <div className="max-w-[680px] mx-auto space-y-0">
      {/* Facebook-style Stories/Platform Filter Bar */}
      <div className="bg-card rounded-xl border shadow-sm mb-4 overflow-hidden">
        <div className="flex items-center gap-1 p-2 overflow-x-auto">
          <button
            onClick={() => setActivePlatform('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
              activePlatform === 'all'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <Globe className="w-4 h-4" /> সব প্ল্যাটফর্ম
          </button>
          {connectedPlatforms.map((p) => {
            const meta = PLATFORM_META[p];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <button
                key={p}
                onClick={() => setActivePlatform(p)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  activePlatform === p
                    ? 'text-white shadow-md'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
                style={activePlatform === p ? { backgroundColor: meta.color } : {}}
              >
                <Icon className="w-4 h-4" /> {meta.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Posts Feed */}
      {feedItems.length === 0 ? (
        <div className="bg-card rounded-xl border shadow-sm p-12 text-center">
          <Globe className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">কোনো পোস্ট পাওয়া যায়নি</p>
          <p className="text-xs text-muted-foreground/60 mt-1">প্ল্যাটফর্মে পোস্ট করলে এখানে দেখা যাবে</p>
        </div>
      ) : (
        feedItems.map((item: any) => {
          const meta = PLATFORM_META[item.platform] || PLATFORM_META.facebook;
          const Icon = meta.icon;
          const account = accounts.find((a) => a.platform === item.platform);
          const postComments = comments.filter(
            (c) => c.post_id === item.post_id && c.platform === item.platform
          );
          const topComments = postComments.filter((c) => !c.is_reply);
          const isExpanded = expandedComments.has(item.id);
          const content = item.post.content_bn || item.post.content || '';
          const mediaUrls = item.post.media_urls || [];
          const hashtags = item.post.hashtags || [];

          return (
            <div key={item.id} className="bg-card rounded-xl border shadow-sm mb-4 overflow-hidden">
              {/* Post Header - Facebook style */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md"
                  style={{ backgroundColor: meta.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {account?.account_name || meta.name}
                    </span>
                    <svg viewBox="0 0 12 13" className="w-3.5 h-3.5 flex-shrink-0" style={{ fill: meta.color }}>
                      <title>Verified</title>
                      <g><path d="M11.5 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z" /><path d="M5.3 8.7l-2-2 .7-.7L5.3 7.3 8 4.6l.7.7-3.4 3.4z" fill="white" /></g>
                    </svg>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{getTimeAgo(item.posted_at || item.post.published_at)}</span>
                    <span>·</span>
                    <Globe className="w-3 h-3" />
                  </div>
                </div>
                <button className="p-2 hover:bg-muted rounded-full transition-colors">
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-3">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {content}
                </p>
                {hashtags.length > 0 && (
                  <p className="text-sm mt-1" style={{ color: meta.color }}>
                    {hashtags.map((h: string, i: number) => (
                      <span key={i} className="mr-1 cursor-pointer hover:underline">
                        {h.startsWith('#') ? h : `#${h}`}
                      </span>
                    ))}
                  </p>
                )}
              </div>

              {/* Media */}
              {mediaUrls.length > 0 && (
                <div className={`${mediaUrls.length === 1 ? '' : 'grid grid-cols-2 gap-0.5'}`}>
                  {mediaUrls.map((url: string, i: number) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className={`w-full object-cover ${
                        mediaUrls.length === 1 ? 'max-h-[500px]' : 'aspect-square'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Engagement Counts Bar */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  {(item.likes_count || 0) > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-0.5">
                        <span className="w-[18px] h-[18px] rounded-full bg-[#1877F2] flex items-center justify-center">
                          <ThumbsUp className="w-2.5 h-2.5 text-white" />
                        </span>
                        <span className="w-[18px] h-[18px] rounded-full bg-[#F33E58] flex items-center justify-center">
                          <Heart className="w-2.5 h-2.5 text-white" />
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-0.5">
                        {item.likes_count?.toLocaleString('bn-BD')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {(item.comments_count || 0) > 0 && (
                    <span className="hover:underline cursor-pointer" onClick={() => toggleComments(item.id)}>
                      {item.comments_count?.toLocaleString('bn-BD')} টি মন্তব্য
                    </span>
                  )}
                  {(item.shares_count || 0) > 0 && (
                    <span>{item.shares_count?.toLocaleString('bn-BD')} টি শেয়ার</span>
                  )}
                  {(item.views_count || 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {item.views_count?.toLocaleString('bn-BD')}
                    </span>
                  )}
                </div>
              </div>

              <Separator />

              {/* Action Buttons - Facebook style */}
              <div className="grid grid-cols-3 px-2 py-1">
                <button className="flex items-center justify-center gap-2 py-2.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                  <ThumbsUp className="w-5 h-5" />
                  <span className="text-sm font-medium">লাইক</span>
                </button>
                <button
                  onClick={() => toggleComments(item.id)}
                  className="flex items-center justify-center gap-2 py-2.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">মন্তব্য</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-2.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm font-medium">শেয়ার</span>
                </button>
              </div>

              {/* Comments Section */}
              {isExpanded && (
                <>
                  <Separator />
                  <div className="px-4 py-3 space-y-3">
                    {topComments.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        কোনো মন্তব্য নেই
                      </p>
                    ) : (
                      topComments.map((comment) => {
                        const replies = postComments.filter(
                          (c) => c.parent_comment_id === comment.id
                        );
                        return (
                          <div key={comment.id} className="space-y-2">
                            {/* Comment */}
                            <div className="flex gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground">
                                {(comment.author_name || 'U')[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="bg-muted rounded-2xl px-3 py-2">
                                  <span className="text-[13px] font-semibold text-foreground">
                                    {comment.author_name || 'ব্যবহারকারী'}
                                  </span>
                                  {comment.is_from_admin && (
                                    <Badge variant="secondary" className="ml-1.5 text-[9px] px-1 py-0">
                                      অ্যাডমিন
                                    </Badge>
                                  )}
                                  <p className="text-[13px] text-foreground mt-0.5">
                                    {comment.content}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 mt-1 px-3">
                                  <span className="text-[11px] text-muted-foreground">
                                    {getTimeAgo(comment.external_created_at || comment.created_at)}
                                  </span>
                                  <button className="text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                                    লাইক
                                  </button>
                                  <button
                                    onClick={() => setReplyingTo(comment.id)}
                                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                                  >
                                    রিপ্লাই
                                  </button>
                                  {(comment.likes_count || 0) > 0 && (
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                      <ThumbsUp className="w-2.5 h-2.5" />
                                      {comment.likes_count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Replies */}
                            {replies.length > 0 && (
                              <div className="ml-10 space-y-2">
                                {replies.map((reply) => (
                                  <div key={reply.id} className="flex gap-2">
                                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-muted-foreground">
                                      {(reply.author_name || 'A')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="bg-muted rounded-2xl px-3 py-1.5">
                                        <span className="text-xs font-semibold text-foreground">
                                          {reply.author_name || 'অ্যাডমিন'}
                                        </span>
                                        {reply.is_from_admin && (
                                          <Badge variant="secondary" className="ml-1 text-[8px] px-1 py-0">
                                            অ্যাডমিন
                                          </Badge>
                                        )}
                                        <p className="text-xs text-foreground mt-0.5">
                                          {reply.content}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-3 mt-0.5 px-3">
                                        <span className="text-[10px] text-muted-foreground">
                                          {getTimeAgo(reply.external_created_at || reply.created_at)}
                                        </span>
                                        <button className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">
                                          লাইক
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Reply Input */}
                            {replyingTo === comment.id && (
                              <div className="ml-10 flex gap-2 items-center">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold" style={{ backgroundColor: meta.color }}>
                                  A
                                </div>
                                <div className="flex-1 relative">
                                  <input
                                    value={replyInputs[item.id] || ''}
                                    onChange={(e) => setReplyInputs((p) => ({ ...p, [item.id]: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && handleReply(item.id, comment.id)}
                                    placeholder="রিপ্লাই লিখুন..."
                                    className="w-full bg-muted rounded-full px-3 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30"
                                  />
                                  <button
                                    onClick={() => handleReply(item.id, comment.id)}
                                    disabled={!replyInputs[item.id]?.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 disabled:opacity-30"
                                    style={{ color: meta.color }}
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* Write Comment */}
                    <div className="flex gap-2 items-center pt-1">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: meta.color }}
                      >
                        A
                      </div>
                      <div className="flex-1 relative">
                        <input
                          value={replyInputs[`main-${item.id}`] || ''}
                          onChange={(e) => setReplyInputs((p) => ({ ...p, [`main-${item.id}`]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const text = replyInputs[`main-${item.id}`];
                              if (text?.trim()) {
                                replyMutation.mutate({ post_result_id: item.id, reply_text: text });
                                setReplyInputs((p) => ({ ...p, [`main-${item.id}`]: '' }));
                              }
                            }
                          }}
                          placeholder="একটি মন্তব্য লিখুন..."
                          className="w-full bg-muted rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
                          <button
                            onClick={() => {
                              const text = replyInputs[`main-${item.id}`];
                              if (text?.trim()) {
                                replyMutation.mutate({ post_result_id: item.id, reply_text: text });
                                setReplyInputs((p) => ({ ...p, [`main-${item.id}`]: '' }));
                              }
                            }}
                            disabled={!replyInputs[`main-${item.id}`]?.trim()}
                            className="disabled:opacity-30"
                            style={{ color: meta.color }}
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* External Link */}
              {item.external_url && (
                <div className="px-4 pb-3 pt-1">
                  <a
                    href={item.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] hover:underline flex items-center gap-1"
                    style={{ color: meta.color }}
                  >
                    <Globe className="w-3 h-3" /> {meta.name}-এ দেখুন →
                  </a>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default SocialFeedView;
