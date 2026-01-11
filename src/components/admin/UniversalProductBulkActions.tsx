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

type ProductType = 'lifestyle' | 'stationery' | 'food';

interface UniversalCategory {
  id: string;
  name_bn: string;
  name_en: string;
  product_type: ProductType;
}

interface UniversalProductBulkActionsProps {
  categories: UniversalCategory[];
  onImportComplete: () => void;
}

interface ImportRow {
  rowNum: number;
  data: Record<string, string>;
  errors: string[];
  status: 'valid' | 'error' | 'imported';
}

const CSV_HEADERS = [
  'product_type',
  'name_bn',
  'name_en',
  'slug',
  'sku',
  'category_name',
  'price',
  'original_price',
  'discount_percent',
  'stock_quantity',
  'is_active',
  'is_featured',
  'brand',
  'manufacturer',
  'weight',
  'dimensions',
  'ingredients',
  'warranty',
  'delivery_time',
  'return_policy',
  'short_description_bn',
  'short_description_en',
  'long_description_bn',
  'long_description_en',
  'video_url',
  'meta_title',
  'meta_description',
  'meta_keywords',
];

const VALID_PRODUCT_TYPES = ['lifestyle', 'stationery', 'food'];

export const UniversalProductBulkActions = ({
  categories,
  onImportComplete,
}: UniversalProductBulkActionsProps) => {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, '-').replace(/^-|-$/g, '');
  };

  const escapeCSV = (value: string) => {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: products, error } = await supabase
        .from('universal_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const csvRows = [CSV_HEADERS.join(',')];

      for (const product of products || []) {
        const category = categories.find(c => c.id === product.category_id);

        const row = [
          escapeCSV(product.product_type),
          escapeCSV(product.name_bn),
          escapeCSV(product.name_en),
          escapeCSV(product.slug),
          escapeCSV(product.sku || ''),
          escapeCSV(category?.name_bn || ''),
          product.price || '',
          product.original_price || '',
          product.discount_percent || 0,
          product.stock_quantity || 0,
          product.is_active ? 'TRUE' : 'FALSE',
          product.is_featured ? 'TRUE' : 'FALSE',
          escapeCSV(product.brand || ''),
          escapeCSV(product.manufacturer || ''),
          escapeCSV(product.weight || ''),
          escapeCSV(product.dimensions || ''),
          escapeCSV(product.ingredients || ''),
          escapeCSV(product.warranty || ''),
          escapeCSV(product.delivery_time || ''),
          escapeCSV(product.return_policy || ''),
          escapeCSV(product.short_description_bn || ''),
          escapeCSV(product.short_description_en || ''),
          escapeCSV(product.long_description_bn || ''),
          escapeCSV(product.long_description_en || ''),
          escapeCSV(product.video_url || ''),
          escapeCSV(product.meta_title || ''),
          escapeCSV(product.meta_description || ''),
          escapeCSV((product.meta_keywords || []).join(';')),
        ];

        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `universal_products_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: 'সফল', description: `${products?.length || 0}টি প্রোডাক্ট এক্সপোর্ট হয়েছে` });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({ title: 'Error', description: 'এক্সপোর্ট করতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const parseCSV = (content: string): Record<string, string>[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header.trim()] = (values[index] || '').trim();
      });
      rows.push(row);
    }

    return rows;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const rows = parseCSV(content);

      if (rows.length === 0) {
        toast({ title: 'Error', description: 'CSV ফাইলে কোন ডাটা নেই', variant: 'destructive' });
        return;
      }

      const importRows: ImportRow[] = rows.map((data, index) => {
        const errors: string[] = [];

        // Validate product_type
        if (!data.product_type?.trim()) {
          errors.push('প্রোডাক্ট টাইপ আবশ্যক');
        } else if (!VALID_PRODUCT_TYPES.includes(data.product_type.toLowerCase())) {
          errors.push(`অবৈধ প্রোডাক্ট টাইপ "${data.product_type}" (lifestyle/stationery/food)`);
        }

        if (!data.name_bn?.trim()) {
          errors.push('নাম (বাংলা) আবশ্যক');
        }
        if (!data.name_en?.trim()) {
          errors.push('Name (English) আবশ্যক');
        }
        if (!data.price || isNaN(Number(data.price)) || Number(data.price) <= 0) {
          errors.push('সঠিক মূল্য প্রয়োজন');
        }

        // Check if category exists for the product type
        if (data.category_name?.trim() && data.product_type?.trim()) {
          const productType = data.product_type.toLowerCase() as ProductType;
          const cat = categories.find(
            c => c.product_type === productType && 
            (c.name_bn.toLowerCase() === data.category_name.toLowerCase() ||
             c.name_en.toLowerCase() === data.category_name.toLowerCase())
          );
          if (!cat) {
            errors.push(`ক্যাটাগরি "${data.category_name}" পাওয়া যায়নি (${productType} টাইপে)`);
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
        const productType = row.data.product_type.toLowerCase() as ProductType;
        const category = categories.find(
          c => c.product_type === productType &&
          (c.name_bn.toLowerCase() === row.data.category_name?.toLowerCase() ||
           c.name_en.toLowerCase() === row.data.category_name?.toLowerCase())
        );

        const productData = {
          product_type: productType,
          name_bn: row.data.name_bn,
          name_en: row.data.name_en,
          slug: row.data.slug || generateSlug(row.data.name_en),
          sku: row.data.sku || null,
          category_id: category?.id || null,
          price: Number(row.data.price),
          original_price: row.data.original_price ? Number(row.data.original_price) : null,
          discount_percent: row.data.discount_percent ? Number(row.data.discount_percent) : 0,
          stock_quantity: row.data.stock_quantity ? Number(row.data.stock_quantity) : 0,
          is_active: row.data.is_active?.toUpperCase() !== 'FALSE',
          is_featured: row.data.is_featured?.toUpperCase() === 'TRUE',
          brand: row.data.brand || null,
          manufacturer: row.data.manufacturer || null,
          weight: row.data.weight || null,
          dimensions: row.data.dimensions || null,
          ingredients: row.data.ingredients || null,
          warranty: row.data.warranty || null,
          delivery_time: row.data.delivery_time || null,
          return_policy: row.data.return_policy || null,
          short_description_bn: row.data.short_description_bn || null,
          short_description_en: row.data.short_description_en || null,
          long_description_bn: row.data.long_description_bn || null,
          long_description_en: row.data.long_description_en || null,
          video_url: row.data.video_url || null,
          meta_title: row.data.meta_title || null,
          meta_description: row.data.meta_description || null,
          meta_keywords: row.data.meta_keywords ? row.data.meta_keywords.split(';').map(t => t.trim()).filter(Boolean) : null,
          images: [],
        };

        const { error } = await supabase.from('universal_products').insert([productData]);

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
    const csvContent = CSV_HEADERS.join(',') + '\n' +
      'lifestyle,উদাহরণ প্রোডাক্ট,Example Product,example-product,SKU001,ক্যাটাগরির নাম,500,600,17,100,TRUE,FALSE,ব্র্যান্ড,প্রস্তুতকারক,১কেজি,১০x১০x১০,উপাদান,১ বছর,৩-৫ দিন,৭ দিনে ফেরত,সংক্ষিপ্ত বিবরণ বাংলা,Short description English,বিস্তারিত বিবরণ বাংলা,Long description English,https://youtube.com/example,SEO Title,SEO Description,keyword1;keyword2';

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'universal_products_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: 'সফল', description: 'টেমপ্লেট ডাউনলোড হয়েছে' });
  };

  const getProductTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      lifestyle: 'লাইফস্টাইল',
      stationery: 'স্টেশনারী',
      food: 'ফুড',
    };
    return labels[type.toLowerCase()] || type;
  };

  const validCount = importRows.filter(r => r.status === 'valid').length;
  const errorCountDisplay = importRows.filter(r => r.status === 'error').length;
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
          accept=".csv"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>ইউনিভার্সাল প্রোডাক্ট ইম্পোর্ট প্রিভিউ</DialogTitle>
          </DialogHeader>

          <div className="flex gap-4 mb-4">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              বৈধ: {validCount}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <XCircle className="h-3 w-3 text-destructive" />
              ত্রুটি: {errorCountDisplay}
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
                  <TableHead>টাইপ</TableHead>
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
                    <TableCell>
                      <Badge variant="secondary">{getProductTypeLabel(row.data.product_type || '')}</Badge>
                    </TableCell>
                    <TableCell>{row.data.name_bn}</TableCell>
                    <TableCell>{row.data.name_en}</TableCell>
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
            <Button onClick={handleImport} disabled={importing || validCount === 0}>
              {importing ? 'ইম্পোর্ট হচ্ছে...' : `${validCount}টি প্রোডাক্ট ইম্পোর্ট করুন`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
