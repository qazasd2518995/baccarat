import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Volume2, VolumeX, Video, VideoOff, Gift, TrendingUp } from 'lucide-react';

interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GameSettings {
  language: string;
  videoSoundEnabled: boolean;
  videoVolume: number;
  gameSoundEnabled: boolean;
  gameVolume: number;
  showVideo: boolean;
  showGiftPopup: boolean;
  showDragonAlert: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  language: 'zh',
  videoSoundEnabled: true,
  videoVolume: 50,
  gameSoundEnabled: true,
  gameVolume: 50,
  showVideo: true,
  showGiftPopup: true,
  showDragonAlert: true,
};

const STORAGE_KEY = 'baccarat_game_settings';

export default function GameSettingsModal({ isOpen, onClose }: GameSettingsModalProps) {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  const updateSettings = (updates: Partial<GameSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  };

  const handleLanguageChange = (lang: string) => {
    updateSettings({ language: lang });
    i18n.changeLanguage(lang);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#1a2235] rounded-xl w-[420px] max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700/50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
            <h2 className="text-xl font-bold text-white">{t('gameSettings')}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700/50 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Language Setting */}
            <div className="flex items-center justify-between">
              <span className="text-gray-300">{t('languageSetting')}</span>
              <select
                value={settings.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-[#2a3548] text-white px-4 py-2 rounded-lg border border-gray-600/50 outline-none focus:border-orange-500/50 cursor-pointer"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Video Sound */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.videoSoundEnabled ? (
                    <Volume2 className="w-5 h-5 text-orange-400" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-gray-500" />
                  )}
                  <span className="text-gray-300">{t('videoSound')}</span>
                </div>
                <button
                  onClick={() => updateSettings({ videoSoundEnabled: !settings.videoSoundEnabled })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    settings.videoSoundEnabled ? 'bg-orange-500' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.videoSoundEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {settings.videoSoundEnabled && (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.videoVolume}
                    onChange={(e) => updateSettings({ videoVolume: Number(e.target.value) })}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <span className="text-gray-400 text-sm w-10 text-right">{settings.videoVolume}%</span>
                </div>
              )}
            </div>

            {/* Game Sound */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.gameSoundEnabled ? (
                    <Volume2 className="w-5 h-5 text-orange-400" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-gray-500" />
                  )}
                  <span className="text-gray-300">{t('gameSound')}</span>
                </div>
                <button
                  onClick={() => updateSettings({ gameSoundEnabled: !settings.gameSoundEnabled })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    settings.gameSoundEnabled ? 'bg-orange-500' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.gameSoundEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {settings.gameSoundEnabled && (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.gameVolume}
                    onChange={(e) => updateSettings({ gameVolume: Number(e.target.value) })}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <span className="text-gray-400 text-sm w-10 text-right">{settings.gameVolume}%</span>
                </div>
              )}
            </div>

            {/* Show Video */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.showVideo ? (
                  <Video className="w-5 h-5 text-orange-400" />
                ) : (
                  <VideoOff className="w-5 h-5 text-gray-500" />
                )}
                <span className="text-gray-300">{t('videoDisplay')}</span>
              </div>
              <button
                onClick={() => updateSettings({ showVideo: !settings.showVideo })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.showVideo ? 'bg-orange-500' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.showVideo ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Gift Popup */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className={`w-5 h-5 ${settings.showGiftPopup ? 'text-orange-400' : 'text-gray-500'}`} />
                <span className="text-gray-300">{t('giftPopup')}</span>
              </div>
              <button
                onClick={() => updateSettings({ showGiftPopup: !settings.showGiftPopup })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.showGiftPopup ? 'bg-orange-500' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.showGiftPopup ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Dragon Alert */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-5 h-5 ${settings.showDragonAlert ? 'text-orange-400' : 'text-gray-500'}`} />
                <span className="text-gray-300">{t('dragonAlert')}</span>
              </div>
              <button
                onClick={() => updateSettings({ showDragonAlert: !settings.showDragonAlert })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.showDragonAlert ? 'bg-orange-500' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.showDragonAlert ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700/50 text-center">
            <span className="text-gray-500 text-sm">Version 1.0.0</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
