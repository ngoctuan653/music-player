import React, { useRef, useState, useEffect } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
  containerClassName?: string;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  className = '',
  containerClassName = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const cWidth = containerRef.current.clientWidth;
        const tWidth = textRef.current.scrollWidth;
        const diff = tWidth - cWidth;
        setOverflow(diff > 8 ? diff + 16 : 0);
      }
    };

    checkOverflow();

    // Recheck on window resize
    const ro = new ResizeObserver(checkOverflow);
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    return () => ro.disconnect();
  }, [text]);

  const duration = Math.max(7, Math.round(overflow / 22));

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden relative w-full ${containerClassName}`}
      style={{
        maskImage:
          overflow > 0
            ? 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)'
            : 'none',
        WebkitMaskImage:
          overflow > 0
            ? 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)'
            : 'none',
      }}
      title={text}
    >
      <div
        className={overflow > 0 ? 'inline-block whitespace-nowrap' : 'text-center'}
        style={
          overflow > 0
            ? {
                animation: `marquee-bounce-slide ${duration}s ease-in-out infinite`,
                ['--marquee-distance' as any]: `${overflow}px`,
              }
            : undefined
        }
      >
        <span ref={textRef} className={`inline-block ${className}`}>
          {text}
        </span>
      </div>
    </div>
  );
};
