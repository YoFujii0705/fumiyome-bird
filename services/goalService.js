// services/goalService.js (完全版 - 永続化対応)
const fs = require('fs');
const path = require('path');

class GoalService {
  constructor() {
    this.googleSheets = null;
    this.goals = new Map();
    this.goalsFilePath = path.join(__dirname, '../data/goals.json');
    
    console.log('🎯 GoalService 初期化中...');
    
    // 起動時に保存された目標を読み込み
    this.loadGoalsFromFile();
  }

  /**
   * ファイルから目標を読み込み
   */
  loadGoalsFromFile() {
    try {
      this.ensureDataDirectory();
      
      if (fs.existsSync(this.goalsFilePath)) {
        const data = fs.readFileSync(this.goalsFilePath, 'utf8');
        const goalsData = JSON.parse(data);
        
        // Map に復元
        for (const [userId, goals] of Object.entries(goalsData)) {
          this.goals.set(userId, goals);
        }
        
        console.log(`✅ ${this.goals.size}人の目標をファイルから読み込みました`);
        
        // デバッグ: 読み込んだ目標を表示
        for (const [userId, goals] of this.goals) {
          console.log(`📋 ユーザー ${userId} の目標:`, JSON.stringify(goals, null, 2));
        }
      } else {
        console.log('📁 目標ファイルが存在しません。新規ファイルを作成します。');
        this.saveGoalsToFile(); // 空のファイルを作成
      }
    } catch (error) {
      console.error('❌ 目標読み込みエラー:', error);
    }
  }

  /**
   * 目標をファイルに保存
   */
  saveGoalsToFile() {
    try {
      this.ensureDataDirectory();
      
      // Map を Object に変換
      const goalsData = {};
      for (const [userId, goals] of this.goals) {
        goalsData[userId] = goals;
      }
      
      fs.writeFileSync(this.goalsFilePath, JSON.stringify(goalsData, null, 2));
      console.log('💾 目標をファイルに保存しました:', this.goalsFilePath);
    } catch (error) {
      console.error('❌ 目標保存エラー:', error);
    }
  }

  /**
   * データディレクトリを確保
   */
  ensureDataDirectory() {
    const dataDir = path.dirname(this.goalsFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 データディレクトリを作成しました:', dataDir);
    }
  }

  /**
   * GoogleSheetsServiceを設定
   */
  setGoogleSheetsService(googleSheetsService) {
    this.googleSheets = googleSheetsService;
    console.log('✅ GoalService に GoogleSheetsService を設定しました');
  }

  /**
   * ユーザーの目標を取得
   */
  async getGoals(userId) {
    const userGoals = this.goals.get(userId);
    
    if (!userGoals) {
      // デフォルト目標を返す
      return {
        weekly: {},
        monthly: {}
      };
    }
    
    return userGoals;
  }

  /**
   * 目標を設定（永続化対応）
   */
  async setGoal(userId, period, category, target) {
    let userGoals = this.goals.get(userId) || { weekly: {}, monthly: {} };
    
    if (!userGoals[period]) {
      userGoals[period] = {};
    }
    
    userGoals[period][category] = parseInt(target);
    this.goals.set(userId, userGoals);
    
    // ファイルに保存
    this.saveGoalsToFile();
    
    console.log(`目標設定: ${userId} - ${period} ${category}: ${target}`);
    return true;
  }

  /**
   * プリセットから目標を一括設定（永続化対応）
   */
  async setGoalsFromPreset(userId, presetData) {
    try {
      let userGoals = this.goals.get(userId) || { weekly: {}, monthly: {} };
      
      // 週次目標を設定
      if (presetData.weekly) {
        userGoals.weekly = { ...presetData.weekly };
      }
      
      // 月次目標を設定
      if (presetData.monthly) {
        userGoals.monthly = { ...presetData.monthly };
      }
      
      this.goals.set(userId, userGoals);
      
      // ファイルに保存
      this.saveGoalsToFile();
      
      console.log(`プリセット目標設定: ${userId}`, presetData);
      return true;
    } catch (error) {
      console.error('プリセット設定エラー:', error);
      throw error;
    }
  }

  /**
   * 目標をリセット（永続化対応）
   */
  async resetAllGoals(userId) {
    this.goals.delete(userId);
    this.saveGoalsToFile();
    console.log(`全目標リセット: ${userId}`);
    return true;
  }

