import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Spade, LayoutGrid, Target, MessageCircle, ArrowLeft } from 'lucide-react';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRule?: (ruleType: string) => void;
}

interface RuleOption {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
  bgColor: string;
}

interface RuleContent {
  title: { zh: string; en: string };
  sections: Array<{
    heading: { zh: string; en: string };
    content: { zh: string; en: string };
  }>;
}

const RULE_OPTIONS: RuleOption[] = [
  {
    id: 'baccarat',
    labelKey: 'baccaratRules',
    icon: <Spade className="w-8 h-8 text-white" />,
    bgColor: 'from-purple-600/80 to-purple-900/80',
  },
  {
    id: 'roadmap',
    labelKey: 'roadmapGuide',
    icon: <LayoutGrid className="w-8 h-8 text-white" />,
    bgColor: 'from-blue-600/80 to-blue-900/80',
  },
  {
    id: 'goodRoad',
    labelKey: 'goodRoadGuide',
    icon: <Target className="w-8 h-8 text-white" />,
    bgColor: 'from-green-600/80 to-green-900/80',
  },
  {
    id: 'dragonTiger',
    labelKey: 'dragonTigerRules',
    icon: <span className="text-2xl">🐉</span>,
    bgColor: 'from-red-600/80 to-red-900/80',
  },
  {
    id: 'bullBull',
    labelKey: 'bullBullRules',
    icon: <span className="text-2xl">🐂</span>,
    bgColor: 'from-yellow-600/80 to-yellow-900/80',
  },
  {
    id: 'chatRules',
    labelKey: 'chatRoomRules',
    icon: <MessageCircle className="w-8 h-8 text-white" />,
    bgColor: 'from-pink-600/80 to-pink-900/80',
  },
];

