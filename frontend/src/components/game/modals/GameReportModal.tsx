import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Calendar, ChevronLeft, ChevronRight, Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { gameApi, transactionApi } from '../../../services/api';
import PlayingCard from '../PlayingCard';
import type { Card } from '../../../types';

interface GameReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportTab = 'betting' | 'balance';

interface BetDetail {
  type: string;
  amount: number;
  payout: number;
  status: string;
}

interface BettingRecord {
  roundId: string;
  fullRoundId: string;
  game: string;
  gameType: 'baccarat' | 'dragontiger' | 'bullbull';
  settleTime: string;
  table: string;
  shoe: number;
  round: number;
  betAmount: number;
  validBet: number;
  result: string;
  winLoss: number;
  // Baccarat specific
  playerCards?: Card[];
  bankerCards?: Card[];
  playerPoints?: number;
  bankerPoints?: number;
  playerPair?: boolean;
  bankerPair?: boolean;
  // Dragon Tiger specific
  dragonCard?: Card;
  tigerCard?: Card;
  dragonValue?: number;
  tigerValue?: number;
  // Bull Bull specific
  bbBankerCards?: Card[];
  bbPlayer1Cards?: Card[];
  bbPlayer2Cards?: Card[];
  bbPlayer3Cards?: Card[];
  bankerRank?: string;
  player1Rank?: string;
  player2Rank?: string;
  player3Rank?: string;
  player1Result?: string;
  player2Result?: string;
  player3Result?: string;
  bets: BetDetail[];
}

interface BalanceRecord {
  orderId: string;
  type: string;
  time: string;
  beforeAmount: number;
  amount: number;
  afterAmount: number;
  note: string;
}

