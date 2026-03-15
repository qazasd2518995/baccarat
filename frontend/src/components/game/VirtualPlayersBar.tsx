import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Country flags with realistic online nicknames/gamertags
const COUNTRIES = [
  // 中國 - 網名風格：諧音、火星文、遊戲ID、QQ風格
  { flag: '🇨🇳', names: ['大佬666', '發財樹', '牛氣沖天', '小賭怡情', '不賭為贏', '錦鯉附體', '歐皇本皇', '賭神附體', '財神到', '非酋本酋', '穩如老狗', '今晚吃雞', '氪金大佬', '佛系玩家', '秀兒是你', '豪橫就完事', '芜湖起飛', 'A神', '老玩家了', '韭菜本菜'] },
  // 台灣 - PTT/巴哈風格、台式用語
  { flag: '🇹🇼', names: ['魯蛇翻身', '歐洲人4ni', '梭哈啦', '穩穩der', '肝帝本人', '課長4ni', '歐皇777', '台北小王', '南部囝仔', '不EY', '衝就對了', '真香警告', '我就爛', '4%仔', '躺分仔', '邊緣人QQ', '窩不知道', '母湯喔', 'hen棒', '87分'] },
  // 香港 - 港式潮語、連登風格
  { flag: '🇭🇰', names: ['贏錢王', '高登仔', '連登巴打', '西環契弟', '碌柒王', '做乜姐', '689', '好L威', '屎波王', '抽水王', 'HKgolden', '廢青本青', '係咁先啦', '收皮啦', '痴L線', '正仆街', '癲狗咁', 'on99', '聽日先算', '唔好意思'] },
  // 日本 - ネット用語、2ch風格
  { flag: '🇯🇵', names: ['草www', '神引き', 'ガチ勢', '無課金勢', '廃課金', 'パチンカス', '麻雀豪', 'RTA走者', '乙です', 'neko', 'sakura88', 'yamato', 'kirin', 'tanuki', 'ryu777', 'jin_23', 'あああ', '名無し', 'ワロタ', 'ｷﾀ━━━'] },
  // 韓國 - 한국어 인터넷용어
  { flag: '🇰🇷', names: ['ㅋㅋㅋ', '대박123', '갓겜러', '럭키짱', '운빨좋음', '행운의돼지', 'StarKR', 'kimchi88', 'soju_king', 'k-lucky', '한탕주의', '오케이굿', '가즈아', 'GG갑', '하이롤러', 'boss_kr', 'vip맨', '찐부자', '머니맨', 'flex해'] },
  // 越南 - 網咖風格ID
  { flag: '🇻🇳', names: ['luckyVN', 'hanoi99', 'saigon_boy', 'pho123', 'vn_lucky', 'rich_vn', 'casino_vn', 'hcm_gamer', 'vip_hanoi', 'banh_mi', 'dai_gia', 'thang888', 'loc_phat', 'an_phat99', 'phat_tai', 'tien_vang'] },
  // 泰國 - ภาษาไทย
  { flag: '🇹🇭', names: ['โชคดี', 'เฮงๆ', 'รวย', 'lucky_th', 'thai_vip', 'bkk_boss', 'pattaya', 'som_tam', 'lucky555', 'sanuk88', 'sawadee', 'th_winner', 'bangkok1', 'happy_th', 'jai_dee'] },
  // 馬來西亞 - 多語混合
  { flag: '🇲🇾', names: ['huat_ah', 'kl_boss', 'genting', 'lucky_my', 'ong888', 'heng_ong', 'towkay', 'boss_kl', 'shiok_la', 'steady_bom', 'jb_king', 'taiping', 'boleh_la', 'syiok', 'cari_makan'] },
  // 新加坡 - Singlish風格
  { flag: '🇸🇬', names: ['shiok_sg', 'mbs_vip', 'sg_huat', 'lucky_sg', 'ong_lai', 'steady_la', 'can_one', 'sg_boss', 'marina88', 'kiasu_win', 'chope_king', 'sian_half', 'bojio', 'jialat', 'sibei_huat'] },
  // 菲律賓
  { flag: '🇵🇭', names: ['pinoy_luck', 'manila_vip', 'swerte', 'palaban', 'sugal_king', 'ph_gamer', 'lucky_ph', 'jackpot_ph', 'manila888', 'cebu_boy', 'boss_ph', 'tito_joey', 'kuya_bet', 'pare_ko', 'astig'] },
  // 印尼
  { flag: '🇮🇩', names: ['hoki_id', 'jakarta99', 'gacor', 'sultan_id', 'bos_indo', 'jp_hunter', 'lucky_indo', 'maxwin', 'cuan_besar', 'gas_terus', 'pejuang_cuan', 'santuy_aja', 'receh_king', 'bali_vip', 'mantap_jiwa'] },
  // 美國
  { flag: '🇺🇸', names: ['bigwin_usa', 'vegas_king', 'lucky_mike', 'high_roller', 'whale_bet', 'win_usa', 'jackpot_joe', 'poker_pro', 'us_gambler', 'diamond_dan', 'mr_lucky', 'golden_guy', 'cash_cow', 'bet_master', 'all_in_andy'] },
  // 英國
  { flag: '🇬🇧', names: ['lucky_brit', 'london_lad', 'uk_punter', 'bet_mate', 'high_stakes', 'quid_queen', 'brit_boss', 'pound_king', 'ace_uk', 'royal_bet', 'london88', 'manc_dan', 'cheeky_bet', 'ladbrokes', 'banter_bet'] },
  // 澳洲
  { flag: '🇦🇺', names: ['aussie_luck', 'sydney_win', 'g_day_mate', 'oz_gambler', 'roo_luck', 'straya_bet', 'melb_boss', 'perth_punt', 'brisbane88', 'crikey_win', 'fair_dinkum', 'no_worries', 'oz_whale', 'down_under', 'matey_bet'] },
];

