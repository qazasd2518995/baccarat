import { motion } from 'framer-motion';

interface GameLoadingScreenProps {
  visible: boolean;
}

export default function GameLoadingScreen({ visible }: GameLoadingScreenProps) {
  if (!visible) return null;

  return (
    <motion.div
      key="game-loading"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d1117]"
    >
      {/* Spinner */}
      <div className="relative w-16 h-16 mb-6">
        <div
          className="absolute inset-0 rounded-full border-4 border-[#d4af37]/20"
        />
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#d4af37] animate-spin"
        />
      </div>

      {/* Text */}
      <p className="text-[#d4af37]/80 text-sm tracking-widest animate-pulse">
        正在進入遊戲桌...
      </p>
    </motion.div>
  );
}
