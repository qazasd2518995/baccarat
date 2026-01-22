import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, Pin } from 'lucide-react';
import { noticeApi } from '../services/api';

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  isPinned: boolean;
  isPublished: boolean;
  createdAt: string;
}

export default function Notices() {
  const { t } = useTranslation();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info' as 'info' | 'warning' | 'urgent',
    isPinned: false,
    isPublished: true,
  });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const { data } = await noticeApi.getNotices({ limit: 50 });
      setNotices(data.notices || []);
    } catch (error) {
      console.error('Failed to fetch notices:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingNotice(null);
    setFormData({
      title: '',
      content: '',
      type: 'info',
      isPinned: false,
      isPublished: true,
    });
    setShowModal(true);
  };

  const openEditModal = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      type: notice.type,
      isPinned: notice.isPinned,
      isPublished: notice.isPublished,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingNotice) {
        await noticeApi.updateNotice(editingNotice.id, formData);
      } else {
        await noticeApi.createNotice(formData);
      }
      setShowModal(false);
      fetchNotices();
    } catch (error) {
      console.error('Failed to save notice:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条公告吗？')) return;
    try {
      await noticeApi.deleteNotice(id);
      fetchNotices();
    } catch (error) {
      console.error('Failed to delete notice:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'text-red-400 bg-red-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-blue-400 bg-blue-500/20';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'urgent': return '紧急';
      case 'warning': return '警告';
      default: return '信息';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t('notices')}</h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          创建公告
        </motion.button>
      </div>

      {/* Notice List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-slate-400">{t('loading')}</div>
        ) : notices.length === 0 ? (
          <div className="text-center py-8 text-slate-400">{t('noData')}</div>
        ) : (
          notices.map((notice) => (
            <div
              key={notice.id}
              className={`bg-slate-800 rounded-xl p-6 border transition-colors ${
                notice.isPinned ? 'border-amber-500/50' : 'border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {notice.isPinned && (
                    <Pin className="w-4 h-4 text-amber-400" />
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(notice.type)}`}>
                    {getTypeText(notice.type)}
                  </span>
                  {!notice.isPublished && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-600 text-slate-300">
                      草稿
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(notice)}
                    className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(notice.id)}
                    className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{notice.title}</h3>
              <p className="text-slate-400 mb-3 whitespace-pre-wrap">{notice.content}</p>
              <div className="text-sm text-slate-500">
                {new Date(notice.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingNotice ? '编辑公告' : '创建公告'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">内容</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-amber-500 resize-none"
                  rows={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">类型</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="info">信息</option>
                  <option value="warning">警告</option>
                  <option value="urgent">紧急</option>
                </select>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-slate-300">置顶</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-slate-300">发布</span>
                </label>
              </div>
              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl transition-colors"
              >
                {t('save')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
