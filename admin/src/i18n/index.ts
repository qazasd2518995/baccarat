import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Common
      loading: 'Loading...',
      noData: 'No data',
      confirm: 'Confirm',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      search: 'Search',
      actions: 'Actions',
      status: 'Status',

      // Auth
      login: 'Login',
      logout: 'Logout',
      username: 'Username',
      password: 'Password',
      loginTitle: 'Admin Panel',
      loginSubtitle: 'Sign in to manage your system',

      // Navigation
      dashboard: 'Dashboard',
      agents: 'Agents',
      members: 'Members',
      transactions: 'Transactions',
      bettingRecords: 'Betting Records',
      gameControl: 'Game Control',
      gameRounds: 'Game Rounds',
      operationLogs: 'Operation Logs',
      reports: 'Reports',
      notices: 'Notices',
      settings: 'Settings',

      // Users
      createUser: 'Create User',
      editUser: 'Edit User',
      role: 'Role',
      balance: 'Balance',
      parentAgent: 'Parent Agent',
      admin: 'Admin',
      agent: 'Agent',
      member: 'Member',
      active: 'Active',
      suspended: 'Suspended',
      banned: 'Banned',

      // Transactions
      deposit: 'Deposit',
      withdraw: 'Withdraw',
      adjustment: 'Adjustment',
      amount: 'Amount',
      note: 'Note',
      operator: 'Operator',
      balanceBefore: 'Balance Before',
      balanceAfter: 'Balance After',

      // Dashboard
      totalUsers: 'Total Users',
      totalAgents: 'Total Agents',
      totalMembers: 'Total Members',
      totalBalance: 'Total Balance',
      todayDeposits: "Today's Deposits",
      todayWithdraws: "Today's Withdrawals",
      recentTransactions: 'Recent Transactions',
      recentGames: 'Recent Games',
    },
  },
  zh: {
    translation: {
      // Common
      loading: '加载中...',
      noData: '暂无数据',
      confirm: '确认',
      cancel: '取消',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      search: '搜索',
      actions: '操作',
      status: '状态',

      // Auth
      login: '登录',
      logout: '退出登录',
      username: '用户名',
      password: '密码',
      loginTitle: '管理后台',
      loginSubtitle: '登录以管理您的系统',

      // Navigation
      dashboard: '仪表盘',
      agents: '代理管理',
      members: '会员管理',
      transactions: '交易记录',
      bettingRecords: '投注记录',
      gameControl: '游戏控制',
      gameRounds: '游戏局数',
      operationLogs: '操作日志',
      reports: '报表',
      notices: '公告',
      settings: '设置',

      // Users
      createUser: '创建用户',
      editUser: '编辑用户',
      role: '角色',
      balance: '余额',
      parentAgent: '上级代理',
      admin: '管理员',
      agent: '代理',
      member: '会员',
      active: '正常',
      suspended: '暂停',
      banned: '禁用',

      // Transactions
      deposit: '入点',
      withdraw: '出点',
      adjustment: '调整',
      amount: '金额',
      note: '备注',
      operator: '操作员',
      balanceBefore: '操作前余额',
      balanceAfter: '操作后余额',

      // Dashboard
      totalUsers: '总用户数',
      totalAgents: '代理数量',
      totalMembers: '会员数量',
      totalBalance: '总余额',
      todayDeposits: '今日入点',
      todayWithdraws: '今日出点',
      recentTransactions: '最近交易',
      recentGames: '最近游戏',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
