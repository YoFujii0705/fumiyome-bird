module.exports = {
  // Google Sheets の設定
  sheets: {
    // シート名の定義
    SHEET_NAMES: {
      BOOKS_MASTER: 'books_master',
      MOVIES_MASTER: 'movies_master',
      ACTIVITIES_MASTER: 'activities_master',
      DAILY_REPORTS: 'daily_reports'
WISHLIST_MASTER: 'wishlist_master',
      ARTICLES_MASTER: 'articles_master'
    },
    
    // 列の定義
    COLUMNS: {
      BOOKS: {
        ID: 0,
        CREATED_AT: 1,
        TITLE: 2,
        AUTHOR: 3,
        MEMO: 4,
        STATUS: 5,
        UPDATED_AT: 6
      },
      MOVIES: {
        ID: 0,
        CREATED_AT: 1,
        TITLE: 2,
        MEMO: 3,
        STATUS: 4,
        UPDATED_AT: 5
      },
      ACTIVITIES: {
        ID: 0,
        CREATED_AT: 1,
        CONTENT: 2,
        MEMO: 3,
        STATUS: 4,
        UPDATED_AT: 5
      },
      REPORTS: {
        ID: 0,
        DATE: 1,
        CATEGORY: 2,
        ITEM_ID: 3,
        CONTENT: 4
      }
    },
// 🆕 ウィッシュリストの列定義
      WISHLIST: {
        ID: 0,
        CREATED_AT: 1,
        NAME: 2,           // アイテム名
        PRICE: 3,          // 予定価格
        ACTUAL_PRICE: 4,   // 実際の価格
        URL: 5,            // 商品URL
        PRIORITY: 6,       // 優先度 (high, medium, low)
        MEMO: 7,           // 備考
        STATUS: 8,         // ステータス (want_to_buy, bought)
        UPDATED_AT: 9      // 更新日時
      },
      // 🆕 記事リストの列定義
      ARTICLES: {
        ID: 0,
        CREATED_AT: 1,
        TITLE: 2,          // 記事タイトル
        URL: 3,            // 記事URL
        CATEGORY: 4,       // カテゴリ (tech, business, lifestyle, news, academic, general)
        PRIORITY: 5,       // 優先度 (high, medium, low)
        MEMO: 6,           // 備考
        STATUS: 7,         // ステータス (want_to_read, read)
        RATING: 8,         // 評価 (1-5)
        REVIEW: 9,         // レビュー・感想
        UPDATED_AT: 10     // 更新日時
      }
    },
    
    // 範囲の定義
    RANGES: {
      BOOKS_ALL: 'books_master!A:G',
      MOVIES_ALL: 'movies_master!A:F',
      ACTIVITIES_ALL: 'activities_master!A:F',
      REPORTS_ALL: 'daily_reports!A:E'
WISHLIST_ALL: 'wishlist_master!A:J',
      ARTICLES_ALL: 'articles_master!A:K'
    }
  },
  
// 🆕 新しいステータス定義
  STATUS: {
    // 既存のステータス...
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
    ACTIVITY: {
      PLANNED: 'planned',
      DONE: 'done',
      SKIPPED: 'skipped'
    },
    // 🆕 ウィッシュリストのステータス
    WISHLIST: {
      WANT_TO_BUY: 'want_to_buy',
      BOUGHT: 'bought'
    },
    // 🆕 記事のステータス
    ARTICLE: {
      WANT_TO_READ: 'want_to_read',
      READ: 'read'
    }
  },

  // 🆕 優先度定義
  PRIORITY: {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
  },

  // 🆕 記事カテゴリ定義
  ARTICLE_CATEGORIES: {
    TECH: 'tech',
    BUSINESS: 'business',
    LIFESTYLE: 'lifestyle',
    NEWS: 'news',
    ACADEMIC: 'academic',
    GENERAL: 'general'
  },

  // 🆕 バリデーション設定
  VALIDATION: {
    WISHLIST: {
      NAME_MAX_LENGTH: 200,
      URL_MAX_LENGTH: 500,
      MEMO_MAX_LENGTH: 500,
      PRICE_MIN: 0,
      PRICE_MAX: 10000000 // 1000万円
    },
    ARTICLE: {
      TITLE_MAX_LENGTH: 300,
      URL_MAX_LENGTH: 500,
      MEMO_MAX_LENGTH: 500,
      REVIEW_MAX_LENGTH: 1000,
      RATING_MIN: 1,
      RATING_MAX: 5
    }
  },

  // 🆕 デフォルト値
  DEFAULTS: {
    WISHLIST_PRIORITY: 'medium',
    ARTICLE_PRIORITY: 'medium',
    ARTICLE_CATEGORY: 'general'
  },


  // タイムアウト設定
  timeouts: {
    OPERATION_TIMEOUT: 10000,
    AUTH_TIMEOUT: 30000
  }
};
