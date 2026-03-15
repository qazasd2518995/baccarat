import { useState, useEffect, useRef, useMemo } from 'react';
import { Volume2 } from 'lucide-react';
import { noticeApi } from '../../services/api';

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  isPinned: boolean;
  createdAt: string;
}

const SCROLL_SPEED = 60; // px per second

export default function NoticeMarquee() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [animStyle, setAnimStyle] = useState<React.CSSProperties>({});
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const styleElRef = useRef<HTMLStyleElement | null>(null);
  const animCountRef = useRef(0);

  useEffect(() => {
    fetchNotices();
    const interval = setInterval(fetchNotices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotices = async () => {
    try {
      const { data } = await noticeApi.getPublicNotices('game_marquee');
      setNotices(data || []);
    } catch (error) {
      console.error('Failed to fetch marquee notices:', error);
    } finally {
      setLoading(false);
    }
  };

  const marqueeText = useMemo(() => {
    return notices
      .map((n) => `${n.type === 'urgent' ? '[緊急] ' : n.type === 'warning' ? '[警告] ' : ''}${n.title}：${n.content}`)
      .join('　　　');
  }, [notices]);

  useEffect(() => {
    if (!marqueeText) return;

    const raf = requestAnimationFrame(() => {
      const textEl = textRef.current;
      const containerEl = containerRef.current;
      if (!textEl || !containerEl) return;

      const textWidth = textEl.offsetWidth;
      const containerWidth = containerEl.offsetWidth;
      const gap = containerWidth;
      const scrollDistance = textWidth + gap;
      const duration = scrollDistance / SCROLL_SPEED;

      // Remove previous injected style
      if (styleElRef.current) {
        styleElRef.current.remove();
      }

      animCountRef.current += 1;
      const animName = `noticeMarquee${animCountRef.current}`;

      const styleEl = document.createElement('style');
      styleEl.textContent = `@keyframes ${animName}{0%{transform:translateX(0)}100%{transform:translateX(-${scrollDistance}px)}}`;
      document.head.appendChild(styleEl);
      styleElRef.current = styleEl;

      setAnimStyle({
        display: 'inline-flex',
        gap: `${gap}px`,
        animation: `${animName} ${duration}s linear infinite`,
        willChange: 'transform',
      });
    });

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [marqueeText]);

  // Cleanup style element on unmount
  useEffect(() => {
    return () => {
      if (styleElRef.current) {
        styleElRef.current.remove();
      }
    };
  }, []);

  if (loading || notices.length === 0) {
    return null;
  }

  return (
    <div className="w-full h-8 bg-gradient-to-r from-[#1a1f2e] via-[#252b3b] to-[#1a1f2e] border-b border-amber-500/30 flex items-center overflow-hidden z-40 relative">
      <div className="flex items-center justify-center w-10 h-full bg-amber-500/20 shrink-0">
        <Volume2 className="w-4 h-4 text-amber-400" />
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
      >
        <div
          className="whitespace-nowrap text-sm text-amber-300/90"
          style={animStyle}
        >
          <span ref={textRef} className="inline-block">{marqueeText}</span>
          <span className="inline-block">{marqueeText}</span>
        </div>
      </div>
    </div>
  );
}
