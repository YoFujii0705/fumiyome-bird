// services/notificationTester.js - 通知テスト用サービス

const { EmbedBuilder } = require('discord.js');
const GoogleSheetsService = require('./googleSheets');

class NotificationTester {
  constructor(client) {
    this.client = client;
    this.googleSheets = new GoogleSheetsService();
  }

  /**
   * 🧪 通知テスト: 指定した漫画の次回通知を強制実行
   */
  async testMangaNotification(mangaId, channelId) {
    try {
      console.log(`🧪 通知テスト開始: 漫画ID ${mangaId}`);
      
      // 1. 漫画情報を取得
      const manga = await this.googleSheets.getMangaById(mangaId);
      if (!manga) {
        console.log('❌ 漫画が見つかりません');
        return false;
      }
      
      // 2. 通知設定を取得
      const notificationData = await this.googleSheets.getData('notification_schedules!A:I');
      if (!notificationData || notificationData.length <= 1) {
        console.log('❌ 通知設定が見つかりません');
        return false;
      }
      
      let notification = null;
      for (let i = 1; i < notificationData.length; i++) {
        const row = notificationData[i];
        if (row[1] === 'manga_update' && parseInt(row[2]) === mangaId) {
          notification = {
            id: row[0],
            title: row[3],
            scheduleData: JSON.parse(row[4] || '{}'),
            status: row[5]
          };
          break;
        }
      }
      
      if (!notification) {
        console.log('❌ 該当漫画の通知設定が見つかりません');
        return false;
      }
      
      // 3. テスト通知を送信
      const channel = this.client.channels.cache.get(channelId);
      if (!channel) {
        console.log('❌ チャンネルが見つかりません');
        return false;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('📚 漫画更新通知（テスト）')
        .setColor('#FF9800')
        .setDescription(`"${manga.title}" の更新日です！`)
        .addFields(
          { name: '📚 漫画', value: manga.title, inline: true },
          { name: '✍️ 作者', value: manga.author, inline: true },
          { name: '📊 進捗', value: this.getProgressText(manga), inline: true },
          { name: '📅 更新頻度', value: notification.scheduleData.displayName || '不明', inline: true },
          { name: '🔔 通知状態', value: notification.status === 'active' ? '有効' : '無効', inline: true },
          { name: '🧪 テスト', value: 'これはテスト通知です', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: '読了記録は /manga read で記録できます' });
      
      // 🔗 公式URLがあれば追加
      if (manga.series_url) {
        embed.addFields({ name: '🔗 公式サイト', value: manga.series_url, inline: false });
      }
      
      await channel.send({ embeds: [embed] });
      
      console.log('✅ テスト通知送信完了');
      return true;
      
    } catch (error) {
      console.error('❌ 通知テストエラー:', error);
      return false;
    }
  }

  /**
   * 🧪 全アクティブ通知のテスト実行
   */
  async testAllActiveNotifications(channelId) {
    try {
      console.log('🧪 全アクティブ通知テスト開始');
      
      const notificationData = await this.googleSheets.getData('notification_schedules!A:I');
      if (!notificationData || notificationData.length <= 1) {
        console.log('❌ 通知設定が見つかりません');
        return 0;
      }
      
      let successCount = 0;
      
      for (let i = 1; i < notificationData.length; i++) {
        const row = notificationData[i];
        const type = row[1];
        const mangaId = parseInt(row[2]);
        const status = row[5];
        
        if (type === 'manga_update' && status === 'active') {
          const success = await this.testMangaNotification(mangaId, channelId);
          if (success) {
            successCount++;
          }
          
          // 連続送信を避けるため少し待機
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`✅ 全アクティブ通知テスト完了: ${successCount}件送信`);
      return successCount;
      
    } catch (error) {
      console.error('❌ 全アクティブ通知テストエラー:', error);
      return 0;
    }
  }

  /**
   * 🔍 通知設定の詳細チェック
   */
  async checkNotificationStatus(mangaId = null) {
    try {
      console.log('🔍 通知設定チェック開始');
      
      const notificationData = await this.googleSheets.getData('notification_schedules!A:I');
      if (!notificationData || notificationData.length <= 1) {
        console.log('❌ 通知設定が見つかりません');
        return [];
      }
      
      const results = [];
      
      for (let i = 1; i < notificationData.length; i++) {
        const row = notificationData[i];
        const id = row[0];
        const type = row[1];
        const relatedId = parseInt(row[2]);
        const title = row[3];
        const scheduleData = JSON.parse(row[4] || '{}');
        const status = row[5];
        const nextNotification = row[8];
        
        // 特定の漫画IDが指定されている場合はフィルタリング
        if (mangaId && relatedId !== mangaId) {
          continue;
        }
        
        if (type === 'manga_update') {
          results.push({
            id,
            mangaId: relatedId,
            title,
            schedule: scheduleData.displayName || '不明',
            status,
            nextNotification,
            isActive: status === 'active',
            isValidSchedule: !!scheduleData.type
          });
        }
      }
      
      console.log(`🔍 通知設定チェック完了: ${results.length}件`);
      results.forEach(result => {
        console.log(`  📚 ${result.title} (ID:${result.mangaId}) - ${result.status} - ${result.schedule}`);
      });
      
      return results;
      
    } catch (error) {
      console.error('❌ 通知設定チェックエラー:', error);
      return [];
    }
  }

  /**
   * ⏰ 次回通知日時の強制更新
   */
  async updateNextNotification(mangaId) {
    try {
      console.log(`⏰ 次回通知日時更新開始: 漫画ID ${mangaId}`);
      
      // 通知設定を取得
      const notificationData = await this.googleSheets.getData('notification_schedules!A:I');
      if (!notificationData || notificationData.length <= 1) {
        return false;
      }
      
      let targetRowIndex = -1;
      let scheduleData = null;
      
      for (let i = 1; i < notificationData.length; i++) {
        const row = notificationData[i];
        if (row[1] === 'manga_update' && parseInt(row[2]) === mangaId) {
          targetRowIndex = i + 1; // Google Sheetsの行番号
          scheduleData = JSON.parse(row[4] || '{}');
          break;
        }
      }
      
      if (targetRowIndex === -1) {
        console.log('❌ 通知設定が見つかりません');
        return false;
      }
      
      // 次回通知日時を計算
      const nextNotification = this.calculateNextNotification(scheduleData);
      if (!nextNotification) {
        console.log('⚠️ 次回通知日時を計算できません');
        return false;
      }
      
      // I列(Next_Notification)を更新
      const updateRange = `notification_schedules!I${targetRowIndex}`;
      const success = await this.googleSheets.updateData(updateRange, [nextNotification]);
      
      if (success) {
        console.log(`✅ 次回通知日時更新完了: ${nextNotification}`);
        return true;
      } else {
        console.log('❌ 更新に失敗しました');
        return false;
      }
      
    } catch (error) {
      console.error('❌ 次回通知日時更新エラー:', error);
      return false;
    }
  }

  // ヘルパーメソッド
  getProgressText(manga) {
    const unit = manga.format === 'volume' ? '巻' : '話';
    if (manga.total_count && manga.total_count > 0) {
      return `${manga.read_count}/${manga.total_count}${unit}`;
    } else {
      return `${manga.read_count}${unit}`;
    }
  }

  calculateNextNotification(scheduleData) {
    if (!scheduleData || !scheduleData.type) {
      return null;
    }
    
    const now = new Date();
    
    switch (scheduleData.type) {
      case 'weekly':
        const nextWeekly = new Date(now);
        const currentDay = now.getDay();
        const targetDay = scheduleData.dayOfWeek;
        
        let daysUntilNext = (targetDay - currentDay + 7) % 7;
        if (daysUntilNext === 0) {
          daysUntilNext = 7;
        }
        
        nextWeekly.setDate(now.getDate() + daysUntilNext);
        nextWeekly.setHours(9, 0, 0, 0);
        return nextWeekly.toISOString();
        
      case 'monthly':
        const nextMonthly = new Date(now.getFullYear(), now.getMonth(), scheduleData.dayOfMonth, 9, 0, 0, 0);
        if (nextMonthly <= now) {
          nextMonthly.setMonth(nextMonthly.getMonth() + 1);
        }
        return nextMonthly.toISOString();
        
      default:
        return null;
    }
  }
}

module.exports = NotificationTester;
