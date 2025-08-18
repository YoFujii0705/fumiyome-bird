// services/goalService.js (Google Sheets対応版)

class GoalService {
  constructor() {
    this.googleSheets = null;
    this.goals = new Map(); // ローカルキャッシュとして使用
    
    console.log('🎯 GoalService 初期化中（Google Sheets対応）...');
  }

  /**
   * GoogleSheetsServiceを設定
   */
  setGoogleSheetsService(googleSheetsService) {
    this.googleSheets = googleSheetsService;
    console.log('✅ GoalService に GoogleSheetsService を設定しました');
  }

  /**
   * ユーザーの目標を取得（Google Sheets から）
   */
  async getGoals(userId) {
    try {
      if (!this.googleSheets) {
        console.warn('⚠️ GoogleSheetsService が設定されていません');
        return { weekly: {}, monthly: {} };
      }

      console.log(`📊 ユーザー ${userId} の目標をGoogle Sheetsから取得中...`);
      
      // goals_master シートからデータを取得
      const goalsData = await this.googleSheets.getData('goals_master!A:M');
      
      if (!goalsData || goalsData.length <= 1) {
        console.log('📋 目標データが見つかりません');
        return { weekly: {}, monthly: {} };
      }

      // ヘッダー行をスキップしてユーザーのデータを検索
      const userRow = goalsData.slice(1).find(row => row[0] === userId);
      
      if (!userRow) {
        console.log(`📋 ユーザー ${userId} の目標が見つかりません`);
        return { weekly: {}, monthly: {} };
      }

      // 列に従ってデータを解析
      // A:user_id B:weekly_books C:weekly_movies D:weekly_animes E:weekly_activities F:weekly_reports
      // G:monthly_books H:monthly_movies I:monthly_animes J:monthly_activities K:monthly_reports L:updated_at
      const goals = {
        weekly: {},
        monthly: {}
      };

      // 週次目標の解析
      if (userRow[1]) goals.weekly.books = parseInt(userRow[1]) || 0;
      if (userRow[2]) goals.weekly.movies = parseInt(userRow[2]) || 0;
      if (userRow[3]) goals.weekly.animes = parseInt(userRow[3]) || 0;
      if (userRow[4]) goals.weekly.activities = parseInt(userRow[4]) || 0;
      if (userRow[5]) goals.weekly.reports = parseInt(userRow[5]) || 0;

      // 月次目標の解析
      if (userRow[6]) goals.monthly.books = parseInt(userRow[6]) || 0;
      if (userRow[7]) goals.monthly.movies = parseInt(userRow[7]) || 0;
      if (userRow[8]) goals.monthly.animes = parseInt(userRow[8]) || 0;
      if (userRow[9]) goals.monthly.activities = parseInt(userRow[9]) || 0;
      if (userRow[10]) goals.monthly.reports = parseInt(userRow[10]) || 0;

      console.log(`✅ ユーザー ${userId} の目標取得完了:`, goals);
      
      // ローカルキャッシュにも保存
      this.goals.set(userId, goals);
      
      return goals;
    } catch (error) {
      console.error('❌ 目標取得エラー:', error);
      return { weekly: {}, monthly: {} };
    }
  }

  /**
   * 目標を設定（Google Sheets に保存）
   */
  async setGoal(userId, period, category, target) {
    try {
      if (!this.googleSheets) {
        throw new Error('GoogleSheetsService が設定されていません');
      }

      console.log(`🎯 目標設定: ${userId} - ${period} ${category}: ${target}`);

      // 現在の目標を取得
      let currentGoals = await this.getGoals(userId);
      
      // 新しい目標を設定
      if (!currentGoals[period]) {
        currentGoals[period] = {};
      }
      currentGoals[period][category] = parseInt(target);

      // Google Sheets に保存
      await this.saveGoalsToSheets(userId, currentGoals);

      console.log(`✅ 目標設定完了: ${userId} - ${period} ${category}: ${target}`);
      return true;
    } catch (error) {
      console.error('❌ 目標設定エラー:', error);
      throw error;
    }
  }