// Avatar colors (gradients) - casino-style
const AVATAR_COLORS = [
  'from-rose-500 to-red-600',
  'from-orange-500 to-amber-600',
  'from-yellow-500 to-orange-600',
  'from-emerald-500 to-green-600',
  'from-teal-500 to-cyan-600',
  'from-sky-500 to-blue-600',
  'from-indigo-500 to-purple-600',
  'from-purple-500 to-pink-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-yellow-600',
];

interface VirtualPlayer {
  id: string;
  name: string;
  flag: string;
  balance: number;
  avatarColor: string;
  initials: string;
  balanceChange?: number; // For showing win/loss animation
  isNew?: boolean; // For entrance animation
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate a single random player
function generateRandomPlayer(usedNames: Set<string>): VirtualPlayer {
  const country = pickRandom(COUNTRIES);

  // Find unused name
  let name = '';
  const shuffledNames = [...country.names].sort(() => Math.random() - 0.5);
  for (const n of shuffledNames) {
    if (!usedNames.has(n)) {
      name = n;
      break;
    }
  }
  if (!name) {
    name = pickRandom(country.names) + randInt(1, 999);
  }

  // Generate balance
  const balanceTier = Math.random();
  let balance: number;
  if (balanceTier < 0.3) {
    balance = randInt(500, 10000);
  } else if (balanceTier < 0.7) {
    balance = randInt(10000, 200000);
  } else if (balanceTier < 0.9) {
    balance = randInt(200000, 1000000);
  } else {
    balance = randInt(1000000, 5000000);
  }

  // Generate initials
  let initials = '';
  const cleanName = name.replace(/[0-9_\-\.@]/g, '');
  if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(cleanName)) {
    initials = cleanName.slice(0, 2);
  } else if (cleanName.length > 0) {
    initials = cleanName.slice(0, 2).toUpperCase();
  } else {
    initials = name.slice(0, 2);
  }

