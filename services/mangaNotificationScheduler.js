// services/mangaNotificationScheduler.js - 自動通知システム

const { EmbedBuilder } = require('discord.js');
const GoogleSheetsService = require('./googleSheets');

class MangaNotificationScheduler {
  constructor(client) {
    this.client = client;
    this.googleSheets = new GoogleSheetsService();
    this.isRunning = false;
    this.checkInterval = 60 * 60 * 1000; // 1時間ごとにチェック
    this.notificationChannelId = process.env.NOTIFICATION_CHANNEL_ID; // 環境変数で設定
  }

  /**
   * スケジューラーを開始
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ 漫画通知スケジューラーは既に実行中です');
      return;
    }

    console.log('🚀 漫画通知スケジューラーを開始します');
    this.isRunning = true;
    
    // 即座に1回チェック
    this.checkNotifications();
    
    // 定期実行を設定
    this.intervalId = setInterval(() => {
      this.checkNotifications();
    }, this.checkInterval);
  }

  /**
   * スケジューラーを停止
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ 漫画通知スケジューラーは実行されていません');
      return;
    }

    console.log('🛑 漫画通知スケジューラーを停止します');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 通知をチェックして送信
   */
  async checkNotifications() {
    try {
      console.log('🔍 漫画通知チェック開始');
      
      const now = new Date();
      const notificationData = await this.googleSheets.getData('notification_schedules!A:I');
      
      if (!notificationData || notificationData.length <= 1) {
        console.log('📭 通知設定が見つかりません');
        return;
      }

      let sentCount = 0;
      const processPromises = [];

      for (let i = 1; i < notificationData.length; i++) {
        const row = notificationData[i];
        const [id, type, mangaId, title, scheduleDataStr, status, createdAt, updatedAt, nextNotification] = row;

        // アクティブな漫画更新通知のみ処理
        if (type !== 'manga_update' || status !== 'active' || !nextNotification) {
          continue;
        }

        const nextNotificationDate = new Date(nextNotification);
        
        // 通知時刻が現在時刻を過ぎているかチェック
        if (nextNotificationDate <= now) {
          console.log(`📅 通知送信対象: ${title} (次回予定: ${nextNotification})`);
          
          // 非同期で通知処理を実行
          const promise = this.sendNotification(parseInt(mangaId), title, JSON.parse(scheduleDataStr || '{}'))
            .then(success => {
              if (success) {
                sentCount++;
                // 次回通知日時を更新
                return this.updateNextNotificationDate(i + 1, JSON.parse(scheduleDataStr || '{}'));
              }
              return false;
            })
            .catch(error => {
              console.error(`❌ 通知送信エラー (${title}):`, error);
              return false;
            });
          
          processPromises.push(promise);
        }
      }

      // 全ての通知処理を並行実行
      await Promise.all(processPromises);

      if (sentCount > 0) {
        console.log(`✅ 漫画通知送信完了: ${sentCount}件`);
      } else {
        console.log('📭 送信対象の通知はありませんでした');
      }

    } catch (error) {
      console.error('❌ 漫画通知チェックエラー:', error);
    }
  }

  /**
   * 指定漫画の通知を送信
   */
  async sendNotification(mangaId, title, scheduleData) {
    try {
      // 漫画情報を取得
      const manga = await this.googleSheets.getMangaById(mangaId);
      if (!manga) {
        console.log(`❌ 漫画が見つかりません: ID ${mangaId}`);
        return false;
      }

      // 通知チャンネルを取得
      const channel = this.client.channels.cache.get(this.notificationChannelId);
      if (!channel) {
        console.log(`❌ 通知チャンネルが見つかりません: ${this.notificationChannelId}`);
        return false;
      }

      // 通知埋め込みを作成
      const embed = new EmbedBuilder()
        .setTitle('📚 漫画更新通知')
        .setColor('#FF6B6B')
        .setDescription(`"**${manga.title}**" の更新日です！`)
        .addFields(
          { name: '📚 作品', value: manga.title, inline: true },
          { name: '✍️ 作者', value: manga.author, inline: true },
          { name: '📊 進捗', value: this.getProgressText(manga), inline: true }
        )
        .setTimestamp();

      // 更新頻度情報を追加
      if (scheduleData.displayName) {
        embed.addFields({ name: '📅 更新頻度', value: scheduleData.displayName, inline: true });
      }

      // 読書ステータスに応じたメッセージ
      if (manga.reading_status === 'reading') {
        embed.addFields({ 
          name: '📖 読書中', 
          value: '新しい巻/話が出ているかもしれません！', 
          inline: false 
        });
        embed.setColor('#4CAF50');
      } else if (manga.reading_status === 'want_to_read') {
        embed.addFields({ 
          name: '📋 積読中', 
          value: '読書を開始するのはいかがですか？', 
          inline: false 
        });
        embed.setColor('#FF9800');
      } else if (manga.reading_status === 'finished') {
        embed.addFields({ 
          name: '✅ 読了済み', 
          value: '新刊情報をチェックしましょう！', 
          inline: false 
        });
        embed.setColor('#9C27B0');
      }

      // 公式URLがあれば追加
      if (manga.series_url) {
        embed.addFields({ name: '🔗 公式サイト', value: manga.series_url, inline: false });
      }

      // アクションボタンの説明
      embed.addFields({ 
        name: '📝 読了記録', 
        value: '巻数/話数の読了は `/manga read` で記録できます', 
        inline: false 
      });

      embed.setFooter({ text: `次回通知: ${this.getNextNotificationText(scheduleData)}` });

      // 通知を送信
      await channel.send({ embeds: [embed] });
      
      console.log(`✅ 通知送信完了: ${manga.title}`);
      return true;

    } catch (error) {
      console.error(`❌ 通知送信エラー (ID:${mangaId}):`, error);
      return false;
    }
  }

