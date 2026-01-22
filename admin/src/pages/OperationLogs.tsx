import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { operationLogApi } from '../services/api';

interface OperationLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  details: any;
  ip: string;
  operator: {
    username: string;
    nickname: string;
  };
  createdAt: string;
}

export default function OperationLogs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const fetchLogs = async () => {
    try {
      const params: any = { page, limit: 20 };
      if (actionFilter !== 'all') {
        params.action = actionFilter;
      }
      const { data } = await operationLogApi.getLogs(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('deposit')) return 'text-green-400 bg-green-500/20';
    if (action.includes('delete') || action.includes('withdraw')) return 'text-red-400 bg-red-500/20';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-400 bg-blue-500/20';
    return 'text-slate-400 bg-slate-500/20';
  };

  const getActionText = (action: string) => {
    const actionMap: Record<string, string> = {
      'user.create': '创建用户',
      'user.update': '更新用户',
      'user.delete': '删除用户',
      'transaction.deposit': '入点',
      'transaction.withdraw': '出点',
      'transaction.adjustment': '余额调整',
      'notice.create': '创建公告',
      'notice.update': '更新公告',
      'notice.delete': '删除公告',
      'login': '登录',
      'logout': '登出',
    };
    return actionMap[action] || action;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t('operationLogs')}</h1>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
        >
          <option value="all">全部操作</option>
          <option value="user.create">创建用户</option>
          <option value="user.update">更新用户</option>
          <option value="transaction.deposit">入点</option>
          <option value="transaction.withdraw">出点</option>
          <option value="login">登录</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">时间</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">操作员</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">操作</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">目标</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">{t('loading')}</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">{t('noData')}</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(log.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-white font-medium">
                    {log.operator?.nickname || log.operator?.username || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getActionColor(log.action)}`}>
                      {getActionText(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {log.targetType}: {log.targetId?.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-slate-400">{log.ip || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg"
          >
            上一页
          </button>
          <span className="text-slate-400 px-4">
            第 {page} 页 / 共 {Math.ceil(total / 20)} 页
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