const RULE_CONTENTS: Record<string, RuleContent> = {
  baccarat: {
    title: { zh: '百家樂規則', en: 'Baccarat Rules' },
    sections: [
      {
        heading: { zh: '遊戲目標', en: 'Game Objective' },
        content: {
          zh: '百家樂是一種比較閒家和莊家手牌點數的紙牌遊戲。目標是預測哪一方的手牌點數最接近9點，或者預測雙方平手。',
          en: 'Baccarat is a card game comparing the hands of the Player and Banker. The objective is to predict which hand will have a point total closest to 9, or if they will tie.',
        },
      },
      {
        heading: { zh: '點數計算', en: 'Card Values' },
        content: {
          zh: '• A = 1點\n• 2-9 = 面值點數\n• 10, J, Q, K = 0點\n\n如果總點數超過9，則只取個位數。例如：7+8=15，實際點數為5。',
          en: '• Ace = 1 point\n• 2-9 = Face value\n• 10, J, Q, K = 0 points\n\nIf the total exceeds 9, only the last digit counts. Example: 7+8=15, actual value is 5.',
        },
      },
      {
        heading: { zh: '發牌規則', en: 'Drawing Rules' },
        content: {
          zh: '• 閒家和莊家各發兩張牌\n• 任一方拿到8或9點為「天牌」，不再補牌\n• 閒家5點或以下補牌，6-7點不補\n• 莊家根據閒家第三張牌決定是否補牌',
          en: '• Player and Banker each receive two cards\n• 8 or 9 is a "Natural" - no more cards drawn\n• Player draws on 0-5, stands on 6-7\n• Banker draws based on Player\'s third card',
        },
      },
      {
        heading: { zh: '賠率', en: 'Payouts' },
        content: {
          zh: '• 閒家贏：1賠1\n• 莊家贏：1賠0.95（扣5%佣金）\n• 和局：1賠8\n• 閒對子/莊對子：1賠11',
          en: '• Player wins: 1:1\n• Banker wins: 1:0.95 (5% commission)\n• Tie: 1:8\n• Player/Banker Pair: 1:11',
        },
      },
    ],
  },
  roadmap: {
    title: { zh: '路紙指南', en: 'Roadmap Guide' },
    sections: [
      {
        heading: { zh: '珠盤路', en: 'Bead Road' },
        content: {
          zh: '最基本的路紙，按順序記錄每局結果。紅色圓圈代表莊家贏，藍色圓圈代表閒家贏，綠色圓圈代表和局。',
          en: 'The most basic road, recording results in sequence. Red circles represent Banker wins, blue circles represent Player wins, and green circles represent Ties.',
        },
      },
      {
        heading: { zh: '大路', en: 'Big Road' },
        content: {
          zh: '從左到右記錄，同樣的結果向下延伸。當結果改變時，移到下一列重新開始。和局不佔格，用綠色斜線標記。',
          en: 'Records from left to right, same results extend downward. When results change, move to next column. Ties don\'t take spaces, marked with green lines.',
        },
      },
      {
        heading: { zh: '大眼仔', en: 'Big Eye Boy' },
        content: {
          zh: '從大路的第二列第二行開始記錄。比較當前位置與左邊一列的規律性。紅色代表有規律，藍色代表無規律。',
          en: 'Starts from second row of second column in Big Road. Compares pattern regularity with adjacent column. Red means regular pattern, blue means irregular.',
        },
      },
      {
        heading: { zh: '小路', en: 'Small Road' },
        content: {
          zh: '類似大眼仔，但比較的是隔一列的規律性。從大路的第三列第二行開始記錄。',
          en: 'Similar to Big Eye Boy, but compares with the column two spaces left. Starts from second row of third column in Big Road.',
        },
      },
      {
        heading: { zh: '曱甴路', en: 'Cockroach Road' },
        content: {
          zh: '比較隔兩列的規律性。從大路的第四列第二行開始記錄。斜線標記，紅色代表有規律，藍色代表無規律。',
          en: 'Compares with the column three spaces left. Starts from second row of fourth column in Big Road. Marked with diagonal lines.',
        },
      },
    ],
  },
  goodRoad: {
    title: { zh: '好路提示', en: 'Good Road Guide' },
    sections: [
      {
        heading: { zh: '什麼是好路', en: 'What is Good Road' },
        content: {
          zh: '好路是指路紙呈現出明顯規律性的牌局。當系統偵測到特定的路紙模式時，會標記為「好路」，幫助玩家發現可能的投注機會。',
          en: 'Good Road refers to games showing clear patterns in the roadmap. When the system detects specific roadmap patterns, it marks them as "Good Road" to help players identify betting opportunities.',
        },
      },
      {
        heading: { zh: '長龍', en: 'Long Dragon' },
        content: {
          zh: '連續6次或以上相同的結果（連續莊贏或連續閒贏）。這是最容易識別的好路之一。',
          en: 'Six or more consecutive same results (consecutive Banker or Player wins). This is one of the easiest good roads to identify.',
        },
      },
      {
        heading: { zh: '單跳', en: 'Ping Pong' },
        content: {
          zh: '莊閒交替出現，如：莊-閒-莊-閒。連續4次或以上的交替被視為好路。',
          en: 'Banker and Player alternating, like: B-P-B-P. Four or more consecutive alternations is considered a good road.',
        },
      },
      {
        heading: { zh: '雙跳', en: 'Double Jump' },
        content: {
          zh: '每兩局相同結果交替，如：莊莊-閒閒-莊莊-閒閒。連續出現被視為好路。',
          en: 'Two same results alternating, like: BB-PP-BB-PP. Consecutive occurrences are considered a good road.',
        },
      },
      {
        heading: { zh: '一廳兩房', en: 'One Hall Two Rooms' },
        content: {
          zh: '固定模式如：莊-閒閒-莊-閒閒，或閒-莊莊-閒-莊莊。',
          en: 'Fixed pattern like: B-PP-B-PP, or P-BB-P-BB.',
        },
      },
    ],
  },
  dragonTiger: {
    title: { zh: '龍虎規則', en: 'Dragon Tiger Rules' },
    sections: [
      {
        heading: { zh: '遊戲介紹', en: 'Game Introduction' },
        content: {
          zh: '龍虎是一種簡單快速的紙牌遊戲。龍和虎各發一張牌，比較大小。這是最簡單的賭場遊戲之一。',
          en: 'Dragon Tiger is a simple and fast card game. One card is dealt to Dragon and one to Tiger, comparing their values. It\'s one of the simplest casino games.',
        },
      },
      {
        heading: { zh: '點數大小', en: 'Card Rankings' },
        content: {
          zh: '從大到小：K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2 > A\n\nA是最小的牌，K是最大的牌。花色不影響大小。',
          en: 'From highest to lowest: K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2 > A\n\nAce is the lowest, King is the highest. Suits don\'t matter.',
        },
      },
      {
        heading: { zh: '投注選項', en: 'Betting Options' },
        content: {
          zh: '• 龍：押龍方獲勝\n• 虎：押虎方獲勝\n• 和：押雙方點數相同',
          en: '• Dragon: Bet on Dragon to win\n• Tiger: Bet on Tiger to win\n• Tie: Bet on both having the same value',
        },
      },
      {
        heading: { zh: '賠率', en: 'Payouts' },
        content: {
          zh: '• 龍贏：1賠1\n• 虎贏：1賠1\n• 和局：1賠8\n• 和局時押龍或虎：退還一半賭注',
          en: '• Dragon wins: 1:1\n• Tiger wins: 1:1\n• Tie: 1:8\n• Dragon/Tiger bet on Tie: Half stake returned',
        },
      },
    ],
  },
  bullBull: {
    title: { zh: '牛牛規則', en: 'Bull Bull Rules' },
    sections: [
      {
        heading: { zh: '遊戲介紹', en: 'Game Introduction' },
        content: {
          zh: '牛牛是一種流行的紙牌遊戲，每位玩家發5張牌，需要將其中3張組成10的倍數（稱為「牛」），剩餘2張的點數決定牌型大小。',
          en: 'Bull Bull is a popular card game where each player receives 5 cards. Three cards must sum to a multiple of 10 (called "Bull"), and the remaining two cards determine the hand ranking.',
        },
      },
      {
        heading: { zh: '點數計算', en: 'Card Values' },
        content: {
          zh: '• A = 1點\n• 2-9 = 面值點數\n• 10, J, Q, K = 10點\n\n5張牌中選3張湊成10的倍數，剩餘2張相加取個位數為「牛幾」。',
          en: '• Ace = 1 point\n• 2-9 = Face value\n• 10, J, Q, K = 10 points\n\nSelect 3 cards summing to multiple of 10, remaining 2 cards\' sum (last digit) is the Bull number.',
        },
      },
      {
        heading: { zh: '牌型大小', en: 'Hand Rankings' },
        content: {
          zh: '從大到小：\n• 五公（5張花牌）\n• 炸彈牛（4張相同）\n• 五花牛（5張J/Q/K）\n• 牛牛（剩餘2張也是10的倍數）\n• 牛九至牛一\n• 無牛（無法湊成10的倍數）',
          en: 'From highest to lowest:\n• Five Royals (5 face cards)\n• Bomb (4 of a kind)\n• Five Flowers (5 J/Q/K cards)\n• Bull Bull (remaining 2 cards also multiple of 10)\n• Bull 9 to Bull 1\n• No Bull (cannot form multiple of 10)',
        },
      },
      {
        heading: { zh: '賠率', en: 'Payouts' },
        content: {
          zh: '• 牛牛：1賠3\n• 牛七至牛九：1賠2\n• 牛一至牛六：1賠1\n• 五公/炸彈牛：1賠5\n• 五花牛：1賠4',
          en: '• Bull Bull: 1:3\n• Bull 7-9: 1:2\n• Bull 1-6: 1:1\n• Five Royals/Bomb: 1:5\n• Five Flowers: 1:4',
        },
      },
    ],
  },
  chatRules: {
    title: { zh: '聊天室規則', en: 'Chat Room Rules' },
    sections: [
      {
        heading: { zh: '基本規範', en: 'Basic Guidelines' },
        content: {
          zh: '• 請保持禮貌和尊重\n• 禁止發送垃圾訊息或廣告\n• 禁止使用侮辱性或歧視性語言\n• 禁止分享個人敏感信息',
          en: '• Please be polite and respectful\n• No spamming or advertising\n• No offensive or discriminatory language\n• Do not share personal sensitive information',
        },
      },
      {
        heading: { zh: '聊天功能', en: 'Chat Features' },
        content: {
          zh: '• 需要下注100元以上才能發送訊息\n• 可以發送表情符號和貼圖\n• 可以打賞主播和其他玩家\n• 支持多種語言',
          en: '• Must bet over 100 to send messages\n• Can send emojis and stickers\n• Can tip dealers and other players\n• Multiple languages supported',
        },
      },
      {
        heading: { zh: '違規處理', en: 'Violation Handling' },
        content: {
          zh: '• 首次違規：警告\n• 再次違規：禁言24小時\n• 嚴重違規：永久禁言\n• 管理員有最終解釋權',
          en: '• First violation: Warning\n• Second violation: 24-hour mute\n• Severe violation: Permanent mute\n• Administrators have final say',
        },
      },
      {
        heading: { zh: '舉報功能', en: 'Report Function' },
        content: {
          zh: '如發現違規行為，請使用舉報功能。點擊訊息旁的選單按鈕，選擇「舉報」並說明原因。我們會盡快處理。',
          en: 'If you notice any violations, please use the report function. Click the menu button next to the message, select "Report" and provide a reason. We will handle it promptly.',
        },
      },
    ],
  },
};

