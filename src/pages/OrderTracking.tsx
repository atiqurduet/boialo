import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Phone, 
  Search,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  XCircle,
  PackageCheck,
  Home
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Order {
  id: string;
  order_number: string;
  status: string;
  full_name: string;
  phone: string;
  address: string;
  delivery_area: string;
  subtotal: number;
  delivery_charge: number;
  total: number;
  payment_method: string;
  courier_provider: string | null;
  tracking_number: string | null;
  courier_status: string | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_title: string;
  product_image: string | null;
  price: number;
  quantity: number;
}

const statusSteps = [
  { key: 'pending', label: 'অর্ডার পেন্ডিং', icon: Clock },
  { key: 'confirmed', label: 'অর্ডার নিশ্চিত', icon: PackageCheck },
  { key: 'processing', label: 'প্রস্তুত হচ্ছে', icon: Package },
  { key: 'shipped', label: 'শিপ করা হয়েছে', icon: Truck },
  { key: 'delivered', label: 'ডেলিভারি সম্পন্ন', icon: CheckCircle },
];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  processing: 'bg-purple-100 text-purple-800 border-purple-200',
  shipped: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const courierLinks: Record<string, string> = {
  pathao: 'https://merchant.pathao.com/tracking/',
  steadfast: 'https://steadfast.com.bd/tracking/',
  redx: 'https://redx.com.bd/track/',
  paperfly: 'https://go.paperfly.com.bd/tracking/',
};

