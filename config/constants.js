// ActivityTrackerBot 設定定数

// アプリケーション情報
const APP_INFO = {
  NAME: 'ActivityTrackerBot',
  VERSION: '2.0.0',
  DESCRIPTION: 'Discord Activity Management Bot',
  AUTHOR: 'Your Name',
  REPOSITORY: 'https://github.com/yourusername/activity-tracker-bot'
};

// Discord関連の制限
const DISCORD_LIMITS = {
  EMBED: {
    TITLE_MAX: 256,
    DESCRIPTION_MAX: 4096,
    FIELD_NAME_MAX: 256,
    FIELD_VALUE_MAX: 1024,
    FIELDS_MAX: 25,
    FOOTER_MAX: 2048,
    AUTHOR_MAX: 256,
    TOTAL_CHARS_MAX: 6000
  },
  MESSAGE: {
    CONTENT_MAX: 2000,
    ATTACHMENTS_MAX: 10
  },
  COMMAND: {
    NAME_MAX: 32,
    DESCRIPTION_MAX: 100,
    OPTION_NAME_MAX: 32,
    OPTION_DESCRIPTION_MAX: 100,
    CHOICES_MAX: 25
  }
};

// ステータス定義
const STATUS = {
  BOOK: {
    WANT_TO_BUY: 'want_to_buy',
    WANT_TO_READ: 'want_to_read',
    READING: 'reading',
    FINISHED: 'finished',
    ABANDONED: 'abandoned'
  },
  MOVIE: {
    WANT_TO_WATCH: 'want_to_watch',
    WATCHED: 'watched',
    MISSED: 'missed'
  },
  // 🆕 アニメステータス追加
  ANIME: {
    WANT_TO_WATCH: 'want_to_watch',
    WATCHING: 'watching',
    COMPLETED: 'completed',
    DROPPED: 'dropped'
  },
  ACTIVITY: {
    PLANNED: 'planned',
    DONE: 'done',
    SKIPPED: 'skipped'
  },
  WISHLIST: {
    WANT_TO_BUY: 'want_to_buy',
    BOUGHT: 'bought'
  },
  ARTICLE: {
    WANT_TO_READ: 'want_to_read',
    READ: 'read'
  }
};

// ステータス表示名（日本語）
const STATUS_NAMES = {
  BOOK: {
    [STATUS.BOOK.WANT_TO_BUY]: '買いたい',
    [STATUS.BOOK.WANT_TO_READ]: '積読',
    [STATUS.BOOK.READING]: '読書中',
    [STATUS.BOOK.FINISHED]: '読了',
    [STATUS.BOOK.ABANDONED]: '中断'
  },
  MOVIE: {
    [STATUS.MOVIE.WANT_TO_WATCH]: '観たい',
    [STATUS.MOVIE.WATCHED]: '視聴済み',
    [STATUS.MOVIE.MISSED]: '見逃し'
  },
  // 🆕 アニメステータス表示名
  ANIME: {
    [STATUS.ANIME.WANT_TO_WATCH]: '観たい',
    [STATUS.ANIME.WATCHING]: '視聴中',
    [STATUS.ANIME.COMPLETED]: '完走済み',
    [STATUS.ANIME.DROPPED]: '中断'
  },
  ACTIVITY: {
    [STATUS.ACTIVITY.PLANNED]: '予定中',
    [STATUS.ACTIVITY.DONE]: '完了',
    [STATUS.ACTIVITY.SKIPPED]: 'スキップ'
  },
  WISHLIST: {
    [STATUS.WISHLIST.WANT_TO_BUY]: '未購入',
    [STATUS.WISHLIST.BOUGHT]: '購入済み'
  },
  ARTICLE: {
    [STATUS.ARTICLE.WANT_TO_READ]: '未読',
    [STATUS.ARTICLE.READ]: '読了済み'
  }
};

