import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Pin, PinOff, Eye, EyeOff, Bell, AlertTriangle, Info } from 'lucide-react';
import DataTable from '../../components/admin/common/DataTable';
import Modal, { ModalFooter, Button, Input, Select } from '../../components/admin/common/Modal';
// import { useAuthStore } from '../../store/authStore';
import { noticeApi } from '../../services/api';

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  isPinned: boolean;
  isPublished: boolean;
  createdBy: string;
  creator: { username: string };
  createdAt: string;
  updatedAt: string;
}

interface NoticeFormData {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  isPinned: boolean;
  isPublished: boolean;
}

export default function Notices() {
  const { t } = useTranslation();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<NoticeFormData>({
    title: '',
    content: '',
    type: 'info',
    isPinned: false,
    isPublished: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const response = await noticeApi.getNotices();
      setNotices(response.data.notices || []);
    } catch (error) {
      console.error('Failed to fetch notices:', error);
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!formData.title.trim()) {
      setFormErrors({ title: 'Title is required' });
      return;
    }
    if (!formData.content.trim()) {
      setFormErrors({ content: 'Content is required' });
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await noticeApi.createNotice(formData);
      } else if (selectedNotice) {
        await noticeApi.updateNotice(selectedNotice.id, formData);
      }
      setShowModal(false);
      resetForm();
      fetchNotices();
    } catch (error: any) {
      setFormErrors({ submit: error.response?.data?.error || 'Failed to save notice' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (notice: Notice) => {
    setSelectedNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      type: notice.type,
      isPinned: notice.isPinned,
      isPublished: notice.isPublished,
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDelete = async (notice: Notice) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await noticeApi.deleteNotice(notice.id);
      fetchNotices();
    } catch (error) {
      console.error('Failed to delete notice:', error);
    }
  };

  const handleTogglePin = async (notice: Notice) => {
    try {
      await noticeApi.togglePin(notice.id);
      setNotices(
        notices.map((n) =>
          n.id === notice.id ? { ...n, isPinned: !n.isPinned } : n
        )
      );
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleTogglePublish = async (notice: Notice) => {
    try {
      await noticeApi.togglePublish(notice.id);
      setNotices(
        notices.map((n) =>
          n.id === notice.id ? { ...n, isPublished: !n.isPublished } : n
        )
      );
    } catch (error) {
      console.error('Failed to toggle publish:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'info',
      isPinned: false,
      isPublished: true,
    });
    setSelectedNotice(null);
    setFormErrors({});
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-400" />;
      case 'urgent':
        return <Bell size={16} className="text-red-400" />;
      default:
        return <Info size={16} className="text-blue-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return styles[type as keyof typeof styles] || styles.info;
  };

  const columns = [
    {
      key: 'title',
      header: t('noticeTitle'),
      render: (notice: Notice) => (
        <div className="flex items-center gap-2">
          {getTypeIcon(notice.type)}
          <div>
            <p className="text-white font-medium">{notice.title}</p>
            <p className="text-xs text-slate-400 truncate max-w-[300px]">
              {notice.content}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('noticeType'),
      render: (notice: Notice) => (
        <span className={`px-2 py-0.5 text-xs rounded border ${getTypeBadge(notice.type)}`}>
          {notice.type.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      render: (notice: Notice) => (
        <div className="flex items-center gap-2">
          {notice.isPinned && (
            <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
              {t('pinned').toUpperCase()}
            </span>
          )}
          <span
            className={`px-2 py-0.5 text-xs rounded ${
              notice.isPublished
                ? 'bg-green-500/20 text-green-400'
                : 'bg-slate-500/20 text-slate-400'
            }`}
          >
            {notice.isPublished ? t('published').toUpperCase() : t('unpublished').toUpperCase()}
          </span>
        </div>
      ),
    },
    {
      key: 'creator',
      header: t('operator'),
      render: (notice: Notice) => (
        <span className="text-slate-400">{notice.creator.username}</span>
      ),
    },
    {
      key: 'createdAt',
      header: t('createdAt'),
      render: (notice: Notice) => (
        <span className="text-slate-400 text-sm">
          {new Date(notice.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32',
      render: (notice: Notice) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleTogglePin(notice)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-purple-400"
            title={notice.isPinned ? 'Unpin' : 'Pin'}
          >
            {notice.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
          <button
            onClick={() => handleTogglePublish(notice)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-green-400"
            title={notice.isPublished ? 'Unpublish' : 'Publish'}
          >
            {notice.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            onClick={() => handleEdit(notice)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete(notice)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('noticesTitle')}</h1>
          <p className="text-slate-400 mt-1">{t('noticesSubtitle')}</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setModalMode('create');
            setShowModal(true);
          }}
        >
          <Plus size={18} /> {t('createNotice')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">{t('notices')}</p>
          <p className="text-2xl font-bold text-white">{notices.length}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">{t('published')}</p>
          <p className="text-2xl font-bold text-green-400">
            {notices.filter((n) => n.isPublished).length}
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">{t('pinned')}</p>
          <p className="text-2xl font-bold text-purple-400">
            {notices.filter((n) => n.isPinned).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={notices}
        keyField="id"
        loading={loading}
        emptyMessage={t('noData')}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={modalMode === 'create' ? t('createNotice') : t('edit') + ' ' + t('notices')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('noticeTitle')}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder={t('noticeTitle')}
            error={formErrors.title}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">{t('noticeContent')}</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder={t('noticeContent')}
              rows={5}
              className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                formErrors.content ? 'border-red-500' : 'border-slate-600'
              }`}
            />
            {formErrors.content && (
              <p className="text-xs text-red-400">{formErrors.content}</p>
            )}
          </div>

          <Select
            label={t('noticeType')}
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value as NoticeFormData['type'] })
            }
            options={[
              { value: 'info', label: t('info') },
              { value: 'warning', label: t('warning') },
              { value: 'urgent', label: t('urgent') },
            ]}
          />

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPinned}
                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">{t('pinned')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">{t('published')}</span>
            </label>
          </div>

          {formErrors.submit && (
            <p className="text-sm text-red-400">{formErrors.submit}</p>
          )}

          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {modalMode === 'create' ? t('createNotice') : t('saveChanges')}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
