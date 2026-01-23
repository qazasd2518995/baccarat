import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, History } from 'lucide-react';
import { agentManagementApi } from '../services/api';

interface ShareSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  onSuccess?: () => void;
  onOpenHistory?: () => void;
}

interface ShareSetting {
  id: string;
  gameCategory: string;
  platform: string;
  sharePercent: number;
  rebatePercent: number;
  maxSharePercent: number;
  maxRebatePercent: number;
}

interface CategoryData {
  category: string;
  platforms: string[];
  settings: ShareSetting[];
}

// 遊戲分類配置
const GAME_CATEGORIES: CategoryData[] = [
  {
    category: '電子',
    platforms: ['100HP', 'AMB', 'ATG', 'EG', 'IN-OUT', '9Game', 'PANDA', 'PIX', 'QT', 'RG', 'RSG', 'Sigma', 'Slotmill', 'TURBO', 'WOW', 'ZG'],
    settings: []
  },
  {
    category: '真人百家2館',
    platforms: ['卡利真人', 'DG真人', 'EEAI'],
    settings: []
  },
  {
    category: '真人百家1館',
    platforms: ['MT真人', 'RC真人', 'T9真人', '華利高真人電投'],
    settings: []
  },
  {
    category: '體育',
    platforms: ['SUPER體育'],
    settings: []
  }
];

