// 日付・時間関連のヘルパー
const DateHelpers = {
  // 日本時間で現在の日付を取得
  getCurrentDateJST() {
    return new Date().toLocaleDateString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
  },

  // 日本時間で現在の日時を取得
  getCurrentDateTimeJST() {
    return new Date().toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo'
    });
  },

  // 週の開始日を取得
  getWeekStart(date = new Date()) {
    const day = date.getDay();
    const diff = date.getDate() - day; // 日曜日を週の開始とする
    return new Date(date.setDate(diff));
  },

  // 月の開始日を取得
  getMonthStart(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  },

  // 日付の差分を計算（日数）
  getDaysDifference(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1 - date2) / oneDay));
  },

  // 相対的な日付表示
  getRelativeDateString(date) {
    const now = new Date();
    const diff = this.getDaysDifference(now, date);
    
    if (diff === 0) return '今日';
    if (diff === 1) return '昨日';
    if (diff <= 7) return `${diff}日前`;
    if (diff <= 30) return `${Math.floor(diff / 7)}週間前`;
    if (diff <= 365) return `${Math.floor(diff / 30)}ヶ月前`;
    return `${Math.floor(diff / 365)}年前`;
  }
};

// 文字列処理のヘルパー
const StringHelpers = {
  // 文字列を指定長さで切り詰め
  truncate(str, length, suffix = '...') {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  },

  // 文字列をタイトルケースに変換
  toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },

  // 文字列から数字のみを抽出
  extractNumbers(str) {
    return str.replace(/\D/g, '');
  },

  // 全角英数字を半角に変換
  toHalfWidth(str) {
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => 
      String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    );
  },

  // キーワードのハイライト
  highlightKeywords(text, keywords, wrapper = '**') {
    let highlightedText = text;
    
    if (Array.isArray(keywords)) {
      keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        highlightedText = highlightedText.replace(regex, `${wrapper}${keyword}${wrapper}`);
      });
    } else {
      const regex = new RegExp(keywords, 'gi');
      highlightedText = highlightedText.replace(regex, `${wrapper}${keywords}${wrapper}`);
    }
    
    return highlightedText;
  }
};

// 数値・統計処理のヘルパー
const NumberHelpers = {
  // 数値を日本語形式でフォーマット
  formatNumber(num) {
    return new Intl.NumberFormat('ja-JP').format(num);
  },

  // パーセンテージを計算
  calculatePercentage(value, total, decimals = 1) {
    if (total === 0) return 0;
    return parseFloat(((value / total) * 100).toFixed(decimals));
  },

  // 平均値を計算
  calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
  },

  // 中央値を計算
  calculateMedian(numbers) {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
  },

  // 範囲内の乱数を生成
  randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // プログレスバーを生成
  generateProgressBar(percentage, length = 10, filledChar = '█', emptyChar = '░') {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return filledChar.repeat(filled) + emptyChar.repeat(empty) + ` ${percentage}%`;
  }
};

// 配列処理のヘルパー
const ArrayHelpers = {
  // 配列をグループ化
  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = typeof key === 'function' ? key(item) : item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  },

  // 配列をチャンク（指定サイズに分割）
  chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  // 配列をシャッフル
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  // 配列から重複を除去
  unique(array) {
    return [...new Set(array)];
  },

  // 配列内の要素の出現回数をカウント
  countOccurrences(array) {
    return array.reduce((counts, item) => {
      counts[item] = (counts[item] || 0) + 1;
      return counts;
    }, {});
  }
};

// バリデーションヘルパー
const ValidationHelpers = {
  // 文字列の長さをチェック
  isValidLength(str, min = 1, max = 1000) {
    return str && str.length >= min && str.length <= max;
  },

  // 数値の範囲をチェック
  isInRange(num, min, max) {
    return num >= min && num <= max;
  },

  // 日付の妥当性をチェック
  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  },

  // オブジェクトが空かチェック
  isEmpty(obj) {
    return Object.keys(obj).length === 0;
  },

  // 必須フィールドの存在をチェック
  hasRequiredFields(obj, requiredFields) {
    return requiredFields.every(field => obj.hasOwnProperty(field) && obj[field] !== null && obj[field] !== undefined);
  }
};

