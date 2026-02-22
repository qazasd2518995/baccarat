import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  zh: {
    translation: {
      // Common
      confirm: '确认',
      cancel: '取消',
      submit: '提交',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      search: '搜索',
      loading: '加载中...',
      noData: '暂无数据',
      success: '操作成功',
      error: '操作失败',
      export: '导出',
      create: '新增',
      all: '全部',
      enable: '启用',
      disable: '停用',
      time: '时间',
      type: '类型',
      actions: '操作',
      details: '详情',
      from: '从',
      to: '至',

      // Auth
      login: '登录',
      logout: '登出',
      username: '用户名',
      password: '密码',
      loginTitle: '百家乐游戏',
      loginSubtitle: '请登录您的账户',
      loginError: '用户名或密码错误',
      currentPassword: '当前密码',
      newPassword: '新密码',
      confirmPassword: '确认密码',
      changePassword: '修改密码',
      passwordChanged: '密码修改成功',

      // Navigation
      game: '游戏',
      admin: '管理后台',
      dashboard: '仪表盘',
      users: '用户管理',
      agents: '代理管理',
      members: '会员管理',
      transactions: '交易记录',
      gameHistory: '游戏记录',
      settings: '设置',
      reports: '报表',
      gameRounds: '牌局记录',
      gameControl: '游戏控制',
      notices: '公告管理',
      operationLogs: '操作日志',
      profile: '个人资料',

      // Game
      player: '闲',
      banker: '庄',
      tie: '和',
      playerPair: '闲对',
      bankerPair: '庄对',
      superSix: '超级六',
      placeBet: '下注',
      deal: '发牌',
      newRound: '新局',
      balance: '余额',
      totalBet: '总下注',
      clearBets: '清除下注',
      confirmBet: '确认下注',
      betSuccess: '下注成功',
      wins: '赢',
      loses: '输',
      points: '点',
      round: '局',
      shoe: '靴',
      result: '结果',
      natural: '天牌',

      // Roadmap
      roadmap: '路单',
      beadRoad: '珠盘路',
      bigRoad: '大路',
      bigEyeRoad: '大眼仔',
      smallRoad: '小路',
      cockroachRoad: '蟑螂路',

      // Payouts
      payout: '赔率',
      bankerPayout: '庄 1:0.95',
      playerPayout: '闲 1:1',
      tiePayout: '和 1:8',
      pairPayout: '对子 1:11',
      super6Payout: '超六 1:12/20',

      // Admin Common
      createUser: '创建用户',
      deposit: '入点',
      withdraw: '出点',
      adjustment: '调整',
      amount: '金额',
      note: '备注',
      status: '状态',
      active: '正常',
      suspended: '暂停',
      banned: '禁用',
      createdAt: '创建时间',
      parentAgent: '上级代理',
      subUsers: '下级用户',
      resetPassword: '重置密码',
      nickname: '昵称',
      role: '角色',
      operator: '操作员',

      // Dashboard
      dashboardTitle: '仪表盘',
      dashboardSubtitle: '系统概览和统计数据',
      todayStats: '今日统计',
      totalBets: '总投注',
      totalPayouts: '总派彩',
      netRevenue: '净收入',
      activeUsers: '活跃用户',
      recentTransactions: '最近交易',
      quickActions: '快捷操作',
      newAgent: '新增代理',
      newMember: '新增会员',
      viewReports: '查看报表',

      // Agents
      agentsTitle: '代理管理',
      agentsSubtitle: '管理代理账户',
      createAgent: '新增代理',
      agentList: '代理列表',
      downlineCount: '下级数量',
      commission: '佣金',

      // Members
      membersTitle: '会员管理',
      membersSubtitle: '管理会员账户',
      createMember: '新增会员',
      memberList: '会员列表',
      lastLogin: '最后登录',
      totalWagered: '总投注额',

      // Transactions
      transactionsTitle: '交易记录',
      transactionsSubtitle: '查看所有交易记录',
      transactionType: '交易类型',
      balanceBefore: '交易前余额',
      balanceAfter: '交易后余额',
      allTypes: '所有类型',
      bet: '下注',
      win: '派彩',
      refund: '退款',

      // Reports
      reportsTitle: '报表',
      reportsSubtitle: '查看业绩报表和统计',
      memberReport: '会员报表',
      agentReport: '代理报表',
      dateRange: '日期范围',
      totalRounds: '总局数',
      totalWins: '总赢额',
      totalLosses: '总输额',
      netResult: '净输赢',
      memberCount: '会员数',

      // Game Rounds
      gameRoundsTitle: '牌局记录',
      gameRoundsSubtitle: '查看历史牌局',
      roundNumber: '局号',
      shoeNumber: '靴号',
      playerCards: '闲家牌',
      bankerCards: '庄家牌',
      playerPoints: '闲家点数',
      bankerPoints: '庄家点数',

      // Game Control
      gameControlTitle: '游戏控制',
      gameControlSubtitle: '配置投注限制和风控',
      bettingLimits: '限红设置',
      depositControl: '入金控制',
      winCap: '封顶控制',
      minBet: '最小投注',
      maxBet: '最大投注',
      dailyCap: '日封顶',
      weeklyCap: '周封顶',
      monthlyCap: '月封顶',
      currentWin: '当前盈利',
      addLimit: '添加限红',
      addControl: '添加控制',
      addCap: '添加封顶',
      default: '默认',

      // Notices
      noticesTitle: '公告管理',
      noticesSubtitle: '管理系统公告',
      createNotice: '新增公告',
      noticeTitle: '公告标题',
      noticeContent: '公告内容',
      noticeType: '公告类型',
      info: '通知',
      warning: '警告',
      urgent: '紧急',
      pinned: '置顶',
      published: '已发布',
      unpublished: '未发布',

      // Operation Logs
      operationLogsTitle: '操作日志',
      operationLogsSubtitle: '查看所有管理操作',
      action: '操作',
      target: '目标',
      ipAddress: 'IP地址',
      totalOperations: '总操作数',
      creates: '创建',
      edits: '编辑',

      // Settings
      settingsTitle: '设置',
      settingsSubtitle: '管理您的账户设置',
      profileInfo: '个人信息',
      notifications: '通知设置',
      settlementNotifications: '结算通知',
      settlementNotificationsDesc: '收到投注结算时通知',
      balanceAlerts: '余额提醒',
      balanceAlertsDesc: '余额变动时通知',
      systemAnnouncements: '系统公告',
      systemAnnouncementsDesc: '接收重要系统更新',
      soundEffects: '音效',
      soundEffectsDesc: '播放通知音效',
      saveSettings: '保存设置',
      saveChanges: '保存更改',

      // Stats
      totalDeposit: '总入点',
      totalWithdraw: '总出点',
      totalBetAmount: '总投注',
      totalWin: '总赢额',
      netProfit: '净盈亏',

      // Messages
      noNotifications: '暂无新通知',
      accessDenied: '访问被拒绝',
      noPermission: '您没有权限访问管理后台',
      returnToGame: '返回游戏',
      confirmDelete: '确认删除？',
      operationSuccess: '操作成功',
      operationFailed: '操作失败',

      // Admin Panel
      adminPanel: '管理后台',

      // Game UI - Status
      live: '在线',
      offline: '离线',
      betting: '下注中',
      dealing: '发牌中',
      waiting: '等待中',
      pleaseBet: '请下注',
      stopBetting: '停止下注',
      dealingCards: '发牌中...',
      showResult: '开牌',
      settling: '结算中...',

      // Game UI - Controls
      switchPlay: '切换玩法',
      noComm: '免佣',
      off: '关',
      on: '开',
      repeat: '重复',
      signal: '信号',
      liveCheck: '视频检测',
      gifts: '礼物',

      // Game UI - Results
      playerWins: '闲赢!',
      bankerWins: '庄赢!',
      tieResult: '和局!',

      // Game UI - Betting
      playerBonus: '闲龙宝',
      bankerBonus: '庄龙宝',
      bonus: '龙宝',
      pPair: '闲对',
      bPair: '庄对',
      super: '超级',
      wager: '投注额',

      // Game UI - Navigation
      switchTable: '换桌',
      multiTables: '多台',
      joinTable: '进入',
      follow: '关注',

      // Lobby
      gameLobby: '遊戲大廳',
      allGames: '全部',
      baccarat: '百家乐',
      dragonTiger: '龙虎',
      bullBull: '牛牛',
      asia: '亚洲',
      normal: '普通',
      goodRoad: '好路',
      chinese: '中文',

      // Sidebar
      billboard: '排行榜',
      playerTab: '玩家',
      dealerTab: '荷官',
      giftsTab: '礼物',
      daily: '日榜',
      weekly: '周榜',

      // Chat
      liveChat: '聊天室',
      betOver100: '投注超过100可发言',
      typeMessage: '输入消息...',

      // Menu
      followingList: '关注列表',
      resultsProportion: '结果比例',
      gameReport: '游戏报告',
      gameSettings: '游戏设置',
      gameRules: '游戏规则',
      liveScene: '直播画面',

      // Login
      enterUsername: '请输入用户名',
      enterPassword: '请输入密码',
      royalGaming: '皇家游戏',
      premiumBaccarat: '尊贵百家乐',

      // Game Settings Modal
      languageSetting: '语言设置',
      videoSound: '视频音效',
      gameSound: '游戏音效',
      videoDisplay: '视频画面',
      giftPopup: '礼物弹幕',
      dragonAlert: '长龙提示',

      // Game Rules Modal
      baccaratRules: '百家乐',
      roadmapGuide: '牌路说明',
      goodRoadGuide: '好路说明',
      dragonTigerRules: '龙虎',
      bullBullRules: '牛牛',
      chatRoomRules: '聊天室规范',
      selectGameForRules: '请选择游戏进入说明页',

      // Game Report Modal
      bettingReport: '投注报表',
      balanceReport: '额度报表',
      tipsReport: '打赏报表',
      roundId: '局号',
      settleTime: '结算时间',
      betAmount: '下注金额',
      validBet: '有效投注',
      winLoss: '输赢',
      orderId: '订单编号',
      beforeAmount: '交易前金额',
      afterAmount: '交易后金额',
      tableName: '桌台名称',
      table: '桌台',
      shoeNum: '靴号',
      roundNum: '局号',
      item: '项目',
      price: '单价',
      quantity: '数量',
      total: '总金额',
      noRecords: '暂无记录',
      viewCards: '查看牌面',
      hideCards: '收起',
      playerHand: '闲家',
      bankerHand: '庄家',
      myBets: '我的投注',
      defaultTable: '默认桌',

      // Following List Modal
      noFollowingDealers: '您还没有关注任何荷官',
      followDealerHint: '关注荷官后可以快速找到他们的桌台',
      followers: '粉丝',
      enter: '进入',
      unfollow: '取消关注',
      followingCount: '已关注 {{count}} 位荷官',

      // Table Switch Modal
      current: '当前',
      noTablesAvailable: '暂无可用桌台',
      tableCount: '共 {{count}} 个桌台',

      // Gift Modal
      sendGiftTo: '送礼物给 {{name}}',
      customQuantity: '自定义数量',
      insufficientBalance: '余额不足',
      yourBalance: '您的余额',
      sendGift: '送出礼物',

      // Chip Settings
      selectChips: '选择显示的筹码',
      selectedCount: '已选择',
      maxChips: '最多6个',

      // New Baccarat Bet Types
      big: '大',
      small: '小',

      // Dragon Tiger New Bet Types
      dtSuitedTie: '同花和',
      dragonBig: '龙大',
      dragonSmall: '龙小',
      tigerBig: '虎大',
      tigerSmall: '虎小',

      // Roadmap Labels
      roadBanker: '庄',
      roadPlayer: '闲',
      roadTie: '和',

      // Bull Bull Rank Names
      bull_bull: '牛牛',
      bull_9: '牛9',
      bull_8: '牛8',
      bull_7: '牛7',
      bull_6: '牛6',
      bull_5: '牛5',
      bull_4: '牛4',
      bull_3: '牛3',
      bull_2: '牛2',
      bull_1: '牛1',
      no_bull: '没牛',
      five_face: '五公',
      bomb: '炸弹',
      five_small: '五小牛',

      // Card Suits
      spades: '黑桃',
      hearts: '红桃',
      diamonds: '方块',
      clubs: '梅花',

      // Card Ranks
      cardAce: 'A',
      cardJack: 'J',
      cardQueen: 'Q',
      cardKing: 'K',

      // Win/Lose
      resultWin: '赢',
      resultLose: '输',

      // Balance Report Note
      roundNote: '第{{round}}局',
      betsNote: '下注',

      // Dragon Tiger
      dtDragon: '龙',
      dtTiger: '虎',
      dtTie: '和',
      dragonOdd: '龙单',
      dragonEven: '龙双',
      tigerOdd: '虎单',
      tigerEven: '虎双',
      dragonRed: '龙红',
      dragonBlack: '龙黑',
      tigerRed: '虎红',
      tigerBlack: '虎黑',
      dragonAskRoad: '龙问路',
      tigerAskRoad: '虎问路',
      dtRoadDragon: '龙',
      dtRoadTiger: '虎',
      dtRoadTie: '和',
      dragonWins: '龙赢!',
      tigerWins: '虎赢!',
      dtTieResult: '和局!',
      dtRules: '龙虎规则',
      dtGameDesc: '龙虎各发一张牌，比较大小。牌面大者胜。',
      dtCardValues: 'A为最小 (1点)，K为最大 (13点)。',
      dtBetTypes: '投注类型与赔率',
      dtSpecialRules: '特殊规则',
      dtTieRefund: '和局时，龙/虎投注退还一半本金',
    },
  },
  en: {
    translation: {
      // Common
      confirm: 'Confirm',
      cancel: 'Cancel',
      submit: 'Submit',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      search: 'Search',
      loading: 'Loading...',
      noData: 'No data',
      success: 'Success',
      error: 'Error',
      export: 'Export',
      create: 'Create',
      all: 'All',
      enable: 'Enable',
      disable: 'Disable',
      time: 'Time',
      type: 'Type',
      actions: 'Actions',
      details: 'Details',
      from: 'From',
      to: 'To',

      // Auth
      login: 'Login',
      logout: 'Logout',
      username: 'Username',
      password: 'Password',
      loginTitle: 'Baccarat Game',
      loginSubtitle: 'Please login to your account',
      loginError: 'Invalid username or password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      changePassword: 'Change Password',
      passwordChanged: 'Password changed successfully',

      // Navigation
      game: 'Game',
      admin: 'Admin',
      dashboard: 'Dashboard',
      users: 'Users',
      agents: 'Agents',
      members: 'Members',
      transactions: 'Transactions',
      gameHistory: 'Game History',
      settings: 'Settings',
      reports: 'Reports',
      gameRounds: 'Game Rounds',
      gameControl: 'Game Control',
      notices: 'Notices',
      operationLogs: 'Operation Logs',
      profile: 'Profile',

      // Game
      player: 'Player',
      banker: 'Banker',
      tie: 'Tie',
      playerPair: 'P Pair',
      bankerPair: 'B Pair',
      superSix: 'Super 6',
      placeBet: 'Place Bet',
      deal: 'Deal',
      newRound: 'New Round',
      balance: 'Balance',
      totalBet: 'Total Bet',
      clearBets: 'Clear',
      confirmBet: 'Confirm',
      betSuccess: 'Bet Placed',
      wins: 'Wins',
      loses: 'Loses',
      points: 'pts',
      round: 'Round',
      shoe: 'Shoe',
      result: 'Result',
      natural: 'Natural',

      // Roadmap
      roadmap: 'Roadmap',
      beadRoad: 'Bead Road',
      bigRoad: 'Big Road',
      bigEyeRoad: 'Big Eye',
      smallRoad: 'Small Road',
      cockroachRoad: 'Cockroach',

      // Payouts
      payout: 'Payout',
      bankerPayout: 'Banker 1:0.95',
      playerPayout: 'Player 1:1',
      tiePayout: 'Tie 1:8',
      pairPayout: 'Pair 1:11',
      super6Payout: 'Super6 1:12/20',

      // Admin Common
      createUser: 'Create User',
      deposit: 'Deposit',
      withdraw: 'Withdraw',
      adjustment: 'Adjustment',
      amount: 'Amount',
      note: 'Note',
      status: 'Status',
      active: 'Active',
      suspended: 'Suspended',
      banned: 'Banned',
      createdAt: 'Created At',
      parentAgent: 'Parent Agent',
      subUsers: 'Sub Users',
      resetPassword: 'Reset Password',
      nickname: 'Nickname',
      role: 'Role',
      operator: 'Operator',

      // Dashboard
      dashboardTitle: 'Dashboard',
      dashboardSubtitle: 'System overview and statistics',
      todayStats: 'Today Stats',
      totalBets: 'Total Bets',
      totalPayouts: 'Total Payouts',
      netRevenue: 'Net Revenue',
      activeUsers: 'Active Users',
      recentTransactions: 'Recent Transactions',
      quickActions: 'Quick Actions',
      newAgent: 'New Agent',
      newMember: 'New Member',
      viewReports: 'View Reports',

      // Agents
      agentsTitle: 'Agents',
      agentsSubtitle: 'Manage agent accounts',
      createAgent: 'New Agent',
      agentList: 'Agent List',
      downlineCount: 'Downline Count',
      commission: 'Commission',

      // Members
      membersTitle: 'Members',
      membersSubtitle: 'Manage member accounts',
      createMember: 'New Member',
      memberList: 'Member List',
      lastLogin: 'Last Login',
      totalWagered: 'Total Wagered',

      // Transactions
      transactionsTitle: 'Transactions',
      transactionsSubtitle: 'View all transaction records',
      transactionType: 'Transaction Type',
      balanceBefore: 'Balance Before',
      balanceAfter: 'Balance After',
      allTypes: 'All Types',
      bet: 'Bet',
      win: 'Win',
      refund: 'Refund',

      // Reports
      reportsTitle: 'Reports',
      reportsSubtitle: 'View performance reports and statistics',
      memberReport: 'Member Report',
      agentReport: 'Agent Report',
      dateRange: 'Date Range',
      totalRounds: 'Total Rounds',
      totalWins: 'Total Wins',
      totalLosses: 'Total Losses',
      netResult: 'Net Result',
      memberCount: 'Member Count',

      // Game Rounds
      gameRoundsTitle: 'Game Rounds',
      gameRoundsSubtitle: 'View game history',
      roundNumber: 'Round #',
      shoeNumber: 'Shoe #',
      playerCards: 'Player Cards',
      bankerCards: 'Banker Cards',
      playerPoints: 'Player Points',
      bankerPoints: 'Banker Points',

      // Game Control
      gameControlTitle: 'Game Control',
      gameControlSubtitle: 'Configure betting limits and risk controls',
      bettingLimits: 'Betting Limits',
      depositControl: 'Deposit Control',
      winCap: 'Win Cap',
      minBet: 'Min Bet',
      maxBet: 'Max Bet',
      dailyCap: 'Daily Cap',
      weeklyCap: 'Weekly Cap',
      monthlyCap: 'Monthly Cap',
      currentWin: 'Current Win',
      addLimit: 'Add Limit',
      addControl: 'Add Control',
      addCap: 'Add Cap',
      default: 'Default',

      // Notices
      noticesTitle: 'Notices',
      noticesSubtitle: 'Manage system notices',
      createNotice: 'New Notice',
      noticeTitle: 'Notice Title',
      noticeContent: 'Content',
      noticeType: 'Notice Type',
      info: 'Info',
      warning: 'Warning',
      urgent: 'Urgent',
      pinned: 'Pinned',
      published: 'Published',
      unpublished: 'Unpublished',

      // Operation Logs
      operationLogsTitle: 'Operation Logs',
      operationLogsSubtitle: 'View all administrative operations',
      action: 'Action',
      target: 'Target',
      ipAddress: 'IP Address',
      totalOperations: 'Total Operations',
      creates: 'Creates',
      edits: 'Edits',

      // Settings
      settingsTitle: 'Settings',
      settingsSubtitle: 'Manage your account settings',
      profileInfo: 'Profile Information',
      notifications: 'Notifications',
      settlementNotifications: 'Settlement Notifications',
      settlementNotificationsDesc: 'Receive notifications when bets are settled',
      balanceAlerts: 'Balance Alerts',
      balanceAlertsDesc: 'Get notified when balance changes',
      systemAnnouncements: 'System Announcements',
      systemAnnouncementsDesc: 'Receive important system updates',
      soundEffects: 'Sound Effects',
      soundEffectsDesc: 'Play sounds for notifications',
      saveSettings: 'Save Settings',
      saveChanges: 'Save Changes',

      // Stats
      totalDeposit: 'Total Deposit',
      totalWithdraw: 'Total Withdraw',
      totalBetAmount: 'Total Bet',
      totalWin: 'Total Win',
      netProfit: 'Net Profit',

      // Messages
      noNotifications: 'No new notifications',
      accessDenied: 'Access Denied',
      noPermission: 'You do not have permission to access the admin panel',
      returnToGame: 'Return to Game',
      confirmDelete: 'Confirm delete?',
      operationSuccess: 'Operation successful',
      operationFailed: 'Operation failed',

      // Admin Panel
      adminPanel: 'Admin Panel',

      // Game UI - Status
      live: 'LIVE',
      offline: 'OFFLINE',
      betting: 'BETTING',
      dealing: 'DEALING',
      waiting: 'WAITING',
      pleaseBet: 'Place Bet',
      stopBetting: 'No More Bets',
      dealingCards: 'Dealing...',
      showResult: 'Result',
      settling: 'Settling...',

      // Game UI - Controls
      switchPlay: 'Switch Play',
      noComm: 'No Comm',
      off: 'OFF',
      on: 'ON',
      repeat: 'Repeat',
      signal: 'Signal',
      liveCheck: 'Live Check',
      gifts: 'Gifts',

      // Game UI - Results
      playerWins: 'PLAYER WINS!',
      bankerWins: 'BANKER WINS!',
      tieResult: 'TIE!',

      // Game UI - Betting
      playerBonus: 'P. DRAGON',
      bankerBonus: 'B. DRAGON',
      bonus: 'DRAGON',
      pPair: 'P. PAIR',
      bPair: 'B. PAIR',
      super: 'SUPER',
      wager: 'Wager',

      // Game UI - Navigation
      switchTable: 'Switch table',
      multiTables: 'Multi-Tables',
      joinTable: 'JOIN TABLE',
      follow: 'Follow',

      // Lobby
      gameLobby: 'Game Lobby',
      allGames: 'All',
      baccarat: 'Baccarat',
      dragonTiger: 'DT',
      bullBull: 'Bull Bull',
      asia: 'Asia',
      normal: 'Normal',
      goodRoad: 'Good Road',
      chinese: 'Chinese',

      // Sidebar
      billboard: 'Billboard',
      playerTab: 'PLAYER',
      dealerTab: 'DEALER',
      giftsTab: 'GIFTS',
      daily: 'DAILY',
      weekly: 'WEEKLY',

      // Chat
      liveChat: 'Live Chat',
      betOver100: 'Bet over 100 to chat',
      typeMessage: 'Type a message...',

      // Menu
      followingList: 'Following List',
      resultsProportion: 'Results Proportion',
      gameReport: 'Game Report',
      gameSettings: 'Game Settings',
      gameRules: 'Game Rules',
      liveScene: 'Live Scene',

      // Login
      enterUsername: 'Enter username',
      enterPassword: 'Enter password',
      royalGaming: 'ROYAL GAMING',
      premiumBaccarat: 'PREMIUM BACCARAT',

      // Game Settings Modal
      languageSetting: 'Language',
      videoSound: 'Video Sound',
      gameSound: 'Game Sound',
      videoDisplay: 'Video Display',
      giftPopup: 'Gift Popup',
      dragonAlert: 'Dragon Alert',

      // Game Rules Modal
      baccaratRules: 'Baccarat',
      roadmapGuide: 'Roadmap Guide',
      goodRoadGuide: 'Good Road Guide',
      dragonTigerRules: 'Dragon Tiger',
      bullBullRules: 'Bull Bull',
      chatRoomRules: 'Chat Rules',
      selectGameForRules: 'Select a game to view rules',

      // Game Report Modal
      bettingReport: 'Betting Report',
      balanceReport: 'Balance Report',
      tipsReport: 'Tips Report',
      roundId: 'Round ID',
      settleTime: 'Settle Time',
      betAmount: 'Bet Amount',
      validBet: 'Valid Bet',
      winLoss: 'Win/Loss',
      orderId: 'Order ID',
      beforeAmount: 'Before',
      afterAmount: 'After',
      tableName: 'Table Name',
      table: 'Table',
      shoeNum: 'Shoe #',
      roundNum: 'Round #',
      item: 'Item',
      price: 'Price',
      quantity: 'Qty',
      total: 'Total',
      noRecords: 'No records found',
      viewCards: 'View Cards',
      hideCards: 'Hide',
      playerHand: 'Player',
      bankerHand: 'Banker',
      myBets: 'My Bets',
      defaultTable: 'Default Table',

      // Following List Modal
      noFollowingDealers: 'You are not following any dealers',
      followDealerHint: 'Follow dealers to quickly find their tables',
      followers: 'followers',
      enter: 'Enter',
      unfollow: 'Unfollow',
      followingCount: 'Following {{count}} dealers',

      // Table Switch Modal
      current: 'Current',
      noTablesAvailable: 'No tables available',
      tableCount: '{{count}} tables',

      // Gift Modal
      sendGiftTo: 'Send gift to {{name}}',
      customQuantity: 'Custom quantity',
      insufficientBalance: 'Insufficient balance',
      yourBalance: 'Your balance',
      sendGift: 'Send Gift',

      // Chip Settings
      selectChips: 'Select Chips',
      selectedCount: 'Selected',
      maxChips: 'Max 6',

      // New Baccarat Bet Types
      big: 'Big',
      small: 'Small',

      // Dragon Tiger New Bet Types
      dtSuitedTie: 'Suited Tie',
      dragonBig: 'D.Big',
      dragonSmall: 'D.Small',
      tigerBig: 'T.Big',
      tigerSmall: 'T.Small',

      // Roadmap Labels
      roadBanker: 'B',
      roadPlayer: 'P',
      roadTie: 'T',

      // Bull Bull Rank Names
      bull_bull: 'Bull Bull',
      bull_9: 'Bull 9',
      bull_8: 'Bull 8',
      bull_7: 'Bull 7',
      bull_6: 'Bull 6',
      bull_5: 'Bull 5',
      bull_4: 'Bull 4',
      bull_3: 'Bull 3',
      bull_2: 'Bull 2',
      bull_1: 'Bull 1',
      no_bull: 'No Bull',
      five_face: 'Five Face',
      bomb: 'Bomb',
      five_small: 'Five Small',

      // Card Suits
      spades: 'Spades',
      hearts: 'Hearts',
      diamonds: 'Diamonds',
      clubs: 'Clubs',

      // Card Ranks
      cardAce: 'A',
      cardJack: 'J',
      cardQueen: 'Q',
      cardKing: 'K',

      // Win/Lose
      resultWin: 'Win',
      resultLose: 'Lose',

      // Balance Report Note
      roundNote: 'Round #{{round}}',
      betsNote: 'Bets',

      // Dragon Tiger
      dtDragon: 'Dragon',
      dtTiger: 'Tiger',
      dtTie: 'Tie',
      dragonOdd: 'D.Odd',
      dragonEven: 'D.Even',
      tigerOdd: 'T.Odd',
      tigerEven: 'T.Even',
      dragonRed: 'D.Red',
      dragonBlack: 'D.Black',
      tigerRed: 'T.Red',
      tigerBlack: 'T.Black',
      dragonAskRoad: 'Dragon Ask Road',
      tigerAskRoad: 'Tiger Ask Road',
      dtRoadDragon: 'D',
      dtRoadTiger: 'T',
      dtRoadTie: 'T',
      dragonWins: 'DRAGON WINS!',
      tigerWins: 'TIGER WINS!',
      dtTieResult: 'TIE!',
      dtRules: 'Dragon Tiger Rules',
      dtGameDesc: 'Dragon and Tiger each receive one card. The higher card wins.',
      dtCardValues: 'A is lowest (1 point), K is highest (13 points).',
      dtBetTypes: 'Bet Types & Payouts',
      dtSpecialRules: 'Special Rules',
      dtTieRefund: 'On tie, Dragon/Tiger bets refund half',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh', // Default to Chinese
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
