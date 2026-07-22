import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { downloadXLSX, parseSpreadsheetFile } from '@/lib/xlsxBulk';

interface Category {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
}

interface CategoryBulkActionsProps {
  categories: Category[];
  onImportComplete: () => void;
}

interface ImportRow {
  rowNum: number;
  data: Record<string, string>;
  errors: string[];
  status: 'valid' | 'error' | 'imported';
}

const CSV_HEADERS = [
  'name_bn',
  'name_en',
  'slug',
  'parent_name',
  'sort_order',
  'is_active',
];

export const CategoryBulkActions = ({ categories, onImportComplete }: CategoryBulkActionsProps) => {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const rows = (data || []).map((cat: any) => {
        const parent = categories.find(c => c.id === cat.parent_id);
        return [
          cat.name_bn,
          cat.name_en,
          cat.slug,
          parent?.name_bn || '',
          cat.sort_order || 0,
          cat.is_active ? 'TRUE' : 'FALSE',
        ];
      });
      downloadXLSX(CSV_HEADERS, rows, `categories_export_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({ title: 'সফল', description: `${data?.length || 0}টি ক্যাটাগরি এক্সপোর্ট হয়েছে` });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({ title: 'Error', description: 'এক্সপোর্ট করতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseSpreadsheetFile(file);

      if (rows.length === 0) {
        toast({ title: 'Error', description: 'ফাইলে কোন ডাটা নেই', variant: 'destructive' });
        return;
      }

      const importRows: ImportRow[] = rows.map((data, index) => {
        const errors: string[] = [];

        if (!data.name_bn?.trim()) errors.push('নাম (বাংলা) আবশ্যক');
        if (!data.name_en?.trim()) errors.push('Name (English) আবশ্যক');

        if (data.parent_name?.trim()) {
          const parent = categories.find(c => c.name_bn.toLowerCase() === data.parent_name.toLowerCase());
          if (!parent) errors.push(`প্যারেন্ট "${data.parent_name}" পাওয়া যায়নি`);
        }

        return {
          rowNum: index + 2,
          data,
          errors,
          status: errors.length > 0 ? 'error' : 'valid',
        };
      });

      setImportRows(importRows);
      setImportDialogOpen(true);
    } catch (error) {
      console.error('File read error:', error);
      toast({ title: 'Error', description: 'ফাইল পড়তে সমস্যা হয়েছে', variant: 'destructive' });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    const validRows = importRows.filter(r => r.status === 'valid');
    if (validRows.length === 0) {
      toast({ title: 'Error', description: 'কোন বৈধ রো নেই', variant: 'destructive' });
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of validRows) {
      try {
        const parent = categories.find(c => c.name_bn.toLowerCase() === row.data.parent_name?.toLowerCase());

        const categoryData = {
          name_bn: row.data.name_bn,
          name_en: row.data.name_en,
          slug: row.data.slug || generateSlug(row.data.name_en),
          parent_id: parent?.id || null,
          sort_order: row.data.sort_order ? Number(row.data.sort_order) : 0,
          is_active: row.data.is_active?.toUpperCase() !== 'FALSE',
        };

        const { error } = await supabase.from('categories').insert([categoryData]);
        if (error) throw error;

        row.status = 'imported';
        successCount++;
      } catch (error) {
        console.error('Import row error:', error);
        row.status = 'error';
        row.errors.push('ইম্পোর্ট করতে সমস্যা হয়েছে');
        errorCount++;
      }
      setImportRows([...importRows]);
    }

    setImporting(false);
    if (successCount > 0) {
      toast({ title: 'সফল', description: `${successCount}টি ক্যাটাগরি ইম্পোর্ট হয়েছে` });
      onImportComplete();
    }
    if (errorCount > 0) {
      toast({ title: 'সতর্কতা', description: `${errorCount}টি ক্যাটাগরি ইম্পোর্ট করা যায়নি`, variant: 'destructive' });
    }
  };

  const handleDownloadTemplate = () => {
    downloadXLSX(
      CSV_HEADERS,
      [
        ['উপন্যাস', 'Novels', 'novels', '', 1, 'TRUE'],
        ['থ্রিলার', 'Thriller', 'thriller', 'উপন্যাস', 2, 'TRUE'],
      ],
      'categories_import_template.xlsx'
    );
    toast({ title: 'সফল', description: 'টেমপ্লেট ডাউনলোড হয়েছে' });
  };

  const validCount = importRows.filter(r => r.status === 'valid').length;
  const errorCount = importRows.filter(r => r.status === 'error').length;
  const importedCount = importRows.filter(r => r.status === 'imported').length;

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          টেমপ্লেট
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'এক্সপোর্ট হচ্ছে...' : 'এক্সপোর্ট'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          ইম্পোর্ট
        </Button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>ক্যাটাগরি ইম্পোর্ট প্রিভিউ</DialogTitle>
          </DialogHeader>

          <div className="flex gap-4 mb-4">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              বৈধ: {validCount}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <XCircle className="h-3 w-3 text-destructive" />
              ত্রুটি: {errorCount}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <AlertCircle className="h-3 w-3 text-blue-500" />
              ইম্পোর্টেড: {importedCount}
            </Badge>
          </div>

          <ScrollArea className="h-[400px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">রো</TableHead>
                  <TableHead>নাম (বাংলা)</TableHead>
                  <TableHead>Name (English)</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>ত্রুটি</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importRows.map((row, index) => (
                  <TableRow key={index} className={row.status === 'error' ? 'bg-destructive/5' : row.status === 'imported' ? 'bg-green-500/5' : ''}>
                    <TableCell>{row.rowNum}</TableCell>
                    <TableCell>{row.data.name_bn}</TableCell>
                    <TableCell>{row.data.name_en}</TableCell>
                    <TableCell>
                      {row.status === 'valid' && <Badge variant="outline" className="text-green-600">বৈধ</Badge>}
                      {row.status === 'error' && <Badge variant="destructive">ত্রুটি</Badge>}
                      {row.status === 'imported' && <Badge className="bg-green-600">ইম্পোর্টেড</Badge>}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {row.errors.length > 0 && <span className="text-xs text-destructive">{row.errors.join(', ')}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>বাতিল</Button>
            <Button onClick={handleImport} disabled={importing || validCount === 0}>
              {importing ? 'ইম্পোর্ট হচ্ছে...' : `${validCount}টি ক্যাটাগরি ইম্পোর্ট করুন`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
