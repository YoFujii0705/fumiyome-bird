/**
 * フォーマットユーティリティ
 */

/**
 * 数値をフォーマット（カンマ区切り）
 */
function formatNumber(num) {
  return new Intl.NumberFormat('ja-JP').format(num);
}

/**
 * プログレスバーを生成
 * @param {number} percentage - 進捗率（0-100）
 * @param {number} length - バーの長さ（デフォルト: 10）
 * @returns {string} プログレスバー
 */
function getProgressBar(percentage, length = 10) {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  
  const filledBar = '█'.repeat(filled);
  const emptyBar = '░'.repeat(empty);
  
  return `${filledBar}${emptyBar}`;
}

/**
 * 残り時間を取得
 * @param {string} period - 'weekly' または 'monthly'
 * @returns {string} 残り時間の文字列
 */
function getTimeRemaining(period) {
  const now = new Date();
  
  if (period === 'weekly') {
    // 今週の日曜日を取得
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay() + 7);
    sunday.setHours(23, 59, 59, 999);
    
    const timeDiff = sunday.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    if (daysRemaining === 1) {
      return '今日まで';
    } else if (daysRemaining === 2) {
      return '明日まで';
    } else {
      return `あと${daysRemaining - 1}日`;
    }
  } else if (period === 'monthly') {
    // 今月の最終日を取得
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    lastDay.setHours(23, 59, 59, 999);
    
    const timeDiff = lastDay.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    if (daysRemaining === 1) {
      return '今日まで';
    } else if (daysRemaining === 2) {
      return '明日まで';
    } else {
      return `あと${daysRemaining}日`;
    }
  }
  
  return '';
}

/**
 * 期間の表示名を取得
 */
function getPeriodDisplayName(period) {
  const names = {
    weekly: '週次',
    monthly: '月次',
    daily: '日次',
    yearly: '年次'
  };
  return names[period] || period;
}

/**
 * カテゴリの表示名を取得
 */
function getCategoryDisplayName(category) {
  const names = {
    books: '📚 本',
    movies: '🎬 映画',
    activities: '🎯 活動',
    reports: '📝 日報'
  };
  return names[category] || category;
}

/**
 * 日付をフォーマット
 * @param {Date} date - 日付オブジェクト
 * @param {string} format - フォーマット形式
 * @returns {string} フォーマットされた日付文字列
 */
function formatDate(date, format = 'YYYY/MM/DD') {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  switch (format) {
    case 'YYYY/MM/DD':
      return `${year}/${month}/${day}`;
    case 'MM/DD':
      return `${month}/${day}`;
    case 'YYYY/MM/DD HH:mm':
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    case 'relative':
      return getRelativeTime(date);
    default:
      return date.toLocaleDateString('ja-JP');
  }
}

/**
 * 相対時間を取得（例: 2時間前、3日前）
 */
function getRelativeTime(date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  
  if (months > 0) return `${months}ヶ月前`;
  if (weeks > 0) return `${weeks}週間前`;
  if (days > 0) return `${days}日前`;
  if (hours > 0) return `${hours}時間前`;
  if (minutes > 0) return `${minutes}分前`;
  return '今';
}

/**
 * パーセンテージを絵文字で表現
 */
function getPercentageEmoji(percentage) {
  if (percentage >= 100) return '🎉';
  if (percentage >= 90) return '🔥';
  if (percentage >= 75) return '💪';
  if (percentage >= 50) return '📈';
  if (percentage >= 25) return '🚀';
  return '📍';
}

/**
 * ステータスの絵文字を取得
 */
function getStatusEmoji(status) {
  const emojis = {
    completed: '✅',
    in_progress: '🔄',
    planned: '📅',
    cancelled: '❌',
    on_hold: '⏸️'
  };
  return emojis[status] || '❓';
}

module.exports = {
  formatNumber,
  getProgressBar,
  getTimeRemaining,
  getPeriodDisplayName,
  getCategoryDisplayName,
  formatDate,
  getRelativeTime,
  getPercentageEmoji,
  getStatusEmoji
};
