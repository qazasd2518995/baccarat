import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio } from 'lucide-react';

// Quick chat messages for casino games
export const QUICK_MESSAGES = [
  { id: 'player', text: '閒！', color: '#3b82f6' },
  { id: 'banker', text: '莊！', color: '#ef4444' },
  { id: 'no_pass', text: '沒過', color: '#f59e0b' },
  { id: 'collected', text: '收了', color: '#22c55e' },
  { id: 'all_in', text: '歐硬！', color: '#a855f7' },
  { id: 'good_luck', text: '祝大家發財', color: '#fbbf24' },
  { id: 'too_easy', text: '太簡單了', color: '#06b6d4' },
  { id: 'too_weak', text: '太菜了', color: '#f97316' },
];

interface MarqueeMessage {
  id: number;
  text: string;
  color: string;
  username: string;
}

let messageIdCounter = 0;

interface MarqueeChatProps {
  /** Messages from other players via socket */
  externalMessages?: MarqueeMessage[];
  /** Current username */
  username?: string;
  /** Callback when user sends a quick message */
  onSendMessage?: (text: string) => void;
  /** Show quick message buttons */
  showButtons?: boolean;
}

// Single marquee message that flies across the TOP of screen
const MarqueeItem = memo(function MarqueeItem({
  message,
  onComplete
}: {
  message: MarqueeMessage;
  onComplete: () => void;
}) {
  return (
    <motion.div
      initial={{ x: '100vw', opacity: 0 }}
      animate={{ x: '-100%', opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        x: { duration: 10, ease: 'linear' },
        opacity: { duration: 0.3 }
      }}
      onAnimationComplete={onComplete}
      className="whitespace-nowrap pointer-events-none"
    >
      <div
        className="flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-sm"
        style={{
          background: `linear-gradient(135deg, ${message.color}50, ${message.color}30)`,
          border: `1px solid ${message.color}60`,
          boxShadow: `0 2px 10px ${message.color}30`
        }}
      >
        <span className="text-white/80 text-[10px] sm:text-xs font-medium">{message.username}</span>
        <span
          className="text-xs sm:text-sm font-bold"
          style={{ color: message.color, textShadow: `0 0 10px ${message.color}80` }}
        >
          {message.text}
        </span>
      </div>
    </motion.div>
  );
});

// Quick message button
const QuickButton = memo(function QuickButton({
  text,
  color,
  onClick,
  disabled
}: {
  text: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className="px-2 py-1 rounded-md text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: `linear-gradient(135deg, ${color}30, ${color}10)`,
        border: `1px solid ${color}50`,
        color: color,
        textShadow: `0 0 8px ${color}50`
      }}
    >
      {text}
    </motion.button>
  );
});

// Hook for managing marquee chat state
export function useMarqueeChat(username: string = '玩家', onSendMessage?: (text: string) => void) {
  const [messages, setMessages] = useState<MarqueeMessage[]>([]);
  const [cooldown, setCooldown] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendMessage = (text: string, color: string) => {
    if (cooldown) return;

    const newMessage: MarqueeMessage = {
      id: ++messageIdCounter,
      text,
      color,
      username,
    };

    setMessages(prev => [...prev, newMessage]);
    onSendMessage?.(text);

    setCooldown(true);
    cooldownRef.current = setTimeout(() => {
      setCooldown(false);
    }, 2000);

    setIsPanelOpen(false);
  };

  const removeMessage = (id: number) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const addExternalMessages = (newMessages: MarqueeMessage[]) => {
    if (newMessages.length > 0) {
      setMessages(prev => [...prev, ...newMessages]);
    }
  };

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  return {
    messages,
    cooldown,
    isPanelOpen,
    setIsPanelOpen,
    sendMessage,
    removeMessage,
    addExternalMessages,
  };
}

// Desktop quick buttons row (to be placed inline in betting area)
export const MarqueeQuickButtons = memo(function MarqueeQuickButtons({
  sendMessage,
  cooldown,
}: {
  sendMessage: (text: string, color: string) => void;
  cooldown: boolean;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {QUICK_MESSAGES.map(msg => (
        <QuickButton
          key={msg.id}
          text={msg.text}
          color={msg.color}
          onClick={() => sendMessage(msg.text, msg.color)}
          disabled={cooldown}
        />
      ))}
    </div>
  );
});

export default function MarqueeChat({
  externalMessages = [],
  username = '玩家',
  onSendMessage,
  showButtons = true
}: MarqueeChatProps) {
  const {
    messages,
    cooldown,
    isPanelOpen,
    setIsPanelOpen,
    sendMessage,
    removeMessage,
    addExternalMessages,
  } = useMarqueeChat(username, onSendMessage);

  // Add external messages to display
  useEffect(() => {
    addExternalMessages(externalMessages);
  }, [externalMessages, addExternalMessages]);

  return (
    <>
      {/* Marquee display area - TOP of screen only */}
      <div className="fixed top-0 left-0 right-0 h-10 overflow-hidden pointer-events-none z-50">
        <div className="relative w-full h-full flex items-center">
          <AnimatePresence>
            {messages.map(msg => (
              <MarqueeItem
                key={msg.id}
                message={msg}
                onComplete={() => removeMessage(msg.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {showButtons && (
        <>
          {/* Mobile: Broadcast button (shows below hamburger menu on right side) */}
          <div className="lg:hidden fixed top-14 right-2 z-50">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isPanelOpen
                  ? 'bg-[#d4af37] text-black'
                  : 'bg-black/60 text-[#d4af37] border border-[#d4af37]/50'
              }`}
            >
              <Radio className="w-3 h-3" />
              廣播
            </motion.button>

            {/* Mobile quick message panel */}
            <AnimatePresence>
              {isPanelOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-10 right-0 bg-black/90 backdrop-blur-md rounded-lg p-2 border border-[#d4af37]/30 shadow-xl"
                >
                  <div className="grid grid-cols-2 gap-1.5 w-[180px]">
                    {QUICK_MESSAGES.map(msg => (
                      <QuickButton
                        key={msg.id}
                        text={msg.text}
                        color={msg.color}
                        onClick={() => sendMessage(msg.text, msg.color)}
                        disabled={cooldown}
                      />
                    ))}
                  </div>
                  {cooldown && (
                    <div className="text-[10px] text-gray-400 text-center mt-1">冷卻中...</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </>
  );
}

// Export a simpler version for just displaying messages (no buttons)
export const MarqueeDisplay = memo(function MarqueeDisplay({
  messages
}: {
  messages: MarqueeMessage[]
}) {
  const [displayMessages, setDisplayMessages] = useState<MarqueeMessage[]>([]);

  useEffect(() => {
    if (messages.length > 0) {
      setDisplayMessages(prev => [...prev, ...messages]);
    }
  }, [messages]);

  const removeMessage = (id: number) => {
    setDisplayMessages(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">
      <AnimatePresence>
        {displayMessages.map(msg => (
          <MarqueeItem
            key={msg.id}
            message={msg}
            onComplete={() => removeMessage(msg.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});
