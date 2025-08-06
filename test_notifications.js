// test_notifications.js
const { Client, GatewayIntentBits } = require('discord.js');
const NotificationService = require('./services/notifications');
const GoogleSheetsService = require('./services/googleSheets');
require('dotenv').config();

class NotificationTester {
  constructor() {
    this.client = null;
    this.notifications = null;
    this.googleSheets = null;
  }

  async initialize() {
    console.log('🚀 通知テストシステムを初期化中...');
    
    // 環境変数チェック
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN が設定されていません');
    }
    
    // Discord クライアント初期化
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });
    
    try {
      // Discord にログイン
      console.log('🔗 Discord に接続中...');
      await this.client.login(process.env.DISCORD_TOKEN);
      
      // Ready イベントを待つ
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Discord接続がタイムアウトしました'));
        }, 10000);
        
        this.client.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
      console.log(`✅ Discord に接続しました (${this.client.user.tag})`);
      
      // GoogleSheets サービス初期化
      console.log('📊 GoogleSheets サービスを初期化中...');
      this.googleSheets = new GoogleSheetsService();
      
      // NotificationService 初期化
      console.log('📢 通知サービスを初期化中...');
      this.notifications = new NotificationService(this.client, this.googleSheets);
      
      // 通知チャンネルの確認
      const channel = this.notifications.getNotificationChannel();
      if (!channel) {
        console.warn('⚠️  通知チャンネルが見つかりません。環境変数NOTIFICATION_CHANNEL_IDを確認してください。');
      } else {
        console.log(`✅ 通知チャンネル: #${channel.name} (${channel.id})`);
      }
      
      console.log('✅ 全サービスの初期化が完了しました');
      
    } catch (error) {
      console.error('❌ 初期化エラー:', error.message);
      throw error;
    }
  }

  async testSpecificNotification(notificationName) {
    console.log(`🧪 通知テスト開始: ${notificationName}`);
    
    if (!this.notifications) {
      throw new Error('NotificationService が初期化されていません');
    }
    
    try {
      const startTime = Date.now();
      
      switch (notificationName) {
        // 🌅 基本通知
        case 'morning_greeting':
          await this.notifications.sendMorningGreeting();
          break;
        case 'daily_report_reminder':
          await this.notifications.sendDailyReportReminder();
          break;
        case 'weekly_report':
          await this.notifications.sendWeeklyReport();
          break;
        case 'monthly_report':
          await this.notifications.sendMonthlyReport();
          break;
          
        // 🎯 目標管理通知
        case 'goals_weekly_start':
          await this.notifications.sendGoalsProgressReport('weekly_start');
          break;
        case 'goals_weekly_mid':
          await this.notifications.sendGoalsProgressReport('weekly_mid');
          break;
        case 'goals_weekly_final':
          await this.notifications.sendWeeklyGoalsFinalCheck();
          break;
        case 'streak_report':
          await this.notifications.sendStreakReport();
          break;
        case 'goals_adjustment':
          await this.notifications.sendGoalsAdjustmentSuggestion();
          break;
          
        // 📊 統計・分析通知
        case 'monthly_stats_summary':
          await this.notifications.sendMonthlyStatsSummary();
          break;
        case 'monthly_trends_analysis':
          await this.notifications.sendMonthlyTrendsAnalysis();
          break;
        case 'monthly_books_stats':
          await this.notifications.sendMonthlyBooksStatistics();
          break;
        case 'monthly_comparison':
          await this.notifications.sendEnhancedMonthlyComparison();
          break;
        case 'quarterly_report':
          await this.notifications.sendQuarterlyReport();
          break;
          
        // 🛒 ウィッシュリスト・記事管理
        case 'monthly_wishlist':
          await this.notifications.sendMonthlyWishlist();
          break;
        case 'monthly_wishlist_reminder':
          await this.notifications.sendMonthlyWishlistReminder();
          break;
        case 'weekly_article_reminder':
          await this.notifications.sendWeeklyArticleReminder();
          break;
        case 'monthly_summary_report':
          await this.notifications.sendMonthlySummaryReport();
          break;
          
        // 🔍 メンテナンス
        case 'abandoned_items_check':
          await this.notifications.checkAbandonedItems();
          break;
          
        // 🎉 ボーナス通知
        case 'goal_achievement':
          // テスト用の目標達成通知
          const testUserId = process.env.TEST_USER_ID || this.client.user.id;
          await this.notifications.sendGoalAchievementNotification(testUserId, 'weekly', 'books', 5);
          break;
          
        // 🔧 カスタム通知
        case 'custom_test':
          await this.notifications.sendCustomNotification(
            '🧪 テスト通知',
            'NotificationService のテスト実行中です',
            [
              { name: '📅 実行時間', value: new Date().toLocaleString('ja-JP'), inline: true },
              { name: '🤖 実行者', value: 'テストスクリプト', inline: true }
            ]
          );
          break;
          
        default:
          console.log(`❌ 未知の通知名: ${notificationName}`);
          console.log('💡 利用可能な通知を確認するには: node test_notifications.js list');
          return false;
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ テスト完了: ${notificationName} (${duration}ms)`);
      return true;
      
    } catch (error) {
      console.error(`❌ テスト失敗: ${notificationName}`);
      console.error(`   エラー: ${error.message}`);
      
      // デバッグ情報
      if (error.stack) {
        console.error(`   スタック: ${error.stack.split('\n')[1]?.trim()}`);
      }
      
      return false;
    }
  }

  async testAllNotifications(intervalSeconds = 3) {
    console.log('🧪 全通知テストを開始します...');
    console.log(`⏱️  各通知間隔: ${intervalSeconds}秒`);
    
    const notifications = this.getAllNotificationNames();
    const results = [];
    let successCount = 0;
    
    console.log(`📋 テスト対象: ${notifications.length}個の通知\n`);
    
    for (let i = 0; i < notifications.length; i++) {
      const notification = notifications[i];
      const progress = `[${i + 1}/${notifications.length}]`;
      
      process.stdout.write(`📧 ${progress} ${notification} ... `);
      
      const success = await this.testSpecificNotification(notification);
      results.push({ notification, success });
      
      if (success) {
        successCount++;
        console.log('✅');
      } else {
        console.log('❌');
      }
      
      // 最後以外は間隔を空ける
      if (i < notifications.length - 1) {
        process.stdout.write(`⏳ ${intervalSeconds}秒待機中...`);
        await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
        process.stdout.write('\r' + ' '.repeat(50) + '\r'); // 行をクリア
      }
    }
    
    // 結果サマリー
    console.log('\n' + '='.repeat(60));
    console.log('📊 テスト結果サマリー:');
    console.log(`✅ 成功: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
    console.log(`❌ 失敗: ${results.length - successCount}/${results.length}`);
    
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
      console.log('\n❌ 失敗した通知:');
      failedTests.forEach(r => {
        console.log(`  • ${r.notification}`);
      });
      
      console.log(`\n💡 個別テスト: node test_notifications.js single <通知名>`);
    }
    
    if (successCount === results.length) {
      console.log('\n🎉 すべての通知が正常に動作しています！');
    } else {
      console.log(`\n⚠️  ${failedTests.length}個の通知でエラーが発生しました`);
    }
    
    return results;
  }

  async testNotificationCategory(category, intervalSeconds = 2) {
    const categories = this.getNotificationCategories();
    
    if (!categories[category]) {
      console.log(`❌ 未知のカテゴリ: ${category}`);
      console.log(`📂 利用可能なカテゴリ: ${Object.keys(categories).join(', ')}`);
      return [];
    }
    
    const notifications = categories[category];
    console.log(`🧪 ${category}カテゴリの通知テスト開始 (${notifications.length}個)`);
    console.log(`📋 対象: ${notifications.join(', ')}\n`);
    
    const results = [];
    let successCount = 0;
    
    for (let i = 0; i < notifications.length; i++) {
      const notification = notifications[i];
      const progress = `[${i + 1}/${notifications.length}]`;
      
      console.log(`📧 ${progress} ${notification}`);
      const success = await this.testSpecificNotification(notification);
      results.push({ notification, success });
      
      if (success) successCount++;
      
      if (i < notifications.length - 1) {
        console.log(`⏳ ${intervalSeconds}秒待機中...\n`);
        await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
      }
    }
    
    console.log('\n' + '-'.repeat(40));
    console.log(`✅ ${category}カテゴリのテスト完了: ${successCount}/${results.length}個成功`);
    
    return results;
  }

  getAllNotificationNames() {
    return [
      // 基本通知
      'morning_greeting', 'daily_report_reminder', 'weekly_report', 'monthly_report',
      // 目標管理
      'goals_weekly_start', 'goals_weekly_mid', 'goals_weekly_final', 'streak_report', 'goals_adjustment',
      // 統計・分析
      'monthly_stats_summary', 'monthly_trends_analysis', 'monthly_books_stats', 'monthly_comparison', 'quarterly_report',
      // ウィッシュリスト・記事
      'monthly_wishlist', 'monthly_wishlist_reminder', 'weekly_article_reminder', 'monthly_summary_report',
      // メンテナンス
      'abandoned_items_check',
      // ボーナス・テスト
      'goal_achievement', 'custom_test'
    ];
  }

  getNotificationCategories() {
    return {
      basic: ['morning_greeting', 'daily_report_reminder', 'weekly_report', 'monthly_report'],
      goals: ['goals_weekly_start', 'goals_weekly_mid', 'goals_weekly_final', 'streak_report', 'goals_adjustment'],
      stats: ['monthly_stats_summary', 'monthly_trends_analysis', 'monthly_books_stats', 'monthly_comparison', 'quarterly_report'],
      wishlist: ['monthly_wishlist', 'monthly_wishlist_reminder', 'weekly_article_reminder', 'monthly_summary_report'],
      maintenance: ['abandoned_items_check'],
      test: ['goal_achievement', 'custom_test']
    };
  }

  async getSystemStatus() {
    console.log('🔍 システム状態を確認中...');
    
    try {
      // NotificationService の状態
      const notificationStatus = this.notifications.getStatus();
      
      console.log('📊 システム状態:');
      console.log(`  Discord: ${this.client.user.tag} (${this.client.readyAt ? '接続中' : '未接続'})`);
      console.log(`  通知サービス: ${notificationStatus.isActive ? 'アクティブ' : '停止中'}`);
      console.log(`  定期タスク: ${notificationStatus.taskCount}個`);
      console.log(`  通知チャンネル: ${notificationStatus.notificationChannel}`);
      
      // 環境変数チェック
      console.log('\n🔧 環境変数:');
      console.log(`  DISCORD_TOKEN: ${process.env.DISCORD_TOKEN ? '設定済み' : '❌ 未設定'}`);
      console.log(`  NOTIFICATION_CHANNEL_ID: ${process.env.NOTIFICATION_CHANNEL_ID ? '設定済み' : '未設定(デフォルト使用)'}`);
      console.log(`  GOALS_NOTIFICATION_USERS: ${process.env.GOALS_NOTIFICATION_USERS ? '設定済み' : '未設定'}`);
      
      // アクティブなタスク
      if (notificationStatus.activeTasks.length > 0) {
        console.log('\n⏰ アクティブな定期タスク:');
        notificationStatus.activeTasks.forEach(task => {
          console.log(`  • ${task}`);
        });
      }
      
      return notificationStatus;
      
    } catch (error) {
      console.error('❌ 状態確認エラー:', error.message);
      return null;
    }
  }

  showHelp() {
    console.log('📖 通知テストスクリプトの使用方法\n');
    
    console.log('🔧 基本コマンド:');
    console.log('  node test_notifications.js single <通知名>    - 個別通知テスト');
    console.log('  node test_notifications.js category <カテゴリ> - カテゴリ別テスト');
    console.log('  node test_notifications.js all               - 全通知テスト');
    console.log('  node test_notifications.js status            - システム状態確認');
    console.log('  node test_notifications.js list              - 通知一覧表示');
    console.log('  node test_notifications.js help              - このヘルプ\n');
    
    console.log('📂 カテゴリ:');
    console.log('  basic       - 基本通知 (朝の挨拶、日報、週次・月次レポート)');
    console.log('  goals       - 目標通知 (進捗確認、ストリーク、調整提案)');
    console.log('  stats       - 統計通知 (月次統計、トレンド分析、読書統計)');
    console.log('  wishlist    - リスト通知 (ウィッシュリスト、記事リマインダー)');
    console.log('  maintenance - メンテナンス (放置アイテムチェック)');
    console.log('  test        - テスト用 (目標達成、カスタム通知)\n');
    
    console.log('💡 使用例:');
    console.log('  node test_notifications.js single morning_greeting');
    console.log('  node test_notifications.js category basic');
    console.log('  node test_notifications.js status\n');
    
    console.log('⚙️  事前準備:');
    console.log('  1. .env ファイルに DISCORD_TOKEN を設定');
    console.log('  2. NOTIFICATION_CHANNEL_ID を設定 (オプション)');
    console.log('  3. Botがサーバーに参加していることを確認');
  }

  showNotificationList() {
    console.log('📋 利用可能な通知一覧\n');
    
    const categories = {
      '🌅 基本通知': [
        'morning_greeting - 朝の挨拶と今日のタスク',
        'daily_report_reminder - 日報記録リマインダー', 
        'weekly_report - 週次活動レポート',
        'monthly_report - 月次活動レポート'
      ],
      '🎯 目標管理通知': [
        'goals_weekly_start - 週の始まりの目標確認',
        'goals_weekly_mid - 週の中間進捗チェック',
        'goals_weekly_final - 週次目標最終チェック',
        'streak_report - 継続ストリークランキング',
        'goals_adjustment - 目標見直し提案'
      ],
      '📊 統計・分析通知': [
        'monthly_stats_summary - 月初統計サマリー',
        'monthly_trends_analysis - 月中トレンド分析',
        'monthly_books_stats - 月末読書統計',
        'monthly_comparison - 月次比較レポート',
        'quarterly_report - 四半期レポート'
      ],
      '🛒 ウィッシュリスト・記事': [
        'monthly_wishlist - 月初買いたい本リスト',
        'monthly_wishlist_reminder - 月次ウィッシュリストリマインダー',
        'weekly_article_reminder - 週次記事リマインダー',
        'monthly_summary_report - 月次アクティビティサマリー'
      ],
      '🔍 メンテナンス': [
        'abandoned_items_check - 放置アイテムチェック'
      ],
      '🧪 テスト用': [
        'goal_achievement - 目標達成通知テスト',
        'custom_test - カスタム通知テスト'
      ]
    };

    Object.entries(categories).forEach(([category, notifications]) => {
      console.log(`${category}:`);
      notifications.forEach(notification => {
        console.log(`  ${notification}`);
      });
      console.log('');
    });
    
    console.log('💡 個別テスト例: node test_notifications.js single morning_greeting');
  }

  async cleanup() {
    console.log('\n🧹 クリーンアップ中...');
    
    try {
      if (this.notifications) {
        // 定期タスクを停止（テスト用なので）
        // this.notifications.stopAllNotifications();
      }
      
      if (this.client && this.client.readyAt) {
        this.client.destroy();
        console.log('👋 Discord接続を終了しました');
      }
      
    } catch (error) {
      console.error('⚠️  クリーンアップエラー:', error.message);
    }
  }
}

