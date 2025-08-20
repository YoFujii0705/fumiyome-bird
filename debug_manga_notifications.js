// debug_manga_notifications.js - 漫画通知専用のデバッグ・テストスクリプト

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const GoogleSheetsService = require('./services/googleSheets');
require('dotenv').config();

class MangaNotificationDebugger {
  constructor() {
    this.client = null;
    this.googleSheets = null;
  }

  async initialize() {
    console.log('🚀 漫画通知デバッグシステムを初期化中...');
    
    // Discord クライアント初期化
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });
    
    try {
      await this.client.login(process.env.DISCORD_TOKEN);
      await new Promise((resolve) => {
        this.client.once('ready', resolve);
      });
      
      console.log(`✅ Discord接続完了: ${this.client.user.tag}`);
      
      // GoogleSheets サービス初期化
      this.googleSheets = new GoogleSheetsService();
      console.log('✅ GoogleSheetsサービス初期化完了');
      
    } catch (error) {
      console.error('❌ 初期化エラー:', error);
      throw error;
    }
  }

  // 🔍 notification_schedules シートの詳細診断
  async diagnoseNotificationSheet() {
    console.log('\n📊 notification_schedules シートの診断を開始...');
    
    const diagnosis = {
      sheetExists: false,
      hasHeaders: false,
      headerStructure: [],
      dataCount: 0,
      sampleData: [],
      errors: []
    };

    try {
      // 1. シートの存在確認
      console.log('1️⃣ シートの存在確認...');
      try {
        const data = await this.googleSheets.getData('notification_schedules!A1:I1000');
        diagnosis.sheetExists = true;
        console.log('✅ notification_schedulesシートが存在します');
        
        if (data && data.length > 0) {
          diagnosis.hasHeaders = true;
          diagnosis.headerStructure = data[0];
          diagnosis.dataCount = data.length - 1;
          
          console.log(`✅ ヘッダー行を検出: ${diagnosis.headerStructure.join(', ')}`);
          console.log(`📊 データ行数: ${diagnosis.dataCount}`);
          
          // サンプルデータを取得
          if (data.length > 1) {
            diagnosis.sampleData = data.slice(1, Math.min(6, data.length));
            console.log(`📝 サンプルデータ: ${diagnosis.sampleData.length}件取得`);
          }
        } else {
          diagnosis.errors.push('シートは存在するが、データが空です');
        }
        
      } catch (error) {
        diagnosis.errors.push(`シートアクセスエラー: ${error.message}`);
        console.error('❌ シートアクセスに失敗:', error.message);
      }

      // 2. 期待されるヘッダー構造との比較
      console.log('\n2️⃣ ヘッダー構造の検証...');
      const expectedHeaders = [
        'ID', 'Type', 'Related_ID', 'Title', 'Schedule_Data', 
        'Status', 'Created_At', 'Updated_At', 'Next_Notification'
      ];
      
      if (diagnosis.hasHeaders) {
        const missingHeaders = expectedHeaders.filter(h => !diagnosis.headerStructure.includes(h));
        const extraHeaders = diagnosis.headerStructure.filter(h => !expectedHeaders.includes(h));
        
        if (missingHeaders.length === 0 && extraHeaders.length === 0) {
          console.log('✅ ヘッダー構造は正常です');
        } else {
          if (missingHeaders.length > 0) {
            diagnosis.errors.push(`不足ヘッダー: ${missingHeaders.join(', ')}`);
            console.warn(`⚠️ 不足ヘッダー: ${missingHeaders.join(', ')}`);
          }
          if (extraHeaders.length > 0) {
            console.warn(`⚠️ 余分なヘッダー: ${extraHeaders.join(', ')}`);
          }
        }
      }

      // 3. Google Sheetsへの書き込み権限テスト
      console.log('\n3️⃣ 書き込み権限のテスト...');
      try {
        const testId = 'TEST_' + Date.now();
        const testData = [
          testId, 'test', '99999', 'テスト通知', '{"type":"test"}', 
          'inactive', new Date().toISOString(), new Date().toISOString(), null
        ];
        
        await this.googleSheets.appendData('notification_schedules!A:I', testData);
        console.log('✅ テストデータの書き込み成功');
        
        // テストデータを削除
        const allData = await this.googleSheets.getData('notification_schedules!A:I');
        const testRowIndex = allData.findIndex(row => row[0] === testId);
        if (testRowIndex > 0) {
          await this.googleSheets.deleteRow('notification_schedules', testRowIndex + 1);
          console.log('✅ テストデータの削除完了');
        }
        
      } catch (error) {
        diagnosis.errors.push(`書き込み権限エラー: ${error.message}`);
        console.error('❌ 書き込み権限テスト失敗:', error.message);
      }

    } catch (error) {
      diagnosis.errors.push(`診断プロセスエラー: ${error.message}`);
      console.error('❌ 診断プロセスエラー:', error.message);
    }

    return diagnosis;
  }

  // 🛠️ notification_schedules シートの自動修復
  async repairNotificationSheet() {
    console.log('\n🛠️ notification_schedulesシートの修復を開始...');
    
    try {
      // 1. シートの存在確認
      let sheetExists = false;
      try {
        await this.googleSheets.getData('notification_schedules!A1:A1');
        sheetExists = true;
      } catch (error) {
        console.log('📝 新しいnotification_schedulesシートを作成します...');
      }

      // 2. ヘッダー行の設定/修復
      const headers = [
        'ID', 'Type', 'Related_ID', 'Title', 'Schedule_Data', 
        'Status', 'Created_At', 'Updated_At', 'Next_Notification'
      ];
      
      if (!sheetExists) {
        // 新規作成
        await this.googleSheets.updateRange('notification_schedules!A1:I1', [headers]);
        console.log('✅ ヘッダー行を作成しました');
      } else {
        // 既存のヘッダーをチェック・修復
        const currentData = await this.googleSheets.getData('notification_schedules!A1:I1');
        if (!currentData || currentData.length === 0 || !this.arraysEqual(currentData[0], headers)) {
          await this.googleSheets.updateRange('notification_schedules!A1:I1', [headers]);
          console.log('✅ ヘッダー行を修復しました');
        } else {
          console.log('✅ ヘッダー行は正常です');
        }
      }

      // 3. サンプル通知データの作成（テスト用）
      const sampleNotifications = [
        [
          1, 'manga_update', '1', 'テスト漫画1', 
          JSON.stringify({type: 'weekly', dayOfWeek: 1, displayName: '毎週月曜日'}),
          'inactive', new Date().toISOString(), new Date().toISOString(), 
          this.calculateNextWeeklyNotification(1)
        ],
        [
          2, 'manga_update', '2', 'テスト漫画2', 
          JSON.stringify({type: 'monthly', dayOfMonth: 15, displayName: '毎月15日'}),
          'active', new Date().toISOString(), new Date().toISOString(), 
          this.calculateNextMonthlyNotification(15)
        ]
      ];

      // 既存のデータを確認
      const existingData = await this.googleSheets.getData('notification_schedules!A:I');
      const hasData = existingData && existingData.length > 1;

      if (!hasData) {
        console.log('📝 サンプル通知データを追加します...');
        for (const notification of sampleNotifications) {
          await this.googleSheets.appendData('notification_schedules!A:I', notification);
        }
        console.log('✅ サンプルデータを追加しました');
      }

      console.log('🎉 notification_schedulesシートの修復が完了しました！');
      return true;

    } catch (error) {
      console.error('❌ シート修復エラー:', error);
      return false;
    }
  }

  // 🧪 漫画通知スケジュールのテスト作成
  async createTestMangaNotification(title, schedule, status = 'active') {
    console.log(`\n🧪 テスト通知作成: ${title} (${schedule})`);
    
    try {
      // スケジュールデータを解析
      const scheduleData = this.parseUpdateSchedule(schedule);
      if (!scheduleData) {
        throw new Error(`無効なスケジュール形式: ${schedule}`);
      }

      // 次回通知日時を計算
      const nextNotification = this.calculateNextNotification(scheduleData);
      
      // テスト用IDを生成
      const testId = Date.now();
      
      // 通知データを作成
      const notificationData = [
        testId,
        'manga_update',
        testId, // Related_ID（漫画ID相当）
        title,
        JSON.stringify(scheduleData),
        status,
        new Date().toISOString(),
        new Date().toISOString(),
        nextNotification
      ];

      // データベースに追加
      await this.googleSheets.appendData('notification_schedules!A:I', notificationData);
      
      console.log('✅ テスト通知を作成しました:');
      console.log(`   ID: ${testId}`);
      console.log(`   タイトル: ${title}`);
      console.log(`   スケジュール: ${scheduleData.displayName}`);
      console.log(`   ステータス: ${status}`);
      console.log(`   次回通知: ${nextNotification}`);
      
      return {
        id: testId,
        title,
        schedule: scheduleData,
        status,
        nextNotification
      };

    } catch (error) {
      console.error('❌ テスト通知作成エラー:', error);
      throw error;
    }
  }

  // 📅 即座に発火する通知のテスト
  async createImmediateTestNotification(title = 'テスト即時通知') {
    console.log(`\n⚡ 即時発火通知のテスト: ${title}`);
    
    try {
      // 現在時刻から1分後に設定
      const nextNotification = new Date(Date.now() + 60 * 1000).toISOString();
      
      const testId = Date.now();
      const notificationData = [
        testId,
        'manga_update',
        testId,
        title,
        JSON.stringify({type: 'immediate_test', displayName: '即時テスト'}),
        'active',
        new Date().toISOString(),
        new Date().toISOString(),
        nextNotification
      ];

      await this.googleSheets.appendData('notification_schedules!A:I', notificationData);
      
      console.log('✅ 即時テスト通知を作成しました:');
      console.log(`   ID: ${testId}`);
      console.log(`   発火予定: ${new Date(nextNotification).toLocaleString('ja-JP')}`);
      
      return testId;

    } catch (error) {
      console.error('❌ 即時テスト通知作成エラー:', error);
      throw error;
    }
  }

  // 📊 現在の通知一覧を表示
  async listCurrentNotifications() {
    console.log('\n📊 現在の通知スケジュール一覧:');
    
    try {
      const data = await this.googleSheets.getData('notification_schedules!A:I');
      
      if (!data || data.length <= 1) {
        console.log('📝 通知スケジュールが登録されていません');
        return [];
      }

      const notifications = data.slice(1).map(row => ({
        id: row[0],
        type: row[1],
        relatedId: row[2],
        title: row[3],
        scheduleData: this.safeJsonParse(row[4]),
        status: row[5],
        createdAt: row[6],
        updatedAt: row[7],
        nextNotification: row[8]
      }));

      console.log(`📋 ${notifications.length}件の通知が登録されています:\n`);
      
      notifications.forEach((notification, index) => {
        const scheduleText = notification.scheduleData?.displayName || '不明';
        const nextTime = notification.nextNotification ? 
          new Date(notification.nextNotification).toLocaleString('ja-JP') : '未設定';
        const statusEmoji = notification.status === 'active' ? '🔔' : '🔕';
        
        console.log(`${index + 1}. ${statusEmoji} ${notification.title}`);
        console.log(`   ID: ${notification.id} | スケジュール: ${scheduleText}`);
        console.log(`   次回: ${nextTime} | ステータス: ${notification.status}\n`);
      });

      return notifications;

    } catch (error) {
      console.error('❌ 通知一覧取得エラー:', error);
      return [];
    }
  }

  // 🧹 テスト通知のクリーンアップ
  async cleanupTestNotifications() {
    console.log('\n🧹 テスト通知のクリーンアップ...');
    
    try {
      const data = await this.googleSheets.getData('notification_schedules!A:I');
      
      if (!data || data.length <= 1) {
        console.log('📝 クリーンアップ対象の通知がありません');
        return;
      }

      let cleanedCount = 0;
      
      // 後ろから削除（行インデックスのずれを防ぐため）
      for (let i = data.length - 1; i >= 1; i--) {
        const row = data[i];
        const title = row[3];
        const scheduleDataStr = row[4];
        
        // テスト通知の判定
        if (title && (
          title.includes('テスト') || 
          title.includes('test') || 
          title.includes('Test') ||
          (scheduleDataStr && scheduleDataStr.includes('immediate_test'))
        )) {
          try {
            await this.googleSheets.deleteRow('notification_schedules', i + 1);
            console.log(`🗑️ 削除: ${title}`);
            cleanedCount++;
          } catch (error) {
            console.warn(`⚠️ 削除失敗: ${title} - ${error.message}`);
          }
        }
      }

      console.log(`✅ ${cleanedCount}件のテスト通知をクリーンアップしました`);

    } catch (error) {
      console.error('❌ クリーンアップエラー:', error);
    }
  }

  // 🔧 実際の漫画から通知スケジュールを作成
  async createNotificationFromManga(mangaId) {
    console.log(`\n🔧 漫画ID ${mangaId} から通知スケジュールを作成...`);
    
    try {
      // 漫画情報を取得
      const manga = await this.googleSheets.getMangaById(mangaId);
      if (!manga) {
        throw new Error(`漫画ID ${mangaId} が見つかりません`);
      }

      console.log(`📚 漫画情報: ${manga.title} - ${manga.author}`);
      
      // 更新スケジュールを確認
      if (!manga.update_schedule || manga.update_schedule === 'irregular' || manga.update_schedule === 'completed') {
        console.log(`⚠️ 通知対象外のスケジュール: ${manga.update_schedule || '未設定'}`);
        return null;
      }

      // スケジュールデータを解析
      const scheduleData = this.parseUpdateSchedule(manga.update_schedule);
      if (!scheduleData) {
        throw new Error(`無効なスケジュール: ${manga.update_schedule}`);
      }

      // 通知ステータスを決定（読書中の場合はactive）
      const status = manga.reading_status === 'reading' ? 'active' : 'inactive';
      
      // 次回通知日時を計算
      const nextNotification = this.calculateNextNotification(scheduleData);
      
      // 既存の通知をチェック
      const existingNotifications = await this.googleSheets.getData('notification_schedules!A:I');
      const existingNotification = existingNotifications?.slice(1).find(row => 
        row[1] === 'manga_update' && row[2] == mangaId
      );

      if (existingNotification) {
        console.log('📝 既存の通知を更新します...');
        // 既存通知の更新ロジック（必要に応じて実装）
      } else {
        console.log('📝 新しい通知を作成します...');
        
        const notificationId = await this.getNextNotificationId();
        const notificationData = [
          notificationId,
          'manga_update',
          mangaId,
          manga.title,
          JSON.stringify(scheduleData),
          status,
          new Date().toISOString(),
          new Date().toISOString(),
          nextNotification
        ];

        await this.googleSheets.appendData('notification_schedules!A:I', notificationData);
      }

      console.log('✅ 通知スケジュール作成完了:');
      console.log(`   タイトル: ${manga.title}`);
      console.log(`   スケジュール: ${scheduleData.displayName}`);
      console.log(`   ステータス: ${status}`);
      console.log(`   次回通知: ${nextNotification}`);

      return {
        mangaId,
        title: manga.title,
        schedule: scheduleData,
        status,
        nextNotification
      };

    } catch (error) {
      console.error('❌ 漫画通知作成エラー:', error);
      throw error;
    }
  }

  // 🚀 通知システムの統合テスト
  async runIntegrationTest() {
    console.log('\n🚀 漫画通知システムの統合テスト開始\n');
    
    const results = {
      sheetDiagnosis: null,
      repairSuccess: false,
      testNotifications: [],
      errors: []
    };

    try {
      // 1. シート診断
      console.log('='.repeat(50));
      console.log('STEP 1: シート診断');
      console.log('='.repeat(50));
      results.sheetDiagnosis = await this.diagnoseNotificationSheet();
      
      // 2. 必要に応じてシート修復
      if (results.sheetDiagnosis.errors.length > 0) {
        console.log('\n='.repeat(50));
        console.log('STEP 2: シート修復');
        console.log('='.repeat(50));
        results.repairSuccess = await this.repairNotificationSheet();
      } else {
        console.log('\n✅ シートは正常なため、修復をスキップします');
        results.repairSuccess = true;
      }

      // 3. テスト通知の作成
      console.log('\n='.repeat(50));
      console.log('STEP 3: テスト通知作成');
      console.log('='.repeat(50));
      
      const testCases = [
        { title: 'テスト週次漫画', schedule: 'weekly-monday' },
        { title: 'テスト月次漫画', schedule: 'monthly-15' },
        { title: 'テスト隔週漫画', schedule: 'biweekly-1,3' }
      ];

      for (const testCase of testCases) {
        try {
          const result = await this.createTestMangaNotification(
            testCase.title, 
            testCase.schedule
          );
          results.testNotifications.push(result);
        } catch (error) {
          results.errors.push(`テスト通知作成失敗: ${testCase.title} - ${error.message}`);
        }
      }

      // 4. 即時通知テスト
      console.log('\n='.repeat(50));
      console.log('STEP 4: 即時通知テスト');
      console.log('='.repeat(50));
      
      try {
        await this.createImmediateTestNotification();
      } catch (error) {
        results.errors.push(`即時通知テスト失敗: ${error.message}`);
      }

      // 5. 通知一覧確認
      console.log('\n='.repeat(50));
      console.log('STEP 5: 通知一覧確認');
      console.log('='.repeat(50));
      
      await this.listCurrentNotifications();

      // 6. 結果サマリー
      console.log('\n' + '='.repeat(50));
      console.log('🎯 統合テスト結果サマリー');
      console.log('='.repeat(50));
      
      console.log(`✅ シート状態: ${results.sheetDiagnosis?.sheetExists ? '正常' : '異常'}`);
      console.log(`✅ 修復結果: ${results.repairSuccess ? '成功' : '失敗'}`);
      console.log(`✅ テスト通知: ${results.testNotifications.length}個作成`);
      console.log(`❌ エラー: ${results.errors.length}個`);

      if (results.errors.length > 0) {
        console.log('\n❌ 発生したエラー:');
        results.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }

      if (results.errors.length === 0) {
        console.log('\n🎉 統合テストが正常に完了しました！');
        console.log('💡 次のステップ:');
        console.log('   1. 通知サービスを起動してテスト通知を確認');
        console.log('   2. 実際の漫画データで通知スケジュールを作成');
        console.log('   3. 定期実行のテスト');
      } else {
        console.log('\n⚠️ 一部エラーが発生しましたが、基本機能は動作可能です');
      }

    } catch (error) {
      console.error('\n❌ 統合テスト中に致命的エラーが発生:', error);
      results.errors.push(`統合テスト失敗: ${error.message}`);
    }

    return results;
  }

  // 🛠️ ユーティリティメソッド
  parseUpdateSchedule(updateSchedule) {
    if (!updateSchedule) return null;
    
    const schedule = updateSchedule.toLowerCase();
    
    // 週次スケジュール
    const weeklyMatch = schedule.match(/^weekly-(\w+)$/);
    if (weeklyMatch) {
      const dayNames = {
        'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
        'friday': 5, 'saturday': 6, 'sunday': 0
      };
      
      const dayOfWeek = dayNames[weeklyMatch[1]];
      if (dayOfWeek !== undefined) {
        return {
          type: 'weekly',
          dayOfWeek: dayOfWeek,
          displayName: `毎週${this.getDayName(dayOfWeek)}曜日`
        };
      }
    }
    
    // 月次スケジュール
    const monthlyMatch = schedule.match(/^monthly-(\d+)$/);
    if (monthlyMatch) {
      const dayOfMonth = parseInt(monthlyMatch[1]);
      if (dayOfMonth >= 1 && dayOfMonth <= 31) {
        return {
          type: 'monthly',
          dayOfMonth: dayOfMonth,
          displayName: `毎月${dayOfMonth}日`
        };
      }
    }
    
    // 隔週スケジュール
    const biweeklyMatch = schedule.match(/^biweekly-(\d+),(\d+)$/);
    if (biweeklyMatch) {
      const week1 = parseInt(biweeklyMatch[1]);
      const week2 = parseInt(biweeklyMatch[2]);
      return {
        type: 'biweekly',
        weeks: [week1, week2],
        displayName: `隔週(第${week1}・${week2}週)`
      };
    }
    
    return null;
  }

  calculateNextNotification(scheduleData) {
    const now = new Date();
    
    switch (scheduleData.type) {
      case 'weekly':
        return this.calculateNextWeeklyNotification(scheduleData.dayOfWeek);
      case 'monthly':
        return this.calculateNextMonthlyNotification(scheduleData.dayOfMonth);
      case 'biweekly':
        const nextBiweekly = new Date(now);
        nextBiweekly.setDate(now.getDate() + 7);
        nextBiweekly.setHours(9, 0, 0, 0);
        return nextBiweekly.toISOString();
      default:
        return null;
    }
  }

  calculateNextWeeklyNotification(dayOfWeek) {
    const now = new Date();
    const nextWeekly = new Date(now);
    const daysUntilNext = (dayOfWeek + 7 - now.getDay()) % 7;
    nextWeekly.setDate(now.getDate() + (daysUntilNext === 0 ? 7 : daysUntilNext));
    nextWeekly.setHours(9, 0, 0, 0);
    return nextWeekly.toISOString();
  }

  calculateNextMonthlyNotification(dayOfMonth) {
    const now = new Date();
    const nextMonthly = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    if (nextMonthly <= now) {
      nextMonthly.setMonth(nextMonthly.getMonth() + 1);
    }
    nextMonthly.setHours(9, 0, 0, 0);
    return nextMonthly.toISOString();
  }

  getDayName(dayOfWeek) {
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    return dayNames[dayOfWeek] || '不明';
  }

  async getNextNotificationId() {
    try {
      const data = await this.googleSheets.getData('notification_schedules!A:A');
      if (!data || data.length <= 1) return 1;
      
      const ids = data.slice(1).map(row => parseInt(row[0])).filter(id => !isNaN(id));
      return ids.length > 0 ? Math.max(...ids) + 1 : 1;
    } catch (error) {
      return Date.now(); // フォールバック
    }
  }

  safeJsonParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  arraysEqual(a, b) {
    return Array.isArray(a) && Array.isArray(b) && 
           a.length === b.length && 
           a.every((val, index) => val === b[index]);
  }

  async cleanup() {
    console.log('\n🧹 デバッグシステムをクリーンアップ中...');
    if (this.client && this.client.readyAt) {
      this.client.destroy();
    }
  }

  // 📋 ヘルプとコマンド一覧
  showHelp() {
    console.log('📖 漫画通知デバッグスクリプトの使用方法\n');
    
    console.log('🔧 基本コマンド:');
    console.log('  node debug_manga_notifications.js test                - 統合テスト実行');
    console.log('  node debug_manga_notifications.js diagnose           - シート診断のみ');
    console.log('  node debug_manga_notifications.js repair             - シート修復のみ');
    console.log('  node debug_manga_notifications.js list               - 通知一覧表示');
    console.log('  node debug_manga_notifications.js create <title> <schedule> - テスト通知作成');
    console.log('  node debug_manga_notifications.js immediate          - 即時通知テスト');
    console.log('  node debug_manga_notifications.js from-manga <id>    - 漫画から通知作成');
    console.log('  node debug_manga_notifications.js cleanup            - テスト通知削除');
    console.log('  node debug_manga_notifications.js help               - このヘルプ\n');
    
    console.log('💡 使用例:');
    console.log('  node debug_manga_notifications.js test');
    console.log('  node debug_manga_notifications.js create "ワンピース" "weekly-sunday"');
    console.log('  node debug_manga_notifications.js from-manga 1');
    console.log('  node debug_manga_notifications.js immediate\n');
    
    console.log('📅 スケジュール形式:');
    console.log('  weekly-monday     - 毎週月曜日');
    console.log('  weekly-friday     - 毎週金曜日');
    console.log('  monthly-15        - 毎月15日');
    console.log('  biweekly-1,3      - 隔週（第1・第3週）\n');
    
    console.log('⚠️ 注意事項:');
    console.log('  • Discord接続とGoogle Sheets認証が必要です');
    console.log('  • テスト通知は "テスト" を含むタイトルで識別されます');
    console.log('  • cleanup コマンドでテスト通知を一括削除できます');
  }
}