const OrderTracking = () => {
  const { orderNumber } = useParams<{ orderNumber?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState(orderNumber || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRealtime, setIsRealtime] = useState(false);

  const fetchOrder = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      let queryBuilder = supabase
        .from('orders')
        .select('*')
        .eq('order_number', query.trim().toUpperCase());

      // If user is logged in, also check user_id for their orders
      if (user) {
        queryBuilder = supabase
          .from('orders')
          .select('*')
          .or(`order_number.eq.${query.trim().toUpperCase()},and(user_id.eq.${user.id},order_number.ilike.%${query.trim()}%)`);
      }

      const { data, error } = await queryBuilder.single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: "অর্ডার পাওয়া যায়নি",
            description: "এই অর্ডার নম্বর দিয়ে কোন অর্ডার খুঁজে পাওয়া যায়নি।",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        setOrder(null);
        return;
      }

      setOrder(data);
      
      // Fetch order items
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', data.id);
      
      setOrderItems(items || []);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast({
        title: "ত্রুটি",
        description: "অর্ডার লোড করতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (orderNumber) {
      fetchOrder(orderNumber);
    }
  }, [orderNumber, user]);

  // Real-time subscription
  useEffect(() => {
    if (!order) return;

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          console.log('Order updated:', payload);
          setOrder(payload.new as Order);
          setIsRealtime(true);
          
          toast({
            title: "অর্ডার আপডেট",
            description: "আপনার অর্ডারের স্ট্যাটাস আপডেট হয়েছে!",
          });
          
          // Reset realtime indicator after 3 seconds
          setTimeout(() => setIsRealtime(false), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/track/${searchQuery.trim().toUpperCase()}`);
      fetchOrder(searchQuery);
    }
  };

  const getCurrentStepIndex = () => {
    if (!order) return -1;
    if (order.status === 'cancelled') return -1;
    return statusSteps.findIndex(step => step.key === order.status);
  };

  const getStatusBadge = (status: string) => {
    const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';
    const labels: Record<string, string> = {
      pending: 'পেন্ডিং',
      confirmed: 'নিশ্চিত',
      processing: 'প্রস্তুত হচ্ছে',
      shipped: 'শিপ করা হয়েছে',
      delivered: 'ডেলিভারি সম্পন্ন',
      cancelled: 'বাতিল',
    };
    return (
      <Badge className={`${colorClass} border`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getCourierTrackingUrl = () => {
    if (!order?.courier_provider || !order?.tracking_number) return null;
    const baseUrl = courierLinks[order.courier_provider.toLowerCase()];
    if (!baseUrl) return null;
    return `${baseUrl}${order.tracking_number}`;
  };

  const currentStep = getCurrentStepIndex();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          পেছনে যান
        </Button>

        <div className="max-w-4xl mx-auto">
          {/* Search Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                অর্ডার ট্র্যাক করুন
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-3">
                <Input
                  type="text"
                  placeholder="অর্ডার নম্বর লিখুন (যেমন: ORD-ABC123)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">ট্র্যাক করুন</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Order Details */}
          {order && (
            <div className="space-y-6">
              {/* Status Header */}
              <Card className={`${isRealtime ? 'ring-2 ring-primary ring-offset-2 transition-all' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-xl font-bold">অর্ডার #{order.order_number}</h2>
                        {isRealtime && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 animate-pulse">
                            Live
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        অর্ডার করা হয়েছে: {new Date(order.created_at).toLocaleDateString('bn-BD', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(order.status)}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fetchOrder(order.order_number)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Timeline */}
              {order.status !== 'cancelled' ? (
                <Card>
                  <CardHeader>
                    <CardTitle>অর্ডার স্ট্যাটাস</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      {/* Progress Line */}
                      <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-muted" />
                      <div 
                        className="absolute left-6 top-6 w-0.5 bg-primary transition-all duration-500"
                        style={{ 
                          height: `${Math.max(0, (currentStep / (statusSteps.length - 1)) * 100)}%`,
                          maxHeight: 'calc(100% - 48px)'
                        }}
                      />
                      
                      {/* Steps */}
                      <div className="space-y-8">
                        {statusSteps.map((step, index) => {
                          const isCompleted = index <= currentStep;
                          const isCurrent = index === currentStep;
                          const Icon = step.icon;
                          
                          return (
                            <div key={step.key} className="relative flex items-start gap-4">
                              <div 
                                className={`
                                  relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all
                                  ${isCompleted 
                                    ? 'bg-primary border-primary text-primary-foreground' 
                                    : 'bg-background border-muted text-muted-foreground'
                                  }
                                  ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                                `}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 pt-2">
                                <h4 className={`font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {step.label}
                                </h4>
                                {step.key === 'shipped' && order.shipped_at && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {new Date(order.shipped_at).toLocaleDateString('bn-BD', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                )}
                                {step.key === 'delivered' && order.delivered_at && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {new Date(order.delivered_at).toLocaleDateString('bn-BD', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 text-red-700">
                      <XCircle className="h-8 w-8" />
                      <div>
                        <h3 className="font-bold text-lg">অর্ডার বাতিল করা হয়েছে</h3>
                        <p className="text-sm">এই অর্ডারটি বাতিল করা হয়েছে।</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Courier Tracking */}
              {order.tracking_number && order.courier_provider && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      কুরিয়ার ট্র্যাকিং
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">কুরিয়ার</p>
                        <p className="font-medium capitalize">{order.courier_provider}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">ট্র্যাকিং নম্বর</p>
                        <p className="font-mono font-medium">{order.tracking_number}</p>
                      </div>
                      {order.courier_status && (
                        <div>
                          <p className="text-sm text-muted-foreground">কুরিয়ার স্ট্যাটাস</p>
                          <p className="font-medium">{order.courier_status}</p>
                        </div>
                      )}
                      {getCourierTrackingUrl() && (
                        <Button asChild>
                          <a 
                            href={getCourierTrackingUrl()!} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            কুরিয়ার সাইটে ট্র্যাক করুন
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Delivery Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      ডেলিভারি তথ্য
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">নাম</p>
                      <p className="font-medium">{order.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ফোন</p>
                      <p className="font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {order.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ঠিকানা</p>
                      <p className="font-medium">{order.address}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">এলাকা</p>
                      <p className="font-medium">{order.delivery_area}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      অর্ডার সামারি
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {orderItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          {item.product_image && (
                            <img 
                              src={item.product_image} 
                              alt={item.product_title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.product_title}</p>
                            <p className="text-sm text-muted-foreground">
                              ৳{item.price} × {item.quantity}
                            </p>
                          </div>
                          <p className="font-medium">৳{item.price * item.quantity}</p>
                        </div>
                      ))}
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">সাবটোটাল</span>
                          <span>৳{order.subtotal}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">ডেলিভারি চার্জ</span>
                          <span>৳{order.delivery_charge}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>মোট</span>
                          <span className="text-primary">৳{order.total}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="outline" asChild>
                  <Link to="/orders">
                    <Package className="h-4 w-4 mr-2" />
                    সব অর্ডার দেখুন
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/">
                    <Home className="h-4 w-4 mr-2" />
                    হোম পেজে যান
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!order && !loading && !orderNumber && (
            <Card>
              <CardContent className="py-16 text-center">
                <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">অর্ডার ট্র্যাক করুন</h3>
                <p className="text-muted-foreground mb-6">
                  আপনার অর্ডার নম্বর দিয়ে রিয়েল-টাইম স্ট্যাটাস দেখুন
                </p>
                {user && (
                  <Button asChild>
                    <Link to="/orders">আমার অর্ডার দেখুন</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default OrderTracking;