// ステータス絵文字
const STATUS_EMOJIS = {
  BOOK: {
    [STATUS.BOOK.WANT_TO_BUY]: '🛒',
    [STATUS.BOOK.WANT_TO_READ]: '📋',
    [STATUS.BOOK.READING]: '📖',
    [STATUS.BOOK.FINISHED]: '✅',
    [STATUS.BOOK.ABANDONED]: '❌'
  },
  MOVIE: {
    [STATUS.MOVIE.WANT_TO_WATCH]: '🍿',
    [STATUS.MOVIE.WATCHED]: '✅',
    [STATUS.MOVIE.MISSED]: '😅'
  },
  // 🆕 アニメステータス絵文字
  ANIME: {
    [STATUS.ANIME.WANT_TO_WATCH]: '🍿',
    [STATUS.ANIME.WATCHING]: '📺',
    [STATUS.ANIME.COMPLETED]: '✅',
    [STATUS.ANIME.DROPPED]: '💔'
  },
  ACTIVITY: {
    [STATUS.ACTIVITY.PLANNED]: '🎯',
    [STATUS.ACTIVITY.DONE]: '✅',
    [STATUS.ACTIVITY.SKIPPED]: '😅'
  },
  WISHLIST: {
    [STATUS.WISHLIST.WANT_TO_BUY]: '🛒',
    [STATUS.WISHLIST.BOUGHT]: '✅'
  },
  ARTICLE: {
    [STATUS.ARTICLE.WANT_TO_READ]: '📝',
    [STATUS.ARTICLE.read]: '✅'
  }
};
// カテゴリ情報
const CATEGORIES = {
  BOOK: {
    name: 'book',
    displayName: '本',
    emoji: '📚',
    color: '#9C27B0'
  },
  MOVIE: {
    name: 'movie',
    displayName: '映画',
    emoji: '🎬',
    color: '#E91E63'
  },
  // 🆕 アニメカテゴリ追加
  ANIME: {
    name: 'anime',
    displayName: 'アニメ',
    emoji: '📺',
    color: '#FF6B6B'
  },
  ACTIVITY: {
    name: 'activity',
    displayName: '活動',
    emoji: '🎯',
    color: '#00BCD4'
  },
  WISHLIST: {
    name: 'wishlist',
    displayName: '買いたいもの',
    emoji: '🛒',
    color: '#E91E63'
  },
  ARTICLE: {
    name: 'article',
    displayName: '記事',
    emoji: '📰',
    color: '#2196F3'
  }
};

const ANIME_GENRES = {
  ACTION: 'action',
  ADVENTURE: 'adventure',
  COMEDY: 'comedy',
  DRAMA: 'drama',
  FANTASY: 'fantasy',
  HORROR: 'horror',
  MYSTERY: 'mystery',
  ROMANCE: 'romance',
  SCI_FI: 'sci-fi',
  SPORTS: 'sports',
  THRILLER: 'thriller',
  OTHER: 'other'
};

const ANIME_GENRE_NAMES = {
  [ANIME_GENRES.ACTION]: 'アクション',
  [ANIME_GENRES.ADVENTURE]: 'アドベンチャー',
  [ANIME_GENRES.COMEDY]: 'コメディ',
  [ANIME_GENRES.DRAMA]: 'ドラマ',
  [ANIME_GENRES.FANTASY]: 'ファンタジー',
  [ANIME_GENRES.HORROR]: 'ホラー',
  [ANIME_GENRES.MYSTERY]: 'ミステリー',
  [ANIME_GENRES.ROMANCE]: 'ロマンス',
  [ANIME_GENRES.SCI_FI]: 'SF',
  [ANIME_GENRES.SPORTS]: 'スポーツ',
  [ANIME_GENRES.THRILLER]: 'スリラー',
  [ANIME_GENRES.OTHER]: 'その他'
};

// 🆕 優先度定義
const PRIORITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

// 🆕 優先度表示名
const PRIORITY_NAMES = {
  [PRIORITY.HIGH]: '高',
  [PRIORITY.MEDIUM]: '中',
  [PRIORITY.LOW]: '低'
};

// 🆕 優先度絵文字
const PRIORITY_EMOJIS = {
  [PRIORITY.HIGH]: '🔴',
  [PRIORITY.MEDIUM]: '🟡',
  [PRIORITY.LOW]: '🟢'
};

// 🆕 記事カテゴリ定義
const ARTICLE_CATEGORIES = {
  TECH: 'tech',
  BUSINESS: 'business', 
  LIFESTYLE: 'lifestyle',
  NEWS: 'news',
  ACADEMIC: 'academic',
  GENERAL: 'general'
};