  return {
    id: `player-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    flag: country.flag,
    balance,
    avatarColor: pickRandom(AVATAR_COLORS),
    initials,
    isNew: true,
  };
}

// Generate initial players for a table
function generateInitialPlayers(tableId: string, count: number): VirtualPlayer[] {
  const seed = tableId.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
  const seededRandom = (index: number) => {
    const x = Math.sin(seed * (index + 1) * 9999) * 10000;
    return x - Math.floor(x);
  };

  const players: VirtualPlayer[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    const countryIndex = Math.floor(seededRandom(i * 7) * COUNTRIES.length);
    const country = COUNTRIES[countryIndex];

    let name = '';
    let attempts = 0;
    while (attempts < 10) {
      const nameIndex = Math.floor(seededRandom(i * 13 + attempts * 3) * country.names.length);
      const candidateName = country.names[nameIndex];
      if (!usedNames.has(candidateName)) {
        name = candidateName;
        usedNames.add(name);
        break;
      }
      attempts++;
    }
    if (!name) name = country.names[0] + i;

    const colorIndex = Math.floor(seededRandom(i * 17) * AVATAR_COLORS.length);
    const balanceTier = seededRandom(i * 23);
    let balance: number;
    if (balanceTier < 0.3) {
      balance = Math.floor(500 + seededRandom(i * 29) * 9500);
    } else if (balanceTier < 0.7) {
      balance = Math.floor(10000 + seededRandom(i * 31) * 190000);
    } else if (balanceTier < 0.9) {
      balance = Math.floor(200000 + seededRandom(i * 37) * 800000);
    } else {
      balance = Math.floor(1000000 + seededRandom(i * 41) * 4000000);
    }

    let initials = '';
    const cleanName = name.replace(/[0-9_\-\.@]/g, '');
    if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(cleanName)) {
      initials = cleanName.slice(0, 2);
    } else if (cleanName.length > 0) {
      initials = cleanName.slice(0, 2).toUpperCase();
    } else {
      initials = name.slice(0, 2);
    }

    players.push({
      id: `${tableId}-player-${i}`,
      name,
      flag: country.flag,
      balance,
      avatarColor: AVATAR_COLORS[colorIndex],
      initials,
    });
  }

  return players;
}

function formatBalance(balance: number): string {
  if (balance >= 1000000) {
    return (balance / 1000000).toFixed(1) + 'M';
  }
  if (balance >= 10000) {
    return Math.floor(balance / 1000) + 'K';
  }
  return balance.toLocaleString();
}

function getPlayerCountForTable(tableId: string): number {
  const seed = tableId.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
  return 5 + Math.floor((Math.sin(seed * 7777) * 10000 % 1) * 8);
}

interface VirtualPlayersBarProps {
  tableId: string;
  playerCount?: number;
}

export const VirtualPlayersBar = memo(function VirtualPlayersBar({
  tableId,
  playerCount
}: VirtualPlayersBarProps) {
  const initialCount = playerCount ?? getPlayerCountForTable(tableId);
  const [players, setPlayers] = useState<VirtualPlayer[]>(() =>
    generateInitialPlayers(tableId, initialCount)
  );
  const usedNamesRef = useRef<Set<string>>(new Set(players.map(p => p.name)));

  // Simulate balance changes (wins/losses)
  const updateBalances = useCallback(() => {
    setPlayers(prev => prev.map(player => {
      // 60% chance of balance change per player
      if (Math.random() > 0.6) return player;

      // Determine win or loss (slightly biased towards loss for realism)
      const isWin = Math.random() < 0.45;

      // Change amount based on current balance tier
      let changePercent: number;
      if (player.balance < 10000) {
        changePercent = randInt(5, 30) / 100; // 5-30%
      } else if (player.balance < 200000) {
        changePercent = randInt(2, 15) / 100; // 2-15%
      } else {
        changePercent = randInt(1, 8) / 100; // 1-8%
      }

      const changeAmount = Math.floor(player.balance * changePercent);
      const actualChange = isWin ? changeAmount : -changeAmount;
      const newBalance = Math.max(0, player.balance + actualChange);

      // If player goes broke, they might leave (handled in player rotation)
      return {
        ...player,
        balance: newBalance,
        balanceChange: actualChange,
      };
    }));

    // Clear balance change indicators after animation
    setTimeout(() => {
      setPlayers(prev => prev.map(p => ({ ...p, balanceChange: undefined })));
    }, 1500);
  }, []);

  // Simulate player entering/leaving
  const rotatePlayer = useCallback(() => {
    setPlayers(prev => {
      // 15% chance of player leaving
      const shouldRemove = Math.random() < 0.15 && prev.length > 4;
      // 20% chance of new player joining
      const shouldAdd = Math.random() < 0.2 && prev.length < 15;

      let newPlayers = [...prev];

      if (shouldRemove) {
        // Remove a random player (prefer players with low/zero balance)
        const sortedByBalance = [...newPlayers].sort((a, b) => a.balance - b.balance);
        const toRemove = sortedByBalance[0]; // Remove lowest balance player
        newPlayers = newPlayers.filter(p => p.id !== toRemove.id);
        usedNamesRef.current.delete(toRemove.name);
      }

      if (shouldAdd) {
        const newPlayer = generateRandomPlayer(usedNamesRef.current);
        usedNamesRef.current.add(newPlayer.name);
        // Insert at random position
        const insertIndex = randInt(0, newPlayers.length);
        newPlayers.splice(insertIndex, 0, newPlayer);

        // Clear isNew flag after animation
        setTimeout(() => {
          setPlayers(p => p.map(pl =>
            pl.id === newPlayer.id ? { ...pl, isNew: false } : pl
          ));
        }, 500);
      }

      return newPlayers;
    });
  }, []);

  // Set up intervals for dynamic updates
  useEffect(() => {
    // Balance updates every 3-8 seconds
    const balanceInterval = setInterval(() => {
      updateBalances();
    }, randInt(3000, 8000));

    // Player rotation every 10-20 seconds
    const rotationInterval = setInterval(() => {
      rotatePlayer();
    }, randInt(10000, 20000));

    return () => {
      clearInterval(balanceInterval);
      clearInterval(rotationInterval);
    };
  }, [updateBalances, rotatePlayer]);

  // Reset when tableId changes
  useEffect(() => {
    const newPlayers = generateInitialPlayers(tableId, initialCount);
    setPlayers(newPlayers);
    usedNamesRef.current = new Set(newPlayers.map(p => p.name));
  }, [tableId, initialCount]);

  return (
    <div
      className="w-full relative overflow-hidden shrink-0"
      style={{
        background: 'linear-gradient(180deg, rgba(30,35,40,0.95) 0%, rgba(20,25,30,0.98) 100%)',
        borderTop: '1px solid rgba(212,175,55,0.3)',
      }}
    >
      {/* Decorative top line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.5) 20%, rgba(212,175,55,0.8) 50%, rgba(212,175,55,0.5) 80%, transparent 100%)',
        }}
      />

      {/* Players container */}
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-1.5 sm:py-2 overflow-x-auto scrollbar-hide min-h-[56px] sm:min-h-[72px]">
        <AnimatePresence mode="popLayout">
          {players.map((player) => (
            <motion.div
              key={player.id}
              layout
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex flex-col items-center shrink-0"
            >
              {/* Player card */}
              <div
                className="relative px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-md sm:rounded-lg"
                style={{
                  background: 'linear-gradient(145deg, rgba(40,45,55,0.9) 0%, rgba(25,30,40,0.95) 100%)',
                  border: '1px solid rgba(100,110,130,0.3)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                  minWidth: '52px',
                }}
              >
                {/* Balance change indicator */}
                <AnimatePresence>
                  {player.balanceChange !== undefined && player.balanceChange !== 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: -15 }}
                      exit={{ opacity: 0, y: -25 }}
                      className={`absolute -top-1 left-1/2 -translate-x-1/2 text-[9px] sm:text-[11px] font-bold whitespace-nowrap z-10 ${
                        player.balanceChange > 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {player.balanceChange > 0 ? '+' : ''}{formatBalance(player.balanceChange)}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Avatar with flag */}
                <div className="flex justify-center mb-0.5">
                  <div className="relative">
                    <div className={`
                      w-6 h-6 sm:w-8 sm:h-8
                      rounded-full bg-gradient-to-br ${player.avatarColor}
                      flex items-center justify-center
                      text-[7px] sm:text-[9px] font-bold text-white
                      shadow-md
                      border border-white/20 sm:border-2
                    `}>
                      {player.initials}
                    </div>
                    {/* Flag badge */}
                    <div
                      className="absolute -bottom-0.5 -right-0.5 sm:-right-1 text-[9px] sm:text-[11px] drop-shadow-md"
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
                    >
                      {player.flag}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="text-[8px] sm:text-[10px] text-gray-200 text-center font-medium whitespace-nowrap leading-tight">
                  {player.name}
                </div>

                {/* Balance with animation */}
                <motion.div
                  key={player.balance}
                  initial={{ scale: 1 }}
                  animate={{
                    scale: player.balanceChange !== undefined ? [1, 1.2, 1] : 1,
                    color: player.balanceChange !== undefined
                      ? player.balanceChange > 0 ? '#4ade80' : '#f87171'
                      : '#e8d48b'
                  }}
                  transition={{ duration: 0.3 }}
                  className="text-[8px] sm:text-[10px] font-mono text-center font-semibold leading-tight"
                  style={{ color: '#e8d48b' }}
                >
                  ${formatBalance(player.balance)}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Subtle bottom shadow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
        }}
      />
    </div>
  );
});

export default VirtualPlayersBar;
