import { Link } from "react-router-dom";
import { Facebook, Youtube, Instagram, Phone, Mail, MapPin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-1 mb-4">
              <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
                <circle cx="20" cy="20" r="18" className="fill-primary" />
                <path
                  d="M12 28V14l8 7-8 7zm8-7l8-7v14l-8-7z"
                  className="fill-primary-foreground"
                />
              </svg>
              <span className="text-2xl font-bold text-primary">WafiLife</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              বাংলাদেশের সবচেয়ে বড় অনলাইন বই ও লাইফস্টাইল শপ। আমরা সেরা মানের পণ্য সরবরাহ করি।
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Youtube className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">দ্রুত লিংক</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  আমাদের সম্পর্কে
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  যোগাযোগ করুন
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  সাধারণ জিজ্ঞাসা
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  শর্তাবলী
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  গোপনীয়তা নীতি
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-bold text-lg mb-4">বিভাগসমূহ</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/shop?category=islamic" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  ইসলামি বই
                </Link>
              </li>
              <li>
                <Link to="/shop?category=academic" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  একাডেমিক বই
                </Link>
              </li>
              <li>
                <Link to="/shop?category=children" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  শিশু কিশোরদের বই
                </Link>
              </li>
              <li>
                <Link to="/shop?category=lifestyle" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  লাইফস্টাইল
                </Link>
              </li>
              <li>
                <Link to="/shop?category=stationery" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  স্টেশনারি
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4">যোগাযোগ</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-5 h-5 shrink-0 text-primary" />
                <span>৬০/এ, পুরানা পল্টন, ঢাকা-১০০০, বাংলাদেশ</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-5 h-5 shrink-0 text-primary" />
                <span>+৮৮০ ১৭০০-০০০০০০</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-5 h-5 shrink-0 text-primary" />
                <span>info@wafilife.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © ২০২৫ WafiLife. সর্বস্বত্ব সংরক্ষিত।
            </p>
            <div className="flex items-center gap-4">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg"
                alt="Visa"
                className="h-6 opacity-60"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                alt="Mastercard"
                className="h-6 opacity-60"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/6/6a/Bkash_Logo.png"
                alt="bKash"
                className="h-6 opacity-60"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
