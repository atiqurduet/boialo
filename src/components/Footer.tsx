import { Link } from "react-router-dom";
import { Facebook, Youtube, Instagram, Phone, Mail, MapPin } from "lucide-react";
import { useFooterData } from "@/hooks/useFooterData";

export const Footer = () => {
  const { sections, loading } = useFooterData();

  // Get sections by type
  const linksSections = sections.filter(s => s.section_type === 'links');
  const contactSection = sections.find(s => s.section_type === 'contact');
  const socialSection = sections.find(s => s.section_type === 'social');

  // Parse contact info
  const contactInfo = contactSection?.content || {
    address: "৬০/এ, পুরানা পল্টন, ঢাকা-১০০০, বাংলাদেশ",
    phone: "+৮৮০ ১৭০০-০০০০০০",
    email: "info@wafilife.com"
  };

  // Parse social links
  const socialLinks = socialSection?.content || {
    facebook: "#",
    youtube: "#",
    instagram: "#"
  };

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
                href={socialLinks.facebook || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href={socialLinks.youtube || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Youtube className="w-5 h-5" />
              </a>
              <a
                href={socialLinks.instagram || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Dynamic Link Sections */}
          {loading ? (
            <>
              <div className="animate-pulse">
                <div className="h-6 w-24 bg-muted rounded mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-4 w-32 bg-muted rounded" />
                  ))}
                </div>
              </div>
              <div className="animate-pulse">
                <div className="h-6 w-24 bg-muted rounded mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-4 w-32 bg-muted rounded" />
                  ))}
                </div>
              </div>
            </>
          ) : (
            linksSections.slice(0, 2).map((section) => (
              <div key={section.id}>
                <h3 className="font-bold text-lg mb-4">{section.title_bn}</h3>
                <ul className="space-y-2">
                  {section.links?.map((link) => (
                    <li key={link.id}>
                      <Link 
                        to={link.url} 
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {link.title_bn}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4">{contactSection?.title_bn || "যোগাযোগ"}</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-5 h-5 shrink-0 text-primary" />
                <span>{contactInfo.address}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-5 h-5 shrink-0 text-primary" />
                <span>{contactInfo.phone}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-5 h-5 shrink-0 text-primary" />
                <span>{contactInfo.email}</span>
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