// Discord固有のヘルパー
const DiscordHelpers = {
  // メンションをエスケープ
  escapeMentions(text) {
    return text.replace(/@/g, '@\u200b');
  },

  // Embedの文字数制限をチェック
  validateEmbedLimits(embed) {
    const limits = {
      title: 256,
      description: 4096,
      fieldName: 256,
      fieldValue: 1024,
      footer: 2048,
      author: 256
    };

    const warnings = [];

    if (embed.title && embed.title.length > limits.title) {
      warnings.push(`タイトルが長すぎます (${embed.title.length}/${limits.title})`);
    }

    if (embed.description && embed.description.length > limits.description) {
      warnings.push(`説明文が長すぎます (${embed.description.length}/${limits.description})`);
    }

    if (embed.fields) {
      embed.fields.forEach((field, index) => {
        if (field.name && field.name.length > limits.fieldName) {
          warnings.push(`フィールド${index + 1}の名前が長すぎます`);
        }
        if (field.value && field.value.length > limits.fieldValue) {
          warnings.push(`フィールド${index + 1}の値が長すぎます`);
        }
      });
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  },

  // ユーザーIDからメンションを生成
  createUserMention(userId) {
    return `<@${userId}>`;
  },

  // チャンネルIDからメンションを生成
  createChannelMention(channelId) {
    return `<#${channelId}>`;
  },

  // ロールIDからメンションを生成
  createRoleMention(roleId) {
    return `<@&${roleId}>`;
  }
};

// エラーハンドリングヘルパー
const ErrorHelpers = {
  // エラーオブジェクトを安全に文字列化
  stringifyError(error) {
    return JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
  },

  // スタックトレースをクリーンアップ
  cleanStackTrace(error) {
    if (!error.stack) return '';
    
    return error.stack
      .split('\n')
      .filter(line => !line.includes('node_modules'))
      .join('\n');
  },

  // エラーの重要度を判定
  getErrorSeverity(error) {
    const criticalErrors = ['ENOTFOUND', 'ECONNREFUSED', 'TokenInvalid'];
    const warningErrors = ['RateLimited', 'Timeout'];
    
    if (criticalErrors.some(code => error.message.includes(code))) {
      return 'critical';
    }
    
    if (warningErrors.some(code => error.message.includes(code))) {
      return 'warning';
    }
    
    return 'info';
  },

  // ユーザーフレンドリーなエラーメッセージを生成
  getUserFriendlyMessage(error) {
    const messages = {
      'TokenInvalid': 'Botの認証に失敗しました。管理者にお問い合わせください。',
      'RateLimited': '操作が多すぎます。しばらく待ってから再試行してください。',
      'Timeout': '処理がタイムアウトしました。再試行してください。',
      'ENOTFOUND': 'ネットワーク接続に問題があります。',
      'ECONNREFUSED': 'サーバーに接続できません。'
    };

    for (const [code, message] of Object.entries(messages)) {
      if (error.message.includes(code)) {
        return message;
      }
    }

    return '予期しないエラーが発生しました。管理者にお問い合わせください。';
  }
};

// パフォーマンス測定ヘルパー
const PerformanceHelpers = {
  // 実行時間を測定
  async measureExecutionTime(asyncFunction, ...args) {
    const start = Date.now();
    const result = await asyncFunction(...args);
    const end = Date.now();
    
    return {
      result,
      executionTime: end - start
    };
  },

  // メモリ使用量を取得
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024)
    };
  },

  // CPU使用率を取得（簡易版）
  getCPUUsage() {
    const usage = process.cpuUsage();
    return {
      user: usage.user / 1000, // マイクロ秒をミリ秒に変換
      system: usage.system / 1000
    };
  }
};

// キャッシュヘルパー
class CacheHelper {
  constructor(defaultTTL = 300000) { // デフォルト5分
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expireAt = Date.now() + ttl;
    this.cache.set(key, { value, expireAt });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // 期限切れのアイテムを削除
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expireAt) {
        this.cache.delete(key);
      }
    }
  }

  // キャッシュ統計を取得
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// 設定ヘルパー
const ConfigHelpers = {
  // 環境変数の存在チェック
  checkRequiredEnvVars(requiredVars) {
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`必須の環境変数が設定されていません: ${missing.join(', ')}`);
    }
    
    return true;
  },

  // 環境変数を安全に取得
  getEnvVar(name, defaultValue = null) {
    return process.env[name] || defaultValue;
  },

  // Boolean型の環境変数を取得
  getBooleanEnvVar(name, defaultValue = false) {
    const value = process.env[name];
    if (!value) return defaultValue;
    
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  },

  // 数値型の環境変数を取得
  getNumberEnvVar(name, defaultValue = 0) {
    const value = process.env[name];
    if (!value) return defaultValue;
    
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
};

// エクスポート
module.exports = {
  DateHelpers,
  StringHelpers,
  NumberHelpers,
  ArrayHelpers,
  ValidationHelpers,
  DiscordHelpers,
  ErrorHelpers,
  PerformanceHelpers,
  CacheHelper,
  ConfigHelpers,

  // よく使われる関数を直接エクスポート
  formatDate: DateHelpers.getCurrentDateJST,
  truncate: StringHelpers.truncate,
  percentage: NumberHelpers.calculatePercentage,
  progressBar: NumberHelpers.generateProgressBar,
  groupBy: ArrayHelpers.groupBy,
  isValidLength: ValidationHelpers.isValidLength,
  escapeMentions: DiscordHelpers.escapeMentions,
  measureTime: PerformanceHelpers.measureExecutionTime
};