async function main() {
  const mangaDebugger = new MangaNotificationDebugger();
  
  // Ctrl+C での終了処理
  process.on('SIGINT', async () => {
    console.log('\n\n⏹️  デバッグを中断しています...');
    await mangaDebugger.cleanup();
    process.exit(0);
  });

  try {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    if (command === 'help') {
      mangaDebugger.showHelp();
      return;
    }

    // Discord接続が必要なコマンド
    await mangaDebugger.initialize();

    switch (command) {
      case 'test':
        console.log('🚀 漫画通知システムの統合テストを開始します...');
        await mangaDebugger.runIntegrationTest();
        break;

      case 'diagnose':
        const diagnosis = await mangaDebugger.diagnoseNotificationSheet();
        console.log('\n📊 診断結果サマリー:');
        console.log(`  シート存在: ${diagnosis.sheetExists ? '✅' : '❌'}`);
        console.log(`  ヘッダー: ${diagnosis.hasHeaders ? '✅' : '❌'}`);
        console.log(`  データ数: ${diagnosis.dataCount}`);
        console.log(`  エラー数: ${diagnosis.errors.length}`);
        break;

      case 'repair':
        const repairResult = await mangaDebugger.repairNotificationSheet();
        console.log(repairResult ? '✅ 修復完了' : '❌ 修復失敗');
        break;

      case 'list':
        await mangaDebugger.listCurrentNotifications();
        break;

      case 'create':
        const title = args[1];
        const schedule = args[2];
        if (!title || !schedule) {
          console.log('❌ 使用方法: node debug_manga_notifications.js create <title> <schedule>');
          console.log('💡 例: node debug_manga_notifications.js create "テスト漫画" "weekly-monday"');
          break;
        }
        await mangaDebugger.createTestMangaNotification(title, schedule);
        break;

      case 'immediate':
        const testId = await mangaDebugger.createImmediateTestNotification();
        console.log(`💡 1分後に通知が発火予定です。通知サービスが動作していることを確認してください。`);
        console.log(`🆔 テスト通知ID: ${testId}`);
        break;

      case 'from-manga':
        const mangaId = args[1];
        if (!mangaId) {
          console.log('❌ 使用方法: node debug_manga_notifications.js from-manga <manga_id>');
          console.log('💡 例: node debug_manga_notifications.js from-manga 1');
          break;
        }
        await mangaDebugger.createNotificationFromManga(parseInt(mangaId));
        break;

      case 'cleanup':
        await mangaDebugger.cleanupTestNotifications();
        break;

      default:
        console.log(`❌ 未知のコマンド: ${command}`);
        mangaDebugger.showHelp();
    }

  } catch (error) {
    console.error('\n❌ 実行エラー:', error.message);
    
    // 詳細なエラー情報（開発用）
    if (process.env.NODE_ENV === 'development') {
      console.error('詳細:', error.stack);
    }
    
    // 一般的なエラーへの対処法を提示
    if (error.message.includes('DISCORD_TOKEN')) {
      console.log('\n💡 対処法: .envファイルにDISCORD_TOKENを設定してください');
    } else if (error.message.includes('Google')) {
      console.log('\n💡 対処法: Google Sheets認証情報を確認してください');
    } else if (error.message.includes('notification_schedules')) {
      console.log('\n💡 対処法: シート修復を試してください');
      console.log('  node debug_manga_notifications.js repair');
    }
    
    process.exit(1);
  } finally {
    await mangaDebugger.cleanup();
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

module.exports = MangaNotificationDebugger;
