import { Link } from "react-router-dom";
import { Facebook, Youtube, Instagram, Phone, Mail, MapPin, ChevronRight, ArrowUp, Twitter, Linkedin, MessageCircle, Send as SendIcon } from "lucide-react";
import { useFooterData } from "@/hooks/useFooterData";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

const SocialIcon = ({ href, label, children }: { href: string; label: string; children: ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-110"
  >
    {children}
  </a>
);

export const Footer = () => {
  const { sections, loading } = useFooterData();
  const { settings: siteSettings, loading: settingsLoading } = useSiteSettings();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const linksSections = sections.filter(s => s.section_type === 'links');
  const contactSection = sections.find(s => s.section_type === 'contact');
  const socialSection = sections.find(s => s.section_type === 'social');

  const contactInfo = contactSection?.content || {
    address: "৬০/এ, পুরানা পল্টন, ঢাকা-১০০০, বাংলাদেশ",
    phone: "+৮৮০ ১৭০০-০০০০০০",
    email: "info@boialo.com"
  };

  const socialLinks = socialSection?.content || {
    facebook: "#",
    youtube: "#",
    instagram: "#"
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSection = (id: string) => {
    setExpandedSection(prev => prev === id ? null : id);
  };

  return (
    <footer style={{
      backgroundColor: 'hsl(var(--footer-bg, var(--foreground)))',
      color: 'hsl(var(--footer-text, var(--background)))',
    }} className="mt-12 relative">
      {/* Scroll to Top */}
      <button
        onClick={scrollToTop}
        className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10"
        aria-label="উপরে যান"
      >
        <ArrowUp className="w-5 h-5" />
      </button>

      {/* Main Footer Content */}
      <div className="container pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6">
          
          {/* Brand Column */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
              {siteSettings.footer_logo ? (
                <img 
                  src={siteSettings.footer_logo} 
                  alt={siteSettings.site_name} 
                  className="h-10 object-contain transition-transform group-hover:scale-105"
                />
              ) : (
                <svg viewBox="0 0 40 40" className="w-9 h-9 transition-transform group-hover:scale-105" fill="none">
                  <circle cx="20" cy="20" r="18" className="fill-primary" />
                  <path d="M12 28V14l8 7-8 7zm8-7l8-7v14l-8-7z" className="fill-primary-foreground" />
                </svg>
              )}
              <span className="text-xl font-bold text-primary">
                {siteSettings.site_name}
              </span>
            </Link>
            <p className="text-sm opacity-70 mb-5 leading-relaxed max-w-xs">
              {settingsLoading ? 'লোড হচ্ছে...' : siteSettings.footer_description}
            </p>
            
            {/* Social Icons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {socialLinks.facebook && socialLinks.facebook !== '#' && socialLinks.facebook.trim() !== '' && (
                <SocialIcon href={socialLinks.facebook} label="Facebook"><Facebook className="w-4 h-4" /></SocialIcon>
              )}
              {socialLinks.youtube && socialLinks.youtube !== '#' && socialLinks.youtube.trim() !== '' && (
                <SocialIcon href={socialLinks.youtube} label="YouTube"><Youtube className="w-4 h-4" /></SocialIcon>
              )}
              {socialLinks.instagram && socialLinks.instagram !== '#' && socialLinks.instagram.trim() !== '' && (
                <SocialIcon href={socialLinks.instagram} label="Instagram"><Instagram className="w-4 h-4" /></SocialIcon>
              )}
              {socialLinks.twitter && socialLinks.twitter.trim() !== '' && (
                <SocialIcon href={socialLinks.twitter} label="Twitter/X"><Twitter className="w-4 h-4" /></SocialIcon>
              )}
              {socialLinks.linkedin && socialLinks.linkedin.trim() !== '' && (
                <SocialIcon href={socialLinks.linkedin} label="LinkedIn"><Linkedin className="w-4 h-4" /></SocialIcon>
              )}
              {socialLinks.tiktok && socialLinks.tiktok.trim() !== '' && (
                <SocialIcon href={socialLinks.tiktok} label="TikTok">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13v-3.5a6.37 6.37 0 0 0-.88-.07 6.34 6.34 0 0 0 0 12.68 6.34 6.34 0 0 0 6.34-6.34V9.06a8.16 8.16 0 0 0 3.76.92V6.69z"/></svg>
                </SocialIcon>
              )}
              {socialLinks.whatsapp && socialLinks.whatsapp.trim() !== '' && (
                <SocialIcon href={socialLinks.whatsapp} label="WhatsApp"><MessageCircle className="w-4 h-4" /></SocialIcon>
              )}
              {socialLinks.telegram && socialLinks.telegram.trim() !== '' && (
                <SocialIcon href={socialLinks.telegram} label="Telegram"><SendIcon className="w-4 h-4" /></SocialIcon>
              )}
              {socialLinks.pinterest && socialLinks.pinterest.trim() !== '' && (
                <SocialIcon href={socialLinks.pinterest} label="Pinterest">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.44l1.4-5.96s-.36-.72-.36-1.78c0-1.67.97-2.92 2.17-2.92 1.02 0 1.52.77 1.52 1.7 0 1.03-.66 2.58-.99 4.01-.28 1.2.6 2.17 1.78 2.17 2.13 0 3.77-2.25 3.77-5.49 0-2.87-2.06-4.87-5.01-4.87-3.41 0-5.42 2.56-5.42 5.2 0 1.03.4 2.13.89 2.73.1.12.11.22.08.34l-.33 1.36c-.05.22-.18.27-.4.16-1.5-.7-2.43-2.88-2.43-4.64 0-3.78 2.75-7.25 7.92-7.25 4.16 0 7.4 2.97 7.4 6.93 0 4.14-2.6 7.46-6.22 7.46-1.22 0-2.36-.63-2.75-1.38l-.75 2.85c-.27 1.04-1 2.35-1.49 3.15A12 12 0 1 0 12 0z"/></svg>
                </SocialIcon>
              )}
            </div>
          </div>

          {/* Dynamic Link Sections - Desktop: inline columns, Mobile: accordion */}
          {loading ? (
            <div className="lg:col-span-4 grid grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="h-5 w-20 bg-white/10 rounded" />
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} className="h-4 w-28 bg-white/5 rounded" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-6">
              {linksSections.slice(0, 2).map((section) => (
                <div key={section.id}>
                  {/* Desktop */}
                  <div className="hidden sm:block">
                    <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 text-primary">
                      {section.title_bn}
                    </h3>
                    <ul className="space-y-2.5">
                      {section.links?.map((link) => (
                        <li key={link.id}>
                          <Link 
                            to={link.url} 
                            className="text-sm opacity-70 hover:opacity-100 hover:text-primary transition-all duration-200 inline-flex items-center gap-1.5 group"
                          >
                            <ChevronRight className="w-3 h-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                            {link.title_bn}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Mobile Accordion */}
                  <div className="sm:hidden border-b border-white/10">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between py-3.5 text-sm font-semibold"
                    >
                      {section.title_bn}
                      <ChevronRight className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        expandedSection === section.id && "rotate-90"
                      )} />
                    </button>
                    <div className={cn(
                      "overflow-hidden transition-all duration-300",
                      expandedSection === section.id ? "max-h-60 pb-3" : "max-h-0"
                    )}>
                      <ul className="space-y-2 pl-2">
                        {section.links?.map((link) => (
                          <li key={link.id}>
                            <Link 
                              to={link.url} 
                              className="text-sm opacity-70 hover:opacity-100 hover:text-primary transition-colors block py-1"
                            >
                              {link.title_bn}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contact Column */}
          <div className="lg:col-span-4">
            {/* Desktop */}
            <div className="hidden sm:block">
              <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 text-primary">
                {contactSection?.title_bn || "যোগাযোগ"}
              </h3>
              <ul className="space-y-3.5">
                <li className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <span className="opacity-70 leading-relaxed">{contactInfo.address}</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <a href={`tel:${contactInfo.phone}`} className="opacity-70 hover:opacity-100 hover:text-primary transition-colors">
                    {contactInfo.phone}
                  </a>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <a href={`mailto:${contactInfo.email}`} className="opacity-70 hover:opacity-100 hover:text-primary transition-colors">
                    {contactInfo.email}
                  </a>
                </li>
              </ul>
            </div>
            
            {/* Mobile */}
            <div className="sm:hidden border-b border-white/10">
              <button
                onClick={() => toggleSection('contact')}
                className="w-full flex items-center justify-between py-3.5 text-sm font-semibold"
              >
                {contactSection?.title_bn || "যোগাযোগ"}
                <ChevronRight className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  expandedSection === 'contact' && "rotate-90"
                )} />
              </button>
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                expandedSection === 'contact' ? "max-h-60 pb-3" : "max-h-0"
              )}>
                <ul className="space-y-3 pl-2">
                  <li className="flex items-start gap-2.5 text-sm opacity-70">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{contactInfo.address}</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm opacity-70">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    <span>{contactInfo.phone}</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm opacity-70">
                    <Mail className="w-4 h-4 text-primary shrink-0" />
                    <span>{contactInfo.email}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs opacity-60 text-center sm:text-left">
              {settingsLoading ? '© 2025 বইআলো' : siteSettings.copyright_text}
            </p>
            <div className="flex items-center gap-3">
              {[
                { src: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg", alt: "Visa" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg", alt: "Mastercard" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/6/6a/Bkash_Logo.png", alt: "bKash" },
              ].map(({ src, alt }) => (
                <img key={alt} src={src} alt={alt} className="h-5 opacity-50 hover:opacity-80 transition-opacity" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
