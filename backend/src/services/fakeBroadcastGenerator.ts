// Fake broadcast generator — creates realistic chat messages from virtual players

import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '../socket/types.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Quick chat messages with their colors
const BROADCAST_MESSAGES = [
  { text: '閒！', color: '#3b82f6' },
  { text: '莊！', color: '#ef4444' },
  { text: '沒過', color: '#f59e0b' },
  { text: '收了', color: '#22c55e' },
  { text: '歐硬！', color: '#a855f7' },
  { text: '祝大家發財', color: '#fbbf24' },
  { text: '太簡單了', color: '#06b6d4' },
  { text: '太菜了', color: '#f97316' },
];

// Country flags with realistic online nicknames (same as frontend VirtualPlayersBar)
const FAKE_PLAYERS = [
  // 中國
  '大佬666', '發財樹', '牛氣沖天', '小賭怡情', '不賭為贏', '錦鯉附體', '歐皇本皇', '賭神附體', '財神到', '非酋本酋', '穩如老狗', '今晚吃雞', '氪金大佬', '佛系玩家', '秀兒是你', '豪橫就完事', '芜湖起飛', 'A神', '老玩家了', '韭菜本菜',
  // 台灣
  '魯蛇翻身', '歐洲人4ni', '梭哈啦', '穩穩der', '肝帝本人', '課長4ni', '歐皇777', '台北小王', '南部囝仔', '不EY', '衝就對了', '真香警告', '我就爛', '4%仔', '躺分仔', '邊緣人QQ', '窩不知道', '母湯喔', 'hen棒', '87分',
  // 香港
  '贏錢王', '高登仔', '連登巴打', '西環契弟', '碌柒王', '做乜姐', '689', '好L威', '屎波王', '抽水王', 'HKgolden', '廢青本青', '係咁先啦', '收皮啦', '痴L線', '正仆街', '癲狗咁', 'on99', '聽日先算', '唔好意思',
  // 日本
  '草www', '神引き', 'ガチ勢', '無課金勢', '廃課金', 'パチンカス', '麻雀豪', 'RTA走者', '乙です', 'neko', 'sakura88', 'yamato', 'kirin', 'tanuki', 'ryu777', 'jin_23', 'あああ', '名無し', 'ワロタ', 'ｷﾀ━━━',
  // 韓國
  'ㅋㅋㅋ', '대박123', '갓겜러', '럭키짱', '운빨좋음', '행운의돼지', 'StarKR', 'kimchi88', 'soju_king', 'k-lucky', '한탕주의', '오케이굿', '가즈아', 'GG갑', '하이롤러', 'boss_kr', 'vip맨', '찐부자', '머니맨', 'flex해',
  // 越南
  'luckyVN', 'hanoi99', 'saigon_boy', 'pho123', 'vn_lucky', 'rich_vn', 'casino_vn', 'hcm_gamer', 'vip_hanoi', 'banh_mi', 'dai_gia', 'thang888', 'loc_phat', 'an_phat99', 'phat_tai', 'tien_vang',
  // 泰國
  'โชคดี', 'เฮงๆ', 'รวย', 'lucky_th', 'thai_vip', 'bkk_boss', 'pattaya', 'som_tam', 'lucky555', 'sanuk88', 'sawadee', 'th_winner', 'bangkok1', 'happy_th', 'jai_dee',
  // 馬來西亞
  'huat_ah', 'kl_boss', 'genting', 'lucky_my', 'ong888', 'heng_ong', 'towkay', 'boss_kl', 'shiok_la', 'steady_bom', 'jb_king', 'taiping', 'boleh_la', 'syiok', 'cari_makan',
  // 新加坡
  'shiok_sg', 'mbs_vip', 'sg_huat', 'lucky_sg', 'ong_lai', 'steady_la', 'can_one', 'sg_boss', 'marina88', 'kiasu_win', 'chope_king', 'sian_half', 'bojio', 'jialat', 'sibei_huat',
  // 菲律賓
  'pinoy_luck', 'manila_vip', 'swerte', 'palaban', 'sugal_king', 'ph_gamer', 'lucky_ph', 'jackpot_ph', 'manila888', 'cebu_boy', 'boss_ph', 'tito_joey', 'kuya_bet', 'pare_ko', 'astig',
  // 印尼
  'hoki_id', 'jakarta99', 'gacor', 'sultan_id', 'bos_indo', 'jp_hunter', 'lucky_indo', 'maxwin', 'cuan_besar', 'gas_terus', 'pejuang_cuan', 'santuy_aja', 'receh_king', 'bali_vip', 'mantap_jiwa',
  // 美國
  'bigwin_usa', 'vegas_king', 'lucky_mike', 'high_roller', 'whale_bet', 'win_usa', 'jackpot_joe', 'poker_pro', 'us_gambler', 'diamond_dan', 'mr_lucky', 'golden_guy', 'cash_cow', 'bet_master', 'all_in_andy',
  // 英國
  'lucky_brit', 'london_lad', 'uk_punter', 'bet_mate', 'high_stakes', 'quid_queen', 'brit_boss', 'pound_king', 'ace_uk', 'royal_bet', 'london88', 'manc_dan', 'cheeky_bet', 'ladbrokes', 'banter_bet',
  // 澳洲
  'aussie_luck', 'sydney_win', 'g_day_mate', 'oz_gambler', 'roo_luck', 'straya_bet', 'melb_boss', 'perth_punt', 'brisbane88', 'crikey_win', 'fair_dinkum', 'no_worries', 'oz_whale', 'down_under', 'matey_bet',
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate a random fake broadcast message
function generateFakeBroadcast(): { username: string; text: string; color: string } {
  const username = pickRandom(FAKE_PLAYERS);
  const message = pickRandom(BROADCAST_MESSAGES);
  return {
    username,
    text: message.text,
    color: message.color,
  };
}

// Table state for fake broadcasts
interface TableBroadcastState {
  isActive: boolean;
  nextBroadcastTime: number;
  intervalId: ReturnType<typeof setInterval> | null;
}

const tableBroadcastStates = new Map<string, TableBroadcastState>();

// Start fake broadcasts for a table during betting phase
export function startTableFakeBroadcasts(
  io: TypedServer,
  tableId: string,
  roomName: string,
  eventName: 'game:fakeBroadcast' | 'dt:fakeBroadcast' = 'game:fakeBroadcast'
): void {
  // Stop existing broadcasts if any
  stopTableFakeBroadcasts(tableId);

  const state: TableBroadcastState = {
    isActive: true,
    nextBroadcastTime: Date.now() + randInt(500, 2000),
    intervalId: null,
  };

  // Check and send broadcasts every 500ms
  state.intervalId = setInterval(() => {
    if (!state.isActive) return;

    const now = Date.now();
    if (now >= state.nextBroadcastTime) {
      // Send a fake broadcast
      const broadcast = generateFakeBroadcast();
      io.to(roomName).emit(eventName as any, broadcast);

      // Schedule next broadcast (1-5 seconds apart, sometimes faster bursts)
      const isBurst = Math.random() < 0.2; // 20% chance of quick follow-up
      const delay = isBurst ? randInt(300, 800) : randInt(1500, 5000);
      state.nextBroadcastTime = now + delay;
    }
  }, 500);

  tableBroadcastStates.set(tableId, state);
}

// Stop fake broadcasts for a table
export function stopTableFakeBroadcasts(tableId: string): void {
  const state = tableBroadcastStates.get(tableId);
  if (state) {
    state.isActive = false;
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    tableBroadcastStates.delete(tableId);
  }
}