  /**
 * 次回通知日時を更新（隔週対応版）
 */
async updateNextNotificationDate(rowIndex, scheduleData) {
  try {
    let nextNotification;
    
    // 隔週○曜日の場合は特別な計算
    if (scheduleData.type === 'biweekly_day') {
      nextNotification = this.calculateBiweeklyDayNext(scheduleData);
    } else {
      nextNotification = this.calculateNextNotification(scheduleData);
    }
    
    if (!nextNotification) {
      console.log('⚠️ 次回通知日時を計算できませんでした');
      return false;
    }

    const updateRange = `notification_schedules!I${rowIndex}`;
    const success = await this.googleSheets.updateData(updateRange, [nextNotification]);

    if (success) {
      console.log(`📅 次回通知日時更新: ${nextNotification}`);
      return true;
    } else {
      console.log('❌ 次回通知日時の更新に失敗しました');
      return false;
    }

  } catch (error) {
    console.error('❌ 次回通知日時更新エラー:', error);
    return false;
  }
}

  /**
 * 隔週○曜日の次回通知計算（通知送信後用）
 */
calculateBiweeklyDayNext(scheduleData) {
  const { dayOfWeek } = scheduleData;
  const now = new Date();
  
  // 現在から2週間後の同じ曜日を計算
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + 14);
  
  // 指定曜日に調整
  const currentDay = nextDate.getDay();
  const daysToAdjust = (dayOfWeek - currentDay + 7) % 7;
  
  if (daysToAdjust !== 0) {
    nextDate.setDate(nextDate.getDate() + daysToAdjust);
  }
  
  nextDate.setHours(9, 0, 0, 0);
  return nextDate.toISOString();
}


  /**
 * 次回通知日時を計算（改良版）
 */
calculateNextNotification(scheduleData) {
  if (!scheduleData || !scheduleData.type) {
    return null;
  }

  const now = new Date();

  switch (scheduleData.type) {
    case 'weekly':
      const nextWeekly = new Date(now);
      nextWeekly.setDate(now.getDate() + 7); // 1週間後
      nextWeekly.setHours(9, 0, 0, 0);
      return nextWeekly.toISOString();

    case 'biweekly_day':
      // 隔週○曜日の場合
      return this.calculateBiweeklyDayNext(scheduleData);

    case 'biweekly_weeks':
      // 毎月第N週○曜日の場合
      return this.calculateBiweeklyWeeksNext(scheduleData);

    case 'monthly':
      const nextMonthly = new Date(now);
      nextMonthly.setMonth(now.getMonth() + 1); // 1ヶ月後
      nextMonthly.setDate(scheduleData.dayOfMonth || 1);
      nextMonthly.setHours(9, 0, 0, 0);
      return nextMonthly.toISOString();

    case 'biweekly_old':
      // 従来の隔週（14日後）
      const nextBiweekly = new Date(now);
      nextBiweekly.setDate(now.getDate() + 14);
      nextBiweekly.setHours(9, 0, 0, 0);
      return nextBiweekly.toISOString();

    case 'irregular':
    case 'completed':
      return null;

    default:
      console.log(`未知のスケジュールタイプ: ${scheduleData.type}`);
      return null;
  }
}

  /**
 * 毎月第N週○曜日の次回通知計算
 */
calculateBiweeklyWeeksNext(scheduleData) {
  const { dayOfWeek, weeks } = scheduleData;
  const now = new Date();
  
  // getNthWeekday関数
  const getNthWeekday = (year, month, weekNumber, dayOfWeek) => {
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    
    let daysToAdd = (dayOfWeek - firstWeekday + 7) % 7;
    const firstOccurrence = new Date(year, month, 1 + daysToAdd);
    
    const nthOccurrence = new Date(firstOccurrence);
    nthOccurrence.setDate(firstOccurrence.getDate() + (weekNumber - 1) * 7);
    nthOccurrence.setHours(9, 0, 0, 0);
    
    if (nthOccurrence.getMonth() !== month) {
      return null;
    }
    
    return nthOccurrence;
  };
  
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // 今月の残りの候補日を計算
  const candidates = weeks.map(weekNum => 
    getNthWeekday(currentYear, currentMonth, weekNum, dayOfWeek)
  ).filter(date => date !== null && date > now);
  
  // 今月に候補がある場合
  if (candidates.length > 0) {
    const nextDate = new Date(Math.min(...candidates.map(d => d.getTime())));
    return nextDate.toISOString();
  }
  
  // 来月の候補を計算
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  
  const nextMonthCandidates = weeks.map(weekNum => 
    getNthWeekday(nextYear, nextMonth, weekNum, dayOfWeek)
  ).filter(date => date !== null);
  
  if (nextMonthCandidates.length > 0) {
    const nextDate = new Date(Math.min(...nextMonthCandidates.map(d => d.getTime())));
    return nextDate.toISOString();
  }
  
  return null;
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

  getNextNotificationText(scheduleData) {
    if (!scheduleData || !scheduleData.displayName) {
      return '未設定';
    }
    
    const next = this.calculateNextNotification(scheduleData);
    if (!next) {
      return '設定なし';
    }
    
    const nextDate = new Date(next);
    return `${nextDate.toLocaleDateString('ja-JP')} ${nextDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
  }

  /**
   * スケジューラーの状態を取得
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      notificationChannelId: this.notificationChannelId,
      nextCheck: this.isRunning ? new Date(Date.now() + this.checkInterval).toISOString() : null
    };
  }
}

module.exports = MangaNotificationScheduler;
