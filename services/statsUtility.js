// services/statsUtility.js - 新しく作成する共通ユーティリティ
class StatsUtility {
  constructor(googleSheetsService) {
    this.googleSheets = googleSheetsService;
  }

  // ===============================
  // 統計データ取得系
  // ===============================
  
  // 前月データ取得（完全版）
  async getMonthlyStatsForDate(targetDate) {
    try {
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      
      return await this.googleSheets.getStatsForDateRange(startOfMonth, endOfMonth);
    } catch (error) {
      console.error('特定月データ取得エラー:', error);
      return { finishedBooks: 0, watchedMovies: 0, completedActivities: 0, reports: 0 };
    }
  }

  // 過去N週間のデータを取得
  async getWeeklyStatsForDate(weeksBack = 0) {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - (weeksBack * 7));
      
      const startOfWeek = new Date(targetDate);
      startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return await this.googleSheets.getStatsForDateRange(startOfWeek, endOfWeek);
    } catch (error) {
      console.error('週次データ取得エラー:', error);
      return { finishedBooks: 0, watchedMovies: 0, completedActivities: 0, reports: 0 };
    }
  }

  // ===============================
  // 比較・分析系
  // ===============================

  // 3ヶ月比較フォーマット
  formatThreeMonthComparison(twoMonthsAgo, lastMonth, thisMonth, monthNames) {
    const formatMonth = (stats, name) => {
      const total = (stats.finishedBooks || 0) + (stats.watchedMovies || 0) + (stats.completedActivities || 0);
      return `**${name}**: ${total}件 (📚${stats.finishedBooks || 0} 🎬${stats.watchedMovies || 0} 🎯${stats.completedActivities || 0})`;
    };

    return [
      formatMonth(twoMonthsAgo, monthNames[0]),
      formatMonth(lastMonth, monthNames[1]),
      formatMonth(thisMonth, monthNames[2])
    ].join('\n');
  }

  // 成長率計算
  calculateGrowthRates(twoMonthsAgo, lastMonth, thisMonth) {
    const calculateRate = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const thisTotal = (thisMonth.finishedBooks || 0) + (thisMonth.watchedMovies || 0) + (thisMonth.completedActivities || 0);
    const lastTotal = (lastMonth.finishedBooks || 0) + (lastMonth.watchedMovies || 0) + (lastMonth.completedActivities || 0);
    const twoMonthsTotal = (twoMonthsAgo.finishedBooks || 0) + (twoMonthsAgo.watchedMovies || 0) + (twoMonthsAgo.completedActivities || 0);

    const monthlyGrowth = calculateRate(thisTotal, lastTotal);
    const quarterlyGrowth = calculateRate(thisTotal, twoMonthsTotal);

    let trendIcon, trendText;
    if (monthlyGrowth > 10) {
      trendIcon = '🚀'; trendText = '急成長';
    } else if (monthlyGrowth > 0) {
      trendIcon = '📈'; trendText = '成長';
    } else if (monthlyGrowth === 0) {
      trendIcon = '➡️'; trendText = '安定';
    } else {
      trendIcon = '📉'; trendText = '調整期';
    }

    return {
      monthlyGrowth,
      quarterlyGrowth,
      summary: `前月比: ${trendIcon} ${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth}% (${trendText})\n3ヶ月比: ${quarterlyGrowth >= 0 ? '+' : ''}${quarterlyGrowth}%`
    };
  }

  // 週次比較（完全版）
  async getEnhancedWeeklyComparison() {
    try {
      const [thisWeek, lastWeek, twoWeeksAgo] = await Promise.all([
        this.getWeeklyStatsForDate(0),
        this.getWeeklyStatsForDate(1),
        this.getWeeklyStatsForDate(2)
      ]);

      const weekNames = ['2週間前', '先週', '今週'];
      
      return {
        thisWeek,
        lastWeek,
        twoWeeksAgo,
        comparison: this.formatThreeWeekComparison(twoWeeksAgo, lastWeek, thisWeek, weekNames),
        growth: this.calculateGrowthRates(twoWeeksAgo, lastWeek, thisWeek),
        trend: this.predictNextWeekTrend(twoWeeksAgo, lastWeek, thisWeek)
      };
    } catch (error) {
      console.error('週次比較取得エラー:', error);
      return null;
    }
  }

  // ===============================
  // 詳細分析系
  // ===============================

  // 詳細トレンド計算
  async calculateDetailedTrends() {
    try {
      const reportsData = await this.googleSheets.getRecentReports(30);
      const dailyStats = this.groupReportsByDay(reportsData);
      const weeklyPattern = this.analyzeWeeklyPattern(reportsData);
      
      return {
        paceAnalysis: this.generatePaceAnalysis(dailyStats),
        mostActiveDay: weeklyPattern.mostActiveDay,
        categoryTrends: this.analyzeCategoryTrends(reportsData),
        activityPattern: weeklyPattern.pattern
      };
    } catch (error) {
      console.error('詳細トレンド計算エラー:', error);
      return {
        paceAnalysis: '📊 順調なペースで活動中',
        mostActiveDay: '🗓️ データ分析中',
        categoryTrends: '📈 バランス良く活動中',
        activityPattern: '⚡ 継続的な活動'
      };
    }
  }

  // 読書分析
  async calculateReadingAnalysis(bookCounts, monthlyStats) {
    const total = bookCounts.total || 1;
    return {
      wishlistPercentage: Math.round(((bookCounts.wantToBuy || 0) / total) * 100),
      backlogPercentage: Math.round(((bookCounts.wantToRead || 0) / total) * 100),
      completionPercentage: Math.round((bookCounts.finished / total) * 100),
      completionRate: bookCounts.total > 0 ? Math.round((bookCounts.finished / bookCounts.total) * 100) : 0,
      backlogClearanceRate: this.calculateBacklogRate(bookCounts),
      monthlyPace: monthlyStats.finishedBooks || 0
    };
  }

  // ===============================
  // ヘルパーメソッド
  // ===============================

  // 日付関連
  getPreviousMonth(monthsBack) {
    const date = new Date();
    date.setMonth(date.getMonth() - monthsBack);
    return date;
  }

  getLastThreeMonthNames() {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const now = new Date();
    return [
      months[(now.getMonth() - 2 + 12) % 12],
      months[(now.getMonth() - 1 + 12) % 12],
      months[now.getMonth()]
    ];
  }

  // 変化表示
  getChangeIndicator(current, previous) {
    if (current > previous) return `📈 +${current - previous}`;
    if (current < previous) return `📉 -${previous - current}`;
    return '➡️ 変化なし';
  }

  // プログレスバー
  generateProgressBar(percentage, length = 10) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percentage}%`;
  }

  // 積読消化率
  calculateBacklogRate(bookCounts) {
    const totalOwned = (bookCounts.wantToRead || 0) + bookCounts.finished;
    return totalOwned > 0 ? Math.round((bookCounts.finished / totalOwned) * 100) : 0;
  }

  // データ分析ヘルパー
  groupReportsByDay(reports) {
    // レポートを日付別にグループ化
    const grouped = {};
    reports.forEach(report => {
      const date = new Date(report.timestamp).toDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(report);
    });
    return grouped;
  }

  analyzeWeeklyPattern(reports) {
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayCounts = new Array(7).fill(0);
    
    reports.forEach(report => {
      const dayIndex = new Date(report.timestamp).getDay();
      dayCounts[dayIndex]++;
    });

    const maxCount = Math.max(...dayCounts);
    const mostActiveDayIndex = dayCounts.indexOf(maxCount);
    
    return {
      mostActiveDay: `${dayNames[mostActiveDayIndex]}曜日 (${maxCount}件)`,
      pattern: dayCounts.map((count, index) => `${dayNames[index]}: ${count}件`).join(', ')
    };
  }

  analyzeCategoryTrends(reports) {
    const categories = { book: 0, movie: 0, activity: 0 };
    reports.forEach(report => {
      if (categories.hasOwnProperty(report.category)) {
        categories[report.category]++;
      }
    });

    const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
    if (total === 0) return '📊 データを蓄積中';

    const percentages = Object.entries(categories).map(([category, count]) => {
      const percentage = Math.round((count / total) * 100);
      const emoji = { book: '📚', movie: '🎬', activity: '🎯' }[category];
      return `${emoji} ${percentage}%`;
    });

    return percentages.join(' ');
  }

  generatePaceAnalysis(dailyStats) {
    const dailyCounts = Object.values(dailyStats).map(day => day.length);
    const avgDaily = dailyCounts.reduce((sum, count) => sum + count, 0) / dailyCounts.length;
    
    if (avgDaily >= 3) return '🚀 非常に活発なペース (平均 ' + avgDaily.toFixed(1) + ' 件/日)';
    if (avgDaily >= 2) return '⚡ 活発なペース (平均 ' + avgDaily.toFixed(1) + ' 件/日)';
    if (avgDaily >= 1) return '📈 安定したペース (平均 ' + avgDaily.toFixed(1) + ' 件/日)';
    return '🌱 ゆっくりペース (平均 ' + avgDaily.toFixed(1) + ' 件/日)';
  }

  // 予測関連
  predictNextWeekTrend(twoWeeksAgo, lastWeek, thisWeek) {
    const trends = [thisWeek, lastWeek, twoWeeksAgo].map(week => 
      (week.finishedBooks || 0) + (week.watchedMovies || 0) + (week.completedActivities || 0)
    );
    
    const avgGrowth = ((trends[0] - trends[1]) + (trends[1] - trends[2])) / 2;
    const prediction = Math.max(0, Math.round(trends[0] + avgGrowth));
    
    if (avgGrowth > 2) {
      return `🚀 来週は約 **${prediction}件** の完了が期待されます！`;
    } else if (avgGrowth > 0) {
      return `📈 来週は約 **${prediction}件** の完了予測`;
    } else {
      return `➡️ 来週は約 **${prediction}件** の完了予測`;
    }
  }

  // 3週間比較フォーマット
  formatThreeWeekComparison(twoWeeksAgo, lastWeek, thisWeek, weekNames) {
    const formatWeek = (stats, name) => {
      const total = (stats.finishedBooks || 0) + (stats.watchedMovies || 0) + (stats.completedActivities || 0);
      return `**${name}**: ${total}件 (📚${stats.finishedBooks || 0} 🎬${stats.watchedMovies || 0} 🎯${stats.completedActivities || 0})`;
    };

    return [
      formatWeek(twoWeeksAgo, weekNames[0]),
      formatWeek(lastWeek, weekNames[1]),
      formatWeek(thisWeek, weekNames[2])
    ].join('\n');
  }
}

module.exports = StatsUtility;