  /**
   * 期間別目標リセット（永続化対応）
   */
  async resetGoals(userId, period = null) {
    if (!period || period === 'all') {
      return this.resetAllGoals(userId);
    }
    
    let userGoals = this.goals.get(userId);
    if (!userGoals) return true;
    
    if (period === 'weekly') {
      userGoals.weekly = {};
    } else if (period === 'monthly') {
      userGoals.monthly = {};
    }
    
    this.goals.set(userId, userGoals);
    this.saveGoalsToFile();
    
    console.log(`${period}目標リセット: ${userId}`);
    return true;
  }

/**
 * 現在の進捗を取得（アニメ対応版）
 */
async getCurrentProgress(userId) {
  try {
    if (!this.googleSheets) {
      console.warn('⚠️ GoogleSheetsService が設定されていません');
      return {
        weekly: { books: 0, movies: 0, animes: 0, activities: 0, reports: 0 },
        monthly: { books: 0, movies: 0, animes: 0, activities: 0, reports: 0 }
      };
    }

    console.log('📊 週次統計取得開始（アニメ含む）');
    const weeklyStats = await this.googleSheets.getWeeklyStats();
    console.log('📊 月次統計取得開始（アニメ含む）');
    const monthlyStats = await this.googleSheets.getMonthlyStats();

    // 安全なデータ抽出（undefined対策・アニメ追加）
    const weeklyProgress = {
      books: weeklyStats?.finishedBooks || 0,
      movies: weeklyStats?.watchedMovies || 0,
      animes: weeklyStats?.completedAnimes || 0, // 🆕 アニメ追加
      activities: weeklyStats?.completedActivities || 0,
      reports: weeklyStats?.reports || 0
    };

    const monthlyProgress = {
      books: monthlyStats?.finishedBooks || 0,
      movies: monthlyStats?.watchedMovies || 0,
      animes: monthlyStats?.completedAnimes || 0, // 🆕 アニメ追加
      activities: monthlyStats?.completedActivities || 0,
      reports: monthlyStats?.reports || 0
    };

    console.log('✅ 週次統計取得完了（アニメ含む）:', weeklyProgress);
    console.log('✅ 月次統計取得完了（アニメ含む）:', monthlyProgress);

    return {
      weekly: weeklyProgress,
      monthly: monthlyProgress
    };
  } catch (error) {
    console.error('❌ 進捗取得エラー:', error);
    // エラー時はゼロデータを返す（アニメ含む）
    return {
      weekly: { books: 0, movies: 0, animes: 0, activities: 0, reports: 0 },
      monthly: { books: 0, movies: 0, animes: 0, activities: 0, reports: 0 }
    };
  }
}