// 🆕 記事カテゴリ表示名
const ARTICLE_CATEGORY_NAMES = {
  [ARTICLE_CATEGORIES.TECH]: '技術',
  [ARTICLE_CATEGORIES.BUSINESS]: 'ビジネス',
  [ARTICLE_CATEGORIES.LIFESTYLE]: 'ライフスタイル',
  [ARTICLE_CATEGORIES.NEWS]: 'ニュース',
  [ARTICLE_CATEGORIES.ACADEMIC]: '学術',
  [ARTICLE_CATEGORIES.GENERAL]: '一般'
};

// 🆕 記事カテゴリ絵文字
const ARTICLE_CATEGORY_EMOJIS = {
  [ARTICLE_CATEGORIES.TECH]: '💻',
  [ARTICLE_CATEGORIES.BUSINESS]: '💼',
  [ARTICLE_CATEGORIES.LIFESTYLE]: '🌟',
  [ARTICLE_CATEGORIES.NEWS]: '📰',
  [ARTICLE_CATEGORIES.ACADEMIC]: '🎓',
  [ARTICLE_CATEGORIES.GENERAL]: '📄'
};

// 色定数（Embed用）
const COLORS = {
  PRIMARY: '#3498DB',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  INFO: '#2196F3',
  
  // カテゴリ別カラー
  BOOK: '#9C27B0',
  MOVIE: '#E91E63',
  ANIME: '#FF6B6B',
  ACTIVITY: '#00BCD4',
  REPORT: '#4CAF50',
  STATS: '#9C27B0',
  SEARCH: '#FF9800',
// 🆕 新しいカテゴリ色
  WISHLIST: '#E91E63',
  ARTICLE: '#2196F3',
  
  // ステータス別カラー
  COMPLETED: '#4CAF50',
  IN_PROGRESS: '#FF9800',
  PENDING: '#2196F3',
  ABANDONED: '#F44336',

// 🆕 優先度別カラー
  PRIORITY_HIGH: '#F44336',
  PRIORITY_MEDIUM: '#FF9800',
  PRIORITY_LOW: '#4CAF50'
};

// 絵文字定数
const EMOJIS = {
  // 基本アクション
  ADD: '➕',
  EDIT: '✏️',
  DELETE: '🗑️',
  SEARCH: '🔍',
  LIST: '📋',
  STATS: '📊',
  
  // ステータス
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOADING: '⏳',
  
  // カテゴリ
  BOOK: '📚',
  MOVIE: '🎬',
  ACTIVITY: '🎯',
  REPORT: '📝',
  
  // 時間
  CALENDAR: '📅',
  CLOCK: '🕐',
  TIMER: '⏱️',
  
  // 評価・レベル
  TROPHY: '🏆',
  MEDAL: '🏅',
  STAR: '⭐',
  FIRE: '🔥',
  THUMBS_UP: '👍',
  HEART: '❤️',
  
  // 方向・動作
  UP: '⬆️',
  DOWN: '⬇️',
  RIGHT: '➡️',
  LEFT: '⬅️',
  REFRESH: '🔄',
  
  // 通知
  BELL: '🔔',
  MEGAPHONE: '📢',
  MAIL: '📧'
};

// 🆕 Google Sheets設定を拡張
const SHEETS_CONFIG = {
  RANGES: {
    BOOKS: 'books_master!A:G',
    MOVIES: 'movies_master!A:F',
    ACTIVITIES: 'activities_master!A:F',
    REPORTS: 'daily_reports!A:E',
    // 🆕 アニメ範囲追加
    ANIMES: 'anime_master!A:K',
    WISHLIST: 'wishlist_master!A:J',
    ARTICLES: 'articles_master!A:K'
  },
  COLUMN_MAPPINGS: {
    BOOKS: {
      ID: 0, CREATED_AT: 1, TITLE: 2, AUTHOR: 3, MEMO: 4, STATUS: 5, UPDATED_AT: 6
    },
    MOVIES: {
      ID: 0, CREATED_AT: 1, TITLE: 2, MEMO: 3, STATUS: 4, UPDATED_AT: 5
    },
    ACTIVITIES: {
      ID: 0, CREATED_AT: 1, CONTENT: 2, MEMO: 3, STATUS: 4, UPDATED_AT: 5
    },
    REPORTS: {
      ID: 0, DATE: 1, CATEGORY: 2, ITEM_ID: 3, CONTENT: 4
    },
    // 🆕 アニメ列マッピング追加
    ANIMES: {
      ID: 0, CREATED_AT: 1, TITLE: 2, TOTAL_EPISODES: 3, WATCHED_EPISODES: 4,
      GENRE: 5, MEMO: 6, STATUS: 7, UPDATED_AT: 8, START_DATE: 9, FINISH_DATE: 10
    },
    WISHLIST: {
      ID: 0, CREATED_AT: 1, NAME: 2, PRICE: 3, ACTUAL_PRICE: 4, 
      URL: 5, PRIORITY: 6, MEMO: 7, STATUS: 8, UPDATED_AT: 9
    },
    ARTICLES: {
      ID: 0, CREATED_AT: 1, TITLE: 2, URL: 3, CATEGORY: 4, PRIORITY: 5,
      MEMO: 6, STATUS: 7, RATING: 8, REVIEW: 9, UPDATED_AT: 10
    }
  },
  TIMEOUTS: {
    READ: 10000,
    WRITE: 15000,
    BATCH: 20000
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_BASE: 1000,
    DELAY_MAX: 5000
  }
};