export default function GameRulesModal({ isOpen, onClose, onSelectRule }: GameRulesModalProps) {
  const { t, i18n } = useTranslation();
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const isZh = i18n.language === 'zh';

  const handleSelectRule = (ruleId: string) => {
    if (onSelectRule) {
      onSelectRule(ruleId);
    }
    setSelectedRule(ruleId);
  };

  const handleBack = () => {
    setSelectedRule(null);
  };

  const handleClose = () => {
    setSelectedRule(null);
    onClose();
  };

  if (!isOpen) return null;

  const currentRule = selectedRule ? RULE_CONTENTS[selectedRule] : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#1a2235] rounded-xl w-[600px] max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700/50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
            <div className="flex items-center gap-3">
              {selectedRule && (
                <button
                  onClick={handleBack}
                  className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700/50 rounded"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-xl font-bold text-white">
                {currentRule
                  ? (isZh ? currentRule.title.zh : currentRule.title.en)
                  : t('gameRules')
                }
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700/50 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          {selectedRule && currentRule ? (
            /* Rule Content View */
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {currentRule.sections.map((section, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-[#242d3d] rounded-lg p-4"
                  >
                    <h3 className="text-orange-400 font-bold mb-3">
                      {isZh ? section.heading.zh : section.heading.en}
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                      {isZh ? section.content.zh : section.content.en}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            /* Rule Selection View */
            <>
              {/* Subtitle */}
              <div className="px-6 py-3 text-center">
                <p className="text-gray-400">{t('selectGameForRules')}</p>
              </div>

              {/* Rules Grid */}
              <div className="p-6 pt-2">
                <div className="grid grid-cols-3 gap-4">
                  {RULE_OPTIONS.map((rule, index) => (
                    <motion.button
                      key={rule.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSelectRule(rule.id)}
                      className={`relative overflow-hidden rounded-xl aspect-square bg-gradient-to-br ${rule.bgColor} p-4 flex flex-col items-center justify-center gap-3 hover:scale-105 transition-transform group border border-white/10`}
                    >
                      {/* Background decoration */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                      {/* Icon */}
                      <div className="relative z-10 w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        {rule.icon}
                      </div>

                      {/* Label */}
                      <span className="relative z-10 text-white font-bold text-sm">
                        {t(rule.labelKey)}
                      </span>

                      {/* Hover effect */}
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  ))}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
