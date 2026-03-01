import { useState, useEffect, useRef } from 'react';
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

export default function NoticeMarquee() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotices();
    // Auto-refresh every 5 minutes
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

  if (loading || notices.length === 0) {
    return null;
  }

  // Combine all notice content into a single marquee string
  const marqueeText = notices
    .map((n) => `${n.type === 'urgent' ? '[緊急] ' : n.type === 'warning' ? '[警告] ' : ''}${n.title}：${n.content}`)
    .join('　　　');

  return (
    <div className="w-full h-8 bg-gradient-to-r from-[#1a1f2e] via-[#252b3b] to-[#1a1f2e] border-b border-amber-500/30 flex items-center overflow-hidden z-40 relative">
      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-full bg-amber-500/20 shrink-0">
        <Volume2 className="w-4 h-4 text-amber-400" />
      </div>

      {/* Marquee Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
      >
        <div className="marquee-content whitespace-nowrap text-sm text-amber-300/90">
          <span className="inline-block">{marqueeText}</span>
          <span className="inline-block ml-32">{marqueeText}</span>
        </div>
      </div>

      <style>{`
        .marquee-content {
          display: inline-block;
          animation: marquee-scroll 60s linear infinite;
        }

        .marquee-content:hover {
          animation-play-state: paused;
        }

        @keyframes marquee-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