// 通知設定
const NOTIFICATION_SETTINGS = {
  SCHEDULES: {
    MORNING_GREETING: '0 7 * * *',      // 毎朝7時
    DAILY_REMINDER: '0 20 * * *',       // 毎日20時
    WEEKLY_REPORT: '0 21 * * 0',        // 毎週日曜21時
    MONTHLY_REPORT: '0 8 1 * *',        // 毎月1日8時
    MONTHLY_WISHLIST: '0 9 1 * *',      // 毎月1日9時
    ABANDONED_CHECK: '0 21 * * *',       // 毎日21時
// 🆕 新しい通知スケジュール
    MONTHLY_WISHLIST_REMINDER: '0 9 1 * *',        // 毎月1日9時
    WEEKLY_ARTICLE_REMINDER: '0 19 * * 5',         // 毎週金曜19時
    URGENT_ITEMS_CHECK: '0 10 * * 1,3,5'           // 月水金10時
  },
  DEFAULTS: {
    TIMEZONE: 'Asia/Tokyo',
    ABANDONED_DAYS: 7,
    RECENT_DAYS: 7,
// 🆕 新しいデフォルト値
    URGENT_CHECK_DAYS: 3,
    MONTHLY_BUDGET_LIMIT: 100000, // 10万円
    WEEKLY_ARTICLE_TARGET: 5       // 週5記事
  }
};

// パフォーマンス設定
const PERFORMANCE = {
  CACHE: {
    DEFAULT_TTL: 300000,     // 5分
    STATS_TTL: 600000,       // 10分
    SEARCH_TTL: 180000       // 3分
  },
  RATE_LIMITS: {
    COMMAND_COOLDOWN: 3000,   // 3秒
    REPORT_COOLDOWN: 2000,    // 2秒
    STATS_COOLDOWN: 5000      // 5秒
  },
  BATCH_SIZES: {
    DISPLAY_ITEMS: 20,
    SEARCH_RESULTS: 15,
    REPORT_HISTORY: 10
  }
};

// エラーメッセージ
const ERROR_MESSAGES = {
  GENERIC: 'エラーが発生しました。しばらく待ってから再試行してください。',
  NOT_FOUND: '指定されたアイテムが見つかりませんでした。',
  INVALID_ID: '無効なIDが指定されました。',
  PERMISSION_DENIED: 'この操作を実行する権限がありません。',
  RATE_LIMITED: '操作が多すぎます。しばらく待ってから再試行してください。',
  TIMEOUT: '処理がタイムアウトしました。再試行してください。',
  VALIDATION_FAILED: '入力データが無効です。',
  SHEETS_ERROR: 'データの保存・取得でエラーが発生しました。',
  NETWORK_ERROR: 'ネットワーク接続に問題があります。',
// 🆕 新しいエラーメッセージ
  WISHLIST_NOT_FOUND: '指定されたウィッシュリストアイテムが見つかりませんでした。',
  ARTICLE_NOT_FOUND: '指定された記事が見つかりませんでした。',
  INVALID_PRICE: '価格は0円以上で入力してください。',
  INVALID_RATING: '評価は1-5の範囲で入力してください。',
  INVALID_URL: '有効なURLを入力してください。',
  DUPLICATE_ITEM: '同じアイテムが既に登録されています。'
};