async function main() {
  const tester = new NotificationTester();
  
  // Ctrl+C での終了処理
  process.on('SIGINT', async () => {
    console.log('\n\n⏹️  テストを中断しています...');
    await tester.cleanup();
    process.exit(0);
  });
  
  try {
    // コマンドライン引数を解析
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const param = args[1];
    
    if (command === 'help') {
      tester.showHelp();
      return;
    }
    
    if (command === 'list') {
      tester.showNotificationList();
      return;
    }
    
    // Discord接続が必要なコマンド
    if (['single', 'category', 'all', 'status'].includes(command)) {
      await tester.initialize();
      
      switch (command) {
        case 'single':
          if (!param) {
            console.log('❌ 通知名を指定してください');
            console.log('💡 例: node test_notifications.js single morning_greeting');
            console.log('📋 利用可能な通知: node test_notifications.js list');
            break;
          }
          await tester.testSpecificNotification(param);
          break;
          
        case 'category':
          if (!param) {
            console.log('❌ カテゴリを指定してください');
            console.log('📂 利用可能: basic, goals, stats, wishlist, maintenance, test');
            break;
          }
          await tester.testNotificationCategory(param);
          break;
          
        case 'all':
          console.log('⚠️  注意: 全通知のテストには時間がかかります');
          console.log('💡 中断する場合は Ctrl+C を押してください');
          
          // 3秒のカウントダウン
          for (let i = 3; i > 0; i--) {
            process.stdout.write(`\r🚀 ${i}秒後に開始... `);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          console.log('\n');
          
          await tester.testAllNotifications();
          break;
          
        case 'status':
          await tester.getSystemStatus();
          break;
      }
    } else {
      console.log(`❌ 未知のコマンド: ${command}`);
      tester.showHelp();
    }
    
  } catch (error) {
    console.error('\n❌ テスト実行エラー:', error.message);
    
    // 詳細なエラー情報（開発用）
    if (process.env.NODE_ENV === 'development') {
      console.error('詳細:', error.stack);
    }
    
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  main().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('致命的エラー:', error);
    process.exit(1);
  });
}

module.exports = NotificationTester;
