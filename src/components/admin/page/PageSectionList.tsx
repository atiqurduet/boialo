import { useState } from 'react';
import { GripVertical, Edit, Trash2, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface PageSection {
  id: string;
  page_id: string;
  section_type: string;
  title_bn: string | null;
  title_en: string | null;
  subtitle_bn: string | null;
  subtitle_en: string | null;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
}

interface PageSectionListProps {
  sections: PageSection[];
  onEdit: (section: PageSection) => void;
  onDelete: (id: string) => void;
  onReorder: (sections: PageSection[]) => void;
}

const sectionTypeLabels: Record<string, string> = {
  hero_banner: 'হিরো ব্যানার',
  text_content: 'টেক্সট কন্টেন্ট',
  image_gallery: 'ইমেজ গ্যালারি',
  product_grid: 'প্রোডাক্ট গ্রিড',
  category_grid: 'ক্যাটাগরি গ্রিড',
  video_embed: 'ভিডিও এম্বেড',
  testimonials: 'টেস্টিমোনিয়াল',
  faq: 'FAQ',
  contact_form: 'কন্টাক্ট ফর্ম',
  newsletter: 'নিউজলেটার',
  feature_cards: 'ফিচার কার্ড',
  cta_banner: 'CTA ব্যানার',
  html_embed: 'HTML এম্বেড',
  divider: 'ডিভাইডার',
  spacer: 'স্পেসার',
  flash_sale: 'ফ্ল্যাশ সেল',
  trust_badges: 'ট্রাস্ট ব্যাজ',
};

export const PageSectionList = ({
  sections,
  onEdit,
  onDelete,
  onReorder,
}: PageSectionListProps) => {
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSections = [...sections];
    const [removed] = newSections.splice(draggedIndex, 1);
    newSections.splice(index, 0, removed);

    setDraggedIndex(index);
    onReorder(newSections);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>কোনো সেকশন নেই</p>
        <p className="text-sm">উপরের বাটনে ক্লিক করে সেকশন যোগ করুন</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {sections.map((section, index) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              flex items-center gap-4 p-4 border rounded-lg bg-card
              ${draggedIndex === index ? 'opacity-50' : ''}
              ${!section.is_active ? 'opacity-60' : ''}
            `}
          >
            <div className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">
                  {section.title_bn || sectionTypeLabels[section.section_type] || section.section_type}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {sectionTypeLabels[section.section_type] || section.section_type}
                </Badge>
                {!section.is_active && (
                  <Badge variant="outline" className="text-xs">
                    <EyeOff className="h-3 w-3 mr-1" />
                    লুকানো
                  </Badge>
                )}
              </div>
              {section.subtitle_bn && (
                <p className="text-sm text-muted-foreground truncate">{section.subtitle_bn}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => onEdit(section)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => setDeleteSectionId(section.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteSectionId} onOpenChange={() => setDeleteSectionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>সেকশন ডিলিট করবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই সেকশন স্থায়ীভাবে ডিলিট হয়ে যাবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteSectionId) {
                  onDelete(deleteSectionId);
                  setDeleteSectionId(null);
                }
              }}
            >
              ডিলিট
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