// 成功メッセージ
const SUCCESS_MESSAGES = {
  ITEM_ADDED: 'アイテムを追加しました！',
  ITEM_UPDATED: 'アイテムを更新しました！',
  ITEM_DELETED: 'アイテムを削除しました！',
  REPORT_ADDED: '日報を記録しました！',
  SEARCH_COMPLETED: '検索が完了しました。',
  STATS_GENERATED: '統計情報を生成しました。',
// 🆕 新しい成功メッセージ
  WISHLIST_ITEM_ADDED: 'ウィッシュリストにアイテムを追加しました！',
  WISHLIST_ITEM_BOUGHT: 'アイテムを購入済みにしました！',
  ARTICLE_ADDED: '記事を読書リストに追加しました！',
  ARTICLE_READ: '記事を読了済みにしました！',
  NOTIFICATION_SENT: '通知を送信しました！'
};

// 🆕 通知メッセージテンプレート
const NOTIFICATION_TEMPLATES = {
  WISHLIST: {
    MONTHLY_REMINDER: {
      title: '🛒 月次ウィッシュリスト通知',
      description: '買いたいものリストの確認時間です！💳',
      color: COLORS.WISHLIST
    },
    URGENT_ITEMS: {
      title: '🚨 緊急購入検討アイテム',
      description: '優先度の高いアイテムがあります！',
      color: COLORS.ERROR
    }
  },
  ARTICLE: {
    WEEKLY_REMINDER: {
      title: '📰 週次記事リマインダー',
      description: '読みたい記事の確認時間です！📚',
      color: COLORS.ARTICLE
    },
    URGENT_ARTICLES: {
      title: '📝 優先読書記事',
      description: '優先度の高い記事があります！',
      color: COLORS.WARNING
    }
  }
};

// バリデーション設定
const VALIDATION = {
  TEXT: {
    TITLE_MIN: 1,
    TITLE_MAX: 200,
    AUTHOR_MIN: 1,
    AUTHOR_MAX: 100,
    CONTENT_MIN: 1,
    CONTENT_MAX: 1000,
    MEMO_MAX: 500,
    KEYWORD_MIN: 2,
    KEYWORD_MAX: 100,
// 🆕 新しいバリデーション
    ITEM_NAME_MIN: 1, ITEM_NAME_MAX: 200,
    URL_MAX: 500,
    REVIEW_MAX: 1000
  },
  NUMBERS: {
    ID_MIN: 1,
    ID_MAX: 999999,
    DAYS_MIN: 1,
    DAYS_MAX: 365,
// 🆕 新しい数値バリデーション
    PRICE_MIN: 0, PRICE_MAX: 10000000,  // 1000万円
    RATING_MIN: 1, RATING_MAX: 5
  }
};

// デフォルト値
const DEFAULTS = {
  BOOK_STATUS: STATUS.BOOK.WANT_TO_READ,
  MOVIE_STATUS: STATUS.MOVIE.WANT_TO_WATCH,
  ACTIVITY_STATUS: STATUS.ACTIVITY.PLANNED,
  RECENT_DAYS: 7,
  SEARCH_LIMIT: 20,
  DISPLAY_LIMIT: 10,
// 🆕 新しいデフォルト値
  WISHLIST_PRIORITY: PRIORITY.MEDIUM,
  ARTICLE_PRIORITY: PRIORITY.MEDIUM,
  ARTICLE_CATEGORY: ARTICLE_CATEGORIES.GENERAL
};

// 目標設定
const GOALS = {
  WEEKLY: {
    BOOKS: 2,
    MOVIES: 3,
    ANIMES: 1, // 🆕 アニメ目標追加
    ACTIVITIES: 5,
    REPORTS: 7,
    ARTICLES_READ: 5,
    WISHLIST_PURCHASES: 1
  },
  MONTHLY: {
    BOOKS: 8,
    MOVIES: 12,
    ANIMES: 4, // 🆕 アニメ目標追加
    ACTIVITIES: 20,
    REPORTS: 30,
    ARTICLES_READ: 20,
    WISHLIST_PURCHASES: 3,
    BUDGET_LIMIT: 50000
  },
  DAILY: {
    REPORTS: 1,
    ARTICLES_READ: 1
  }
};

