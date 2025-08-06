// debug_goals.js - 目標設定の確認スクリプト

require('dotenv').config();

// GoalServiceの読み込み
const goalService = require('./services/goalService');
const GoogleSheetsService = require('./services/googleSheets');

async function debugGoals() {
  console.log('🔍 目標設定デバッグ開始...');
  console.log('=====================================');
  
  // GoogleSheetsServiceの設定
  const googleSheets = new GoogleSheetsService();
  goalService.setGoogleSheetsService(googleSheets);
  
  // 環境変数の確認
  const userIds = process.env.GOALS_NOTIFICATION_USERS?.split(',') || [];
  console.log('📋 対象ユーザーID:', userIds);
  
  if (userIds.length === 0) {
    console.log('❌ GOALS_NOTIFICATION_USERS が設定されていません');
    return;
  }
  
  // 各ユーザーの目標を確認
  for (const rawUserId of userIds) {
    const userId = rawUserId.trim();
    console.log(`\n👤 ユーザーID: ${userId}`);
    console.log('-------------------');
    
    try {
      // 目標取得
      const goals = await goalService.getGoals(userId);
      console.log('🎯 設定された目標:', JSON.stringify(goals, null, 2));
      
      // 目標が空かチェック
      const hasWeeklyGoals = goals.weekly && Object.keys(goals.weekly).length > 0;
      const hasMonthlyGoals = goals.monthly && Object.keys(goals.monthly).length > 0;
      
      console.log(`週次目標: ${hasWeeklyGoals ? '✅ 設定済み' : '❌ 未設定'}`);
      console.log(`月次目標: ${hasMonthlyGoals ? '✅ 設定済み' : '❌ 未設定'}`);
      
      if (!hasWeeklyGoals && !hasMonthlyGoals) {
        console.log('🔧 テスト目標を設定してみます...');
        
        // テスト目標設定
        await goalService.setGoal(userId, 'weekly', 'books', 2);
        await goalService.setGoal(userId, 'weekly', 'movies', 3);
        await goalService.setGoal(userId, 'monthly', 'books', 8);
        await goalService.setGoal(userId, 'monthly', 'reports', 20);
        
        // 再確認
        const newGoals = await goalService.getGoals(userId);
        console.log('🎯 設定後の目標:', JSON.stringify(newGoals, null, 2));
      }
      
      // 現在の進捗取得
      const progress = await goalService.getCurrentProgress(userId);
      console.log('📊 現在の進捗:', JSON.stringify(progress, null, 2));
      
      // 進捗分析取得
      const analysis = await goalService.getProgressAnalysis(userId);
      console.log('📈 進捗分析:', JSON.stringify(analysis, null, 2));
      
    } catch (error) {
      console.error(`❌ ユーザー ${userId} の処理エラー:`, error.message);
    }
  }
  
  // 全ユーザーの目標統計
  console.log('\n📊 全体統計:');
  console.log('-------------------');
  const allGoals = goalService.getAllUserGoals();
  console.log('全ユーザーの目標:', JSON.stringify(allGoals, null, 2));
  
  const stats = goalService.getStats();
  console.log('統計情報:', JSON.stringify(stats, null, 2));
  
  console.log('\n✅ デバッグ完了');
}

debugGoals().catch(console.error);