export default function ShareSettingModal({
  isOpen,
  onClose,
  agentId,
  agentName,
  onSuccess,
  onOpenHistory
}: ShareSettingModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    GAME_CATEGORIES.map(c => c.category)
  );
  const [batchSharePercent, setBatchSharePercent] = useState('');
  const [batchRebatePercent, setBatchRebatePercent] = useState('');
  const [settings, setSettings] = useState<Record<string, { share: string; rebate: string }>>({});
  const [loading, setLoading] = useState(false);
  // const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (isOpen && agentId) {
      fetchShareSettings();
    }
  }, [isOpen, agentId]);

  const fetchShareSettings = async () => {
    try {
      const res = await agentManagementApi.getShareSettings(agentId);
      const settingsMap: Record<string, { share: string; rebate: string }> = {};

      res.data.settings?.forEach((s: ShareSetting) => {
        const key = `${s.gameCategory}-${s.platform}`;
        settingsMap[key] = {
          share: s.sharePercent?.toString() || '0',
          rebate: s.rebatePercent?.toString() || '0'
        };
      });

      setSettings(settingsMap);
    } catch (err) {
      console.error('Failed to fetch share settings:', err);
    }
  };

  const handleSelectAll = () => {
    setSelectedCategories(GAME_CATEGORIES.map(c => c.category));
  };

  const handleSelectInverse = () => {
    const allCategories = GAME_CATEGORIES.map(c => c.category);
    setSelectedCategories(
      allCategories.filter(c => !selectedCategories.includes(c))
    );
  };

  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleBatchSetShare = () => {
    if (!batchSharePercent) return;

    const newSettings = { ...settings };
    GAME_CATEGORIES.forEach(cat => {
      if (selectedCategories.includes(cat.category)) {
        cat.platforms.forEach(platform => {
          const key = `${cat.category}-${platform}`;
          newSettings[key] = {
            ...newSettings[key],
            share: batchSharePercent
          };
        });
      }
    });
    setSettings(newSettings);
  };

  const handleBatchSetRebate = () => {
    if (!batchRebatePercent) return;

    const newSettings = { ...settings };
    GAME_CATEGORIES.forEach(cat => {
      if (selectedCategories.includes(cat.category)) {
        cat.platforms.forEach(platform => {
          const key = `${cat.category}-${platform}`;
          newSettings[key] = {
            ...newSettings[key],
            rebate: batchRebatePercent
          };
        });
      }
    });
    setSettings(newSettings);
  };

  const handleSettingChange = (
    category: string,
    platform: string,
    field: 'share' | 'rebate',
    value: string
  ) => {
    const key = `${category}-${platform}`;
    setSettings({
      ...settings,
      [key]: {
        ...settings[key],
        [field]: value
      }
    });
  };

  const handleConfirmSetting = async (category: string, platform: string, field: 'share' | 'rebate') => {
    const key = `${category}-${platform}`;
    const value = settings[key]?.[field] || '0';

    try {
      await agentManagementApi.updateShareSettings(agentId, {
        gameCategory: category,
        platform,
        [field === 'share' ? 'sharePercent' : 'rebatePercent']: parseFloat(value) || 0
      });
    } catch (err) {
      console.error('Failed to update setting:', err);
    }
  };

  const handleClearSetting = (category: string, platform: string, field: 'share' | 'rebate') => {
    const key = `${category}-${platform}`;
    setSettings({
      ...settings,
      [key]: {
        ...settings[key],
        [field]: '0'
      }
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const shareSettings: { gameCategory: string; platform: string; sharePercent: number; rebatePercent: number }[] = [];

      Object.entries(settings).forEach(([key, value]) => {
        const [category, platform] = key.split('-');
        shareSettings.push({
          gameCategory: category,
          platform,
          sharePercent: parseFloat(value.share) || 0,
          rebatePercent: parseFloat(value.rebate) || 0
        });
      });

      await agentManagementApi.updateShareSettings(agentId, { settings: shareSettings });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to save share settings:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1a1a] border border-[#333] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333]">
          <h2 className="text-white text-lg font-bold">編輯代理 - {agentName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 快速設置 */}
          <div className="bg-[#252525] rounded-lg p-4 mb-4">
            <h3 className="text-white font-medium mb-3">快速設置</h3>

            {/* 分類選擇 */}
            <div className="flex items-center gap-4 mb-4">
              {GAME_CATEGORIES.map(cat => (
                <label key={cat.category} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.category)}
                    onChange={() => handleCategoryToggle(cat.category)}
                    className="w-4 h-4 text-amber-500 bg-[#333] border-[#444] rounded focus:ring-amber-500"
                  />
                  <span className="text-white text-sm">{cat.category}</span>
                </label>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 bg-[#333] text-white text-sm rounded hover:bg-[#444] transition-colors"
                >
                  全 選
                </button>
                <button
                  onClick={handleSelectInverse}
                  className="px-3 py-1 bg-[#333] text-white text-sm rounded hover:bg-[#444] transition-colors"
                >
                  反 選
                </button>
              </div>
            </div>

            {/* 批量設置 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={batchSharePercent}
                  onChange={(e) => setBatchSharePercent(e.target.value)}
                  placeholder="下級佔成"
                  className="w-32 px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleBatchSetShare}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded transition-colors"
                >
                  設置佔成
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={batchRebatePercent}
                  onChange={(e) => setBatchRebatePercent(e.target.value)}
                  placeholder="下級退水"
                  className="w-32 px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleBatchSetRebate}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded transition-colors"
                >
                  設置退水
                </button>
              </div>

              <button
                onClick={() => onOpenHistory?.()}
                className="ml-auto flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm"
              >
                <History className="w-4 h-4" />
                佔成/退水歷史
              </button>
            </div>
          </div>

          {/* 設定表格 */}
          <div className="bg-[#252525] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#1a1a1a]">
                  <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">分類</th>
                  <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">廠商</th>
                  <th className="px-4 py-3 text-center text-gray-400 text-sm font-medium">佔成可輸入值</th>
                  <th className="px-4 py-3 text-center text-gray-400 text-sm font-medium">退水可輸入值</th>
                  <th className="px-4 py-3 text-center text-gray-400 text-sm font-medium">
                    下級佔成 <span className="text-amber-400">✎</span>
                  </th>
                  <th className="px-4 py-3 text-center text-gray-400 text-sm font-medium">
                    下級退水 <span className="text-amber-400">✎</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {GAME_CATEGORIES.map((cat) => (
                  <tr key={cat.category} className="border-t border-[#333]">
                    <td className="px-4 py-3 text-white text-sm align-top">{cat.category}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm align-top">
                      <div className="space-y-1">
                        {cat.platforms.map(platform => (
                          <div key={platform}>{platform}</div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400 text-sm align-top">
                      <div className="space-y-1">
                        {cat.platforms.map(() => (
                          <div key={Math.random()}>0%-0%</div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400 text-sm align-top">
                      <div className="space-y-1">
                        {cat.platforms.map(() => (
                          <div key={Math.random()}>0-0</div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-1">
                        {cat.platforms.map(platform => {
                          const key = `${cat.category}-${platform}`;
                          return (
                            <div key={platform} className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                value={settings[key]?.share || '0'}
                                onChange={(e) => handleSettingChange(cat.category, platform, 'share', e.target.value)}
                                className="w-16 px-2 py-1 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm text-center focus:outline-none focus:border-amber-500"
                              />
                              <button
                                onClick={() => handleConfirmSetting(cat.category, platform, 'share')}
                                className="p-1 text-green-400 hover:text-green-300"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleClearSetting(cat.category, platform, 'share')}
                                className="p-1 text-red-400 hover:text-red-300"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-1">
                        {cat.platforms.map(platform => {
                          const key = `${cat.category}-${platform}`;
                          return (
                            <div key={platform} className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                value={settings[key]?.rebate || '0'}
                                onChange={(e) => handleSettingChange(cat.category, platform, 'rebate', e.target.value)}
                                className="w-16 px-2 py-1 bg-[#1a1a1a] border border-[#444] rounded text-white text-sm text-center focus:outline-none focus:border-amber-500"
                              />
                              <button
                                onClick={() => handleConfirmSetting(cat.category, platform, 'rebate')}
                                className="p-1 text-green-400 hover:text-green-300"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleClearSetting(cat.category, platform, 'rebate')}
                                className="p-1 text-red-400 hover:text-red-300"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 提示 */}
          <p className="text-amber-400 text-sm text-center mt-4">
            請先開啟廠商在設置佔成退水，否則設置無效。如無廠商請聯繫上級代理。
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 p-4 border-t border-[#333]">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors"
          >
            取 消
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '保存中...' : '保 存'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