// レベル定義
const LEVELS = {
  MONTHLY_ACTIVITY: [
    { min: 30, icon: '🏆', name: '超人レベル', description: '驚異的な達成率です！' },
    { min: 20, icon: '🌟', name: 'エキスパート', description: '素晴らしい継続力です！' },
    { min: 15, icon: '⭐', name: 'アクティブ', description: '順調にペースを保っています！' },
    { min: 10, icon: '🔥', name: 'モチベート', description: '良いペースで進んでいます！' },
    { min: 5, icon: '💪', name: 'チャレンジャー', description: 'もう少しペースアップできそうです！' },
    { min: 0, icon: '🌱', name: 'スタート', description: '継続が成功の鍵です！' }
  ],
  READING_PACE: [
    { min: 8, icon: '🚀', name: '超高速ペース', description: '月8冊以上！驚異的な読書量です！' },
    { min: 4, icon: '⚡', name: '高速ペース', description: '月4冊以上！素晴らしいペースです！' },
    { min: 2, icon: '📈', name: '標準ペース', description: '月2冊以上！良いペースを保っています！' },
    { min: 1, icon: '📚', name: '安定ペース', description: '月1冊！継続が大切です！' },
    { min: 0, icon: '🌱', name: 'スタート', description: 'まずは月1冊を目標にしてみませんか？' }
  ],
// 🆕 記事読書レベル
  ARTICLE_READING_PACE: [
    { min: 25, icon: '🚀', name: '情報マスター', description: '月25記事以上！驚異的な学習量です！' },
    { min: 20, icon: '⚡', name: '知識ハンター', description: '月20記事以上！素晴らしい学習意欲です！' },
    { min: 15, icon: '📈', name: '学習者', description: '月15記事以上！良いペースを保っています！' },
    { min: 10, icon: '📰', name: '読書好き', description: '月10記事！継続が大切です！' },
    { min: 5, icon: '🌱', name: 'スタート', description: 'まずは月10記事を目標にしてみませんか？' }
  ],
  // 🆕 購買レベル
  SHOPPING_LEVEL: [
    { min: 5, icon: '🛍️', name: 'ショッピング王', description: '月5個以上！計画的なお買い物ですね！' },
    { min: 3, icon: '🛒', name: 'スマート購入者', description: '月3個以上！バランスの良い購入です！' },
    { min: 2, icon: '💳', name: '慎重派', description: '月2個！計画的で素晴らしいです！' },
    { min: 1, icon: '🎯', name: '厳選派', description: '月1個！質を重視した購入ですね！' },
    { min: 0, icon: '💰', name: '節約家', description: '今月は節約月間！素晴らしい自制心です！' }
  ]
};

/ 🆕 統計カテゴリ定義
const STATS_CATEGORIES = {
  WISHLIST: {
    TOTAL_ITEMS: 'total_items',
    PENDING_ITEMS: 'pending_items',
    BOUGHT_ITEMS: 'bought_items',
    TOTAL_BUDGET: 'total_budget',
    TOTAL_SPENT: 'total_spent',
    AVERAGE_PRICE: 'average_price',
    PRIORITY_DISTRIBUTION: 'priority_distribution'
  },
  ARTICLE: {
    TOTAL_ARTICLES: 'total_articles',
    PENDING_ARTICLES: 'pending_articles',
    READ_ARTICLES: 'read_articles',
    AVERAGE_RATING: 'average_rating',
    CATEGORY_DISTRIBUTION: 'category_distribution',
    PRIORITY_DISTRIBUTION: 'priority_distribution',
    MONTHLY_READ_COUNT: 'monthly_read_count'
  }
};

// 🆕 検索フィルター定義
const SEARCH_FILTERS = {
  WISHLIST: {
    STATUS: ['want_to_buy', 'bought'],
    PRIORITY: ['high', 'medium', 'low'],
    PRICE_RANGE: ['0-1000', '1000-5000', '5000-10000', '10000+']
  },
  ARTICLE: {
    STATUS: ['want_to_read', 'read'],
    CATEGORY: Object.values(ARTICLE_CATEGORIES),
    PRIORITY: ['high', 'medium', 'low'],
    RATING: ['1', '2', '3', '4', '5']
  }
};