  /**
 * 進捗分析を取得（アニメ対応版）
 */
async getProgressAnalysis(userId) {
  try {
    if (!this.googleSheets) {
      console.warn('⚠️ GoogleSheetsService が設定されていません（進捗分析）');
      return {
        today: { books: 0, movies: 0, animes: 0, activities: 0 },
        streak: 0,
        weeklyProgress: 0,
        momentum: 'stable'
      };
    }

    console.log('📝 過去7日間のレポート取得開始');
    const recentReports = await this.googleSheets.getRecentReports(7);
    console.log(`✅ ${recentReports?.length || 0}件のレポートを取得しました`);

    // recentReports が null や undefined の場合の対策
    if (!recentReports || !Array.isArray(recentReports)) {
      console.warn('⚠️ レポートデータが無効です');
      return {
        today: { books: 0, movies: 0, animes: 0, activities: 0 },
        streak: 0,
        weeklyProgress: 0,
        momentum: 'stable'
      };
    }

    // 今日の実績を計算（安全な日付処理・アニメ追加）
    const today = new Date().toISOString().slice(0, 10);
    const todayReports = recentReports.filter(report => {
      if (!report || !report.timestamp) return false;
      
      try {
        let dateStr;
        if (report.timestamp instanceof Date) {
          dateStr = report.timestamp.toISOString().slice(0, 10);
        } else if (typeof report.timestamp === 'string') {
          if (report.timestamp.includes('T')) {
            dateStr = report.timestamp.slice(0, 10);
          } else {
            dateStr = report.timestamp;
          }
        } else {
          dateStr = new Date(report.timestamp).toISOString().slice(0, 10);
        }
        
        return dateStr === today;
      } catch (error) {
        console.log('⚠️ 日付処理エラー:', report.timestamp, error);
        return false;
      }
    });

    const todayStats = {
      books: todayReports.filter(r => r.category === 'book').length,
      movies: todayReports.filter(r => r.category === 'movie').length,
      animes: todayReports.filter(r => r.category === 'anime').length, // 🆕 アニメ追加
      activities: todayReports.filter(r => r.category === 'activity').length
    };

    console.log('🎯 今日の実績（アニメ含む）:', todayStats);

    // ストリーク計算
    const streak = this.calculateStreak(recentReports);
    const weeklyProgress = await this.calculateWeeklyProgress(recentReports);
    const momentum = this.calculateMomentum(recentReports);

    const analysis = {
      today: todayStats,
      streak,
      weeklyProgress,
      momentum
    };

    console.log('📊 進捗分析結果（アニメ含む）:', analysis);
    return analysis;

  } catch (error) {
    console.error('❌ 進捗分析エラー:', error);
    return {
      today: { books: 0, movies: 0, animes: 0, activities: 0 },
      streak: 0,
      weeklyProgress: 0,
      momentum: 'stable'
    };
  }
}
  /**
   * ストリークを計算（修正版）
   */
  calculateStreak(recentReports) {
    if (!recentReports || recentReports.length === 0) {
      console.log('📊 レポートデータが空のため、ストリーク=0');
      return 0;
    }

    try {
      // 日付別にグループ化（安全な日付処理）
      const reportsByDate = {};
      recentReports.forEach(report => {
        try {
          let dateStr;
          
          if (report.timestamp instanceof Date) {
            dateStr = report.timestamp.toISOString().slice(0, 10);
          } else if (typeof report.timestamp === 'string') {
            if (report.timestamp.includes('T')) {
              dateStr = report.timestamp.slice(0, 10);
            } else {
              dateStr = report.timestamp;
            }
          } else {
            dateStr = new Date(report.timestamp).toISOString().slice(0, 10);
          }
          
          if (!reportsByDate[dateStr]) reportsByDate[dateStr] = [];
          reportsByDate[dateStr].push(report);
        } catch (error) {
          console.log('⚠️ ストリーク計算で日付処理エラー:', report.timestamp);
        }
      });

      // 連続日数を計算
      let streak = 0;
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().slice(0, 10);
        
        if (reportsByDate[dateStr] && reportsByDate[dateStr].length > 0) {
          streak++;
        } else {
          break;
        }
      }

      console.log(`🔥 計算されたストリーク: ${streak}日`);
      return streak;
    } catch (error) {
      console.error('ストリーク計算エラー:', error);
      return 0;
    }
  }

  /**
   * 週次進捗を計算（修正版）
   */
  async calculateWeeklyProgress(recentReports) {
    if (!recentReports || recentReports.length === 0) return 0;

    try {
      const thisWeekReports = recentReports.filter(report => {
        try {
          let reportDate;
          
          if (report.timestamp instanceof Date) {
            reportDate = report.timestamp;
          } else {
            reportDate = new Date(report.timestamp);
          }
          
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);
          
          return reportDate >= weekStart;
        } catch (error) {
          console.log('⚠️ 週次進捗計算で日付処理エラー:', report.timestamp);
          return false;
        }
      });

      return thisWeekReports.length;
    } catch (error) {
      console.error('週次進捗計算エラー:', error);
      return 0;
    }
  }

  /**
   * モメンタム（勢い）を計算（修正版）
   */
  calculateMomentum(recentReports) {
    if (!recentReports || recentReports.length < 7) return 'building';

    try {
      // 最近の7件と前の7件を比較
      const thisWeek = recentReports.slice(0, 7).length;
      const lastWeek = recentReports.slice(7, 14).length;

      if (thisWeek > lastWeek * 1.2) return 'accelerating';
      if (thisWeek < lastWeek * 0.8) return 'slowing';
      return 'stable';
    } catch (error) {
      console.error('モメンタム計算エラー:', error);
      return 'stable';
    }
  }

  /**
   * 全ユーザーの目標を取得
   */
  getAllUserGoals() {
    const allGoals = {};
    for (const [userId, goals] of this.goals) {
      allGoals[userId] = goals;
    }
    return allGoals;
  }

  /**
   * 目標達成状況をチェック
   */
  async checkGoalAchievements(userId) {
    const [goals, progress] = await Promise.all([
      this.getGoals(userId),
      this.getCurrentProgress(userId)
    ]);

    const achievements = [];

    // 週次目標チェック
    if (goals.weekly) {
      Object.entries(goals.weekly).forEach(([category, target]) => {
        const current = progress.weekly[category] || 0;
        if (current >= target) {
          achievements.push({
            type: 'weekly',
            category,
            target,
            current,
            achievedAt: new Date()
          });
        }
      });
    }

    // 月次目標チェック
    if (goals.monthly) {
      Object.entries(goals.monthly).forEach(([category, target]) => {
        const current = progress.monthly[category] || 0;
        if (current >= target) {
          achievements.push({
            type: 'monthly',
            category,
            target,
            current,
            achievedAt: new Date()
          });
        }
      });
    }

    return achievements;
  }

  /**
   * テスト用のモックユーザー作成
   */
  createTestUser(userId) {
    const testGoals = {
      weekly: {
        books: 2,
        movies: 3,
        activities: 5,
        reports: 7
      },
      monthly: {
        books: 8,
        movies: 12,
        activities: 20,
        reports: 30
      }
    };

    this.goals.set(userId, testGoals);
    this.saveGoalsToFile(); // 永続化
    console.log(`テストユーザー作成: ${userId}`);
    return testGoals;
  }

  /**
   * 統計取得
   */
  getStats() {
    const totalUsers = this.goals.size;
    const activeGoalTypes = new Set();
    
    for (const [userId, userGoals] of this.goals) {
      Object.keys(userGoals.weekly || {}).forEach(category => activeGoalTypes.add(`weekly_${category}`));
      Object.keys(userGoals.monthly || {}).forEach(category => activeGoalTypes.add(`monthly_${category}`));
    }

    return {
      totalUsers,
      activeGoalTypes: Array.from(activeGoalTypes),
      goalTypeCount: activeGoalTypes.size
    };
  }
}

// シングルトンインスタンスをエクスポート
module.exports = new GoalService();
