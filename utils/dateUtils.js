/**
 * 日付操作ユーティリティ
 */

/**
 * 週の開始日（月曜日）を取得
 * @param {Date} date - 基準日
 * @returns {Date} 週の開始日
 */
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日を週の開始とする
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * 週の終了日（日曜日）を取得
 * @param {Date} date - 基準日
 * @returns {Date} 週の終了日
 */
function getWeekEnd(date = new Date()) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * 月の開始日を取得
 * @param {Date} date - 基準日
 * @returns {Date} 月の開始日
 */
function getMonthStart(date = new Date()) {
  const d = new Date(date);
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  return monthStart;
}

/**
 * 月の終了日を取得
 * @param {Date} date - 基準日
 * @returns {Date} 月の終了日
 */
function getMonthEnd(date = new Date()) {
  const d = new Date(date);
  const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);
  return monthEnd;
}

/**
 * 年の開始日を取得
 * @param {Date} date - 基準日
 * @returns {Date} 年の開始日
 */
function getYearStart(date = new Date()) {
  const d = new Date(date);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  yearStart.setHours(0, 0, 0, 0);
  return yearStart;
}

/**
 * 年の終了日を取得
 * @param {Date} date - 基準日
 * @returns {Date} 年の終了日
 */
function getYearEnd(date = new Date()) {
  const d = new Date(date);
  const yearEnd = new Date(d.getFullYear(), 11, 31);
  yearEnd.setHours(23, 59, 59, 999);
  return yearEnd;
}

/**
 * 指定した日付が今週かどうかを判定
 * @param {Date} date - 判定対象の日付
 * @returns {boolean} 今週かどうか
 */
function isThisWeek(date) {
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  return date >= weekStart && date <= weekEnd;
}

/**
 * 指定した日付が今月かどうかを判定
 * @param {Date} date - 判定対象の日付
 * @returns {boolean} 今月かどうか
 */
function isThisMonth(date) {
  const now = new Date();
  const monthStart = getMonthStart(now);
  const monthEnd = getMonthEnd(now);
  return date >= monthStart && date <= monthEnd;
}

/**
 * 指定した日付が今年かどうかを判定
 * @param {Date} date - 判定対象の日付
 * @returns {boolean} 今年かどうか
 */
function isThisYear(date) {
  const now = new Date();
  return date.getFullYear() === now.getFullYear();
}

/**
 * 指定した日付が今日かどうかを判定
 * @param {Date} date - 判定対象の日付
 * @returns {boolean} 今日かどうか
 */
function isToday(date) {
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

/**
 * 2つの日付の差を日数で取得
 * @param {Date} date1 - 開始日
 * @param {Date} date2 - 終了日
 * @returns {number} 日数の差
 */
function getDaysDifference(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((date2.getTime() - date1.getTime()) / oneDay);
}

/**
 * 指定した日数前の日付を取得
 * @param {number} days - 日数
 * @param {Date} fromDate - 基準日（デフォルト: 今日）
 * @returns {Date} 指定日数前の日付
 */
function getDaysAgo(days, fromDate = new Date()) {
  const date = new Date(fromDate);
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * 指定した日数後の日付を取得
 * @param {number} days - 日数
 * @param {Date} fromDate - 基準日（デフォルト: 今日）
 * @returns {Date} 指定日数後の日付
 */
function getDaysLater(days, fromDate = new Date()) {
  const date = new Date(fromDate);
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * 日付を ISO 文字列（YYYY-MM-DD）に変換
 * @param {Date} date - 日付
 * @returns {string} ISO文字列
 */
function toISODateString(date) {
  return date.toISOString().split('T')[0];
}

/**
 * ISO文字列から日付オブジェクトを作成
 * @param {string} isoString - ISO文字列
 * @returns {Date} 日付オブジェクト
 */
function fromISODateString(isoString) {
  return new Date(isoString + 'T00:00:00.000Z');
}

/**
 * 日付が有効かどうかを判定
 * @param {Date} date - 判定対象の日付
 * @returns {boolean} 有効な日付かどうか
 */
function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * 日付を安全にパース
 * @param {string|Date} dateInput - 日付の入力
 * @returns {Date|null} パースされた日付またはnull
 */
function safeParseDate(dateInput) {
  if (dateInput instanceof Date) {
    return isValidDate(dateInput) ? dateInput : null;
  }
  
  if (typeof dateInput === 'string') {
    const parsed = new Date(dateInput);
    return isValidDate(parsed) ? parsed : null;
  }
  
  return null;
}

module.exports = {
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  getYearStart,
  getYearEnd,
  isThisWeek,
  isThisMonth,
  isThisYear,
  isToday,
  getDaysDifference,
  getDaysAgo,
  getDaysLater,
  toISODateString,
  fromISODateString,
  isValidDate,
  safeParseDate
};
