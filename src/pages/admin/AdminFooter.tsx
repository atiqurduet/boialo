import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface FooterSection {
  id: string;
  title_bn: string;
  section_type: string;
  content: any;
}

interface FooterLink {
  id: string;
  section_id: string;
  title_bn: string;
  url: string;
  sort_order: number;
}

const AdminFooter = () => {
  const [sections, setSections] = useState<FooterSection[]>([]);
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<FooterLink | null>(null);
  const [editingSection, setEditingSection] = useState<FooterSection | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const { toast } = useToast();

  const [linkForm, setLinkForm] = useState({ title_bn: '', url: '' });
  const [sectionForm, setSectionForm] = useState({ title_bn: '', content: {} as any });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [sectionsRes, linksRes] = await Promise.all([
        supabase.from('footer_sections').select('*').order('sort_order'),
        supabase.from('footer_links').select('*').order('sort_order')
      ]);
      setSections(sectionsRes.data || []);
      setLinks(linksRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLink) {
        await supabase.from('footer_links').update(linkForm).eq('id', editingLink.id);
        toast({ title: 'সফল', description: 'লিংক আপডেট হয়েছে' });
      } else if (selectedSectionId) {
        const maxOrder = links.filter(l => l.section_id === selectedSectionId).length;
        await supabase.from('footer_links').insert({ ...linkForm, section_id: selectedSectionId, sort_order: maxOrder });
        toast({ title: 'সফল', description: 'নতুন লিংক যোগ হয়েছে' });
      }
      setLinkDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    try {
      await supabase.from('footer_sections').update({ title_bn: sectionForm.title_bn, content: sectionForm.content }).eq('id', editingSection.id);
      toast({ title: 'সফল', description: 'সেকশন আপডেট হয়েছে' });
      setSectionDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('মুছে ফেলতে চান?')) return;
    await supabase.from('footer_links').delete().eq('id', id);
    toast({ title: 'সফল', description: 'লিংক মুছে ফেলা হয়েছে' });
    fetchData();
  };

  const openAddLink = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setEditingLink(null);
    setLinkForm({ title_bn: '', url: '' });
    setLinkDialogOpen(true);
  };

  const openEditLink = (link: FooterLink) => {
    setEditingLink(link);
    setLinkForm({ title_bn: link.title_bn, url: link.url });
    setLinkDialogOpen(true);
  };

  const openEditSection = (section: FooterSection) => {
    setEditingSection(section);
    setSectionForm({ title_bn: section.title_bn, content: section.content || {} });
    setSectionDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">ফুটার ম্যানেজমেন্ট</h1>
          <p className="text-muted-foreground">ফুটার সেকশন ও লিংক ম্যানেজ করুন</p>
        </div>

        {loading ? <div className="p-8 text-center">লোড হচ্ছে...</div> : (
          <div className="grid gap-6">
            {sections.map(section => (
              <Card key={section.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">{section.title_bn}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditSection(section)}><Pencil className="w-4 h-4 mr-1" />এডিট</Button>
                    {section.section_type === 'links' && (
                      <Button size="sm" onClick={() => openAddLink(section.id)}><Plus className="w-4 h-4 mr-1" />লিংক যোগ</Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {section.section_type === 'links' ? (
                    <div className="space-y-2">
                      {links.filter(l => l.section_id === section.id).map(link => (
                        <div key={link.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <span className="font-medium">{link.title_bn}</span>
                            <span className="text-sm text-muted-foreground ml-2">{link.url}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditLink(link)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteLink(link.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : section.section_type === 'contact' ? (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>📍 {section.content?.address}</p>
                      <p>📞 {section.content?.phone}</p>
                      <p>📧 {section.content?.email}</p>
                    </div>
                  ) : section.section_type === 'social' ? (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Facebook: {section.content?.facebook}</p>
                      <p>YouTube: {section.content?.youtube}</p>
                      <p>Instagram: {section.content?.instagram}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingLink ? 'লিংক এডিট' : 'নতুন লিংক'}</DialogTitle></DialogHeader>
            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div><Label>নাম</Label><Input value={linkForm.title_bn} onChange={(e) => setLinkForm({ ...linkForm, title_bn: e.target.value })} required /></div>
              <div><Label>URL</Label><Input value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} required /></div>
              <Button type="submit" className="w-full">{editingLink ? 'আপডেট' : 'যোগ করুন'}</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>সেকশন এডিট</DialogTitle></DialogHeader>
            <form onSubmit={handleSectionSubmit} className="space-y-4">
              <div><Label>টাইটেল</Label><Input value={sectionForm.title_bn} onChange={(e) => setSectionForm({ ...sectionForm, title_bn: e.target.value })} required /></div>
              {editingSection?.section_type === 'contact' && (
                <>
                  <div><Label>ঠিকানা</Label><Textarea value={sectionForm.content?.address || ''} onChange={(e) => setSectionForm({ ...sectionForm, content: { ...sectionForm.content, address: e.target.value } })} /></div>
                  <div><Label>ফোন</Label><Input value={sectionForm.content?.phone || ''} onChange={(e) => setSectionForm({ ...sectionForm, content: { ...sectionForm.content, phone: e.target.value } })} /></div>
                  <div><Label>ইমেইল</Label><Input value={sectionForm.content?.email || ''} onChange={(e) => setSectionForm({ ...sectionForm, content: { ...sectionForm.content, email: e.target.value } })} /></div>
                </>
              )}
              {editingSection?.section_type === 'social' && (
                <>
                  <div><Label>Facebook URL</Label><Input value={sectionForm.content?.facebook || ''} onChange={(e) => setSectionForm({ ...sectionForm, content: { ...sectionForm.content, facebook: e.target.value } })} /></div>
                  <div><Label>YouTube URL</Label><Input value={sectionForm.content?.youtube || ''} onChange={(e) => setSectionForm({ ...sectionForm, content: { ...sectionForm.content, youtube: e.target.value } })} /></div>
                  <div><Label>Instagram URL</Label><Input value={sectionForm.content?.instagram || ''} onChange={(e) => setSectionForm({ ...sectionForm, content: { ...sectionForm.content, instagram: e.target.value } })} /></div>
                </>
              )}
              <Button type="submit" className="w-full">আপডেট করুন</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminFooter;
