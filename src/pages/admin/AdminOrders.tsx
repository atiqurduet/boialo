import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Eye, FileText, Truck, Loader2, Printer, X } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string;
  delivery_area: string;
  subtotal: number;
  delivery_charge: number;
  total: number;
  status: string;
  payment_method: string;
  transaction_id: string | null;
  notes: string | null;
  tracking_number: string | null;
  courier_provider: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_title: string;
  product_image: string | null;
  price: number;
  quantity: number;
}

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkPrinting, setBulkPrinting] = useState<'invoice' | 'delivery-slip' | null>(null);
  const { toast } = useToast();

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const clearSelection = () => {
    setSelectedOrderIds(new Set());
  };

  const bulkPrint = async (type: 'invoice' | 'delivery-slip') => {
    if (selectedOrderIds.size === 0) return;
    
    setBulkPrinting(type);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Error', description: 'লগইন করুন', variant: 'destructive' });
        return;
      }

      // Generate all documents
      const orderIdsArray = Array.from(selectedOrderIds);
      const htmlParts: string[] = [];
      
      for (const orderId of orderIdsArray) {
        const { data, error } = await supabase.functions.invoke('admin-invoice', {
          body: { orderId, type }
        });
        
        if (error) {
          console.error(`Error generating ${type} for order ${orderId}:`, error);
          continue;
        }
        
        htmlParts.push(data.html);
      }

      if (htmlParts.length === 0) {
        toast({ title: 'Error', description: 'কোন ডকুমেন্ট তৈরি হয়নি', variant: 'destructive' });
        return;
      }

      // Combine all HTML with page breaks
      const combinedHtml = `
        <!DOCTYPE html>
        <html lang="bn">
        <head>
          <meta charset="UTF-8">
          <title>বাল্ক ${type === 'invoice' ? 'ইনভয়েস' : 'ডেলিভারি স্লিপ'}</title>
          <style>
            @media print {
              .page-break { page-break-after: always; }
              .page-break:last-child { page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          ${htmlParts.map((html, index) => {
            // Extract body content from each HTML
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            const bodyContent = bodyMatch ? bodyMatch[1] : html;
            return `<div class="${index < htmlParts.length - 1 ? 'page-break' : ''}">${bodyContent}</div>`;
          }).join('')}
        </body>
        </html>
      `;

      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(combinedHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }

      toast({ 
        title: 'সফল', 
        description: `${htmlParts.length}টি ${type === 'invoice' ? 'ইনভয়েস' : 'ডেলিভারি স্লিপ'} তৈরি হয়েছে` 
      });
    } catch (error: any) {
      console.error('Bulk print error:', error);
      toast({ title: 'Error', description: 'বাল্ক প্রিন্টে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setBulkPrinting(null);
    }
  };

  const generateDocument = async (orderId: string, type: 'invoice' | 'delivery-slip') => {
    setGeneratingDoc(`${orderId}-${type}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Error', description: 'লগইন করুন', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-invoice', {
        body: { orderId, type }
      });

      if (error) throw error;

      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }

      toast({ title: 'সফল', description: type === 'invoice' ? 'ইনভয়েস তৈরি হয়েছে' : 'ডেলিভারি স্লিপ তৈরি হয়েছে' });
    } catch (error: any) {
      console.error('Document generation error:', error);
      toast({ title: 'Error', description: 'ডকুমেন্ট তৈরিতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setGeneratingDoc(null);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({ title: 'Error', description: 'অর্ডার লোড করতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (error) throw error;
      setOrderItems(data || []);
    } catch (error) {
      console.error('Error fetching order items:', error);
    }
  };

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    await fetchOrderItems(order.id);
    setDetailsOpen(true);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const orderToUpdate = orders.find(o => o.id === orderId);
      
      const updateData: Record<string, any> = { status: newStatus };
      
      // Add timestamps for specific statuses
      if (newStatus === 'shipped') {
        updateData.shipped_at = new Date().toISOString();
      } else if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
      
      // Send SMS notification
      if (orderToUpdate) {
        try {
          const { data: smsResult, error: smsError } = await supabase.functions.invoke('order-sms-notify', {
            body: {
              order_id: orderId,
              new_status: newStatus,
              order_number: orderToUpdate.order_number,
              phone: orderToUpdate.phone,
              full_name: orderToUpdate.full_name,
              total: orderToUpdate.total,
              tracking_number: orderToUpdate.tracking_number,
              courier_provider: orderToUpdate.courier_provider,
            }
          });
          
          if (smsError) {
            console.error('SMS notification error:', smsError);
          } else {
            console.log('SMS notification result:', smsResult);
            if (smsResult?.warning) {
              toast({ 
                title: 'স্ট্যাটাস আপডেট হয়েছে', 
                description: 'SMS প্রোভাইডার কনফিগার করা নেই',
              });
            }
          }
        } catch (smsErr) {
          console.error('Failed to send SMS:', smsErr);
        }
      }
      
      toast({ title: 'সফল', description: 'অর্ডার স্ট্যাটাস আপডেট হয়েছে' });
      fetchOrders();
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: 'পেন্ডিং', className: 'bg-yellow-100 text-yellow-800' },
      processing: { label: 'প্রসেসিং', className: 'bg-blue-100 text-blue-800' },
      shipped: { label: 'শিপড', className: 'bg-purple-100 text-purple-800' },
      delivered: { label: 'ডেলিভার্ড', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'বাতিল', className: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.phone.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">অর্ডার</h1>
          <p className="text-muted-foreground">সকল অর্ডার ম্যানেজ করুন</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="অর্ডার নং, নাম বা ফোন দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="স্ট্যাটাস ফিল্টার" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
              <SelectItem value="pending">পেন্ডিং</SelectItem>
              <SelectItem value="processing">প্রসেসিং</SelectItem>
              <SelectItem value="shipped">শিপড</SelectItem>
              <SelectItem value="delivered">ডেলিভার্ড</SelectItem>
              <SelectItem value="cancelled">বাতিল</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions Bar */}
        {selectedOrderIds.size > 0 && (
          <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <span className="font-medium">{selectedOrderIds.size}টি অর্ডার সিলেক্টেড</span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => bulkPrint('invoice')}
                disabled={bulkPrinting !== null}
              >
                {bulkPrinting === 'invoice' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                বাল্ক ইনভয়েস প্রিন্ট
              </Button>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => bulkPrint('delivery-slip')}
                disabled={bulkPrinting !== null}
              >
                {bulkPrinting === 'delivery-slip' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Truck className="h-4 w-4 mr-2" />}
                বাল্ক ডেলিভারি স্লিপ প্রিন্ট
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              <X className="h-4 w-4 mr-1" />
              বাতিল
            </Button>
          </div>
        )}

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">লোড হচ্ছে...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">কোন অর্ডার নেই</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-3 px-4 w-10">
                        <Checkbox 
                          checked={filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium">অর্ডার নং</th>
                      <th className="text-left py-3 px-4 font-medium">গ্রাহক</th>
                      <th className="text-left py-3 px-4 font-medium">মোট</th>
                      <th className="text-left py-3 px-4 font-medium">স্ট্যাটাস</th>
                      <th className="text-left py-3 px-4 font-medium">তারিখ</th>
                      <th className="text-right py-3 px-4 font-medium">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className={`border-b hover:bg-muted/50 ${selectedOrderIds.has(order.id) ? 'bg-primary/5' : ''}`}>
                        <td className="py-3 px-4">
                          <Checkbox 
                            checked={selectedOrderIds.has(order.id)}
                            onCheckedChange={() => toggleOrderSelection(order.id)}
                          />
                        </td>
                        <td className="py-3 px-4 font-mono text-sm">{order.order_number}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium">{order.full_name}</p>
                          <p className="text-sm text-muted-foreground">{order.phone}</p>
                        </td>
                        <td className="py-3 px-4 font-medium">৳{Number(order.total).toLocaleString()}</td>
                        <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('bn-BD')}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleViewOrder(order)} title="বিস্তারিত">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => generateDocument(order.id, 'invoice')}
                            disabled={generatingDoc === `${order.id}-invoice`}
                            title="ইনভয়েস"
                          >
                            {generatingDoc === `${order.id}-invoice` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => generateDocument(order.id, 'delivery-slip')}
                            disabled={generatingDoc === `${order.id}-delivery-slip`}
                            title="ডেলিভারি স্লিপ"
                          >
                            {generatingDoc === `${order.id}-delivery-slip` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>অর্ডার বিস্তারিত - {selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                {/* Print Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generateDocument(selectedOrder.id, 'invoice')}
                    disabled={generatingDoc === `${selectedOrder.id}-invoice`}
                  >
                    {generatingDoc === `${selectedOrder.id}-invoice` ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    ইনভয়েস প্রিন্ট
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generateDocument(selectedOrder.id, 'delivery-slip')}
                    disabled={generatingDoc === `${selectedOrder.id}-delivery-slip`}
                  >
                    {generatingDoc === `${selectedOrder.id}-delivery-slip` ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Truck className="h-4 w-4 mr-2" />}
                    ডেলিভারি স্লিপ প্রিন্ট
                  </Button>
                </div>

                {/* Status Update */}
                <div className="flex items-center gap-4">
                  <Label>স্ট্যাটাস:</Label>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(value) => handleStatusChange(selectedOrder.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">পেন্ডিং</SelectItem>
                      <SelectItem value="processing">প্রসেসিং</SelectItem>
                      <SelectItem value="shipped">শিপড</SelectItem>
                      <SelectItem value="delivered">ডেলিভার্ড</SelectItem>
                      <SelectItem value="cancelled">বাতিল</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">গ্রাহকের নাম</Label>
                    <p className="font-medium">{selectedOrder.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">ফোন</Label>
                    <p className="font-medium">{selectedOrder.phone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">ইমেইল</Label>
                    <p className="font-medium">{selectedOrder.email || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">ডেলিভারি এরিয়া</Label>
                    <p className="font-medium">{selectedOrder.delivery_area}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">ঠিকানা</Label>
                    <p className="font-medium">{selectedOrder.address}</p>
                  </div>
                  {selectedOrder.notes && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">নোট</Label>
                      <p className="font-medium">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div>
                  <Label className="text-muted-foreground mb-2 block">অর্ডার আইটেম</Label>
                  <div className="border rounded-lg divide-y">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3">
                        {item.product_image && (
                          <img
                            src={item.product_image}
                            alt={item.product_title}
                            className="w-12 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{item.product_title}</p>
                          <p className="text-sm text-muted-foreground">
                            ৳{item.price} × {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium">৳{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>সাবটোটাল</span>
                    <span>৳{Number(selectedOrder.subtotal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ডেলিভারি চার্জ</span>
                    <span>৳{Number(selectedOrder.delivery_charge).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>মোট</span>
                    <span>৳{Number(selectedOrder.total).toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span>পেমেন্ট মেথড</span>
                    <span className="font-medium">{selectedOrder.payment_method}</span>
                  </div>
                  {selectedOrder.transaction_id && (
                    <div className="flex justify-between">
                      <span>ট্রানজ্যাকশন আইডি</span>
                      <span className="font-mono text-sm">{selectedOrder.transaction_id}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
