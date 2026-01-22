import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Edit,
  Ban,
  CheckCircle,
  Key,
} from 'lucide-react';
import DataTable from '../../components/admin/common/DataTable';
import Modal, { ModalFooter, Button, Input } from '../../components/admin/common/Modal';
import { useAuthStore } from '../../store/authStore';
import { userApi, transactionApi } from '../../services/api';
import type { User } from '../../types';

interface MemberFormData {
  username: string;
  password: string;
  nickname: string;
  parentAgentId: string;
}

interface PointsFormData {
  type: 'deposit' | 'withdraw';
  amount: string;
  note: string;
}

export default function Members() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<MemberFormData>({
    username: '',
    password: '',
    nickname: '',
    parentAgentId: currentUser?.id || '',
  });
  const [pointsForm, setPointsForm] = useState<PointsFormData>({
    type: 'deposit',
    amount: '',
    note: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [page, search, statusFilter]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: 10,
        role: 'member',
      };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await userApi.getUsers(params);

      setMembers(response.data.users || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotal(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!createForm.username) {
      setFormErrors({ username: t('usernameRequired') || '请输入用户名' });
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      setFormErrors({ password: t('passwordTooShort') || '密码至少需要6个字符' });
      return;
    }

    setSubmitting(true);
    try {
      await userApi.createUser({
        username: createForm.username,
        password: createForm.password,
        nickname: createForm.nickname || undefined,
        role: 'member',
      });

      setShowCreateModal(false);
      setCreateForm({
        username: '',
        password: '',
        nickname: '',
        parentAgentId: currentUser?.id || '',
      });
      fetchMembers();
    } catch (error: any) {
      setFormErrors({ submit: error.response?.data?.error || t('operationFailed') });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePointsOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    setFormErrors({});
    const amount = parseFloat(pointsForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormErrors({ amount: t('invalidAmount') || '请输入有效金额' });
      return;
    }

    setSubmitting(true);
    try {
      await transactionApi.createTransaction({
        userId: selectedMember.id,
        type: pointsForm.type,
        amount,
        note: pointsForm.note || undefined,
      });

      setShowPointsModal(false);
      setPointsForm({ type: 'deposit', amount: '', note: '' });
      setSelectedMember(null);
      fetchMembers();
    } catch (error: any) {
      setFormErrors({ submit: error.response?.data?.error || t('operationFailed') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (member: User, newStatus: 'active' | 'suspended' | 'banned') => {
    try {
      await userApi.updateUser(member.id, { status: newStatus });
      fetchMembers();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
    setActionMenuId(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      suspended: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      banned: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return styles[status as keyof typeof styles] || styles.active;
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      active: t('active'),
      suspended: t('suspended'),
      banned: t('banned'),
    };
    return texts[status] || status;
  };

  const columns = [
    {
      key: 'username',
      header: t('username'),
      render: (member: User) => (
        <div>
          <p className="font-medium text-white">{member.username}</p>
          {member.nickname && (
            <p className="text-xs text-slate-400">{member.nickname}</p>
          )}
        </div>
      ),
    },
    {
      key: 'balance',
      header: t('balance'),
      render: (member: User) => (
        <span className="font-medium text-amber-400">
          ${formatCurrency(member.balance)}
        </span>
      ),
    },
    {
      key: 'parentAgent',
      header: t('parentAgent'),
      render: (member: User) => (
        <span className="text-slate-300">
          {member.parentAgent?.username || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      render: (member: User) => (
        <span
          className={`px-2 py-0.5 text-xs rounded border ${getStatusBadge(member.status)}`}
        >
          {getStatusText(member.status)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: t('createdAt'),
      render: (member: User) => (
        <span className="text-slate-400 text-xs">
          {new Date(member.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (member: User) => (
        <div className="relative">
          <button
            onClick={() => setActionMenuId(actionMenuId === member.id ? null : member.id)}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <MoreVertical size={18} />
          </button>

          {actionMenuId === member.id && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-10">
              <button
                onClick={() => {
                  setSelectedMember(member);
                  setPointsForm({ type: 'deposit', amount: '', note: '' });
                  setShowPointsModal(true);
                  setActionMenuId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-slate-600"
              >
                <ArrowUpRight size={16} /> {t('deposit')}
              </button>
              <button
                onClick={() => {
                  setSelectedMember(member);
                  setPointsForm({ type: 'withdraw', amount: '', note: '' });
                  setShowPointsModal(true);
                  setActionMenuId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-600"
              >
                <ArrowDownRight size={16} /> {t('withdraw')}
              </button>
              <hr className="border-slate-600" />
              <button
                onClick={() => {
                  setSelectedMember(member);
                  setShowEditModal(true);
                  setActionMenuId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-600"
              >
                <Edit size={16} /> {t('edit')}
              </button>
              <button
                onClick={() => {}}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-600"
              >
                <Key size={16} /> {t('resetPassword')}
              </button>
              <hr className="border-slate-600" />
              {member.status === 'active' ? (
                <button
                  onClick={() => handleStatusChange(member, 'suspended')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-slate-600"
                >
                  <Ban size={16} /> {t('suspended')}
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange(member, 'active')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-slate-600"
                >
                  <CheckCircle size={16} /> {t('active')}
                </button>
              )}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('membersTitle')}</h1>
          <p className="text-slate-400 mt-1">{t('membersSubtitle')}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> {t('createMember')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('search') + '...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('all')} {t('status')}</option>
          <option value="active">{t('active')}</option>
          <option value="suspended">{t('suspended')}</option>
          <option value="banned">{t('banned')}</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={members}
        keyField="id"
        loading={loading}
        emptyMessage={t('noData')}
        pagination={{
          page,
          totalPages,
          total,
          onPageChange: setPage,
        }}
      />

      {/* Create Member Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('createMember')}
      >
        <form onSubmit={handleCreateMember} className="space-y-4">
          <Input
            label={t('username')}
            value={createForm.username}
            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
            placeholder={t('username')}
            error={formErrors.username}
          />
          <Input
            label={t('password')}
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            placeholder={t('password')}
            error={formErrors.password}
          />
          <Input
            label={t('nickname')}
            value={createForm.nickname}
            onChange={(e) => setCreateForm({ ...createForm, nickname: e.target.value })}
            placeholder={t('nickname')}
          />

          {formErrors.submit && (
            <p className="text-sm text-red-400">{formErrors.submit}</p>
          )}

          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {t('confirm')}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Points Operation Modal */}
      <Modal
        isOpen={showPointsModal}
        onClose={() => {
          setShowPointsModal(false);
          setSelectedMember(null);
        }}
        title={pointsForm.type === 'deposit' ? t('deposit') : t('withdraw')}
      >
        <form onSubmit={handlePointsOperation} className="space-y-4">
          {selectedMember && (
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-400">{t('members')}</p>
              <p className="font-medium text-white">{selectedMember.username}</p>
              <p className="text-sm text-amber-400">
                {t('balance')}: ${formatCurrency(selectedMember.balance)}
              </p>
            </div>
          )}

          <Input
            label={t('amount')}
            type="number"
            step="0.01"
            min="0"
            value={pointsForm.amount}
            onChange={(e) => setPointsForm({ ...pointsForm, amount: e.target.value })}
            placeholder={t('amount')}
            error={formErrors.amount}
          />
          <Input
            label={t('note')}
            value={pointsForm.note}
            onChange={(e) => setPointsForm({ ...pointsForm, note: e.target.value })}
            placeholder={t('note')}
          />

          {formErrors.submit && (
            <p className="text-sm text-red-400">{formErrors.submit}</p>
          )}

          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowPointsModal(false);
                setSelectedMember(null);
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant={pointsForm.type === 'deposit' ? 'success' : 'danger'}
              loading={submitting}
            >
              {pointsForm.type === 'deposit' ? t('deposit') : t('withdraw')}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedMember(null);
        }}
        title={t('edit') + ' ' + t('members')}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selectedMember) return;
            setSubmitting(true);
            try {
              await userApi.updateUser(selectedMember.id, {
                nickname: selectedMember.nickname || undefined,
              });
              setShowEditModal(false);
              setSelectedMember(null);
              fetchMembers();
            } catch (error: any) {
              setFormErrors({ submit: error.response?.data?.error || t('operationFailed') });
            } finally {
              setSubmitting(false);
            }
          }}
          className="space-y-4"
        >
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-400">{t('username')}</p>
            <p className="font-medium text-white">{selectedMember?.username}</p>
          </div>

          <Input
            label={t('nickname')}
            value={selectedMember?.nickname || ''}
            onChange={(e) =>
              setSelectedMember(selectedMember ? { ...selectedMember, nickname: e.target.value } : null)
            }
            placeholder={t('nickname')}
          />

          {formErrors.submit && (
            <p className="text-sm text-red-400">{formErrors.submit}</p>
          )}

          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                setSelectedMember(null);
              }}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {t('saveChanges')}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
