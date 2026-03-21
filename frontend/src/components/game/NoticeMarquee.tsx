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

const SCROLL_SPEED = 50; // px per second

export default function NoticeMarquee() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(30);
  const trackRef = useRef<HTMLDivElement>(null);
  const measuredRef = useRef(false);

  useEffect(() => {
    fetchNotices();
    const interval = setInterval(fetchNotices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotices = async () => {
    try {
      const { data } = await noticeApi.getPublicNotices('game_marquee');
      // Only update if content actually changed (prevent animation restart)
      setNotices(prev => {
        const newText = (data || []).map((n: Notice) => n.content).join();
        const oldText = prev.map(n => n.content).join();
        return newText === oldText ? prev : (data || []);
      });
    } catch (error) {
      console.error('Failed to fetch marquee notices:', error);
    } finally {
      setLoading(false);
    }
  };

  const marqueeText = useMemo(() => {
    return notices
      .map((n) => `${n.type === 'urgent' ? '[緊急] ' : n.type === 'warning' ? '[警告] ' : ''}${n.title}：${n.content}`)
      .join('　　　　　');
  }, [notices]);

  // Measure track width once to calculate proper duration
  useEffect(() => {
    if (!marqueeText || measuredRef.current) return;
    requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track) return;
      // Track contains two copies, so half = one copy's width
      const halfWidth = track.scrollWidth / 2;
      const calc = Math.max(10, halfWidth / SCROLL_SPEED);
      setDuration(calc);
      measuredRef.current = true;
    });
  }, [marqueeText]);

  // Reset measurement flag when text changes
  useEffect(() => {
    measuredRef.current = false;
  }, [marqueeText]);

  if (loading || notices.length === 0) {
    return null;
  }

  return (
    <div className="w-full h-8 bg-gradient-to-r from-[#1a1f2e] via-[#252b3b] to-[#1a1f2e] border-b border-amber-500/30 flex items-center overflow-hidden z-40 relative">
      <div className="flex items-center justify-center w-10 h-full bg-amber-500/20 shrink-0">
        <Volume2 className="w-4 h-4 text-amber-400" />
      </div>

      <div className="flex-1 overflow-hidden relative h-full">
        <div
          ref={trackRef}
          className="whitespace-nowrap text-sm text-amber-300/90 absolute top-0 left-0 h-full flex items-center"
          style={{
            animation: `noticeMarqueeScroll ${duration}s linear infinite`,
            willChange: 'transform',
          }}
        >
          <span className="inline-block">{marqueeText}</span>
          <span className="inline-block" style={{ paddingLeft: '5em' }}>{marqueeText}</span>
        </div>
      </div>

      <style>{`
        @keyframes noticeMarqueeScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
