import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Page {
  id: string;
  title_bn: string;
  title_en: string | null;
  slug: string;
  status: string;
  is_homepage: boolean;
  created_at: string;
  updated_at: string;
}

const AdminPages = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: pages, isLoading } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Page[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      toast.success('পেজ ডিলিট হয়েছে');
      setDeletePageId(null);
    },
    onError: () => {
      toast.error('ডিলিট করতে সমস্যা হয়েছে');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (page: Page) => {
      // First create the new page
      const { data: newPage, error: pageError } = await supabase
        .from('pages')
        .insert({
          title_bn: `${page.title_bn} (কপি)`,
          title_en: page.title_en ? `${page.title_en} (Copy)` : null,
          slug: `${page.slug}-copy-${Date.now()}`,
          status: 'draft',
          is_homepage: false,
        })
        .select()
        .single();

      if (pageError) throw pageError;

      // Copy sections
      const { data: sections } = await supabase
        .from('page_sections')
        .select('*')
        .eq('page_id', page.id);

      if (sections && sections.length > 0) {
        const newSections = sections.map((s) => ({
          page_id: newPage.id,
          section_type: s.section_type,
          title_bn: s.title_bn,
          title_en: s.title_en,
          subtitle_bn: s.subtitle_bn,
          subtitle_en: s.subtitle_en,
          content: s.content,
          settings: s.settings,
          sort_order: s.sort_order,
          is_active: s.is_active,
        }));

        await supabase.from('page_sections').insert(newSections);
      }

      return newPage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      toast.success('পেজ কপি করা হয়েছে');
    },
    onError: () => {
      toast.error('কপি করতে সমস্যা হয়েছে');
    },
  });

  const filteredPages = pages?.filter(
    (page) =>
      page.title_bn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500">প্রকাশিত</Badge>;
      case 'draft':
        return <Badge variant="secondary">ড্রাফট</Badge>;
      case 'archived':
        return <Badge variant="outline">আর্কাইভ</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">পেজ ম্যানেজমেন্ট</h1>
            <p className="text-muted-foreground">সাইটের সকল পেজ তৈরি ও পরিচালনা করুন</p>
          </div>
          <Button onClick={() => navigate('/admin/pages/new')}>
            <Plus className="h-4 w-4 mr-2" />
            নতুন পেজ
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="পেজ খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>শিরোনাম</TableHead>
                <TableHead>স্লাগ</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>আপডেট</TableHead>
                <TableHead className="w-[100px]">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    লোড হচ্ছে...
                  </TableCell>
                </TableRow>
              ) : filteredPages?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    কোনো পেজ পাওয়া যায়নি
                  </TableCell>
                </TableRow>
              ) : (
                filteredPages?.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{page.title_bn}</span>
                        {page.is_homepage && (
                          <Badge variant="outline" className="text-xs">
                            হোম
                          </Badge>
                        )}
                      </div>
                      {page.title_en && (
                        <span className="text-sm text-muted-foreground">{page.title_en}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">/{page.slug}</code>
                    </TableCell>
                    <TableCell>{getStatusBadge(page.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(page.updated_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/pages/${page.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            এডিট
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(`/page/${page.slug}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            প্রিভিউ
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateMutation.mutate(page)}>
                            <Copy className="h-4 w-4 mr-2" />
                            কপি করুন
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletePageId(page.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            ডিলিট
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <AlertDialog open={!!deletePageId} onOpenChange={() => setDeletePageId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>পেজ ডিলিট করবেন?</AlertDialogTitle>
              <AlertDialogDescription>
                এই পেজ এবং এর সকল সেকশন স্থায়ীভাবে ডিলিট হয়ে যাবে। এই অ্যাকশন আর ফেরানো যাবে না।
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>বাতিল</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deletePageId && deleteMutation.mutate(deletePageId)}
              >
                ডিলিট
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminPages;