export default function GameReportModal({ isOpen, onClose }: GameReportModalProps) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<ReportTab>('betting');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Real data states
  const [bettingRecords, setBettingRecords] = useState<BettingRecord[]>([]);
  const [balanceRecords, setBalanceRecords] = useState<BalanceRecord[]>([]);
  const tabs: { id: ReportTab; labelKey: string }[] = [
    { id: 'betting', labelKey: 'bettingReport' },
    { id: 'balance', labelKey: 'balanceReport' },
  ];

  // Helper to translate bet type
  const translateBetType = (type: string) => {
    const betTypeMap: Record<string, { zh: string; en: string }> = {
      // Baccarat
      player: { zh: '闲', en: 'Player' },
      banker: { zh: '庄', en: 'Banker' },
      tie: { zh: '和', en: 'Tie' },
      player_pair: { zh: '闲对', en: 'P.Pair' },
      banker_pair: { zh: '庄对', en: 'B.Pair' },
      super_six: { zh: '超级六', en: 'Super 6' },
      player_bonus: { zh: '闲龙宝', en: 'P.Dragon' },
      banker_bonus: { zh: '庄龙宝', en: 'B.Dragon' },
      // Dragon Tiger
      dragon: { zh: '龙', en: 'Dragon' },
      tiger: { zh: '虎', en: 'Tiger' },
      dt_tie: { zh: '和', en: 'Tie' },
      dt_suited_tie: { zh: '同花和', en: 'Suited Tie' },
      dragon_big: { zh: '龙大', en: 'Dragon Big' },
      dragon_small: { zh: '龙小', en: 'Dragon Small' },
      tiger_big: { zh: '虎大', en: 'Tiger Big' },
      tiger_small: { zh: '虎小', en: 'Tiger Small' },
      // Bull Bull
      bb_banker: { zh: '庄', en: 'Banker' },
      bb_player1: { zh: '闲1', en: 'Player 1' },
      bb_player2: { zh: '闲2', en: 'Player 2' },
      bb_player3: { zh: '闲3', en: 'Player 3' },
    };
    const mapped = betTypeMap[type];
    if (mapped) {
      return i18n.language === 'zh' ? mapped.zh : mapped.en;
    }
    return type;
  };

  // Helper to translate Bull Bull rank names
  const translateRank = (rank: string | undefined) => {
    if (!rank) return '-';
    const rankMap: Record<string, { zh: string; en: string }> = {
      bull_bull: { zh: '牛牛', en: 'Bull Bull' },
      bull_9: { zh: '牛9', en: 'Bull 9' },
      bull_8: { zh: '牛8', en: 'Bull 8' },
      bull_7: { zh: '牛7', en: 'Bull 7' },
      bull_6: { zh: '牛6', en: 'Bull 6' },
      bull_5: { zh: '牛5', en: 'Bull 5' },
      bull_4: { zh: '牛4', en: 'Bull 4' },
      bull_3: { zh: '牛3', en: 'Bull 3' },
      bull_2: { zh: '牛2', en: 'Bull 2' },
      bull_1: { zh: '牛1', en: 'Bull 1' },
      no_bull: { zh: '没牛', en: 'No Bull' },
      five_face: { zh: '五公', en: 'Five Face' },
      bomb: { zh: '炸弹', en: 'Bomb' },
      five_small: { zh: '五小牛', en: 'Five Small' },
    };
    const mapped = rankMap[rank];
    if (mapped) {
      return i18n.language === 'zh' ? mapped.zh : mapped.en;
    }
    return rank;
  };

  // Helper to translate win/lose result
  const translateResult = (result: string | undefined) => {
    if (!result) return '-';
    if (result === 'win') {
      return i18n.language === 'zh' ? '赢' : 'Win';
    }
    if (result === 'lose') {
      return i18n.language === 'zh' ? '输' : 'Lose';
    }
    return result;
  };

  // Helper to translate balance report note
  const translateNote = (note: string) => {
    if (!note) return '';
    // Parse "Round #123 - Bets: tie:800" format
    const roundMatch = note.match(/Round #(\d+)/);
    const betsMatch = note.match(/Bets: (.+)/);

    if (roundMatch && betsMatch) {
      const roundNum = roundMatch[1];
      const bets = betsMatch[1];
      // Translate bet types in the bets string
      const translatedBets = bets.split(', ').map(bet => {
        const [type, amount] = bet.split(':');
        return `${translateBetType(type)}:${amount}`;
      }).join(', ');

      if (i18n.language === 'zh') {
        return `第${roundNum}局 - 下注: ${translatedBets}`;
      }
      return `Round #${roundNum} - Bets: ${translatedBets}`;
    }
    return note;
  };

  // Fetch betting history
  const fetchBettingHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; from?: string; to?: string } = {
        page: currentPage,
        limit: 20,
      };
      if (startDate) params.from = startDate;
      if (endDate) params.to = endDate;

      const response = await gameApi.getHistory(params);
      const rounds = response.data?.rounds || [];

      // Map backend data to BettingRecord format
      const records: BettingRecord[] = rounds.map((round: any) => {
        const bets = round.bets || [];
        const totalBet = bets.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
        const totalPayout = bets.reduce((sum: number, b: any) => sum + Number(b.payout), 0);
        const netResult = totalPayout - totalBet;

        // Determine game name based on gameType
        const gameType = round.gameType || 'baccarat';
        let gameName: string;
        if (gameType === 'dragontiger') {
          gameName = i18n.language === 'zh' ? '龙虎' : 'Dragon Tiger';
        } else if (gameType === 'bullbull') {
          gameName = i18n.language === 'zh' ? '牛牛' : 'Bull Bull';
        } else {
          gameName = i18n.language === 'zh' ? '百家乐' : 'Baccarat';
        }

        // Determine result text based on game type
        let resultText = round.result;
        if (gameType === 'baccarat') {
          if (i18n.language === 'zh') {
            resultText = round.result === 'player' ? '闲赢' :
                         round.result === 'banker' ? '庄赢' :
                         round.result === 'tie' ? '和局' : round.result;
          } else {
            resultText = round.result === 'player' ? 'Player' :
                         round.result === 'banker' ? 'Banker' :
                         round.result === 'tie' ? 'Tie' : round.result;
          }
        } else if (gameType === 'dragontiger') {
          if (i18n.language === 'zh') {
            resultText = round.result === 'dragon' ? '龙赢' :
                         round.result === 'tiger' ? '虎赢' :
                         round.result === 'dt_tie' ? '和局' : round.result;
          } else {
            resultText = round.result === 'dragon' ? 'Dragon' :
                         round.result === 'tiger' ? 'Tiger' :
                         round.result === 'dt_tie' ? 'Tie' : round.result;
          }
        } else if (gameType === 'bullbull') {
          // Bull Bull shows player results (win/lose for each position)
          resultText = round.result || '-';
        }

        // Map bet details
        const betDetails: BetDetail[] = bets.map((b: any) => ({
          type: b.betType,
          amount: Number(b.amount),
          payout: Number(b.payout),
          status: b.status,
        }));

        // Get table name from API response or use default
        let tableName = round.table?.name;
        if (!tableName) {
          if (gameType === 'dragontiger') {
            tableName = i18n.language === 'zh' ? '龙虎桌' : 'Dragon Tiger';
          } else if (gameType === 'bullbull') {
            tableName = i18n.language === 'zh' ? '牛牛桌' : 'Bull Bull';
          } else {
            tableName = i18n.language === 'zh' ? '默认桌' : 'Default Table';
          }
        }

        return {
          roundId: round.id.slice(0, 8),
          fullRoundId: round.id,
          game: gameName,
          gameType: gameType as 'baccarat' | 'dragontiger' | 'bullbull',
          settleTime: new Date(round.createdAt).toLocaleString(i18n.language === 'zh' ? 'zh-TW' : 'en-US'),
          table: tableName,
          shoe: round.shoeNumber || 1,
          round: round.roundNumber || 0,
          betAmount: totalBet,
          validBet: totalBet,
          result: resultText,
          winLoss: netResult,
          // Baccarat specific
          playerCards: round.playerCards || [],
          bankerCards: round.bankerCards || [],
          playerPoints: round.playerPoints || 0,
          bankerPoints: round.bankerPoints || 0,
          playerPair: round.playerPair || false,
          bankerPair: round.bankerPair || false,
          // Dragon Tiger specific
          dragonCard: round.dragonCard,
          tigerCard: round.tigerCard,
          dragonValue: round.dragonValue,
          tigerValue: round.tigerValue,
          // Bull Bull specific
          bbBankerCards: round.bankerCards,
          bbPlayer1Cards: round.player1Cards,
          bbPlayer2Cards: round.player2Cards,
          bbPlayer3Cards: round.player3Cards,
          bankerRank: round.bankerRank,
          player1Rank: round.player1Rank,
          player2Rank: round.player2Rank,
          player3Rank: round.player3Rank,
          player1Result: round.player1Result,
          player2Result: round.player2Result,
          player3Result: round.player3Result,
          bets: betDetails,
        };
      });

      setBettingRecords(records);
      setTotalPages(response.data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch betting history:', error);
      setBettingRecords([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, startDate, endDate, i18n.language]);

  // Fetch balance history
  const fetchBalanceHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; startDate?: string; endDate?: string } = {
        page: currentPage,
        limit: 20,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await transactionApi.getTransactions(params);
      const transactions = response.data?.transactions || [];

      // Map backend data to BalanceRecord format
      const records: BalanceRecord[] = transactions.map((tx: any) => {
        // Determine type text
        let typeText = tx.type;
        if (i18n.language === 'zh') {
          typeText = tx.type === 'deposit' ? '入金' :
                     tx.type === 'withdraw' ? '出金' :
                     tx.type === 'bet' ? '下注' :
                     tx.type === 'win' ? '派彩' :
                     tx.type === 'adjustment' ? '调整' : tx.type;
        } else {
          typeText = tx.type === 'deposit' ? 'Deposit' :
                     tx.type === 'withdraw' ? 'Withdraw' :
                     tx.type === 'bet' ? 'Bet' :
                     tx.type === 'win' ? 'Win' :
                     tx.type === 'adjustment' ? 'Adjustment' : tx.type;
        }

        return {
          orderId: tx.id.slice(0, 8),
          type: typeText,
          time: new Date(tx.createdAt).toLocaleString(i18n.language === 'zh' ? 'zh-TW' : 'en-US'),
          beforeAmount: Number(tx.balanceBefore),
          amount: Number(tx.amount),
          afterAmount: Number(tx.balanceAfter),
          note: tx.note || '',
        };
      });

      setBalanceRecords(records);
      setTotalPages(response.data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch balance history:', error);
      setBalanceRecords([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, startDate, endDate, i18n.language]);

  // Fetch data when tab or page changes
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'betting') {
      fetchBettingHistory();
    } else if (activeTab === 'balance') {
      fetchBalanceHistory();
    }
  }, [isOpen, activeTab, currentPage, fetchBettingHistory, fetchBalanceHistory]);

  // Reset page when switching tabs
  useEffect(() => {
    setCurrentPage(1);
    setExpandedRow(null);
  }, [activeTab]);

  const handleSearch = () => {
    setCurrentPage(1);
    setExpandedRow(null);
    if (activeTab === 'betting') {
      fetchBettingHistory();
    } else if (activeTab === 'balance') {
      fetchBalanceHistory();
    }
  };

  const toggleExpand = (roundId: string) => {
    setExpandedRow(expandedRow === roundId ? null : roundId);
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
          className="bg-[#1a2235] rounded-xl w-[950px] max-h-[85vh] overflow-hidden shadow-2xl border border-gray-700/50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
            <h2 className="text-xl font-bold text-white">{t('gameReport')}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700/50 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-orange-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t(tab.labelKey)}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeReportTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-700/50 bg-[#141922]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#2a3548] text-white text-sm px-3 py-2 rounded border border-gray-600/50 outline-none focus:border-orange-500/50"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#2a3548] text-white text-sm px-3 py-2 rounded border border-gray-600/50 outline-none focus:border-orange-500/50"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {t('search')}
            </button>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
              </div>
            ) : (
              <>
                {activeTab === 'betting' && (
                  <table className="w-full text-sm">
                    <thead className="bg-[#2a3548] text-gray-400">
                      <tr>
                        <th className="px-2 py-3 text-left w-8"></th>
                        <th className="px-2 py-3 text-left">{t('roundId')}</th>
                        <th className="px-2 py-3 text-left">{t('game')}</th>
                        <th className="px-2 py-3 text-left">{t('settleTime')}</th>
                        <th className="px-2 py-3 text-left">{t('table')}</th>
                        <th className="px-2 py-3 text-center">{t('shoeNum')}</th>
                        <th className="px-2 py-3 text-center">{t('roundNum')}</th>
                        <th className="px-2 py-3 text-right">{t('betAmount')}</th>
                        <th className="px-2 py-3 text-right">{t('validBet')}</th>
                        <th className="px-2 py-3 text-center">{t('result')}</th>
                        <th className="px-2 py-3 text-right">{t('winLoss')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bettingRecords.map((record) => (
                        <>
                          <tr
                            key={record.roundId}
                            className={`border-b border-gray-700/30 hover:bg-gray-800/30 cursor-pointer ${
                              expandedRow === record.roundId ? 'bg-gray-800/40' : ''
                            }`}
                            onClick={() => toggleExpand(record.roundId)}
                          >
                            <td className="px-2 py-3 text-gray-400">
                              {expandedRow === record.roundId ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </td>
                            <td className="px-2 py-3 text-gray-300 font-mono">{record.roundId}</td>
                            <td className="px-2 py-3 text-gray-300">{record.game}</td>
                            <td className="px-2 py-3 text-gray-400 text-xs">{record.settleTime}</td>
                            <td className="px-2 py-3 text-gray-300">{record.table}</td>
                            <td className="px-2 py-3 text-center text-gray-400">{record.shoe}</td>
                            <td className="px-2 py-3 text-center text-gray-400">{record.round}</td>
                            <td className="px-2 py-3 text-right text-gray-300">{record.betAmount.toLocaleString()}</td>
                            <td className="px-2 py-3 text-right text-gray-300">{record.validBet.toLocaleString()}</td>
                            <td className="px-2 py-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs ${
                                record.result.includes('庄') || record.result === 'Banker' ? 'bg-red-500/20 text-red-400' :
                                record.result.includes('闲') || record.result === 'Player' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                                {record.result}
                              </span>
                            </td>
                            <td className={`px-2 py-3 text-right font-medium ${
                              record.winLoss > 0 ? 'text-green-400' :
                              record.winLoss < 0 ? 'text-red-400' :
                              'text-gray-400'
                            }`}>
                              {record.winLoss > 0 ? '+' : ''}{record.winLoss.toLocaleString()}
                            </td>
                          </tr>
                          {/* Expanded Row with Card Details */}
                          {expandedRow === record.roundId && (
                            <tr key={`${record.roundId}-expanded`}>
                              <td colSpan={11} className="bg-[#0d1117] border-b border-gray-700/30">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="p-4"
                                >
                                  <div className="flex gap-8">
                                    {/* Baccarat: Player & Banker Cards */}
                                    {record.gameType === 'baccarat' && (
                                      <>
                                        <div className="flex-1">
                                          <div className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                                            {t('playerHand')}
                                            <span className="bg-blue-500/20 px-2 py-0.5 rounded text-xs">
                                              {record.playerPoints} {t('points')}
                                            </span>
                                            {record.playerPair && (
                                              <span className="bg-blue-500/30 px-2 py-0.5 rounded text-xs">
                                                {t('playerPair')}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex gap-2">
                                            {record.playerCards?.map((card, idx) => (
                                              <PlayingCard key={idx} card={card} size="sm" />
                                            ))}
                                            {(!record.playerCards || record.playerCards.length === 0) && (
                                              <span className="text-gray-500 text-xs">{t('noData')}</span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex-1">
                                          <div className="text-red-400 font-medium mb-2 flex items-center gap-2">
                                            {t('bankerHand')}
                                            <span className="bg-red-500/20 px-2 py-0.5 rounded text-xs">
                                              {record.bankerPoints} {t('points')}
                                            </span>
                                            {record.bankerPair && (
                                              <span className="bg-red-500/30 px-2 py-0.5 rounded text-xs">
                                                {t('bankerPair')}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex gap-2">
                                            {record.bankerCards?.map((card, idx) => (
                                              <PlayingCard key={idx} card={card} size="sm" />
                                            ))}
                                            {(!record.bankerCards || record.bankerCards.length === 0) && (
                                              <span className="text-gray-500 text-xs">{t('noData')}</span>
                                            )}
                                          </div>
                                        </div>
                                      </>
                                    )}

                                    {/* Dragon Tiger: Dragon & Tiger Cards */}
                                    {record.gameType === 'dragontiger' && (
                                      <>
                                        <div className="flex-1">
                                          <div className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
                                            {i18n.language === 'zh' ? '龙' : 'Dragon'}
                                            <span className="bg-yellow-500/20 px-2 py-0.5 rounded text-xs">
                                              {record.dragonValue}
                                            </span>
                                          </div>
                                          <div className="flex gap-2">
                                            {record.dragonCard && (
                                              <PlayingCard card={record.dragonCard} size="sm" />
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex-1">
                                          <div className="text-purple-400 font-medium mb-2 flex items-center gap-2">
                                            {i18n.language === 'zh' ? '虎' : 'Tiger'}
                                            <span className="bg-purple-500/20 px-2 py-0.5 rounded text-xs">
                                              {record.tigerValue}
                                            </span>
                                          </div>
                                          <div className="flex gap-2">
                                            {record.tigerCard && (
                                              <PlayingCard card={record.tigerCard} size="sm" />
                                            )}
                                          </div>
                                        </div>
                                      </>
                                    )}

                                    {/* Bull Bull: All Hands */}
                                    {record.gameType === 'bullbull' && (
                                      <div className="flex-1 grid grid-cols-2 gap-4">
                                        <div>
                                          <div className="text-yellow-400 font-medium mb-2">
                                            {i18n.language === 'zh' ? '庄家' : 'Banker'} - {translateRank(record.bankerRank)}
                                          </div>
                                          <div className="flex gap-1 flex-wrap">
                                            {record.bbBankerCards?.map((card, idx) => (
                                              <PlayingCard key={idx} card={card} size="sm" />
                                            ))}
                                          </div>
                                        </div>
                                        <div>
                                          <div className={`font-medium mb-2 ${record.player1Result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                                            {i18n.language === 'zh' ? '闲1' : 'P1'} - {translateRank(record.player1Rank)} ({translateResult(record.player1Result)})
                                          </div>
                                          <div className="flex gap-1 flex-wrap">
                                            {record.bbPlayer1Cards?.map((card, idx) => (
                                              <PlayingCard key={idx} card={card} size="sm" />
                                            ))}
                                          </div>
                                        </div>
                                        <div>
                                          <div className={`font-medium mb-2 ${record.player2Result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                                            {i18n.language === 'zh' ? '闲2' : 'P2'} - {translateRank(record.player2Rank)} ({translateResult(record.player2Result)})
                                          </div>
                                          <div className="flex gap-1 flex-wrap">
                                            {record.bbPlayer2Cards?.map((card, idx) => (
                                              <PlayingCard key={idx} card={card} size="sm" />
                                            ))}
                                          </div>
                                        </div>
                                        <div>
                                          <div className={`font-medium mb-2 ${record.player3Result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                                            {i18n.language === 'zh' ? '闲3' : 'P3'} - {translateRank(record.player3Rank)} ({translateResult(record.player3Result)})
                                          </div>
                                          <div className="flex gap-1 flex-wrap">
                                            {record.bbPlayer3Cards?.map((card, idx) => (
                                              <PlayingCard key={idx} card={card} size="sm" />
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* My Bets */}
                                    <div className="flex-1">
                                      <div className="text-orange-400 font-medium mb-2">
                                        {t('myBets')}
                                      </div>
                                      {record.bets.length > 0 ? (
                                        <div className="space-y-1">
                                          {record.bets.map((bet, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs bg-gray-800/50 px-2 py-1 rounded">
                                              <span className="text-gray-300">{translateBetType(bet.type)}</span>
                                              <span className="text-gray-400">{bet.amount.toLocaleString()}</span>
                                              <span className={bet.status === 'won' ? 'text-green-400' : bet.status === 'lost' ? 'text-red-400' : 'text-gray-400'}>
                                                {bet.status === 'won' ? `+${bet.payout.toLocaleString()}` :
                                                 bet.status === 'lost' ? `-${bet.amount.toLocaleString()}` :
                                                 '0'}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-gray-500 text-xs">{t('noData')}</span>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'balance' && (
                  <table className="w-full text-sm">
                    <thead className="bg-[#2a3548] text-gray-400">
                      <tr>
                        <th className="px-3 py-3 text-left">{t('orderId')}</th>
                        <th className="px-3 py-3 text-left">{t('transactionType')}</th>
                        <th className="px-3 py-3 text-left">{t('time')}</th>
                        <th className="px-3 py-3 text-right">{t('beforeAmount')}</th>
                        <th className="px-3 py-3 text-right">{t('amount')}</th>
                        <th className="px-3 py-3 text-right">{t('afterAmount')}</th>
                        <th className="px-3 py-3 text-left">{t('note')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceRecords.map((record) => (
                        <tr key={record.orderId} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                          <td className="px-3 py-3 text-gray-300">{record.orderId}</td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              record.type === '入金' || record.type === 'Deposit' ? 'bg-green-500/20 text-green-400' :
                              record.type === '下注' || record.type === 'Bet' ? 'bg-orange-500/20 text-orange-400' :
                              record.type === '派彩' || record.type === 'Win' ? 'bg-blue-500/20 text-blue-400' :
                              record.type === '出金' || record.type === 'Withdraw' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {record.type}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-gray-400">{record.time}</td>
                          <td className="px-3 py-3 text-right text-gray-300">{record.beforeAmount.toLocaleString()}</td>
                          <td className={`px-3 py-3 text-right font-medium ${
                            record.amount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {record.amount > 0 ? '+' : ''}{record.amount.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-300">{record.afterAmount.toLocaleString()}</td>
                          <td className="px-3 py-3 text-gray-400">{translateNote(record.note)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Empty State */}
                {((activeTab === 'betting' && bettingRecords.length === 0) ||
                  (activeTab === 'balance' && balanceRecords.length === 0)) && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <div className="text-4xl mb-4">📋</div>
                    <p>{t('noRecords')}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-gray-700/50 bg-[#141922]">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
              className="p-2 rounded bg-[#2a3548] text-gray-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  disabled={loading}
                  className={`w-8 h-8 rounded text-sm ${
                    currentPage === page
                      ? 'bg-orange-500 text-white'
                      : 'bg-[#2a3548] text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || loading}
              className="p-2 rounded bg-[#2a3548] text-gray-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
