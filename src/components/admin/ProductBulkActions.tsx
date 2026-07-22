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
}

interface Writer {
  id: string;
  name_bn: string;
  name_en: string;
}

interface Publisher {
  id: string;
  name_bn: string;
  name_en: string;
}

interface Brand {
  id: string;
  name_bn: string;
  name_en: string;
}

interface ProductBulkActionsProps {
  categories: Category[];
  writers: Writer[];
  publishers: Publisher[];
  brands: Brand[];
  onImportComplete: () => void;
}

interface ImportRow {
  rowNum: number;
  data: Record<string, string>;
  errors: string[];
  status: 'valid' | 'error' | 'imported';
}

const CSV_HEADERS = [
  'title_bn',
  'title_en',
  'slug',
  'price',
  'original_price',
  'discount_percent',
  'stock_quantity',
  'is_active',
  'is_preorder',
  'is_featured',
  'category_name',
  'writer_name',
  'publisher_name',
  'brand_name',
  'author',
  'publisher_text',
  'description_bn',
  'description_en',
  'isbn',
  'meta_title',
  'meta_description',
  'tags',
];

export const ProductBulkActions = ({
  categories,
  writers,
  publishers,
  brands,
  onImportComplete,
}: ProductBulkActionsProps) => {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (products || []).map((product: any) => {
        const category = categories.find(c => c.id === product.category_id);
        const writer = writers.find(w => w.id === product.writer_id);
        const publisher = publishers.find(p => p.id === product.publisher_id);
        const brand = brands.find(b => b.id === product.brand_id);
        return [
          product.title_bn,
          product.title_en,
          product.slug,
          product.price || '',
          product.original_price || '',
          product.discount_percent || 0,
          product.stock_quantity || 0,
          product.is_active ? 'TRUE' : 'FALSE',
          product.is_preorder ? 'TRUE' : 'FALSE',
          product.is_featured ? 'TRUE' : 'FALSE',
          category?.name_bn || '',
          writer?.name_bn || '',
          publisher?.name_bn || '',
          brand?.name_bn || '',
          product.author || '',
          product.publisher || '',
          product.description_bn || '',
          product.description_en || '',
          product.isbn || '',
          product.meta_title || '',
          product.meta_description || '',
          (product.tags || []).join(';'),
        ];
      });
      downloadXLSX(CSV_HEADERS, rows, `products_export_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({ title: 'সফল', description: `${products?.length || 0}টি প্রোডাক্ট এক্সপোর্ট হয়েছে` });
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

      // Validate rows
      const importRows: ImportRow[] = rows.map((data, index) => {
        const errors: string[] = [];

        if (!data.title_bn?.trim()) {
          errors.push('নাম (বাংলা) আবশ্যক');
        }
        if (!data.title_en?.trim()) {
          errors.push('Name (English) আবশ্যক');
        }
        if (!data.price || isNaN(Number(data.price)) || Number(data.price) <= 0) {
          errors.push('সঠিক মূল্য প্রয়োজন');
        }

        // Check if category exists
        if (data.category_name?.trim()) {
          const cat = categories.find(c => c.name_bn.toLowerCase() === data.category_name.toLowerCase());
          if (!cat) {
            errors.push(`ক্যাটাগরি "${data.category_name}" পাওয়া যায়নি`);
          }
        }

        // Check if writer exists
        if (data.writer_name?.trim()) {
          const writer = writers.find(w => 
            w.name_bn.toLowerCase() === data.writer_name.toLowerCase() ||
            w.name_en.toLowerCase() === data.writer_name.toLowerCase()
          );
          if (!writer) {
            errors.push(`লেখক "${data.writer_name}" পাওয়া যায়নি`);
          }
        }

        // Check if publisher exists
        if (data.publisher_name?.trim()) {
          const pub = publishers.find(p => 
            p.name_bn.toLowerCase() === data.publisher_name.toLowerCase() ||
            p.name_en.toLowerCase() === data.publisher_name.toLowerCase()
          );
          if (!pub) {
            errors.push(`প্রকাশনী "${data.publisher_name}" পাওয়া যায়নি`);
          }
        }

        // Check if brand exists
        if (data.brand_name?.trim()) {
          const brand = brands.find(b => 
            b.name_bn.toLowerCase() === data.brand_name.toLowerCase() ||
            b.name_en.toLowerCase() === data.brand_name.toLowerCase()
          );
          if (!brand) {
            errors.push(`ব্র্যান্ড "${data.brand_name}" পাওয়া যায়নি`);
          }
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

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    const validRows = importRows.filter(r => r.status === 'valid');
    if (validRows.length === 0) {
      toast({ title: 'Error', description: 'কোন বৈধ রো নেই ইম্পোর্ট করার জন্য', variant: 'destructive' });
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of validRows) {
      try {
        const category = categories.find(c => c.name_bn.toLowerCase() === row.data.category_name?.toLowerCase());
        const writer = writers.find(w => 
          w.name_bn.toLowerCase() === row.data.writer_name?.toLowerCase() ||
          w.name_en.toLowerCase() === row.data.writer_name?.toLowerCase()
        );
        const publisher = publishers.find(p => 
          p.name_bn.toLowerCase() === row.data.publisher_name?.toLowerCase() ||
          p.name_en.toLowerCase() === row.data.publisher_name?.toLowerCase()
        );
        const brand = brands.find(b => 
          b.name_bn.toLowerCase() === row.data.brand_name?.toLowerCase() ||
          b.name_en.toLowerCase() === row.data.brand_name?.toLowerCase()
        );

        const productData = {
          title_bn: row.data.title_bn,
          title_en: row.data.title_en,
          slug: row.data.slug || generateSlug(row.data.title_en),
          price: Number(row.data.price),
          original_price: row.data.original_price ? Number(row.data.original_price) : null,
          discount_percent: row.data.discount_percent ? Number(row.data.discount_percent) : 0,
          stock_quantity: row.data.stock_quantity ? Number(row.data.stock_quantity) : 0,
          is_active: row.data.is_active?.toUpperCase() !== 'FALSE',
          is_preorder: row.data.is_preorder?.toUpperCase() === 'TRUE',
          is_featured: row.data.is_featured?.toUpperCase() === 'TRUE',
          category_id: category?.id || null,
          writer_id: writer?.id || null,
          publisher_id: publisher?.id || null,
          brand_id: brand?.id || null,
          author: row.data.author || null,
          publisher: row.data.publisher_text || null,
          description_bn: row.data.description_bn || null,
          description_en: row.data.description_en || null,
          isbn: row.data.isbn || null,
          meta_title: row.data.meta_title || null,
          meta_description: row.data.meta_description || null,
          tags: row.data.tags ? row.data.tags.split(';').map(t => t.trim()).filter(Boolean) : null,
          images: [],
        };

        const { error } = await supabase.from('products').insert([productData]);

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
      toast({ title: 'সফল', description: `${successCount}টি প্রোডাক্ট ইম্পোর্ট হয়েছে` });
      onImportComplete();
    }

    if (errorCount > 0) {
      toast({ title: 'সতর্কতা', description: `${errorCount}টি প্রোডাক্ট ইম্পোর্ট করা যায়নি`, variant: 'destructive' });
    }
  };

  const handleDownloadTemplate = () => {
    downloadXLSX(
      CSV_HEADERS,
      [[
        'উদাহরণ বই', 'Example Book', 'example-book', 500, 600, 17, 100,
        'TRUE', 'FALSE', 'FALSE',
        'উপন্যাস', 'লেখকের নাম', 'প্রকাশনীর নাম', 'ব্র্যান্ডের নাম',
        'লেখক', 'প্রকাশক', 'বাংলা বিবরণ', 'English description',
        '978-123456789', 'SEO Title', 'SEO Description', 'tag1;tag2;tag3',
      ]],
      'products_import_template.xlsx'
    );
    toast({ title: 'সফল', description: 'টেমপ্লেট ডাউনলোড হয়েছে' });
  };

  const validCount = importRows.filter(r => r.status === 'valid').length;
  const errorCount = importRows.filter(r => r.status === 'error').length;
  const importedCount = importRows.filter(r => r.status === 'imported').length;

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          টেমপ্লেট
        </Button>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'এক্সপোর্ট হচ্ছে...' : 'এক্সপোর্ট'}
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          ইম্পোর্ট
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>প্রোডাক্ট ইম্পোর্ট প্রিভিউ</DialogTitle>
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
                  <TableHead>মূল্য</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>ত্রুটি</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importRows.map((row, index) => (
                  <TableRow key={index} className={row.status === 'error' ? 'bg-destructive/5' : row.status === 'imported' ? 'bg-green-500/5' : ''}>
                    <TableCell>{row.rowNum}</TableCell>
                    <TableCell>{row.data.title_bn}</TableCell>
                    <TableCell>{row.data.title_en}</TableCell>
                    <TableCell>৳{row.data.price}</TableCell>
                    <TableCell>
                      {row.status === 'valid' && <Badge variant="outline" className="text-green-600">বৈধ</Badge>}
                      {row.status === 'error' && <Badge variant="destructive">ত্রুটি</Badge>}
                      {row.status === 'imported' && <Badge className="bg-green-600">ইম্পোর্টেড</Badge>}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {row.errors.length > 0 && (
                        <span className="text-xs text-destructive">{row.errors.join(', ')}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              বাতিল
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={importing || validCount === 0}
            >
              {importing ? 'ইম্পোর্ট হচ্ছে...' : `${validCount}টি প্রোডাক্ট ইম্পোর্ট করুন`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