// 🆕 アクション推奨メッセージ
const RECOMMENDATION_MESSAGES = {
  WISHLIST: {
    HIGH_BUDGET: '💰 予算が高額です。本当に必要か再検討してみませんか？',
    LOW_PRIORITY_ITEMS: '🟢 低優先度のアイテムが多いです。整理を検討しましょう。',
    OLD_ITEMS: '📅 古いアイテムがあります。まだ必要か確認してみませんか？',
    PRICE_DROP: '📉 価格が下がっているアイテムがあるかもしれません。'
  },
  ARTICLE: {
    UNREAD_BACKLOG: '📚 未読記事が溜まっています。優先度を見直してみませんか？',
    LOW_RATING_CATEGORY: '⭐ 評価の低いカテゴリがあります。興味に合わないかもしれません。',
    HIGH_RATING_CATEGORY: '🌟 高評価のカテゴリです。類似記事を探してみませんか？',
    READING_STREAK: '🔥 連続読書記録更新中！この調子で続けましょう！'
  }
};

module.exports = {
  // 既存のエクスポート...
  APP_INFO: {
    NAME: 'ActivityTrackerBot',
    VERSION: '2.1.0', // バージョンアップ
    DESCRIPTION: 'Discord Activity Management Bot with Wishlist & Articles',
    AUTHOR: 'Yo Fujii',
    REPOSITORY: 'https://github.com/YoFujii0705/bot-discord'
  },
  DISCORD_LIMITS: {
    EMBED: {
      TITLE_MAX: 256,
      DESCRIPTION_MAX: 4096,
      FIELD_NAME_MAX: 256,
      FIELD_VALUE_MAX: 1024,
      FIELDS_MAX: 25,
      FOOTER_MAX: 2048,
      AUTHOR_MAX: 256,
      TOTAL_CHARS_MAX: 6000
    },
    MESSAGE: {
      CONTENT_MAX: 2000,
      ATTACHMENTS_MAX: 10
    },
    COMMAND: {
      NAME_MAX: 32,
      DESCRIPTION_MAX: 100,
      OPTION_NAME_MAX: 32,
      OPTION_DESCRIPTION_MAX: 100,
      CHOICES_MAX: 25
    }
  },
  
  // 🆕 拡張された定数をエクスポート
  STATUS,
  STATUS_NAMES,
  STATUS_EMOJIS,
  CATEGORIES,
  PRIORITY,
  PRIORITY_NAMES,
  PRIORITY_EMOJIS,
  ARTICLE_CATEGORIES,
  ARTICLE_CATEGORY_NAMES,
  ARTICLE_CATEGORY_EMOJIS,
  COLORS,
  SHEETS_CONFIG,
  NOTIFICATION_SETTINGS,
  VALIDATION,
  DEFAULTS,
  GOALS,
  LEVELS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  NOTIFICATION_TEMPLATES,
  STATS_CATEGORIES,
  SEARCH_FILTERS,
  RECOMMENDATION_MESSAGES,
  EMOJIS: {
    // 基本アクション
    ADD: '➕',
    EDIT: '✏️',
    DELETE: '🗑️',
    SEARCH: '🔍',
    LIST: '📋',
    STATS: '📊',
    
    // ステータス
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    INFO: 'ℹ️',
    LOADING: '⏳',
    
    // カテゴリ
    BOOK: '📚',
    MOVIE: '🎬',
    ACTIVITY: '🎯',
    REPORT: '📝',
    WISHLIST: '🛒',
    ARTICLE: '📰',
    
    // 時間
    CALENDAR: '📅',
    CLOCK: '🕐',
    TIMER: '⏱️',
    
    // 評価・レベル
    TROPHY: '🏆',
    MEDAL: '🏅',
    STAR: '⭐',
    FIRE: '🔥',
    THUMBS_UP: '👍',
    HEART: '❤️',
    
    // 方向・動作
    UP: '⬆️',
    DOWN: '⬇️',
    RIGHT: '➡️',
    LEFT: '⬅️',
    REFRESH: '🔄',
    
    // 通知
    BELL: '🔔',
    MEGAPHONE: '📢',
    MAIL: '📧',
    
    // 🆕 新しい絵文字
    MONEY: '💰',
    CREDIT_CARD: '💳',
    SHOPPING_BAG: '🛍️',
    LINK: '🔗',
    PRIORITY_HIGH: '🔴',
    PRIORITY_MEDIUM: '🟡',
    PRIORITY_LOW: '🟢',
    TECH: '💻',
    BUSINESS: '💼',
    LIFESTYLE: '🌟',
    NEWS: '📰',
    ACADEMIC: '🎓',
    GENERAL: '📄'
  }
};
