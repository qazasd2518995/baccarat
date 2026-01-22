import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, DollarSign, TrendingUp, AlertTriangle, Plus, Edit, Trash2, RefreshCw, Search } from 'lucide-react';
import DataTable from '../../components/admin/common/DataTable';
import Modal, { ModalFooter, Button, Input } from '../../components/admin/common/Modal';
import { bettingLimitApi, gameControlApi, userApi } from '../../services/api';

type ControlTab = 'betting-limits' | 'deposit-control' | 'win-cap';

interface BettingLimit {
  id: string;
  name: string;
  playerMin: number;
  playerMax: number;
  bankerMin: number;
  bankerMax: number;
  tieMin: number;
  tieMax: number;
  pairMin: number;
  pairMax: number;
  isDefault: boolean;
}

interface DepositControl {
  id: string;
  userId: string;
  username: string;
  enabled: boolean;
  minAmount: number | null;
  maxAmount: number | null;
  note: string | null;
}

interface WinCapControl {
  id: string;
  userId: string;
  username: string;
  enabled: boolean;
  dailyCap: number | null;
  weeklyCap: number | null;
  monthlyCap: number | null;
  currentWin: number;
  note: string | null;
}

interface User {
  id: string;
  username: string;
  balance: number;
}

export default function GameControl() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ControlTab>('betting-limits');
  const [loading, setLoading] = useState(true);

  // Data states
  const [bettingLimits, setBettingLimits] = useState<BettingLimit[]>([]);
  const [depositControls, setDepositControls] = useState<DepositControl[]>([]);
  const [winCapControls, setWinCapControls] = useState<WinCapControl[]>([]);
  const [members, setMembers] = useState<User[]>([]);

  // Modal states
  const [showBettingLimitModal, setShowBettingLimitModal] = useState(false);
  const [showDepositControlModal, setShowDepositControlModal] = useState(false);
  const [showWinCapModal, setShowWinCapModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BettingLimit | DepositControl | WinCapControl | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form states
  const [bettingLimitForm, setBettingLimitForm] = useState({
    name: '',
    playerMin: '',
    playerMax: '',
    bankerMin: '',
    bankerMax: '',
    tieMin: '',
    tieMax: '',
    pairMin: '',
    pairMax: '',
    isDefault: false,
  });

  const [depositControlForm, setDepositControlForm] = useState({
    enabled: true,
    minAmount: '',
    maxAmount: '',
    note: '',
  });

  const [winCapForm, setWinCapForm] = useState({
    enabled: true,
    dailyCap: '',
    weeklyCap: '',
    monthlyCap: '',
    note: '',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'betting-limits') {
        const response = await bettingLimitApi.getLimits();
        setBettingLimits(response.data || []);
      } else {
        // Fetch members for deposit/win cap controls
        const membersResponse = await userApi.getUsers({ role: 'member', limit: 100 });
        const membersList = membersResponse.data.users || [];
        setMembers(membersList);

        // For demonstration, we'll show controls for users who have them configured
        // In a real app, you might want to fetch all controls via a dedicated API
        const controlsWithUsers: (DepositControl | WinCapControl)[] = [];

        for (const member of membersList.slice(0, 10)) {
          try {
            if (activeTab === 'deposit-control') {
              const control = await gameControlApi.getDepositControl(member.id);
              if (control.data && control.data.enabled) {
                controlsWithUsers.push({
                  ...control.data,
                  userId: member.id,
                  username: member.username,
                });
              }
            } else if (activeTab === 'win-cap') {
              const control = await gameControlApi.getWinCapControl(member.id);
              if (control.data && control.data.enabled) {
                controlsWithUsers.push({
                  ...control.data,
                  userId: member.id,
                  username: member.username,
                });
              }
            }
          } catch {
            // Skip if no control exists
          }
        }

        if (activeTab === 'deposit-control') {
          setDepositControls(controlsWithUsers as DepositControl[]);
        } else {
          setWinCapControls(controlsWithUsers as WinCapControl[]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBettingLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);

    try {
      const data = {
        name: bettingLimitForm.name,
        playerMin: parseFloat(bettingLimitForm.playerMin),
        playerMax: parseFloat(bettingLimitForm.playerMax),
        bankerMin: parseFloat(bettingLimitForm.bankerMin),
        bankerMax: parseFloat(bettingLimitForm.bankerMax),
        tieMin: parseFloat(bettingLimitForm.tieMin),
        tieMax: parseFloat(bettingLimitForm.tieMax),
        pairMin: parseFloat(bettingLimitForm.pairMin),
        pairMax: parseFloat(bettingLimitForm.pairMax),
        isDefault: bettingLimitForm.isDefault,
      };

      if (editingItem) {
        await bettingLimitApi.updateLimit((editingItem as BettingLimit).id, data);
      } else {
        await bettingLimitApi.createLimit(data);
      }

      setShowBettingLimitModal(false);
      resetBettingLimitForm();
      fetchData();
    } catch (error: any) {
      setFormErrors({ submit: error.response?.data?.error || t('operationFailed') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDepositControl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormErrors({});
    setSubmitting(true);

    try {
      await gameControlApi.setDepositControl(selectedUser.id, {
        enabled: depositControlForm.enabled,
        minAmount: depositControlForm.minAmount ? parseFloat(depositControlForm.minAmount) : null,
        maxAmount: depositControlForm.maxAmount ? parseFloat(depositControlForm.maxAmount) : null,
        note: depositControlForm.note || null,
      });

      setShowDepositControlModal(false);
      setSelectedUser(null);
      resetDepositControlForm();
      fetchData();
    } catch (error: any) {
      setFormErrors({ submit: error.response?.data?.error || t('operationFailed') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveWinCap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormErrors({});
    setSubmitting(true);

    try {
      await gameControlApi.setWinCapControl(selectedUser.id, {
        enabled: winCapForm.enabled,
        dailyCap: winCapForm.dailyCap ? parseFloat(winCapForm.dailyCap) : null,
        weeklyCap: winCapForm.weeklyCap ? parseFloat(winCapForm.weeklyCap) : null,
        monthlyCap: winCapForm.monthlyCap ? parseFloat(winCapForm.monthlyCap) : null,
        note: winCapForm.note || null,
      });

      setShowWinCapModal(false);
      setSelectedUser(null);
      resetWinCapForm();
      fetchData();
    } catch (error: any) {
      setFormErrors({ submit: error.response?.data?.error || t('operationFailed') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetWinCap = async (userId: string) => {
    if (!confirm(t('confirmReset'))) return;
    try {
      await gameControlApi.resetWinCap(userId);
      fetchData();
    } catch (error) {
      console.error('Failed to reset win cap:', error);
    }
  };

  const handleDeleteBettingLimit = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await bettingLimitApi.deleteLimit(id);
      fetchData();
    } catch (error) {
      console.error('Failed to delete betting limit:', error);
    }
  };

  const resetBettingLimitForm = () => {
    setBettingLimitForm({
      name: '',
      playerMin: '',
      playerMax: '',
      bankerMin: '',
      bankerMax: '',
      tieMin: '',
      tieMax: '',
      pairMin: '',
      pairMax: '',
      isDefault: false,
    });
    setEditingItem(null);
  };

  const resetDepositControlForm = () => {
    setDepositControlForm({
      enabled: true,
      minAmount: '',
      maxAmount: '',
      note: '',
    });
  };

  const resetWinCapForm = () => {
    setWinCapForm({
      enabled: true,
      dailyCap: '',
      weeklyCap: '',
      monthlyCap: '',
      note: '',
    });
  };

  const openEditBettingLimit = (item: BettingLimit) => {
    setEditingItem(item);
    setBettingLimitForm({
      name: item.name,
      playerMin: item.playerMin.toString(),
      playerMax: item.playerMax.toString(),
      bankerMin: item.bankerMin.toString(),
      bankerMax: item.bankerMax.toString(),
      tieMin: item.tieMin.toString(),
      tieMax: item.tieMax.toString(),
      pairMin: item.pairMin.toString(),
      pairMax: item.pairMax.toString(),
      isDefault: item.isDefault,
    });
    setShowBettingLimitModal(true);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const tabs: { key: ControlTab; label: string; icon: React.ReactNode }[] = [
    { key: 'betting-limits', label: t('bettingLimits'), icon: <DollarSign size={18} /> },
    { key: 'deposit-control', label: t('depositControl'), icon: <Shield size={18} /> },
    { key: 'win-cap', label: t('winCap'), icon: <TrendingUp size={18} /> },
  ];

  const bettingLimitColumns = [
    {
      key: 'name',
      header: t('nickname'),
      render: (item: BettingLimit) => (
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{item.name}</span>
          {item.isDefault && (
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
              {t('default').toUpperCase()}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'player',
      header: t('player'),
      render: (item: BettingLimit) => (
        <span className="text-blue-400">
          ${formatCurrency(item.playerMin)} - ${formatCurrency(item.playerMax)}
        </span>
      ),
    },
    {
      key: 'banker',
      header: t('banker'),
      render: (item: BettingLimit) => (
        <span className="text-red-400">
          ${formatCurrency(item.bankerMin)} - ${formatCurrency(item.bankerMax)}
        </span>
      ),
    },
    {
      key: 'tie',
      header: t('tie'),
      render: (item: BettingLimit) => (
        <span className="text-green-400">
          ${formatCurrency(item.tieMin)} - ${formatCurrency(item.tieMax)}
        </span>
      ),
    },
    {
      key: 'pair',
      header: t('playerPair'),
      render: (item: BettingLimit) => (
        <span className="text-amber-400">
          ${formatCurrency(item.pairMin)} - ${formatCurrency(item.pairMax)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (item: BettingLimit) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditBettingLimit(item)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <Edit size={16} />
          </button>
          {!item.isDefault && (
            <button
              onClick={() => handleDeleteBettingLimit(item.id)}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const depositControlColumns = [
    {
      key: 'username',
      header: t('members'),
      render: (item: DepositControl) => (
        <span className="text-white font-medium">{item.username}</span>
      ),
    },
    {
      key: 'enabled',
      header: t('status'),
      render: (item: DepositControl) => (
        <span
          className={`px-2 py-0.5 text-xs rounded ${
            item.enabled
              ? 'bg-green-500/20 text-green-400'
              : 'bg-slate-500/20 text-slate-400'
          }`}
        >
          {item.enabled ? t('enable').toUpperCase() : t('disable').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'minAmount',
      header: t('minBet'),
      render: (item: DepositControl) => (
        <span className="text-slate-300">${formatCurrency(item.minAmount)}</span>
      ),
    },
    {
      key: 'maxAmount',
      header: t('maxBet'),
      render: (item: DepositControl) => (
        <span className="text-slate-300">${formatCurrency(item.maxAmount)}</span>
      ),
    },
    {
      key: 'note',
      header: t('note'),
      render: (item: DepositControl) => (
        <span className="text-slate-400 text-sm">{item.note || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (item: DepositControl) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedUser({ id: item.userId, username: item.username, balance: 0 });
              setDepositControlForm({
                enabled: item.enabled,
                minAmount: item.minAmount?.toString() || '',
                maxAmount: item.maxAmount?.toString() || '',
                note: item.note || '',
              });
              setShowDepositControlModal(true);
            }}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <Edit size={16} />
          </button>
        </div>
      ),
    },
  ];

  const winCapColumns = [
    {
      key: 'username',
      header: t('members'),
      render: (item: WinCapControl) => (
        <span className="text-white font-medium">{item.username}</span>
      ),
    },
    {
      key: 'enabled',
      header: t('status'),
      render: (item: WinCapControl) => (
        <span
          className={`px-2 py-0.5 text-xs rounded ${
            item.enabled
              ? 'bg-green-500/20 text-green-400'
              : 'bg-slate-500/20 text-slate-400'
          }`}
        >
          {item.enabled ? t('enable').toUpperCase() : t('disable').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'dailyCap',
      header: t('dailyCap'),
      render: (item: WinCapControl) => (
        <span className="text-slate-300">${formatCurrency(item.dailyCap)}</span>
      ),
    },
    {
      key: 'weeklyCap',
      header: t('weeklyCap'),
      render: (item: WinCapControl) => (
        <span className="text-slate-300">${formatCurrency(item.weeklyCap)}</span>
      ),
    },
    {
      key: 'monthlyCap',
      header: t('monthlyCap'),
      render: (item: WinCapControl) => (
        <span className="text-slate-300">${formatCurrency(item.monthlyCap)}</span>
      ),
    },
    {
      key: 'currentWin',
      header: t('currentWin'),
      render: (item: WinCapControl) => {
        const percentage = item.dailyCap ? (item.currentWin / item.dailyCap) * 100 : 0;
        return (
          <div>
            <span
              className={
                percentage >= 80
                  ? 'text-red-400'
                  : percentage >= 50
                  ? 'text-amber-400'
                  : 'text-green-400'
              }
            >
              ${formatCurrency(item.currentWin)}
            </span>
            {item.dailyCap && (
              <span className="text-slate-500 text-xs ml-1">
                ({percentage.toFixed(0)}%)
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32',
      render: (item: WinCapControl) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedUser({ id: item.userId, username: item.username, balance: 0 });
              setWinCapForm({
                enabled: item.enabled,
                dailyCap: item.dailyCap?.toString() || '',
                weeklyCap: item.weeklyCap?.toString() || '',
                monthlyCap: item.monthlyCap?.toString() || '',
                note: item.note || '',
              });
              setShowWinCapModal(true);
            }}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleResetWinCap(item.userId)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-amber-400"
            title={t('resetWin')}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      ),
    },
  ];

  const filteredMembers = members.filter(m =>
    m.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('gameControlTitle')}</h1>
          <p className="text-slate-400 mt-1">{t('gameControlSubtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'betting-limits' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetBettingLimitForm();
                setShowBettingLimitModal(true);
              }}
            >
              <Plus size={18} /> {t('addLimit')}
            </Button>
          </div>

          <div className="bg-slate-800/50 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-400 font-medium">{t('bettingLimits')}</p>
              <p className="text-xs text-slate-400 mt-1">
                {t('gameControlSubtitle')}
              </p>
            </div>
          </div>

          <DataTable
            columns={bettingLimitColumns}
            data={bettingLimits}
            keyField="id"
            loading={loading}
            emptyMessage={t('noData')}
          />
        </div>
      )}

      {activeTab === 'deposit-control' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetDepositControlForm();
                setSelectedUser(null);
                setShowDepositControlModal(true);
              }}
            >
              <Plus size={18} /> {t('addControl')}
            </Button>
          </div>

          <div className="bg-slate-800/50 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
            <Shield size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-400 font-medium">{t('depositControl')}</p>
              <p className="text-xs text-slate-400 mt-1">
                {t('gameControlSubtitle')}
              </p>
            </div>
          </div>

          <DataTable
            columns={depositControlColumns}
            data={depositControls}
            keyField="id"
            loading={loading}
            emptyMessage={t('noData')}
          />
        </div>
      )}

      {activeTab === 'win-cap' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetWinCapForm();
                setSelectedUser(null);
                setShowWinCapModal(true);
              }}
            >
              <Plus size={18} /> {t('addCap')}
            </Button>
          </div>

          <div className="bg-slate-800/50 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
            <TrendingUp size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-green-400 font-medium">{t('winCap')}</p>
              <p className="text-xs text-slate-400 mt-1">
                {t('gameControlSubtitle')}
              </p>
            </div>
          </div>

          <DataTable
            columns={winCapColumns}
            data={winCapControls}
            keyField="id"
            loading={loading}
            emptyMessage={t('noData')}
          />
        </div>
      )}

      {/* Betting Limit Modal */}
      <Modal
        isOpen={showBettingLimitModal}
        onClose={() => {
          setShowBettingLimitModal(false);
          resetBettingLimitForm();
        }}
        title={editingItem ? t('edit') + ' ' + t('bettingLimits') : t('addLimit')}
      >
        <form onSubmit={handleCreateBettingLimit} className="space-y-4">
          <Input
            label={t('nickname')}
            value={bettingLimitForm.name}
            onChange={(e) => setBettingLimitForm({ ...bettingLimitForm, name: e.target.value })}
            placeholder={t('nickname')}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`${t('player')} Min`}
              type="number"
              value={bettingLimitForm.playerMin}
              onChange={(e) => setBettingLimitForm({ ...bettingLimitForm, playerMin: e.target.value })}
              placeholder="10"
              required
            />
            <Input
              label={`${t('player')} Max`}
              type="number"
              value={bettingLimitForm.playerMax}
              onChange={(e) => setBettingLimitForm({ ...bettingLimitForm, playerMax: e.target.value })}
              placeholder="10000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`${t('banker')} Min`}
              type="number"
              value={bettingLimitForm.bankerMin}
              onChange={(e) => setBettingLimitForm({ ...bettingLimitForm, bankerMin: e.target.value })}
              placeholder="10"
              required
            />
            <Input
              label={`${t('banker')} Max`}
              type="number"
              value={bettingLimitForm.bankerMax}
              onChange={(e) => setBettingLimitForm({ ...bettingLimitForm, bankerMax: e.target.value })}
              placeholder="10000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`${t('tie')} Min`}
              type="number"
              value={bettingLimitForm.tieMin}
              onChange={(e) => setBettingLimitForm({ ...bettingLimitForm, tieMin: e.target.value })}
              placeholder="10"
              required
            />
            <Input
              label={`${t('tie')} Max`}
              type="number"
              value={bettingLimitForm.tieMax}
              onChange={(e) => setBettingLimitForm({ ...bettingLimitForm, tieMax: e.target.value })}
              placeholder="5000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`${t('playerPair')} Min`}
              type="number"
              value={bettingLimitForm.pairMin}
              onChange={(e) => setBettingLimitForm({ ...bettingLimitForm, pairMin: e.target.value })}
              placeholder="10"
              required
            />
            <Input
              label={`${t('playerPair')} Max`}
              type="number"
              value={bettingLimitForm.pairMax}
              onChange={(e) => setBettingLimitForm({ ...bettingLimitForm, pairMax: e.target.value })}
              placeholder="3000"
              required
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={bettingLimitForm.isDefault}
              onChange={(e) => setBettingLimitForm({ ...bettingLimitForm, isDefault: e.target.checked })}
              className="rounded border-slate-600 bg-slate-700 text-blue-500"
            />
            <span className="text-sm text-slate-300">{t('setAsDefault')}</span>
          </label>

          {formErrors.submit && (
            <p className="text-sm text-red-400">{formErrors.submit}</p>
          )}

          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowBettingLimitModal(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {t('save')}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Deposit Control Modal */}
      <Modal
        isOpen={showDepositControlModal}
        onClose={() => {
          setShowDepositControlModal(false);
          setSelectedUser(null);
          resetDepositControlForm();
        }}
        title={t('depositControl')}
      >
        <form onSubmit={handleSaveDepositControl} className="space-y-4">
          {!selectedUser && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('selectMember')}
              </label>
              <div className="relative mb-2">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('search') + '...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                />
              </div>
              <div className="max-h-40 overflow-y-auto bg-slate-700 rounded-lg divide-y divide-slate-600">
                {filteredMembers.slice(0, 10).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedUser(member)}
                    className="w-full px-4 py-2 text-left text-white hover:bg-slate-600 transition-colors"
                  >
                    {member.username}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedUser && (
            <>
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-400">{t('members')}</p>
                <p className="font-medium text-white">{selectedUser.username}</p>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={depositControlForm.enabled}
                  onChange={(e) => setDepositControlForm({ ...depositControlForm, enabled: e.target.checked })}
                  className="rounded border-slate-600 bg-slate-700 text-blue-500"
                />
                <span className="text-sm text-slate-300">{t('enable')}</span>
              </label>

              <Input
                label={t('minBet')}
                type="number"
                value={depositControlForm.minAmount}
                onChange={(e) => setDepositControlForm({ ...depositControlForm, minAmount: e.target.value })}
                placeholder="100"
              />

              <Input
                label={t('maxBet')}
                type="number"
                value={depositControlForm.maxAmount}
                onChange={(e) => setDepositControlForm({ ...depositControlForm, maxAmount: e.target.value })}
                placeholder="50000"
              />

              <Input
                label={t('note')}
                value={depositControlForm.note}
                onChange={(e) => setDepositControlForm({ ...depositControlForm, note: e.target.value })}
                placeholder={t('note')}
              />

              {formErrors.submit && (
                <p className="text-sm text-red-400">{formErrors.submit}</p>
              )}

              <ModalFooter>
                <Button variant="secondary" onClick={() => setShowDepositControlModal(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" loading={submitting}>
                  {t('save')}
                </Button>
              </ModalFooter>
            </>
          )}
        </form>
      </Modal>

      {/* Win Cap Modal */}
      <Modal
        isOpen={showWinCapModal}
        onClose={() => {
          setShowWinCapModal(false);
          setSelectedUser(null);
          resetWinCapForm();
        }}
        title={t('winCap')}
      >
        <form onSubmit={handleSaveWinCap} className="space-y-4">
          {!selectedUser && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('selectMember')}
              </label>
              <div className="relative mb-2">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('search') + '...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                />
              </div>
              <div className="max-h-40 overflow-y-auto bg-slate-700 rounded-lg divide-y divide-slate-600">
                {filteredMembers.slice(0, 10).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedUser(member)}
                    className="w-full px-4 py-2 text-left text-white hover:bg-slate-600 transition-colors"
                  >
                    {member.username}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedUser && (
            <>
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-400">{t('members')}</p>
                <p className="font-medium text-white">{selectedUser.username}</p>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={winCapForm.enabled}
                  onChange={(e) => setWinCapForm({ ...winCapForm, enabled: e.target.checked })}
                  className="rounded border-slate-600 bg-slate-700 text-blue-500"
                />
                <span className="text-sm text-slate-300">{t('enable')}</span>
              </label>

              <Input
                label={t('dailyCap')}
                type="number"
                value={winCapForm.dailyCap}
                onChange={(e) => setWinCapForm({ ...winCapForm, dailyCap: e.target.value })}
                placeholder="10000"
              />

              <Input
                label={t('weeklyCap')}
                type="number"
                value={winCapForm.weeklyCap}
                onChange={(e) => setWinCapForm({ ...winCapForm, weeklyCap: e.target.value })}
                placeholder="50000"
              />

              <Input
                label={t('monthlyCap')}
                type="number"
                value={winCapForm.monthlyCap}
                onChange={(e) => setWinCapForm({ ...winCapForm, monthlyCap: e.target.value })}
                placeholder="100000"
              />

              <Input
                label={t('note')}
                value={winCapForm.note}
                onChange={(e) => setWinCapForm({ ...winCapForm, note: e.target.value })}
                placeholder={t('note')}
              />

              {formErrors.submit && (
                <p className="text-sm text-red-400">{formErrors.submit}</p>
              )}

              <ModalFooter>
                <Button variant="secondary" onClick={() => setShowWinCapModal(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" loading={submitting}>
                  {t('save')}
                </Button>
              </ModalFooter>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