  /**
   * プリセットから目標を一括設定
   */
  async setGoalsFromPreset(userId, presetData) {
    try {
      if (!this.googleSheets) {
        throw new Error('GoogleSheetsService が設定されていません');
      }

      console.log(`🎯 プリセット目標設定: ${userId}`, presetData);

      const goals = {
        weekly: { ...presetData.weekly },
        monthly: { ...presetData.monthly }
      };

      // Google Sheets に保存
      await this.saveGoalsToSheets(userId, goals);

      console.log(`✅ プリセット目標設定完了: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ プリセット設定エラー:', error);
      throw error;
    }
  }

  /**
   * 目標をGoogle Sheetsに保存
   */
  async saveGoalsToSheets(userId, goals) {
    try {
      console.log(`💾 Google Sheetsに目標を保存中: ${userId}`);

      // 現在のデータを取得
      const goalsData = await this.googleSheets.getData('goals_master!A:M');
      
      // ヘッダー行が存在しない場合は作成
      if (!goalsData || goalsData.length === 0) {
        const headers = [
          'user_id', 'weekly_books', 'weekly_movies', 'weekly_animes', 'weekly_activities', 'weekly_reports',
          'monthly_books', 'monthly_movies', 'monthly_animes', 'monthly_activities', 'monthly_reports', 'updated_at'
        ];
        await this.googleSheets.appendData('goals_master!A:M', headers);
      }

      // ユーザーの既存行を探す
      let userRowIndex = -1;
      if (goalsData && goalsData.length > 1) {
        userRowIndex = goalsData.slice(1).findIndex(row => row[0] === userId);
        if (userRowIndex >= 0) {
          userRowIndex += 2; // ヘッダー行とインデックス調整
        }
      }

      // 更新データを準備
      const now = new Date().toLocaleString('ja-JP');
      const rowData = [
        userId,
        goals.weekly.books || '',
        goals.weekly.movies || '',
        goals.weekly.animes || '',
        goals.weekly.activities || '',
        goals.weekly.reports || '',
        goals.monthly.books || '',
        goals.monthly.movies || '',
        goals.monthly.animes || '',
        goals.monthly.activities || '',
        goals.monthly.reports || '',
        now
      ];

      if (userRowIndex > 0) {
        // 既存行を更新
        console.log(`📝 既存行を更新: 行${userRowIndex}`);
        const updateRange = `goals_master!A${userRowIndex}:L${userRowIndex}`;
        await this.googleSheets.updateData(updateRange, rowData);
      } else {
        // 新しい行を追加
        console.log(`➕ 新しい行を追加`);
        await this.googleSheets.appendData('goals_master!A:M', rowData);
      }

      console.log(`✅ Google Sheetsに目標保存完了: ${userId}`);
      
      // ローカルキャッシュも更新
      this.goals.set(userId, goals);

    } catch (error) {
      console.error('❌ Google Sheets保存エラー:', error);
      throw error;
    }
  }

  /**
   * 目標をリセット
   */
  async resetAllGoals(userId) {
    try {
      const emptyGoals = { weekly: {}, monthly: {} };
      await this.saveGoalsToSheets(userId, emptyGoals);
      console.log(`✅ 全目標リセット完了: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ 目標リセットエラー:', error);
      throw error;
    }
  }

  /**
   * 期間別目標リセット
   */
  async resetGoals(userId, period = null) {
    try {
      if (!period || period === 'all') {
        return await this.resetAllGoals(userId);
      }

      const currentGoals = await this.getGoals(userId);
      
      if (period === 'weekly') {
        currentGoals.weekly = {};
      } else if (period === 'monthly') {
        currentGoals.monthly = {};
      }

      await this.saveGoalsToSheets(userId, currentGoals);
      console.log(`✅ ${period}目標リセット完了: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ 期間別リセットエラー:', error);
      throw error;
    }
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
        animes: weeklyStats?.completedAnimes || 0,
        activities: weeklyStats?.completedActivities || 0,
        reports: weeklyStats?.reports || 0
      };

      const monthlyProgress = {
        books: monthlyStats?.finishedBooks || 0,
        movies: monthlyStats?.watchedMovies || 0,
        animes: monthlyStats?.completedAnimes || 0,
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

      if (!recentReports || !Array.isArray(recentReports)) {
        console.warn('⚠️ レポートデータが無効です');
        return {
          today: { books: 0, movies: 0, animes: 0, activities: 0 },
          streak: 0,
          weeklyProgress: 0,
          momentum: 'stable'
        };
      }

      // 今日の実績を計算（アニメ追加）
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
        animes: todayReports.filter(r => r.category === 'anime').length,
        activities: todayReports.filter(r => r.category === 'activity').length
      };

      console.log('🎯 今日の実績（アニメ含む）:', todayStats);

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
   * ストリークを計算
   */
  calculateStreak(recentReports) {
    if (!recentReports || recentReports.length === 0) {
      return 0;
    }

    try {
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

      return streak;
    } catch (error) {
      console.error('ストリーク計算エラー:', error);
      return 0;
    }
  }

  /**
   * 週次進捗を計算
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
   * モメンタム（勢い）を計算
   */
  calculateMomentum(recentReports) {
    if (!recentReports || recentReports.length < 7) return 'building';

    try {
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
   * デバッグ用：Google Sheetsの目標データを確認
   */
  async debugGoalsData() {
    try {
      if (!this.googleSheets) {
        console.log('❌ GoogleSheetsService が設定されていません');
        return;
      }

      console.log('🔍 goals_master シートの内容を確認中...');
      
      const goalsData = await this.googleSheets.getData('goals_master!A:M');
      
      console.log('📊 取得した生データ:');
      console.log(`行数: ${goalsData ? goalsData.length : 0}`);
      
      if (goalsData && goalsData.length > 0) {
        console.log('ヘッダー行:', goalsData[0]);
        console.log('データ行 (最初の3行):');
        goalsData.slice(1, 4).forEach((row, index) => {
          console.log(`  ${index + 1}:`, row);
        });
      } else {
        console.log('📭 データが見つかりません');
      }
      
    } catch (error) {
      console.error('❌ デバッグエラー:', error);
    }
  }
}

// シングルトンインスタンスをエクスポート
module.exports = new GoalService();
