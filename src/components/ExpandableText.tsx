import { useState } from 'react';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export const ExpandableText = ({ text, maxLength = 150, className = '' }: ExpandableTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const shouldTruncate = text.length > maxLength;
  const displayText = isExpanded || !shouldTruncate 
    ? text 
    : text.slice(0, maxLength) + '...';

  return (
    <div className={className}>
      <p className="leading-relaxed">
        {displayText}
        {shouldTruncate && (
          <>
            {' '}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              {isExpanded ? 'কম দেখুন' : 'আরো পড়ুন'}
            </button>
          </>
        )}
      </p>
    </div>
  );
};
