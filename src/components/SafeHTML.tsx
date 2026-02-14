import DOMPurify from 'dompurify';

interface SafeHTMLProps {
  html: string;
  className?: string;
  /** Allow all common HTML tags including iframes, tables etc. Set to false for strict mode. */
  allowRich?: boolean;
}

const STRICT_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span', 'hr', 'sup', 'sub',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel', 'width', 'height'],
  ALLOW_DATA_ATTR: false,
};

const RICH_CONFIG = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

export const SafeHTML = ({ html, className, allowRich = false }: SafeHTMLProps) => {
  if (!html) return null;
  
  const config = allowRich ? { ...STRICT_CONFIG, ...RICH_CONFIG } : STRICT_CONFIG;
  const clean = DOMPurify.sanitize(html, config);
  
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
};
