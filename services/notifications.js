const { EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const StatsUtility = require('./statsUtility');

class NotificationService {
  constructor(client, googleSheetsService) {
    this.client = client;
    this.googleSheets = googleSheetsService;
    this.statsUtil = new StatsUtility(googleSheetsService);
    this.scheduledTasks = new Map();
    
   // GoalServiceにGoogleSheetsServiceを設定 (追加)
    const goalService = require('./goalService');
    goalService.setGoogleSheetsService(googleSheetsService);
    this.goalService = goalService;

    console.log('📢 通知サービスを初期化中...');
    this.initializeScheduledNotifications();
  }

  initializeScheduledNotifications() {
    console.log('⏰ 定期通知スケジュールを設定中...');

    // =====================================
    // 🌅 基本的な日次・週次・月次通知
    // =====================================
    
    // 毎朝7時: おはよう通知
    this.scheduleTask('morning_greeting', '0 7 * * *', () => {
      this.sendMorningGreeting();
    });

    // 毎日20時: 日報記録リマインダー
    this.scheduleTask('daily_report_reminder', '0 20 * * *', () => {
      this.sendDailyReportReminder();
    });

    // 毎週日曜日21時: 週次レポート
    this.scheduleTask('weekly_report', '0 21 * * 0', () => {
      this.sendWeeklyReport();
    });

    // 毎月1日8時: 月次レポート
    this.scheduleTask('monthly_report', '0 8 1 * *', () => {
      this.sendMonthlyReport();
    });

    // =====================================
    // 🎯 目標管理通知
    // =====================================
    
    // 月曜日 9:00 - 週の始まりの目標確認
    this.scheduleTask('goals_weekly_start', '0 9 * * 1', () => {
      this.sendGoalsProgressReport('weekly_start');
    });

    // 水曜日 18:00 - 週の中間チェック
    this.scheduleTask('goals_weekly_mid', '0 18 * * 3', () => {
      this.sendGoalsProgressReport('weekly_mid');
    });

    // 金曜日 19:00 - 週次目標の最終チェック
    this.scheduleTask('goals_weekly_final', '0 19 * * 5', () => {
      this.sendWeeklyGoalsFinalCheck();
    });

    // 毎週日曜日 20:00 - ストリーク情報
    this.scheduleTask('streak_report', '0 20 * * 0', () => {
      this.sendStreakReport();
    });

    // 毎月15日 9:00 - 目標の見直し提案
    this.scheduleTask('goals_adjustment', '0 9 15 * *', () => {
      this.sendGoalsAdjustmentSuggestion();
    });

    // =====================================
    // 📊 統計・分析通知
    // =====================================
    
    // 月の5日 19:00 - 月初統計サマリー
    this.scheduleTask('monthly_stats_summary', '0 19 5 * *', () => {
      this.sendMonthlyStatsSummary();
    });

    // 月の15日 20:00 - 月中トレンド分析
    this.scheduleTask('monthly_trends_analysis', '0 20 15 * *', () => {
      this.sendMonthlyTrendsAnalysis();
    });

    // 月の25日 19:30 - 月末読書統計
    this.scheduleTask('monthly_books_stats', '0 19 25 * *', () => {
      this.sendMonthlyBooksStatistics();
    });

    // 月の28日 18:00 - 月次比較レポート（完全版）
    this.scheduleTask('monthly_comparison', '0 18 28 * *', () => {
      this.sendEnhancedMonthlyComparison();
    });

    // =====================================
    // 🛒 ウィッシュリスト・記事管理通知
    // =====================================
    
    // 毎月1日9時: 買いたい本リスト通知
    this.scheduleTask('monthly_wishlist', '0 9 1 * *', () => {
      this.sendMonthlyWishlist();
    });

    // 毎月3日 10:00 - ウィッシュリストリマインダー
    this.scheduleTask('monthly_wishlist_reminder', '0 10 3 * *', () => {
      this.sendMonthlyWishlistReminder();
    });

    // 毎週土曜日 18:00 - 週次記事リマインダー
    this.scheduleTask('weekly_article_reminder', '0 18 * * 6', () => {
      this.sendWeeklyArticleReminder();
    });

    // =====================================
    // 🔍 メンテナンス・整理通知
    // =====================================
    
    // 毎週金曜日21時: 放置アイテムチェック
    this.scheduleTask('abandoned_items_check', '0 21 * * 5', () => {
      this.checkAbandonedItems();
    });

   // 修正後（月の28-31日の17:00に実行し、月末かチェック）
this.scheduleTask('monthly_summary_report', '0 17 28-31 * *', () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  // 明日が翌月の1日なら今日が月末
  if (tomorrow.getDate() === 1) {
    this.sendMonthlySummaryReport();
  }
});

    // =====================================
    // 🏆 特別レポート
    // =====================================
    
    // 四半期レポート（3,6,9,12月の最終日曜日）
    this.scheduleTask('quarterly_report', '0 19 * 3,6,9,12 0', () => {
      const isLastSunday = this.isLastSundayOfMonth();
      if (isLastSunday) {
        this.sendQuarterlyReport();
      }
    });

    console.log(`✅ ${this.scheduledTasks.size}個の定期通知を設定しました`);
  }

  // =====================================
  // ⚙️ ユーティリティメソッド
  // =====================================

  scheduleTask(name, cronPattern, callback) {
    try {
      const task = cron.schedule(cronPattern, callback, {
        scheduled: true,
        timezone: "Asia/Tokyo"
      });
      
      this.scheduledTasks.set(name, task);
      console.log(`✅ ${name} スケジュール設定完了: ${cronPattern}`);
    } catch (error) {
      console.error(`❌ ${name} スケジュール設定失敗:`, error);
    }
  }

  getNotificationChannel() {
    if (process.env.NOTIFICATION_CHANNEL_ID) {
      const channel = this.client.channels.cache.get(process.env.NOTIFICATION_CHANNEL_ID);
      if (channel) return channel;
    }

    const guild = this.client.guilds.cache.first();
    if (guild) {
      const textChannels = guild.channels.cache.filter(ch => ch.type === 0);
      return textChannels.first();
    }

    return null;
  }

  isLastSundayOfMonth() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const lastSunday = new Date(lastDay);
    lastSunday.setDate(lastDay.getDate() - lastDay.getDay());
    
    return today.toDateString() === lastSunday.toDateString();
  }

  // =====================================
  // 🌅 基本通知メソッド
  // =====================================

  async sendMorningGreeting() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const [readingBooks, wantToReadBooks, plannedActivities, watchingAnimes, wantToWatchAnimes, wantToWatchMovies] = await Promise.all([
        this.googleSheets.getCurrentReadingBooks(),
        this.googleSheets.getWantToReadBooks(),
        this.googleSheets.getActivities().then(activities => 
          activities.filter(activity => activity.includes('(planned)')).slice(0, 5)
        ),
        this.googleSheets.getAnimesByStatus('watching'),
        this.googleSheets.getAnimesByStatus('want_to_watch'),
        this.googleSheets.getWantToWatchMovies()
      ]);

      const embed = new EmbedBuilder()
        .setTitle('☀️ おはようございます！')
        .setDescription('今日も素晴らしい一日にしましょう！📚✨')
        .setColor('#FFD700')
        .setTimestamp();

      // 読書中の本
      if (readingBooks.length > 0) {
        const bookList = readingBooks.map(book => `📖 ${book.title} - ${book.author}`).join('\n');
        embed.addFields({
          name: '📚 読書中の本',
          value: bookList,
          inline: false
        });
      }

      // 視聴中のアニメ
      if (watchingAnimes.length > 0) {
        const animeList = watchingAnimes.slice(0, 3).map(anime => 
          `📺 ${anime.title} (${anime.watched_episodes}/${anime.total_episodes}話)`
        ).join('\n');
        embed.addFields({
          name: '📺 視聴中のアニメ',
          value: animeList,
          inline: false
        });
      }

      // 今日のおすすめ（複数カテゴリ統合）
      const recommendations = [];
      
      if (wantToReadBooks.length > 0) {
        recommendations.push(...wantToReadBooks.slice(0, 2)
          .map(book => `📋 ${book.title} - ${book.author}`));
      }
      
      if (wantToWatchAnimes.length > 0) {
        recommendations.push(...wantToWatchAnimes.slice(0, 2)
          .map(anime => `🍿 ${anime.title} (${anime.total_episodes}話)`));
      }
      
      if (wantToWatchMovies.length > 0) {
        recommendations.push(...wantToWatchMovies.slice(0, 2)
          .map(movie => `🎬 ${movie}`));
      }

      if (recommendations.length > 0) {
        embed.addFields({
          name: '🌟 今日のおすすめ',
          value: recommendations.slice(0, 4).join('\n'),
          inline: false
        });
      }

      // 今日の活動候補
      if (plannedActivities.length > 0) {
        const activityList = plannedActivities.slice(0, 3)
          .map(activity => {
            const match = activity.match(/\[(\d+)\] (.+?) \(/);
            return match ? `🎯 ${match[2]}` : activity;
          }).join('\n');
        
        embed.addFields({
          name: '🎯 今日の活動候補',
          value: activityList,
          inline: false
        });
      }

      const dailyGoals = [
        '📚 読書時間を確保する',
        '📺 アニメの続きを楽しむ',
        '📝 日報を記録する',
        '🎯 一つでも活動を完了する',
        '💭 新しい発見を記録する'
      ];

      embed.addFields({
        name: '🎯 今日の目標',
        value: dailyGoals.join('\n'),
        inline: false
      });

      embed.setFooter({ text: '今日も一歩ずつ前進していきましょう！' });

      await channel.send({ embeds: [embed] });
      console.log('☀️ 朝の挨拶を送信しました（アニメ対応版）');

    } catch (error) {
      console.error('朝の挨拶送信エラー:', error);
    }
  }

  async sendDailyReportReminder() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const todayReports = await this.googleSheets.getRecentReports(1);
      
      console.log('📝 取得したレポートデータ:', JSON.stringify(todayReports, null, 2));

      const embed = new EmbedBuilder()
        .setColor(todayReports.length > 0 ? '#4CAF50' : '#FF9800')
        .setTimestamp();

      if (todayReports.length > 0) {
        embed
          .setTitle('🎉 今日もお疲れ様でした！')
          .setDescription(`今日は ${todayReports.length} 件のレポートを記録されましたね！`)
          .setFooter({ text: '継続は力なり！素晴らしい習慣ですね！' });

        // レポート内容の表示を改善（アニメ情報付き）
        const reportSummary = await Promise.all(todayReports.map(async (report, index) => {
          const emoji = { 
            book: '📚', 
            movie: '🎬',
            anime: '📺',
            activity: '🎯' 
          }[report.category] || '📝';
          
          console.log(`📝 レポート${index + 1}の詳細:`, {
            category: report.category,
            content: report.content,
            item_id: report.item_id,
            user_id: report.user_id
          });
          
          // アイテム情報を取得
          let itemInfo = '';
          if (report.item_id && report.category) {
            try {
              let item = null;
              switch (report.category) {
                case 'book':
                  item = await this.googleSheets.getBookById(report.item_id);
                  if (item) {
                    itemInfo = `『${item.title}』(${item.author}) - `;
                  }
                  break;
                case 'movie':
                  item = await this.googleSheets.getMovieById(report.item_id);
                  if (item) {
                    itemInfo = `『${item.title}』 - `;
                  }
                  break;
                case 'anime':
                  item = await this.googleSheets.getAnimeById(report.item_id);
                  if (item) {
                    itemInfo = `『${item.title}』(${item.watched_episodes}/${item.total_episodes}話) - `;
                  }
                  break;
                case 'activity':
                  item = await this.googleSheets.getActivityById(report.item_id);
                  if (item) {
                    itemInfo = `「${item.content}」 - `;
                  }
                  break;
              }
            } catch (error) {
              console.log(`アイテム情報取得エラー (${report.category} ID:${report.item_id}):`, error.message);
            }
          }
          
          // 文字数制限を調整（アイテム情報を含めて）
          const maxContentLength = todayReports.length === 1 ? 150 : 100;
          const content = report.content || 'レポート内容なし';
          
          let displayContent;
          if (content.length <= maxContentLength) {
            displayContent = content;
          } else {
            displayContent = content.substring(0, maxContentLength) + '...';
          }
          
          return `${emoji} **${index + 1}.** ${itemInfo}${displayContent}`;
        }));
        
        const finalReportSummary = reportSummary.join('\n\n');

        embed.addFields({
          name: '📝 今日の記録',
          value: finalReportSummary,
          inline: false
        });

        // レポート数が多い場合の追加情報
        if (todayReports.length > 3) {
          embed.addFields({
            name: '💡 記録詳細',
            value: `本日は特に活発な記録日でした！${todayReports.length}件の記録、素晴らしいですね。`,
            inline: false
          });
        }

      } else {
        embed
          .setTitle('📝 日報記録のリマインド')
          .setDescription('今日の活動を振り返って、記録してみませんか？')
          .addFields(
            { name: '📚 読書記録', value: '`/report` → 本を選択', inline: true },
            { name: '🎬 映画記録', value: '`/report` → 映画を選択', inline: true },
            { name: '📺 アニメ記録', value: '`/report` → アニメを選択', inline: true },
            { name: '🎯 活動記録', value: '`/report` → 活動を選択', inline: true },
            { name: '💡 記録のコツ', value: '• 短くても OK\n• 感じたことを素直に\n• 継続が一番大切', inline: false }
          )
          .setFooter({ text: '小さな記録の積み重ねが大きな成長につながります！' });
      }

      await channel.send({ embeds: [embed] });
      console.log('📝 日報リマインドを送信しました（アニメ対応版）');

    } catch (error) {
      console.error('日報リマインド送信エラー:', error);
    }
  }

  async sendWeeklyReport() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const [weeklyStats, recentReports, animeStats] = await Promise.all([
        this.googleSheets.getWeeklyStats(),
        this.googleSheets.getRecentReports(7),
        this.googleSheets.getAnimeCounts()
      ]);

      // アニメの週次統計を計算（簡易版）
      const weeklyAnimeCompleted = await this.calculateWeeklyAnimeCompleted();
      const weeklyAnimeEpisodes = await this.calculateWeeklyAnimeEpisodes();

      const totalCompleted = weeklyStats.finishedBooks + weeklyStats.watchedMovies + weeklyStats.completedActivities + weeklyAnimeCompleted;

      const embed = new EmbedBuilder()
        .setTitle('📅 今週の活動レポート')
        .setDescription(`今週は ${totalCompleted} 件のアイテムを完了しました！🎉`)
        .setColor('#9C27B0')
        .addFields(
          { name: '📚 読了した本', value: `${weeklyStats.finishedBooks}冊`, inline: true },
          { name: '🎬 視聴した映画', value: `${weeklyStats.watchedMovies}本`, inline: true },
          { name: '📺 完走したアニメ', value: `${weeklyAnimeCompleted}本`, inline: true },
          { name: '🎯 完了した活動', value: `${weeklyStats.completedActivities}件`, inline: true },
          { name: '📝 記録した日報', value: `${recentReports.length}件`, inline: true },
          { name: '📺 視聴した話数', value: `${weeklyAnimeEpisodes}話`, inline: true }
        )
        .setTimestamp();

      // 週次目標との比較（アニメ追加）
      const weeklyGoals = { books: 2, movies: 3, animes: 1, activities: 5, reports: 7, episodes: 10 };
      const achievements = [];
      
      if (weeklyStats.finishedBooks >= weeklyGoals.books) achievements.push('📚 読書目標達成！');
      if (weeklyStats.watchedMovies >= weeklyGoals.movies) achievements.push('🎬 映画目標達成！');
      if (weeklyAnimeCompleted >= weeklyGoals.animes) achievements.push('📺 アニメ完走目標達成！');
      if (weeklyStats.completedActivities >= weeklyGoals.activities) achievements.push('🎯 活動目標達成！');
      if (recentReports.length >= weeklyGoals.reports) achievements.push('📝 日報目標達成！');
      if (weeklyAnimeEpisodes >= weeklyGoals.episodes) achievements.push('📺 話数視聴目標達成！');

      if (achievements.length > 0) {
        embed.addFields({
          name: '🏆 今週の達成項目',
          value: achievements.join('\n'),
          inline: false
        });
      }

      // 現在の視聴状況
      const currentStatus = [];
      if (animeStats.watching > 0) {
        currentStatus.push(`📺 視聴中のアニメ: ${animeStats.watching}本`);
      }
      if (animeStats.wantToWatch > 0) {
        currentStatus.push(`🍿 観たいアニメ: ${animeStats.wantToWatch}本`);
      }

      if (currentStatus.length > 0) {
        embed.addFields({
          name: '📊 現在のアニメ状況',
          value: currentStatus.join('\n'),
          inline: false
        });
      }

      const encouragements = [
        'お疲れ様でした！来週も頑張りましょう！',
        '素晴らしい一週間でした！',
        '継続的な活動、素晴らしいですね！',
        '着実に前進していますね！',
        'アニメも読書も活動も充実していますね！'
      ];

      embed.setFooter({ 
        text: encouragements[Math.floor(Math.random() * encouragements.length)]
      });

      await channel.send({ embeds: [embed] });
      console.log('📅 週次レポートを送信しました（アニメ対応版）');

    } catch (error) {
      console.error('週次レポート送信エラー:', error);
    }
  }
  
  async sendMonthlyReport() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const [monthlyStats, bookTitles, animeStats, monthlyAnimeCompleted, monthlyAnimeEpisodes] = await Promise.all([
        this.googleSheets.getMonthlyStats(),
        this.googleSheets.getMonthlyBookTitles(),
        this.googleSheets.getAnimeCounts(),
        this.calculateMonthlyAnimeCompleted(),
        this.calculateMonthlyAnimeEpisodes()
      ]);

      const totalCompleted = monthlyStats.finishedBooks + monthlyStats.watchedMovies + monthlyStats.completedActivities + monthlyAnimeCompleted;

      const embed = new EmbedBuilder()
        .setTitle('🗓️ 今月の活動レポート')
        .setDescription(`今月は ${totalCompleted} 件のアイテムを完了しました！`)
        .setColor('#E91E63')
        .addFields(
          { name: '📚 読了冊数', value: `${monthlyStats.finishedBooks}冊`, inline: true },
          { name: '🎬 視聴本数', value: `${monthlyStats.watchedMovies}本`, inline: true },
          { name: '📺 完走アニメ', value: `${monthlyAnimeCompleted}本`, inline: true },
          { name: '🎯 完了活動', value: `${monthlyStats.completedActivities}件`, inline: true },
          { name: '📝 日報件数', value: `${monthlyStats.reports}件`, inline: true },
          { name: '📺 視聴話数', value: `${monthlyAnimeEpisodes}話`, inline: true }
        )
        .setTimestamp();

      // 読了した本の一覧
      if (bookTitles.length > 0) {
        const displayTitles = bookTitles.slice(0, 6);
        const moreTitles = bookTitles.length - 6;
        
        let titlesList = displayTitles.map((title, index) => `${index + 1}. ${title}`).join('\n');
        if (moreTitles > 0) {
          titlesList += `\n... 他${moreTitles}冊`;
        }
        
        embed.addFields({
          name: '🏆 今月読了した本',
          value: titlesList,
          inline: false
        });
      }

      // 完走したアニメの一覧
      const completedAnimes = await this.getMonthlyCompletedAnimes();
      if (completedAnimes.length > 0) {
        const displayAnimes = completedAnimes.slice(0, 6);
        const moreAnimes = completedAnimes.length - 6;
        
        let animesList = displayAnimes.map((anime, index) => 
          `${index + 1}. ${anime.title} (${anime.total_episodes}話)`
        ).join('\n');
        if (moreAnimes > 0) {
          animesList += `\n... 他${moreAnimes}本`;
        }
        
        embed.addFields({
          name: '🎉 今月完走したアニメ',
          value: animesList,
          inline: false
        });
      }

      // アニメ視聴統計
      if (animeStats.total > 0) {
        const animeCompletionRate = Math.round((animeStats.completed / animeStats.total) * 100);
        embed.addFields({
          name: '📺 アニメ視聴統計',
          value: [
            `完走率: ${animeCompletionRate}%`,
            `視聴中: ${animeStats.watching}本`,
            `観たい: ${animeStats.wantToWatch}本`,
            `中断: ${animeStats.dropped}本`
          ].join(' | '),
          inline: false
        });
      }

      const level = this.calculateMonthlyLevel(totalCompleted);
      embed.addFields({
        name: '🌟 今月の活動レベル',
        value: `${level.icon} **${level.name}**\n${level.description}`,
        inline: false
      });

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthName = nextMonth.toLocaleDateString('ja-JP', { month: 'long' });

      embed.setFooter({ text: `素晴らしい1ヶ月でした！${nextMonthName}も頑張りましょう！` });

      await channel.send({ embeds: [embed] });
      console.log('🗓️ 月次レポートを送信しました（アニメ対応版）');

    } catch (error) {
      console.error('月次レポート送信エラー:', error);
    }
  }
  // =====================================
  // 🔍 メンテナンス・整理通知メソッド
  // =====================================

  async checkAbandonedItems() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const [abandonedItems, abandonedAnimes] = await Promise.all([
        this.googleSheets.getAbandonedItems(7),
        this.getAbandonedAnimes(7)
      ]);

      const totalAbandoned = abandonedItems.movies.length + abandonedItems.activities.length + abandonedAnimes.length;

      if (totalAbandoned === 0) {
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('⚠️ 放置されているアイテムがあります')
        .setDescription('1週間以上手つかずのアイテムをチェックしてみませんか？')
        .setColor('#FF5722')
        .setTimestamp();

      // 放置されたアニメ
      if (abandonedAnimes.length > 0) {
        const animeList = abandonedAnimes.slice(0, 5)
          .map(anime => `📺 [${anime.id}] ${anime.title} (${anime.watched_episodes}/${anime.total_episodes}話)`).join('\n');
        
        embed.addFields({
          name: `📺 視聴中断中のアニメ（${abandonedAnimes.length}本）`,
          value: animeList,
          inline: false
        });
      }

      // 放置された映画
      if (abandonedItems.movies.length > 0) {
        const movieList = abandonedItems.movies.slice(0, 5)
          .map(movie => `🎬 [${movie.id}] ${movie.title}`).join('\n');
        
        embed.addFields({
          name: `🎬 観たい映画（${abandonedItems.movies.length}件）`,
          value: movieList,
          inline: false
        });
      }

      // 放置された活動
      if (abandonedItems.activities.length > 0) {
        const activityList = abandonedItems.activities.slice(0, 5)
          .map(activity => `🎯 [${activity.id}] ${activity.content}`).join('\n');
        
        embed.addFields({
          name: `🎯 予定中の活動（${abandonedItems.activities.length}件）`,
          value: activityList,
          inline: false
        });
      }

      embed.addFields({
        name: '💡 対処方法',
        value: [
          '📺 アニメ: `/anime watch` で話数視聴、`/anime finish` で完走、`/anime drop` で中断',
          '🎬 映画: `/movie watch` または `/movie skip`',
          '🎯 活動: `/activity done` または `/activity skip`',
          '📝 感想: `/report` で記録・振り返り',
          '🔄 整理: 不要なアイテムの見直し'
        ].join('\n'),
        inline: false
      });

      embed.setFooter({ text: '定期的な整理で効率的な管理を！' });

      await channel.send({ embeds: [embed] });
      console.log('⚠️ 放置アイテム通知を送信しました（アニメ対応版）');

    } catch (error) {
      console.error('放置アイテムチェックエラー:', error);
    }
  }

   // =====================================
  // 🆕 アニメ関連ヘルパーメソッド
  // =====================================

  /**
   * 週次でのアニメ完走数を計算
   */
  async calculateWeeklyAnimeCompleted() {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString().slice(0, 10);
      
      // 簡易実装：過去7日間に完走されたアニメ数を取得
      // 実際の実装では finish_date を確認
      const allAnimes = await this.googleSheets.getAllAnimes();
      
      return allAnimes.filter(anime => {
        if (anime.status !== 'completed') return false;
        if (!anime.finish_date) return false;
        
        try {
          const finishDate = new Date(anime.finish_date);
          return finishDate >= oneWeekAgo;
        } catch {
          return false;
        }
      }).length;
    } catch (error) {
      console.error('週次アニメ完走数計算エラー:', error);
      return 0;
    }
  }

  /**
   * 週次でのアニメ視聴話数を計算
   */
  async calculateWeeklyAnimeEpisodes() {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString().slice(0, 10);
      
      // エピソードログから過去7日間の視聴話数を計算
      // 簡易実装として、全アニメの進捗から推定
      const watchingAnimes = await this.googleSheets.getAnimesByStatus('watching');
      const completedAnimes = await this.googleSheets.getAnimesByStatus('completed');
      
      // 簡易推定：視聴中アニメ×2話 + 完走アニメの最終話数
      let weeklyEpisodes = watchingAnimes.length * 2;
      
      for (const anime of completedAnimes) {
        if (anime.finish_date) {
          try {
            const finishDate = new Date(anime.finish_date);
            if (finishDate >= oneWeekAgo) {
              // この週に完走されたアニメの最後の数話
              weeklyEpisodes += Math.min(anime.total_episodes, 5);
            }
          } catch {
            // 日付パースエラーは無視
          }
        }
      }
      
      return weeklyEpisodes;
    } catch (error) {
      console.error('週次アニメ話数計算エラー:', error);
      return 0;
    }
  }

  /**
   * 月次でのアニメ完走数を計算
   */
  async calculateMonthlyAnimeCompleted() {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const oneMonthAgoStr = oneMonthAgo.toISOString().slice(0, 10);
      
      const allAnimes = await this.googleSheets.getAllAnimes();
      
      return allAnimes.filter(anime => {
        if (anime.status !== 'completed') return false;
        if (!anime.finish_date) return false;
        
        try {
          const finishDate = new Date(anime.finish_date);
          return finishDate >= oneMonthAgo;
        } catch {
          return false;
        }
      }).length;
    } catch (error) {
      console.error('月次アニメ完走数計算エラー:', error);
      return 0;
    }
  }

  /**
   * 月次でのアニメ視聴話数を計算
   */
  async calculateMonthlyAnimeEpisodes() {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      // 簡易推定：視聴中アニメ×8話 + 完走アニメの話数
      const watchingAnimes = await this.googleSheets.getAnimesByStatus('watching');
      const completedAnimes = await this.googleSheets.getAnimesByStatus('completed');
      
      let monthlyEpisodes = watchingAnimes.reduce((sum, anime) => 
        sum + (anime.watched_episodes || 0), 0
      );
      
      for (const anime of completedAnimes) {
        if (anime.finish_date) {
          try {
            const finishDate = new Date(anime.finish_date);
            if (finishDate >= oneMonthAgo) {
              monthlyEpisodes += anime.total_episodes || 0;
            }
          } catch {
            // 日付パースエラーは無視
          }
        }
      }
      
      return monthlyEpisodes;
    } catch (error) {
      console.error('月次アニメ話数計算エラー:', error);
      return 0;
    }
  }

  /**
   * 今月完走したアニメ一覧を取得
   */
  async getMonthlyCompletedAnimes() {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const allAnimes = await this.googleSheets.getAllAnimes();
      
      return allAnimes.filter(anime => {
        if (anime.status !== 'completed') return false;
        if (!anime.finish_date) return false;
        
        try {
          const finishDate = new Date(anime.finish_date);
          return finishDate >= oneMonthAgo;
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.error('月次完走アニメ取得エラー:', error);
      return [];
    }
  }

  /**
   * 放置されたアニメを取得
   */
  async getAbandonedAnimes(daysAgo = 7) {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysAgo);
      const targetDateStr = targetDate.toISOString().slice(0, 10);
      
      const watchingAnimes = await this.googleSheets.getAnimesByStatus('watching');
      
      return watchingAnimes.filter(anime => {
        // updated_at がない、または指定日数より古い場合は放置されているとみなす
        if (!anime.updated_at) return true;
        
        try {
          const updateDate = new Date(anime.updated_at);
          return updateDate.toISOString().slice(0, 10) <= targetDateStr;
        } catch {
          return true; // 日付パースエラーの場合も放置扱い
        }
      });
    } catch (error) {
      console.error('放置アニメ取得エラー:', error);
      return [];
    }
  }

  // =====================================
  // 🎯 目標管理通知メソッド
  // =====================================

  // 目標進捗レポート送信メソッドの修正
  async sendGoalsProgressReport(reportType = 'general') {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      console.log(`📊 目標進捗レポート送信開始 (${reportType})...`);

      const activeUsers = this.getActiveGoalUsers();
      
      if (activeUsers.length === 0) {
        console.log('目標設定済みユーザーが見つかりません');
        return;
      }

      for (const userId of activeUsers) {
        try {
          await this.sendUserGoalsProgress(channel, userId, reportType);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`ユーザー ${userId} の目標進捗送信エラー:`, error);
        }
      }

      console.log('✅ 目標進捗レポート送信完了');
    } catch (error) {
      console.error('❌ 目標進捗レポート送信エラー:', error);
    }
  }

 async sendUserGoalsProgress(channel, userId, reportType) {
    try {
      console.log(`📊 ユーザー ${userId} の目標進捗取得開始...`);
      
      const user = await this.client.users.fetch(userId);
      if (!user) {
        console.log(`⚠️ ユーザー ${userId} が見つかりません`);
        return;
      }

      console.log(`👤 ユーザー ${user.username} の目標進捗を取得中...`);

      // データを順次取得
      let goals, currentStats, progressAnalysis;
      
      try {
        goals = await this.goalService.getGoals(userId);
        console.log('🎯 目標取得完了:', goals);
      } catch (error) {
        console.error('目標取得エラー:', error);
        goals = { weekly: {}, monthly: {} };
      }

      try {
        currentStats = await this.goalService.getCurrentProgress(userId);
        console.log('📊 進捗取得完了:', currentStats);
      } catch (error) {
        console.error('進捗取得エラー:', error);
        currentStats = {
          weekly: { books: 0, movies: 0, activities: 0, reports: 0 },
          monthly: { books: 0, movies: 0, activities: 0, reports: 0 }
        };
      }

      try {
        progressAnalysis = await this.goalService.getProgressAnalysis(userId);
        console.log('📈 分析取得完了:', progressAnalysis);
      } catch (error) {
        console.error('分析取得エラー:', error);
        progressAnalysis = {
          today: { books: 0, movies: 0, activities: 0 },
          streak: 0,
          weeklyProgress: 0,
          momentum: 'stable'
        };
      }

      // 目標が全く設定されていない場合のチェック
      const hasWeeklyGoals = goals.weekly && Object.keys(goals.weekly).length > 0;
      const hasMonthlyGoals = goals.monthly && Object.keys(goals.monthly).length > 0;

      if (!hasWeeklyGoals && !hasMonthlyGoals) {
        console.log(`ユーザー ${user.username} は目標未設定のためスキップ`);
        return;
      }

      // Embedを直接構築（EmbedBuilderを使わない方法）
      const embedData = this.createGoalsProgressEmbedData(user, goals, currentStats, progressAnalysis, reportType);
      
      if (embedData) {
        console.log('📊 送信するEmbedデータ:', JSON.stringify(embedData, null, 2));
        await channel.send({ embeds: [embedData] });
        console.log(`✅ ${user.username} の目標進捗を送信しました`);
      } else {
        console.log(`⚠️ ${user.username} のEmbed生成に失敗しました`);
      }
    } catch (error) {
      console.error('ユーザー目標進捗送信エラー:', error);
      
      // エラー時は最小限の安全なメッセージを送信
      try {
        await channel.send({
          content: `⚠️ ${user?.username || 'ユーザー'}の目標進捗データの取得中にエラーが発生しました。管理者にお知らせください。`
        });
      } catch (fallbackError) {
        console.error('フォールバック送信エラー:', fallbackError);
      }
    }
  }

// EmbedBuilderを使わずに直接オブジェクトを作成する新しいメソッド
createGoalsProgressEmbedData(user, goals, currentStats, progressAnalysis, reportType) {
    try {
      console.log('📊 Embed直接生成開始:', { user: user.username, reportType });

      // データ検証とデフォルト値設定
      if (!goals) goals = { weekly: {}, monthly: {} };
      if (!currentStats) currentStats = { weekly: {}, monthly: {} };
      if (!progressAnalysis) progressAnalysis = { today: {}, streak: 0 };

      let title, description, color, footer;
      
      // reportType による分岐（必ず description を設定）
      switch (reportType) {
        case 'weekly_start':
          title = `🌅 ${user.username}さんの週次目標 - 新しい週のスタート！`;
          description = '新しい週が始まりました！今週の目標達成に向けて頑張りましょう💪';
          color = 3066993; // 0x2ecc71
          footer = '今週も一歩ずつ、着実に前進していきましょう！';
          break;
        case 'weekly_mid':
          title = `📊 ${user.username}さんの目標進捗 - 週の中間チェック`;
          description = '週の半ばです！目標達成状況を確認して、必要に応じて調整しましょう🎯';
          color = 3447003; // 0x3498db
          footer = '週末まであと少し！ラストスパートをかけましょう！';
          break;
        default:
          title = `📈 ${user.username}さんの目標進捗レポート`;
          description = '現在の目標達成状況をお知らせします';
          color = 10181046; // 0x9b59b6
          footer = '継続は力なり！素晴らしい取り組みですね！';
      }

      // 必須フィールドの最終チェック
      if (!title || title.trim() === '') {
        title = '📈 目標進捗レポート';
      }
      if (!description || description.trim() === '') {
        description = '目標進捗を確認しています...';
      }
      if (!footer || footer.trim() === '') {
        footer = '目標達成に向けて頑張りましょう！';
      }

      // 直接Embedオブジェクトを作成
      const embedData = {
        title: title,
        description: description,
        color: color,
        timestamp: new Date().toISOString(),
        thumbnail: {
          url: user.displayAvatarURL()
        },
        footer: {
          text: footer,
          icon_url: user.client.user.displayAvatarURL()
        },
        fields: []
      };

      // 目標データの存在確認
      const hasWeeklyGoals = goals.weekly && Object.keys(goals.weekly).length > 0;
      const hasMonthlyGoals = goals.monthly && Object.keys(goals.monthly).length > 0;

      // 週次目標の追加
      if (hasWeeklyGoals) {
        try {
          const weeklyText = this.formatGoalSection(goals.weekly, currentStats.weekly || {});
          if (weeklyText && weeklyText.trim() !== '' && weeklyText.length <= 1024) {
            embedData.fields.push({
              name: '📅 週次目標の進捗',
              value: weeklyText,
              inline: false
            });
          }
        } catch (error) {
          console.error('週次目標フォーマットエラー:', error);
          embedData.fields.push({
            name: '📅 週次目標の進捗',
            value: '週次目標データの処理中にエラーが発生しました',
            inline: false
          });
        }
      }

      // 月次目標の追加
      if (hasMonthlyGoals) {
        try {
          const monthlyText = this.formatGoalSection(goals.monthly, currentStats.monthly || {});
          if (monthlyText && monthlyText.trim() !== '' && monthlyText.length <= 1024) {
            embedData.fields.push({
              name: '🗓️ 月次目標の進捗',
              value: monthlyText,
              inline: false
            });
          }
        } catch (error) {
          console.error('月次目標フォーマットエラー:', error);
          embedData.fields.push({
            name: '🗓️ 月次目標の進捗',
            value: '月次目標データの処理中にエラーが発生しました',
            inline: false
          });
        }
      }

      // 目標が設定されていない場合
      if (!hasWeeklyGoals && !hasMonthlyGoals) {
        embedData.fields.push({
          name: '🎯 目標設定',
          value: '目標が設定されていません。`/goals set` コマンドで目標を設定してみましょう！',
          inline: false
        });
      }

      // 今日の実績（安全な処理）
      if (progressAnalysis && progressAnalysis.today) {
        try {
          const today = progressAnalysis.today;
          const todayEntries = Object.entries(today).filter(([_, count]) => count > 0);
          
          if (todayEntries.length > 0) {
            const todayText = todayEntries
              .map(([category, count]) => {
                const emoji = this.getCategoryEmoji(category);
                const name = this.getCategoryName(category);
                return `${emoji} ${name}: ${count}件`;
              })
              .join('\n');
            
            if (todayText.length <= 1024) {
              embedData.fields.push({
                name: '🎯 今日の実績',
                value: todayText,
                inline: true
              });
            }
          }
        } catch (error) {
          console.error('今日の実績処理エラー:', error);
        }
      }

      // ストリーク情報（安全な処理）
      if (progressAnalysis && typeof progressAnalysis.streak === 'number' && progressAnalysis.streak > 0) {
        embedData.fields.push({
          name: '🔥 継続ストリーク',
          value: `${progressAnalysis.streak}日間継続中！`,
          inline: true
        });
      }

      // アドバイス（安全な処理）
      try {
        const advice = this.generateGoalsAdvice(goals, currentStats, reportType);
        if (advice && advice.trim() !== '' && advice.length <= 1024) {
          embedData.fields.push({
            name: '💡 アドバイス',
            value: advice,
            inline: false
          });
        }
      } catch (error) {
        console.error('アドバイス生成エラー:', error);
      }

      // 最終検証 - 必須フィールドが確実に存在することを確認
      if (!embedData.description || embedData.description.trim() === '') {
        console.error('⚠️ 最終検証でdescriptionが空でした');
        embedData.description = '目標進捗データを処理中です...';
      }

      if (!embedData.title || embedData.title.trim() === '') {
        embedData.title = '📈 目標進捗レポート';
      }

      console.log('📊 最終的なEmbed情報:', {
        title: embedData.title,
        description: embedData.description,
        fieldsCount: embedData.fields?.length || 0,
        color: embedData.color,
        hasDescription: !!embedData.description,
        descriptionLength: embedData.description?.length || 0
      });

      return embedData;
    } catch (error) {
      console.error('目標進捗Embed生成エラー:', error);
      
      // 最もシンプルなフォールバックEmbed
      return {
        title: '⚠️ 目標進捗レポート',
        description: '目標進捗データの取得中にエラーが発生しました。しばらくしてから再度お試しください。',
        color: 16711680, // 0xff0000
        timestamp: new Date().toISOString(),
        fields: []
      };
    }
  }

  async sendWeeklyGoalsFinalCheck() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const goalService = require('./goalService');
      const activeUsers = this.getActiveGoalUsers();
      
      for (const userId of activeUsers) {
        const [goals, currentStats] = await Promise.all([
          goalService.getGoals(userId),
          goalService.getCurrentProgress(userId)
        ]);

        const underPerformingGoals = this.findUnderPerformingGoals(goals.weekly, currentStats.weekly);
        
        if (underPerformingGoals.length > 0) {
          const user = await this.client.users.fetch(userId);
          await this.sendWeekendRushNotification(channel, user, underPerformingGoals);
        }
      }
    } catch (error) {
      console.error('週次目標最終チェックエラー:', error);
    }
  }

  async sendStreakReport() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const goalService = require('./goalService');
      const activeUsers = this.getActiveGoalUsers();
      const streakData = [];

      for (const userId of activeUsers) {
        try {
          const user = await this.client.users.fetch(userId);
          const analysis = await goalService.getProgressAnalysis(userId);
          
          if (analysis.streak > 0) {
            streakData.push({
              user: user.username,
              streak: analysis.streak
            });
          }
        } catch (error) {
          console.error(`ユーザー ${userId} のストリーク取得エラー:`, error);
        }
      }

      if (streakData.length === 0) return;

      streakData.sort((a, b) => b.streak - a.streak);

      const embed = new EmbedBuilder()
        .setColor('#FF6B35')
        .setTitle('🔥 今週の継続ストリークランキング')
        .setDescription('継続は力なり！皆さんの素晴らしい継続力をご紹介します✨')
        .setTimestamp();

      const rankingText = streakData.map((data, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
        return `${medal} **${data.user}**: ${data.streak}日継続`;
      }).join('\n');

      embed.addFields({
        name: '🏆 継続ランキング',
        value: rankingText,
        inline: false
      });

      if (streakData[0].streak >= 7) {
        embed.addFields({
          name: '🌟 特別表彰',
          value: `${streakData[0].user}さん、${streakData[0].streak}日継続おめでとうございます！🎉\n素晴らしい継続力です！`,
          inline: false
        });
      }

      embed.setFooter({ text: '継続している皆さん、本当に素晴らしいです！' });

      await channel.send({ embeds: [embed] });
      console.log('🔥 ストリークレポートを送信しました');
    } catch (error) {
      console.error('ストリークレポート送信エラー:', error);
    }
  }

  async sendGoalsAdjustmentSuggestion() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setTitle('🎯 月中目標見直しのご提案')
        .setDescription('月の半ばです。目標の進捗を確認して、必要に応じて調整してみませんか？')
        .setColor('#FFA500')
        .addFields(
          {
            name: '💡 見直しのポイント',
            value: [
              '📊 現在の進捗率を確認',
              '🎯 現実的な目標値に調整',
              '📈 新しいカテゴリの追加検討',
              '⚖️ バランスの取れた目標設定'
            ].join('\n'),
            inline: false
          },
          {
            name: '🔧 調整コマンド',
            value: '`/goals set weekly [カテゴリ] [目標数]` で週次目標を調整\n`/goals set monthly [カテゴリ] [目標数]` で月次目標を調整',
            inline: false
          }
        )
        .setFooter({ text: '適切な目標設定で持続可能な成長を！' })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      console.log('🎯 目標調整提案を送信しました');
    } catch (error) {
      console.error('目標調整提案送信エラー:', error);
    }
  }

  // =====================================
  // 📊 統計・分析通知メソッド
  // =====================================

  async sendMonthlyStatsSummary() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const [bookCounts, movieCounts, activityCounts, monthlyStats] = await Promise.all([
        this.googleSheets.getBookCounts(),
        this.googleSheets.getMovieCounts(),
        this.googleSheets.getActivityCounts(),
        this.googleSheets.getMonthlyStats()
      ]);

      const totalItems = bookCounts.total + movieCounts.total + activityCounts.total;
      const completedItems = bookCounts.finished + movieCounts.watched + activityCounts.done;
      const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      const embed = new EmbedBuilder()
        .setTitle('📊 月初統計サマリー - 全体状況確認')
        .setColor('#3498DB')
        .setDescription(`現在 **${totalItems}** 件のアイテムを管理中 | 完了率 **${completionRate}%**`)
        .addFields(
          { 
            name: '📚 本の管理状況', 
            value: `🛒 買いたい: **${bookCounts.wantToBuy || 0}**冊\n📋 積読: **${bookCounts.wantToRead || 0}**冊\n📖 読書中: **${bookCounts.reading}**冊\n✅ 読了: **${bookCounts.finished}**冊`, 
            inline: true 
          },
          { 
            name: '🎬 映画の管理状況', 
            value: `🍿 観たい: **${movieCounts.wantToWatch}**本\n✅ 視聴済み: **${movieCounts.watched}**本\n😅 見逃し: **${movieCounts.missed || 0}**本`, 
            inline: true 
          },
          { 
            name: '🎯 活動の管理状況', 
            value: `🎯 予定中: **${activityCounts.planned}**件\n✅ 完了: **${activityCounts.done}**件\n😅 スキップ: **${activityCounts.skipped || 0}**件`, 
            inline: true 
          }
        )
        .setTimestamp();

      try {
        const previousMonthStats = await this.statsUtil.getMonthlyStatsForDate(this.statsUtil.getPreviousMonth(1));
        if (previousMonthStats) {
          const thisMonthTotal = monthlyStats.finishedBooks + monthlyStats.watchedMovies + monthlyStats.completedActivities;
          const prevMonthTotal = previousMonthStats.finishedBooks + previousMonthStats.watchedMovies + previousMonthStats.completedActivities;
          const changeIndicator = this.statsUtil.getChangeIndicator(thisMonthTotal, prevMonthTotal);
          
          embed.addFields({
            name: '📈 前月比較',
            value: `今月: ${thisMonthTotal}件 | 前月: ${prevMonthTotal}件 | 変化: ${changeIndicator}`,
            inline: false
          });
        }
      } catch (error) {
        console.error('前月比較エラー:', error);
      }

      const monthlyGoal = this.suggestMonthlyGoal(monthlyStats, completionRate);
      if (monthlyGoal) {
        embed.addFields({
          name: '🎯 今月の推奨目標',
          value: monthlyGoal,
          inline: false
        });
      }

      embed.setFooter({ text: '月初の振り返りと目標設定で、より充実した1ヶ月にしましょう！' });

      await channel.send({ embeds: [embed] });
      console.log('📊 月初統計サマリーを送信しました');

    } catch (error) {
      console.error('月初統計サマリー送信エラー:', error);
    }
  }

  async sendMonthlyTrendsAnalysis() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const [monthlyStats, weeklyStats, reports, detailedTrends] = await Promise.all([
        this.googleSheets.getMonthlyStats(),
        this.googleSheets.getWeeklyStats(),
        this.googleSheets.getRecentReports(30),
        this.statsUtil.calculateDetailedTrends()
      ]);

      const activityLevel = this.analyzeDetailedActivityLevel(reports);
      const predictions = this.generateMonthlyPredictions(monthlyStats, weeklyStats);

      const embed = new EmbedBuilder()
        .setTitle('📈 月中トレンド分析 - パフォーマンス診断')
        .setColor('#FF5722')
        .setDescription('今月の活動パターンと傾向を詳しく分析しました')
        .addFields(
          { 
            name: '📊 今月のペース分析', 
            value: detailedTrends.paceAnalysis,
            inline: false 
          },
          { 
            name: '🔥 活動レベル評価', 
            value: activityLevel.description,
            inline: true 
          },
          { 
            name: '📅 最も活発な曜日', 
            value: detailedTrends.mostActiveDay,
            inline: true 
          },
          {
            name: '🎯 カテゴリ別傾向',
            value: detailedTrends.categoryTrends,
            inline: false
          },
          {
            name: '🔮 月末予測',
            value: predictions.endOfMonthForecast,
            inline: false
          }
        )
        .setFooter({ text: 'データに基づいた分析で、より効率的な活動を！' })
        .setTimestamp();

      const improvements = this.generateImprovementSuggestions(detailedTrends, activityLevel);
      if (improvements.length > 0) {
        embed.addFields({
          name: '💡 改善提案',
          value: improvements.join('\n'),
          inline: false
        });
      }

      await channel.send({ embeds: [embed] });
      console.log('📈 月中トレンド分析を送信しました');

    } catch (error) {
      console.error('月中トレンド分析送信エラー:', error);
    }
  }

  async sendMonthlyBooksStatistics() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      console.log('📚 月末読書・アニメ統計送信開始...');

      const [bookCounts, monthlyStats, bookTitles, animeStats, monthlyAnimeCompleted, monthlyAnimeEpisodes] = await Promise.all([
        this.googleSheets.getBookCounts(),
        this.googleSheets.getMonthlyStats(),
        this.googleSheets.getMonthlyBookTitles(),
        this.googleSheets.getAnimeCounts(),
        this.calculateMonthlyAnimeCompleted(),
        this.calculateMonthlyAnimeEpisodes()
      ]);

      console.log('📊 取得データ確認:', { 
        bookCounts, 
        monthlyStats, 
        bookTitlesCount: bookTitles.length,
        animeStats,
        monthlyAnimeCompleted,
        monthlyAnimeEpisodes
      });

      // 読書分析を自前で計算
      const readingAnalysis = this.calculateReadingAnalysisLocal(bookCounts, monthlyStats);
      const readingPace = this.evaluateReadingPace(monthlyStats.finishedBooks);
      
      // アニメ分析を計算
      const animeAnalysis = this.calculateAnimeAnalysisLocal(animeStats, monthlyAnimeCompleted, monthlyAnimeEpisodes);
      const animePace = this.evaluateAnimePace(monthlyAnimeCompleted, monthlyAnimeEpisodes);

      const embed = new EmbedBuilder()
        .setTitle('📚📺 月末エンターテイメント統計 - 読書・アニメ活動詳細レポート')
        .setColor('#E74C3C')
        .setDescription(`今月は **${monthlyStats.finishedBooks}** 冊の本と **${monthlyAnimeCompleted}** 本のアニメを完了しました！`)
        .addFields(
          { 
            name: '📊 読書ステータス分析', 
            value: `🛒 買いたい: **${bookCounts.wantToBuy || 0}**冊 (${readingAnalysis.wishlistPercentage}%)\n📋 積読: **${bookCounts.wantToRead || 0}**冊 (${readingAnalysis.backlogPercentage}%)\n📖 読書中: **${bookCounts.reading}**冊\n✅ 読了: **${bookCounts.finished}**冊 (${readingAnalysis.completionPercentage}%)`, 
            inline: true 
          },
          { 
            name: '📺 アニメステータス分析', 
            value: `🍿 観たい: **${animeStats.wantToWatch}**本 (${animeAnalysis.wishlistPercentage}%)\n📺 視聴中: **${animeStats.watching}**本 (${animeAnalysis.watchingPercentage}%)\n✅ 完走: **${animeStats.completed}**本 (${animeAnalysis.completionPercentage}%)\n💔 中断: **${animeStats.dropped}**本`, 
            inline: true 
          },
          { 
            name: '⚡ 読書ペース評価', 
            value: `${readingPace.icon} **${readingPace.level}**\n${readingPace.comment}`,
            inline: true 
          },
          { 
            name: '🚀 アニメペース評価', 
            value: `${animePace.icon} **${animePace.level}**\n${animePace.comment}`,
            inline: true 
          },
          {
            name: '📈 読書効率指標',
            value: `完読率: **${readingAnalysis.completionRate}%**\n積読消化率: **${readingAnalysis.backlogClearanceRate}%**\n月間ペース: **${readingAnalysis.monthlyPace}**冊/月`,
            inline: true
          },
          {
            name: '🎯 アニメ効率指標',
            value: `完走率: **${animeAnalysis.completionRate}%**\n月間視聴話数: **${monthlyAnimeEpisodes}**話\n平均話数/日: **${Math.round(monthlyAnimeEpisodes/30)}**話`,
            inline: true
          }
        )
        .setTimestamp();

      // 読了した本一覧
      if (bookTitles && bookTitles.length > 0) {
        const displayTitles = bookTitles.slice(0, 8);
        const moreTitles = bookTitles.length - 8;
        
        let titlesList = displayTitles.map((title, index) => `${index + 1}. ${title}`).join('\n');
        if (moreTitles > 0) {
          titlesList += `\n... 他${moreTitles}冊`;
        }
        
        embed.addFields({ 
          name: '🏆 今月読了した本一覧', 
          value: titlesList, 
          inline: false 
        });
      }

      // 完走したアニメ一覧
      const completedAnimes = await this.getMonthlyCompletedAnimes();
      if (completedAnimes.length > 0) {
        const displayAnimes = completedAnimes.slice(0, 8);
        const moreAnimes = completedAnimes.length - 8;
        
        let animesList = displayAnimes.map((anime, index) => 
          `${index + 1}. ${anime.title} (${anime.total_episodes}話)`
        ).join('\n');
        if (moreAnimes > 0) {
          animesList += `\n... 他${moreAnimes}本`;
        }
        
        embed.addFields({ 
          name: '🎉 今月完走したアニメ一覧', 
          value: animesList, 
          inline: false 
        });
      }

      const nextMonthGoal = this.suggestEntertainmentGoal(monthlyStats.finishedBooks, bookCounts.wantToRead, monthlyAnimeCompleted, animeStats.watching);
      if (nextMonthGoal) {
        embed.addFields({
          name: '🎯 来月のエンターテイメント目標提案',
          value: nextMonthGoal,
          inline: false
        });
      }

      embed.setFooter({ text: '読書もアニメも心の栄養です！来月も素敵な作品との出会いを！' });

      await channel.send({ embeds: [embed] });
      console.log('📚📺 月末読書・アニメ統計を送信しました');

    } catch (error) {
      console.error('月末読書・アニメ統計送信エラー:', error);
    }
  }

  /**
   * アニメ分析を計算（ローカル実装）
   */
  calculateAnimeAnalysisLocal(animeStats, monthlyCompleted, monthlyEpisodes) {
    const total = animeStats.total || 0;
    
    if (total === 0) {
      return {
        wishlistPercentage: 0,
        watchingPercentage: 0,
        completionPercentage: 0,
        completionRate: 0,
        monthlyPace: 0
      };
    }
    
    const wishlistPercentage = Math.round((animeStats.wantToWatch / total) * 100);
    const watchingPercentage = Math.round((animeStats.watching / total) * 100);
    const completionPercentage = Math.round((animeStats.completed / total) * 100);
    const completionRate = total > 0 ? Math.round((animeStats.completed / total) * 100) : 0;
    const monthlyPace = monthlyCompleted || 0;
    
    return {
      wishlistPercentage,
      watchingPercentage,
      completionPercentage,
      completionRate,
      monthlyPace
    };
  }

  /**
   * アニメ視聴ペースを評価
   */
  evaluateAnimePace(monthlyCompleted, monthlyEpisodes) {
    if (monthlyCompleted >= 6) {
      return { icon: '🚀', level: '超高速ペース', comment: `月${monthlyCompleted}本完走！驚異的な視聴量です！` };
    } else if (monthlyCompleted >= 3) {
      return { icon: '⚡', level: '高速ペース', comment: `月${monthlyCompleted}本完走！素晴らしいペースです！` };
    } else if (monthlyCompleted >= 1) {
      return { icon: '📈', level: '標準ペース', comment: `月${monthlyCompleted}本完走！良いペースを保っています！` };
    } else if (monthlyEpisodes >= 20) {
      return { icon: '📺', level: '話数重視', comment: `月${monthlyEpisodes}話視聴！継続視聴が素晴らしい！` };
    } else if (monthlyEpisodes >= 10) {
      return { icon: '🌱', level: '安定ペース', comment: `月${monthlyEpisodes}話視聴！継続が大切です！` };
    } else {
      return { icon: '🌱', level: 'スタート', comment: 'まずは月1本の完走を目指してみませんか？' };
    }
  }

  /**
   * エンターテイメント目標を提案
   */
  suggestEntertainmentGoal(finishedBooks, backlogBooks, completedAnimes, watchingAnimes) {
    const suggestions = [];
    
    // 読書目標
    if (finishedBooks < 1) {
      suggestions.push('📚 まずは月1冊の読了を目指してみましょう');
    } else if (finishedBooks < 2) {
      suggestions.push('📚 月2冊読了を目指して、読書習慣を強化しませんか');
    } else if (backlogBooks > 10) {
      suggestions.push('📚 積読本が多いので、新規購入を控えて消化に集中しませんか');
    } else if (finishedBooks >= 4) {
      suggestions.push('📚 素晴らしいペース！このまま継続して年間50冊を目指しませんか');
    }
    
    // アニメ目標
    if (completedAnimes < 1) {
      suggestions.push('📺 まずは月1本のアニメ完走を目指してみましょう');
    } else if (completedAnimes < 2) {
      suggestions.push('📺 月2本完走にチャレンジしてみませんか');
    } else if (watchingAnimes > 5) {
      suggestions.push('📺 視聴中のアニメが多いので、完走に集中しませんか');
    } else if (completedAnimes >= 3) {
      suggestions.push('📺 素晴らしいペース！月3-4本完走を継続しましょう');
    }
    
    // バランス提案
    if (finishedBooks > 0 && completedAnimes > 0) {
      suggestions.push('⚖️ 読書とアニメのバランスが取れていて素晴らしいです');
    } else if (finishedBooks > completedAnimes * 2) {
      suggestions.push('🎯 読書が充実！アニメも少し増やしてリフレッシュしませんか');
    } else if (completedAnimes > finishedBooks * 2) {
      suggestions.push('🎯 アニメが充実！読書も少し増やして知識を深めませんか');
    }
    
    return suggestions.slice(0, 3).join('\n• ');
  }

  // =====================================
  // 🎯 目標管理関連のアニメ対応拡張
  // =====================================

  /**
   * 目標進捗フォーマット（アニメ対応版）
   */
  formatGoalSectionWithAnime(goals, currentStats) {
    try {
      if (!goals || Object.keys(goals).length === 0) {
        return '目標が設定されていません';
      }
      
      if (!currentStats) {
        currentStats = {};
      }
      
      const sections = Object.entries(goals)
        .map(([category, target]) => {
          try {
            const current = currentStats[category] || 0;
            const percentage = Math.min(Math.round((current / target) * 100), 100);
            const progressBar = this.getProgressBar(percentage);
            const emoji = this.getCategoryEmojiWithAnime(category);
            const name = this.getCategoryNameWithAnime(category);
            
            let status = '';
            if (percentage >= 100) status = '✅';
            else if (percentage >= 75) status = '🔥';
            else if (percentage >= 50) status = '📈';
            else if (percentage >= 25) status = '🚀';
            else status = '📍';

            return `${status} ${emoji} **${name}**: ${progressBar} **${current}/${target}** (${percentage}%)`;
          } catch (error) {
            console.error(`カテゴリ ${category} の処理エラー:`, error);
            return `❓ ${category}: データ処理エラー`;
          }
        })
        .filter(section => section && section.trim() !== '');
      
      const result = sections.join('\n');
      return result || '目標データを取得できませんでした';
    } catch (error) {
      console.error('formatGoalSectionWithAnime エラー:', error);
      return '目標データの処理中にエラーが発生しました';
    }
  }

  /**
   * カテゴリ絵文字取得（アニメ対応版）
   */
  getCategoryEmojiWithAnime(category) {
    const emojis = {
      books: '📚',
      movies: '🎬',
      animes: '📺',
      episodes: '📺',
      activities: '🎯',
      reports: '📝'
    };
    return emojis[category] || '❓';
  }

  /**
   * カテゴリ名取得（アニメ対応版）
   */
  getCategoryNameWithAnime(category) {
    const names = {
      books: '本',
      movies: '映画',
      animes: 'アニメ',
      episodes: '話数',
      activities: '活動',
      reports: '日報'
    };
    return names[category] || category;
  }

  /**
   * アニメを含む目標アドバイス生成
   */
  generateGoalsAdviceWithAnime(goals, currentStats, reportType) {
    const advice = [];
    
    if (reportType === 'weekly_start') {
      advice.push('🌟 新しい週の始まりです！読書、アニメ、活動をバランスよく楽しみましょう。');
      
      const hasGoals = Object.keys(goals.weekly || {}).length > 0;
      if (hasGoals) {
        advice.push('📝 先週の反省を活かして、今週はさらに良い結果を目指しましょう！');
        
        // アニメ特有のアドバイス
        if (goals.weekly.animes || goals.weekly.episodes) {
          advice.push('📺 アニメは無理せず、楽しめる範囲で視聴しましょう。質も大切です！');
        }
      }
    } else if (reportType === 'weekly_mid') {
      const weeklyProgress = Object.entries(goals.weekly || {}).map(([category, target]) => {
        const current = currentStats.weekly?.[category] || 0;
        return (current / target) * 100;
      });
      
      const avgProgress = weeklyProgress.length > 0 ? 
        weeklyProgress.reduce((sum, p) => sum + p, 0) / weeklyProgress.length : 0;
      
      if (avgProgress >= 60) {
        advice.push('🎉 素晴らしい進捗です！読書もアニメも順調ですね！');
      } else if (avgProgress >= 30) {
        advice.push('📈 順調に進んでいます。週末に向けて少しペースを上げてみませんか？');
      } else {
        advice.push('⚡ 週の後半です！アニメ1話、本1章でも進歩です。頑張りましょう！');
      }
      
      // アニメ特有のアドバイス
      if (goals.weekly.episodes && currentStats.weekly?.episodes < (goals.weekly.episodes * 0.5)) {
        advice.push('📺 アニメ視聴が少し遅れていますね。短い話数から始めてみませんか？');
      }
    }
    
    return advice.join('\n\n');
  }

/**
 * 読書分析を計算（ローカル実装）
 */
calculateReadingAnalysisLocal(bookCounts, monthlyStats) {
  const total = bookCounts.total || 0;
  
  if (total === 0) {
    return {
      wishlistPercentage: 0,
      backlogPercentage: 0,
      completionPercentage: 0,
      completionRate: 0,
      backlogClearanceRate: 0,
      monthlyPace: 0
    };
  }
  
  const wishlistPercentage = Math.round((bookCounts.wantToBuy / total) * 100);
  const backlogPercentage = Math.round((bookCounts.wantToRead / total) * 100);
  const completionPercentage = Math.round((bookCounts.finished / total) * 100);
  
  const completionRate = total > 0 ? Math.round((bookCounts.finished / total) * 100) : 0;
  const backlogClearanceRate = bookCounts.wantToRead > 0 ? Math.round((monthlyStats.finishedBooks / bookCounts.wantToRead) * 100) : 0;
  const monthlyPace = monthlyStats.finishedBooks || 0;
  
  return {
    wishlistPercentage,
    backlogPercentage, 
    completionPercentage,
    completionRate,
    backlogClearanceRate,
    monthlyPace
  };
}

  async sendEnhancedMonthlyComparison() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const [thisMonth, lastMonth, twoMonthsAgo] = await Promise.all([
        this.googleSheets.getMonthlyStats(),
        this.statsUtil.getMonthlyStatsForDate(this.statsUtil.getPreviousMonth(1)),
        this.statsUtil.getMonthlyStatsForDate(this.statsUtil.getPreviousMonth(2))
      ]);

      const embed = new EmbedBuilder()
        .setTitle('📊 月次比較レポート - 3ヶ月間の成長分析')
        .setColor('#9C27B0')
        .setDescription('過去3ヶ月の活動量推移と成長パターンを分析しました')
        .setTimestamp();

      const monthNames = this.statsUtil.getLastThreeMonthNames();
      embed.addFields({
        name: '📈 3ヶ月間の推移',
        value: this.statsUtil.formatThreeMonthComparison(twoMonthsAgo, lastMonth, thisMonth, monthNames),
        inline: false
      });

      const categoryComparison = this.generateCategoryComparison(twoMonthsAgo, lastMonth, thisMonth);
      embed.addFields(categoryComparison);

      const growthAnalysis = this.statsUtil.calculateGrowthRates(twoMonthsAgo, lastMonth, thisMonth);
      embed.addFields({
        name: '📊 成長率分析',
        value: growthAnalysis.summary,
        inline: false
      });

      const trendPrediction = this.predictNextMonthTrend(twoMonthsAgo, lastMonth, thisMonth);
      embed.addFields({
        name: '🔮 来月の予測',
        value: trendPrediction,
        inline: false
      });

      const performance = this.evaluateOverallPerformance(growthAnalysis);
      embed.addFields({
        name: '🏆 総合評価',
        value: `${performance.grade} **${performance.level}**\n${performance.comment}`,
        inline: false
      });

      embed.setFooter({ text: '継続的な記録により、より正確な分析が可能になります！' });

      await channel.send({ embeds: [embed] });
      console.log('📊 完全版月次比較レポートを送信しました');

    } catch (error) {
      console.error('月次比較レポート送信エラー:', error);
    }
  }

  async sendQuarterlyReport() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const quarterlyData = await this.getQuarterlyStats();
      const quarterName = this.getCurrentQuarterName();

      const embed = new EmbedBuilder()
        .setTitle(`🏆 ${quarterName}四半期レポート - 総括と振り返り`)
        .setColor('#FFD700')
        .setDescription(`${quarterName}も大変お疲れ様でした！3ヶ月間の成果をご報告します✨`)
        .addFields(
          {
            name: '📊 四半期総計',
            value: `📚 読了: **${quarterlyData.totalBooks}**冊\n🎬 視聴: **${quarterlyData.totalMovies}**本\n🎯 完了: **${quarterlyData.totalActivities}**件\n📝 記録: **${quarterlyData.totalReports}**件`,
            inline: true
          },
          {
            name: '🎯 四半期ハイライト',
            value: quarterlyData.highlights.join('\n'),
            inline: false
          },
          {
            name: '📈 四半期成長',
            value: quarterlyData.growthSummary,
            inline: false
          }
        )
        .setFooter({ text: `素晴らしい${quarterName}でした！次の四半期もよろしくお願いします🎉` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      console.log(`🏆 ${quarterName}四半期レポートを送信しました`);

    } catch (error) {
      console.error('四半期レポート送信エラー:', error);
    }
  }

  // =====================================
  // 🛒 ウィッシュリスト・記事管理通知メソッド
  // =====================================

  async sendMonthlyWishlist() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const wishlistBooks = await this.googleSheets.getWishlistBooks();

      const embed = new EmbedBuilder()
        .setColor(wishlistBooks.length > 0 ? '#FF9800' : '#FFC107')
        .setTimestamp();

      if (wishlistBooks.length > 0) {
        embed
          .setTitle('🛒 月初の買いたい本リスト')
          .setDescription('新しい月が始まりました！気になっていた本を購入してみませんか？📚✨')
          .addFields({
            name: `📋 買いたい本一覧 (${wishlistBooks.length}冊)`,
            value: wishlistBooks.slice(0, 10).join('\n'),
            inline: false
          })
          .setFooter({ text: '購入したら /book buy [ID] で積読リストに移動できます' });

        if (wishlistBooks.length > 10) {
          embed.setDescription(embed.data.description + `\n\n💡 他${wishlistBooks.length - 10}冊の本がリストにあります`);
        }
      } else {
        embed
          .setTitle('🛒 買いたい本リスト')
          .setDescription('現在、買いたい本リストは空です。\n新しい本を探してみませんか？📚')
          .addFields({
            name: '📚 本を追加', 
            value: '`/book add [タイトル] [作者] want_to_buy` で買いたい本を追加できます',
            inline: false
          });
      }

      await channel.send({ embeds: [embed] });
      console.log('🛒 月初買いたい本リスト通知を送信しました');

    } catch (error) {
      console.error('買いたい本リスト通知送信エラー:', error);
    }
  }

  async sendMonthlyWishlistReminder() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const [pendingItems, recentlyBought] = await Promise.all([
        this.googleSheets.getPendingWishlistItems?.() || [],
        this.googleSheets.getRecentlyBoughtItems?.(30) || []
      ]);

      const embed = new EmbedBuilder()
        .setTitle('🛒 月次ウィッシュリスト通知')
        .setDescription('買いたいものリストの確認時間です！💳')
        .setColor('#E91E63')
        .setTimestamp();

      if (pendingItems.length > 0) {
        const highPriorityItems = pendingItems.filter(item => 
          item.includes('高') || item.includes('urgent')).slice(0, 3);
        const mediumPriorityItems = pendingItems.filter(item => 
          !item.includes('高') && !item.includes('低')).slice(0, 5);
        
        if (highPriorityItems.length > 0) {
          embed.addFields({
            name: '🔴 高優先度アイテム',
            value: highPriorityItems.join('\n'),
            inline: false
          });
        }

        if (mediumPriorityItems.length > 0) {
          embed.addFields({
            name: '🟡 注目アイテム',
            value: mediumPriorityItems.join('\n'),
            inline: false
          });
        }

        const totalPending = pendingItems.length;
        const estimatedBudget = await this.calculateEstimatedBudget(pendingItems);
        
        embed.addFields(
          { name: '📊 未購入アイテム', value: `${totalPending}個`, inline: true },
          { name: '💰 推定予算', value: estimatedBudget ? `¥${estimatedBudget.toLocaleString()}` : '未設定', inline: true }
        );

        embed.addFields({
          name: '💡 今月のおすすめアクション',
          value: [
            '🎯 高優先度アイテムの購入検討',
            '💰 予算と価格の見直し',
            '🔗 価格比較・セール情報の確認',
            '📝 本当に必要かの再検討'
          ].join('\n'),
          inline: false
        });

      } else {
        embed.addFields({
          name: '✨ ウィッシュリストは空です',
          value: '新しい目標や欲しいものがあれば `/wishlist add` で追加してみましょう！',
          inline: false
        });
      }

      if (recentlyBought.length > 0) {
        embed.addFields({
          name: '🎉 先月の購入実績',
          value: `${recentlyBought.length}個のアイテムを購入しました！\n${recentlyBought.slice(0, 3).join('\n')}`,
          inline: false
        });
      }

      embed.setFooter({ text: '計画的なお買い物で賢く生活しましょう！' });

      await channel.send({ embeds: [embed] });
      console.log('🛒 月次ウィッシュリストリマインダーを送信しました');

    } catch (error) {
      console.error('月次ウィッシュリストリマインダー送信エラー:', error);
    }
  }

  async sendWeeklyArticleReminder() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const [pendingArticles, recentlyRead] = await Promise.all([
        this.googleSheets.getPendingArticles?.() || [],
        this.googleSheets.getRecentlyReadArticles?.(7) || []
      ]);

      const embed = new EmbedBuilder()
        .setTitle('📰 週次記事リマインダー')
        .setDescription('読みたい記事の確認時間です！📚')
        .setColor('#2196F3')
        .setTimestamp();

      if (pendingArticles.length > 0) {
        const highPriorityArticles = pendingArticles.filter(article => 
          article.includes('高') || article.includes('urgent')).slice(0, 3);
        const techArticles = pendingArticles.filter(article => 
          article.includes('tech') || article.includes('技術')).slice(0, 3);
        const businessArticles = pendingArticles.filter(article => 
          article.includes('business') || article.includes('ビジネス')).slice(0, 3);
        
        if (highPriorityArticles.length > 0) {
          embed.addFields({
            name: '🔴 優先度の高い記事',
            value: highPriorityArticles.join('\n'),
            inline: false
          });
        }

        if (techArticles.length > 0) {
          embed.addFields({
            name: '💻 技術記事',
            value: techArticles.join('\n'),
            inline: false
          });
        }

        if (businessArticles.length > 0) {
          embed.addFields({
            name: '💼 ビジネス記事',
            value: businessArticles.join('\n'),
            inline: false
          });
        }

        const totalPending = pendingArticles.length;
        const estimatedReadingTime = totalPending * 5;
        
        embed.addFields(
          { name: '📊 未読記事', value: `${totalPending}記事`, inline: true },
          { name: '⏱️ 推定読書時間', value: `約${estimatedReadingTime}分`, inline: true }
        );

        const weekendRecommendations = pendingArticles
          .filter(article => 
            article.includes('lifestyle') || 
            article.includes('general') ||
            article.includes('ライフスタイル')
          ).slice(0, 3);

        if (weekendRecommendations.length > 0) {
          embed.addFields({
            name: '🌟 週末のおすすめ記事',
            value: weekendRecommendations.join('\n'),
            inline: false
          });
        }

        embed.addFields({
          name: '💡 効率的な読書のコツ',
          value: [
            '📱 移動時間を活用しよう',
            '🎯 カテゴリごとにまとめ読み',
            '📝 重要なポイントはメモに',
            '⭐ 読了後は評価をつけよう'
          ].join('\n'),
          inline: false
        });

      } else {
        embed.addFields({
          name: '✨ 未読記事はありません',
          value: '新しい記事を見つけたら `/article add` で追加してみましょう！',
          inline: false
        });
      }

      if (recentlyRead.length > 0) {
        embed.addFields({
          name: '🎉 今週の読書実績',
          value: `${recentlyRead.length}記事を読了しました！\n${recentlyRead.slice(0, 3).join('\n')}`,
          inline: false
        });

        const weeklyLevel = this.calculateWeeklyReadingLevel(recentlyRead.length);
        embed.addFields({
          name: '📈 今週の読書レベル',
          value: `${weeklyLevel.icon} ${weeklyLevel.name}\n${weeklyLevel.description}`,
          inline: false
        });
      }

      embed.setFooter({ text: '継続的な学習で知識を深めていきましょう！' });

      await channel.send({ embeds: [embed] });
      console.log('📰 週次記事リマインダーを送信しました');

    } catch (error) {
      console.error('週次記事リマインダー送信エラー:', error);
    }
  }

  async sendMonthlySummaryReport() {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const [monthlyPurchases, monthlyReads, pendingWishlist, pendingArticles] = await Promise.all([
        this.googleSheets.getMonthlyPurchases?.() || [],
        this.googleSheets.getMonthlyReads?.() || [],
        this.googleSheets.getPendingWishlistItems?.() || [],
        this.googleSheets.getPendingArticles?.() || []
      ]);

      const embed = new EmbedBuilder()
        .setTitle('📈 月次アクティビティサマリー')
        .setDescription('今月の購入・読書活動の振り返りです！')
        .setColor('#9C27B0')
        .setTimestamp();

      if (monthlyPurchases.length > 0) {
        const totalSpent = await this.calculateTotalSpent(monthlyPurchases);
        embed.addFields({
          name: '🛒 今月の購入実績',
          value: `${monthlyPurchases.length}個購入\n${totalSpent ? `総額: ¥${totalSpent.toLocaleString()}` : ''}`,
          inline: true
        });
      }

      if (monthlyReads.length > 0) {
        const avgRating = await this.calculateAverageRating(monthlyReads);
        embed.addFields({
          name: '📚 今月の読書実績',
          value: `${monthlyReads.length}記事読了\n${avgRating ? `平均評価: ${'⭐'.repeat(Math.round(avgRating))}` : ''}`,
          inline: true
        });
      }

      const totalPending = pendingWishlist.length + pendingArticles.length;
      embed.addFields({
        name: '📋 未完了アイテム',
        value: `買いたいもの: ${pendingWishlist.length}個\n読みたい記事: ${pendingArticles.length}記事`,
        inline: true
      });

      embed.addFields({
        name: '🎯 来月への提案',
        value: [
          pendingWishlist.length > 10 ? '🛒 ウィッシュリストの整理を検討' : '🛒 新しい目標アイテムの追加',
          pendingArticles.length > 15 ? '📰 記事の優先度見直しを推奨' : '📰 新しい分野の記事探索',
          '📊 予算と学習時間の最適化',
          '🎉 達成した目標の振り返り'
        ].join('\n'),
        inline: false
      });

      embed.setFooter({ text: '継続的な改善で理想の習慣を作り上げましょう！' });

      await channel.send({ embeds: [embed] });
      console.log('📈 月次サマリーレポートを送信しました');

    } catch (error) {
      console.error('月次サマリーレポート送信エラー:', error);
    }
  }

  // =====================================
  // 🎯 目標関連ヘルパーメソッド
  // =====================================

  formatGoalSection(goals, currentStats) {
    try {
      if (!goals || Object.keys(goals).length === 0) {
        return '目標が設定されていません';
      }
      
      if (!currentStats) {
        currentStats = {};
      }
      
      const sections = Object.entries(goals)
        .map(([category, target]) => {
          try {
            const current = currentStats[category] || 0;
            const percentage = Math.min(Math.round((current / target) * 100), 100);
            const progressBar = this.getProgressBar(percentage);
            const emoji = this.getCategoryEmoji(category);
            const name = this.getCategoryName(category);
            
            let status = '';
            if (percentage >= 100) status = '✅';
            else if (percentage >= 75) status = '🔥';
            else if (percentage >= 50) status = '📈';
            else if (percentage >= 25) status = '🚀';
            else status = '📍';

            return `${status} ${emoji} **${name}**: ${progressBar} **${current}/${target}** (${percentage}%)`;
          } catch (error) {
            console.error(`カテゴリ ${category} の処理エラー:`, error);
            return `❓ ${category}: データ処理エラー`;
          }
        })
        .filter(section => section && section.trim() !== '');
      
      const result = sections.join('\n');
      return result || '目標データを取得できませんでした';
    } catch (error) {
      console.error('formatGoalSection エラー:', error);
      return '目標データの処理中にエラーが発生しました';
    }
  }
  getProgressBar(percentage, length = 10) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    
    return `${filledBar}${emptyBar}`;
  }

  getCategoryEmoji(category) {
    const emojis = {
      books: '📚',
      movies: '🎬',
      activities: '🎯',
      reports: '📝'
    };
    return emojis[category] || '❓';
  }

  getCategoryName(category) {
    const names = {
      books: '本',
      movies: '映画',
      activities: '活動',
      reports: '日報'
    };
    return names[category] || category;
  }

  generateGoalsAdvice(goals, currentStats, reportType) {
    const advice = [];
    
    if (reportType === 'weekly_start') {
      advice.push('🌟 新しい週の始まりです！小さな一歩から始めて、着実に目標に近づきましょう。');
      
      const hasGoals = Object.keys(goals.weekly || {}).length > 0;
      if (hasGoals) {
        advice.push('📝 先週の反省を活かして、今週はさらに良い結果を目指しましょう！');
      }
    } else if (reportType === 'weekly_mid') {
      const weeklyProgress = Object.entries(goals.weekly || {}).map(([category, target]) => {
        const current = currentStats.weekly[category] || 0;
        return (current / target) * 100;
      });
      
      const avgProgress = weeklyProgress.length > 0 ? 
        weeklyProgress.reduce((sum, p) => sum + p, 0) / weeklyProgress.length : 0;
      
      if (avgProgress >= 60) {
        advice.push('🎉 素晴らしい進捗です！この調子で週末まで頑張りましょう！');
      } else if (avgProgress >= 30) {
        advice.push('📈 順調に進んでいます。週末に向けてペースを上げてみませんか？');
      } else {
        advice.push('⚡ 週の後半です！まだ挽回のチャンスはあります。頑張りましょう！');
      }
    }
    
    return advice.join('\n\n');
  }

  getActiveGoalUsers() {
    const users = process.env.GOALS_NOTIFICATION_USERS?.split(',') || [];
    return users.map(id => id.trim()).filter(id => id);
  }

  findUnderPerformingGoals(weeklyGoals, currentStats) {
    const underPerforming = [];
    
    for (const [category, target] of Object.entries(weeklyGoals || {})) {
      const current = currentStats[category] || 0;
      const percentage = (current / target) * 100;
      
      if (percentage < 75 && (target - current) <= 3) {
        underPerforming.push({
          category,
          target,
          current,
          percentage: Math.round(percentage)
        });
      }
    }
    
    return underPerforming;
  }

  async sendWeekendRushNotification(channel, user, underPerformingGoals) {
    const embed = new EmbedBuilder()
      .setColor('#FF9800')
      .setTitle(`⚡ ${user.username}さん、週末ラッシュのお時間です！`)
      .setDescription('週の終わりが近づいています。まだ達成できそうな目標がありますよ！💪')
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    const goalsList = underPerformingGoals.map(goal => {
      const emoji = this.getCategoryEmoji(goal.category);
      const name = this.getCategoryName(goal.category);
      const remaining = goal.target - goal.current;
      return `${emoji} **${name}**: あと${remaining}件で達成！ (現在${goal.percentage}%)`;
    }).join('\n');

    embed.addFields({
      name: '🎯 達成可能な目標',
      value: goalsList,
      inline: false
    });

    embed.addFields({
      name: '💡 週末のアドバイス',
      value: '無理せず、できる範囲で挑戦してみてください。小さな進歩も立派な成果です！',
      inline: false
    });

    embed.setFooter({ text: '週末も素敵な時間をお過ごしください！' });

    await channel.send({ embeds: [embed] });
  }

  // =====================================
  // 📊 統計・分析ヘルパーメソッド
  // =====================================

  calculateMonthlyLevel(totalCompleted) {
    if (totalCompleted >= 30) {
      return { icon: '🏆', name: '超人レベル', description: '驚異的な達成率です！' };
    } else if (totalCompleted >= 20) {
      return { icon: '🌟', name: 'エキスパート', description: '素晴らしい継続力です！' };
    } else if (totalCompleted >= 15) {
      return { icon: '⭐', name: 'アクティブ', description: '順調にペースを保っています！' };
    } else if (totalCompleted >= 10) {
      return { icon: '🔥', name: 'モチベート', description: '良いペースで進んでいます！' };
    } else if (totalCompleted >= 5) {
      return { icon: '💪', name: 'チャレンジャー', description: 'もう少しペースアップできそうです！' };
    } else {
      return { icon: '🌱', name: 'スタート', description: '継続が成功の鍵です！' };
    }
  }

  suggestMonthlyGoal(monthlyStats, completionRate) {
    const totalCompleted = (monthlyStats.finishedBooks || 0) + (monthlyStats.watchedMovies || 0) + (monthlyStats.completedActivities || 0);
    
    if (totalCompleted < 5) {
      return '🎯 今月は月10件の完了を目指してみませんか？';
    } else if (totalCompleted < 15) {
      return '📈 今月は月20件完了にチャレンジしてみましょう！';
    } else if (completionRate < 70) {
      return '📚 新規追加よりも既存アイテムの完了に集中しませんか？';
    } else {
      return '🏆 素晴らしいペース！この調子で継続しましょう！';
    }
  }

  analyzeDetailedActivityLevel(reports) {
    const recentReports = reports.slice(0, 7);
    const weeklyCount = recentReports.length;
    const avgDaily = weeklyCount / 7;
    
    if (avgDaily >= 2) {
      return { 
        level: '🔥 超活発', 
        description: `週${weeklyCount}件記録中！平均${avgDaily.toFixed(1)}件/日の素晴らしいペース！` 
      };
    } else if (avgDaily >= 1) {
      return { 
        level: '⚡ 活発', 
        description: `週${weeklyCount}件記録！平均${avgDaily.toFixed(1)}件/日の良いペース！` 
      };
    } else if (weeklyCount >= 3) {
      return { 
        level: '💪 普通', 
        description: `週${weeklyCount}件記録。安定したペースです！` 
      };
    } else {
      return { 
        level: '😴 低調', 
        description: `週${weeklyCount}件記録。もう少しペースアップしませんか？` 
      };
    }
  }

  generateMonthlyPredictions(monthlyStats, weeklyStats) {
    const currentTotal = (monthlyStats.finishedBooks || 0) + (monthlyStats.watchedMovies || 0) + (monthlyStats.completedActivities || 0);
    const weeklyTotal = (weeklyStats.finishedBooks || 0) + (weeklyStats.watchedMovies || 0) + (weeklyStats.completedActivities || 0);
    
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const remainingWeeks = Math.ceil((endOfMonth - today) / (7 * 24 * 60 * 60 * 1000));
    
    const projectedTotal = currentTotal + (weeklyTotal * remainingWeeks);
    
    let forecast;
    if (projectedTotal >= 25) {
      forecast = `🚀 月末予測: 約**${projectedTotal}件**完了！驚異的なペースです！`;
    } else if (projectedTotal >= 15) {
      forecast = `📈 月末予測: 約**${projectedTotal}件**完了！素晴らしいペース！`;
    } else if (projectedTotal >= 10) {
      forecast = `⭐ 月末予測: 約**${projectedTotal}件**完了！順調です！`;
    } else {
      forecast = `🌱 月末予測: 約**${projectedTotal}件**完了！継続していきましょう！`;
    }
    
    return { endOfMonthForecast: forecast };
  }

  generateImprovementSuggestions(detailedTrends, activityLevel) {
    const suggestions = [];
    
    if (activityLevel.level.includes('😴')) {
      suggestions.push('📅 毎日少しずつでも記録を心がけてみませんか？');
      suggestions.push('🎯 小さな目標から始めて習慣化を図りましょう！');
    } else if (activityLevel.level.includes('💪')) {
      suggestions.push('⚡ もう一歩踏み込んで、1日1件以上を目指してみませんか？');
    } else if (activityLevel.level.includes('🔥')) {
      suggestions.push('🏆 素晴らしいペース！この調子で継続しましょう！');
    }
    
    if (detailedTrends.categoryTrends && detailedTrends.categoryTrends.includes('📚 0%')) {
      suggestions.push('📚 読書活動も取り入れてみませんか？');
    }
    if (detailedTrends.categoryTrends && detailedTrends.categoryTrends.includes('🎬 0%')) {
      suggestions.push('🎬 映画鑑賞でリフレッシュも大切です！');
    }
    if (detailedTrends.categoryTrends && detailedTrends.categoryTrends.includes('🎯 0%')) {
      suggestions.push('🎯 新しい活動にチャレンジしてみませんか？');
    }
    
    return suggestions.slice(0, 3);
  }

  generateCategoryComparison(twoMonthsAgo, lastMonth, thisMonth) {
    const categories = [
      { key: 'finishedBooks', name: '📚 読書', emoji: '📚' },
      { key: 'watchedMovies', name: '🎬 映画', emoji: '🎬' },
      { key: 'completedActivities', name: '🎯 活動', emoji: '🎯' }
    ];
    
    return {
      name: '🎯 カテゴリ別3ヶ月比較',
      value: categories.map(category => {
        const thisValue = thisMonth?.[category.key] || 0;
        const lastValue = lastMonth?.[category.key] || 0;
        const twoMonthsValue = twoMonthsAgo?.[category.key] || 0;
        
        const trend = thisValue > lastValue ? '📈' : thisValue < lastValue ? '📉' : '➡️';
        
        return `${category.emoji} **${category.name}**: ${twoMonthsValue} → ${lastValue} → ${thisValue} ${trend}`;
      }).join('\n'),
      inline: false
    };
  }

  predictNextMonthTrend(twoMonthsAgo, lastMonth, thisMonth) {
    const trends = [thisMonth, lastMonth, twoMonthsAgo].map(month => 
      (month?.finishedBooks || 0) + (month?.watchedMovies || 0) + (month?.completedActivities || 0)
    );
    
    const avgGrowth = ((trends[0] - trends[1]) + (trends[1] - trends[2])) / 2;
    const prediction = Math.max(0, Math.round(trends[0] + avgGrowth));
    
    if (avgGrowth > 5) {
      return `🚀 来月は約 **${prediction}件** の完了が期待されます！成長トレンド継続中！`;
    } else if (avgGrowth > 0) {
      return `📈 来月は約 **${prediction}件** の完了予測。順調な成長です！`;
    } else {
      return `➡️ 来月は約 **${prediction}件** の完了予測。安定したペースを保っています。`;
    }
  }

  evaluateOverallPerformance(growthAnalysis) {
    const { monthlyGrowth = 0, quarterlyGrowth = 0 } = growthAnalysis || {};
    
    if (monthlyGrowth >= 20 && quarterlyGrowth >= 50) {
      return { grade: '🏆', level: 'エクセレント', comment: '驚異的な成長率です！素晴らしい継続力ですね！' };
    } else if (monthlyGrowth >= 10 && quarterlyGrowth >= 25) {
      return { grade: '🌟', level: 'アドバンス', comment: '高い成長率を維持しています！この調子で頑張りましょう！' };
    } else if (monthlyGrowth >= 0 && quarterlyGrowth >= 0) {
      return { grade: '📈', level: 'ステディ', comment: '安定した成長を続けています！継続は力なりですね！' };
    } else {
      return { grade: '🔄', level: 'アジャスト', comment: '調整期間かもしれません。無理せず自分のペースで！' };
    }
  }

  // =====================================
  // 📚 読書関連ヘルパーメソッド
  // =====================================

  evaluateReadingPace(monthlyBooks) {
    if (monthlyBooks >= 8) {
      return { icon: '🚀', level: '超高速ペース', comment: '月8冊以上！驚異的な読書量です！' };
    } else if (monthlyBooks >= 4) {
      return { icon: '⚡', level: '高速ペース', comment: '月4冊以上！素晴らしいペースです！' };
    } else if (monthlyBooks >= 2) {
      return { icon: '📈', level: '標準ペース', comment: '月2冊以上！良いペースを保っています！' };
    } else if (monthlyBooks >= 1) {
      return { icon: '📚', level: '安定ペース', comment: '月1冊！継続が大切です！' };
    } else {
      return { icon: '🌱', level: 'スタート', comment: 'まずは月1冊を目標にしてみませんか？' };
    }
  }

  suggestReadingGoal(currentMonthly, backlogCount) {
    if (currentMonthly < 1) {
      return '📋 まずは月1冊の読了を目指してみましょう！';
    } else if (currentMonthly < 2) {
      return '📚 月2冊読了を目指して、読書習慣を強化しませんか？';
    } else if (backlogCount > 10) {
      return '📖 積読本が多いので、新規購入を控えて消化に集中しませんか？';
    } else if (currentMonthly >= 4) {
      return '🏆 素晴らしいペース！このまま継続して年間50冊を目指しませんか？';
    } else {
      return '⭐ 月3冊読了にチャレンジしてみませんか？';
    }
  }

  calculateWeeklyReadingLevel(articlesRead) {
    if (articlesRead >= 10) {
      return { icon: '🚀', name: '読書マスター', description: '週10記事以上！驚異的な学習量です！' };
    } else if (articlesRead >= 7) {
      return { icon: '⚡', name: '読書エキスパート', description: '毎日1記事ペース！素晴らしい継続力です！' };
    } else if (articlesRead >= 5) {
      return { icon: '📈', name: '読書アクティブ', description: '週5記事！良いペースを保っています！' };
    } else if (articlesRead >= 3) {
      return { icon: '📚', name: '読書ステディ', description: '週3記事！安定した学習習慣ですね！' };
    } else if (articlesRead >= 1) {
      return { icon: '🌱', name: '読書スタート', description: '継続が一番大切です！' };
    } else {
      return { icon: '😴', name: '読書休憩中', description: '来週は記事読書にチャレンジしてみませんか？' };
    }
  }

  // =====================================
  // 🛒 ウィッシュリスト関連ヘルパーメソッド
  // =====================================

  async calculateEstimatedBudget(pendingItems) {
    try {
      let totalBudget = 0;
      for (const item of pendingItems) {
        const priceMatch = item.match(/¥([\d,]+)/);
        if (priceMatch) {
          const price = parseInt(priceMatch[1].replace(/,/g, ''));
          totalBudget += price;
        }
      }
      return totalBudget > 0 ? totalBudget : null;
    } catch (error) {
      console.error('予算計算エラー:', error);
      return null;
    }
  }

  async calculateTotalSpent(purchases) {
    let total = 0;
    for (const purchase of purchases) {
      const priceMatch = purchase.match(/¥([\d,]+)/);
      if (priceMatch) {
        total += parseInt(priceMatch[1].replace(/,/g, ''));
      }
    }
    return total;
  }

  async calculateAverageRating(reads) {
    const ratings = reads
      .map(read => {
        const ratingMatch = read.match(/⭐{1,5}/);
        return ratingMatch ? ratingMatch[0].length : null;
      })
      .filter(rating => rating !== null);
    
    return ratings.length > 0 ? ratings.reduce((a, b) => a + b) / ratings.length : null;
  }

  // =====================================
  // 🏆 四半期関連ヘルパーメソッド
  // =====================================

  async getQuarterlyStats() {
    try {
      const monthlyStats = await this.googleSheets.getMonthlyStats();
      const totalBooks = (monthlyStats.finishedBooks || 0) * 3;
      const totalMovies = (monthlyStats.watchedMovies || 0) * 3;
      const totalActivities = (monthlyStats.completedActivities || 0) * 3;
      const totalReports = (monthlyStats.reports || 0) * 3;
      
      return {
        totalBooks,
        totalMovies,
        totalActivities,
        totalReports,
        highlights: [
          '📚 継続的な読書習慣が定着',
          '🎬 エンターテイメントも楽しみながら',
          '🎯 多様な活動にチャレンジ',
          '📝 記録の習慣化が成功'
        ],
        growthSummary: '前四半期比で着実な成長を見せています！'
      };
    } catch (error) {
      console.error('四半期データ取得エラー:', error);
      return {
        totalBooks: 0,
        totalMovies: 0,
        totalActivities: 0,
        totalReports: 0,
        highlights: ['データ取得中です'],
        growthSummary: 'データを蓄積中です'
      };
    }
  }

  getCurrentQuarterName() {
    const month = new Date().getMonth() + 1;
    if (month <= 3) return '第1';
    if (month <= 6) return '第2';
    if (month <= 9) return '第3';
    return '第4';
  }

  // =====================================
  // 🎉 ボーナス通知メソッド
  // =====================================

  async sendGoalAchievementNotification(userId, goalType, category, target) {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return;

      const user = await this.client.users.fetch(userId);
      if (!user) return;

      const categoryEmoji = this.getCategoryEmoji(category);
      const categoryName = this.getCategoryName(category);
      const periodName = goalType === 'weekly' ? '週次' : '月次';

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`🎉 目標達成おめでとうございます！`)
        .setDescription(`${user.username}さんが${periodName}目標を達成しました！`)
        .setThumbnail(user.displayAvatarURL())
        .addFields({
          name: '🏆 達成した目標',
          value: `${categoryEmoji} **${categoryName}**: ${target}件`,
          inline: false
        })
        .addFields({
          name: '🌟 素晴らしい成果',
          value: 'この調子で他の目標も達成していきましょう！継続は力なりです💪',
          inline: false
        })
        .setFooter({ text: '目標達成、本当におめでとうございます！' })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      console.log(`🎉 ${user.username} の目標達成通知を送信しました`);
    } catch (error) {
      console.error('目標達成通知送信エラー:', error);
    }
  }

  // =====================================
  // 🔧 カスタム通知・管理メソッド
  // =====================================

  async sendCustomNotification(title, description, fields = []) {
    try {
      const channel = this.getNotificationChannel();
      if (!channel) return false;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor('#00BCD4')
        .setTimestamp();

      if (fields.length > 0) {
        embed.addFields(...fields);
      }

      await channel.send({ embeds: [embed] });
      return true;
    } catch (error) {
      console.error('カスタム通知送信エラー:', error);
      return false;
    }
  }


// =====================================
  // 🧪 テスト機能
  // =====================================

  /**
   * テストコマンドのハンドリング
   */
  async handleTestCommand(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      await interaction.deferReply({ ephemeral: true });

      switch (subcommand) {
        case 'single':
          await this.handleSingleNotificationTest(interaction);
          break;
        case 'category':
          await this.handleCategoryTest(interaction);
          break;
        case 'all':
          await this.handleAllNotificationTest(interaction);
          break;
        default:
          await interaction.editReply('❌ 無効なサブコマンドです。');
      }
    } catch (error) {
      console.error('テストコマンドエラー:', error);
      await interaction.editReply('❌ テスト実行中にエラーが発生しました。');
    }
  }

  /**
   * 個別通知テスト
   */
  async handleSingleNotificationTest(interaction) {
    const notificationType = interaction.options.getString('notification');
    
    const testMethods = {
      'morning_greeting': () => this.sendMorningGreeting(),
      'daily_report_reminder': () => this.sendDailyReportReminder(),
      'weekly_report': () => this.sendWeeklyReport(),
      'monthly_report': () => this.sendMonthlyReport(),
      'abandoned_items_check': () => this.checkAbandonedItems(),
      'goals_weekly_start': () => this.sendGoalsProgressReport('weekly_start'),
      'goals_weekly_mid': () => this.sendGoalsProgressReport('weekly_mid'),
      'weekly_goals_final': () => this.sendWeeklyGoalsFinalCheck(),
      'streak_report': () => this.sendStreakReport(),
      'goals_adjustment': () => this.sendGoalsAdjustmentSuggestion(),
      'monthly_stats_summary': () => this.sendMonthlyStatsSummary(),
      'monthly_trends_analysis': () => this.sendMonthlyTrendsAnalysis(),
      'monthly_books_stats': () => this.sendMonthlyBooksStatistics(),
      'monthly_comparison': () => this.sendEnhancedMonthlyComparison(),
      'monthly_wishlist': () => this.sendMonthlyWishlist(),
      'monthly_wishlist_reminder': () => this.sendMonthlyWishlistReminder(),
      'weekly_article_reminder': () => this.sendWeeklyArticleReminder(),
      'monthly_summary_report': () => this.sendMonthlySummaryReport(),
      'quarterly_report': () => this.sendQuarterlyReport()
    };

    const testMethod = testMethods[notificationType];
    
    if (!testMethod) {
      await interaction.editReply(`❌ 通知タイプ "${notificationType}" が見つかりません。`);
      return;
    }

    try {
      console.log(`🧪 通知テスト実行: ${notificationType}`);
      await testMethod();
      await interaction.editReply(`✅ "${notificationType}" 通知のテストが完了しました！`);
    } catch (error) {
      console.error(`テスト実行エラー (${notificationType}):`, error);
      await interaction.editReply(`❌ "${notificationType}" 通知のテストに失敗しました: ${error.message}`);
    }
  }

  /**
   * カテゴリ別テスト
   */
  async handleCategoryTest(interaction) {
    const category = interaction.options.getString('category');
    
    const categoryTests = {
      'basic': [
        { name: '朝の挨拶', method: () => this.sendMorningGreeting() },
        { name: '日報リマインダー', method: () => this.sendDailyReportReminder() },
        { name: '週次レポート', method: () => this.sendWeeklyReport() },
        { name: '月次レポート', method: () => this.sendMonthlyReport() }
      ],
      'stats': [
        { name: '月初統計サマリー', method: () => this.sendMonthlyStatsSummary() },
        { name: '月中トレンド分析', method: () => this.sendMonthlyTrendsAnalysis() },
        { name: '月末読書統計', method: () => this.sendMonthlyBooksStatistics() },
        { name: '月次比較レポート', method: () => this.sendEnhancedMonthlyComparison() }
      ],
      'goals': [
        { name: '週初目標レポート', method: () => this.sendGoalsProgressReport('weekly_start') },
        { name: '週中目標レポート', method: () => this.sendGoalsProgressReport('weekly_mid') },
        { name: '週末目標チェック', method: () => this.sendWeeklyGoalsFinalCheck() },
        { name: 'ストリークレポート', method: () => this.sendStreakReport() },
        { name: '目標調整提案', method: () => this.sendGoalsAdjustmentSuggestion() }
      ],
      'reminders': [
        { name: '放置アイテムチェック', method: () => this.checkAbandonedItems() },
        { name: '月次ウィッシュリスト', method: () => this.sendMonthlyWishlist() },
        { name: 'ウィッシュリストリマインダー', method: () => this.sendMonthlyWishlistReminder() },
        { name: '週次記事リマインダー', method: () => this.sendWeeklyArticleReminder() },
        { name: '月次サマリーレポート', method: () => this.sendMonthlySummaryReport() }
      ]
    };

    const tests = categoryTests[category];
    
    if (!tests) {
      await interaction.editReply(`❌ カテゴリ "${category}" が見つかりません。`);
      return;
    }

    await interaction.editReply(`🧪 "${category}" カテゴリのテストを開始します...`);

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const test of tests) {
      try {
        console.log(`🧪 実行中: ${test.name}`);
        await test.method();
        successCount++;
        results.push(`✅ ${test.name}`);
        // 通知間の間隔を設ける
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        failCount++;
        results.push(`❌ ${test.name}: ${error.message}`);
        console.error(`${test.name} テストエラー:`, error);
      }
    }

    const finalMessage = [
      `📊 **${category}** カテゴリテスト完了`,
      `成功: ${successCount}件 | 失敗: ${failCount}件`,
      '',
      '**結果詳細:**',
      ...results
    ].join('\n');

    await interaction.editReply(finalMessage);
  }

  /**
   * 全通知テスト
   */
  async handleAllNotificationTest(interaction) {
    await interaction.editReply('🚀 全通知システムのテストを開始します...\n⚠️ この処理には数分かかる場合があります。');

    const allTests = [
      // 基本通知
      { name: '朝の挨拶', method: () => this.sendMorningGreeting(), category: '基本' },
      { name: '日報リマインダー', method: () => this.sendDailyReportReminder(), category: '基本' },
      { name: '週次レポート', method: () => this.sendWeeklyReport(), category: '基本' },
      { name: '月次レポート', method: () => this.sendMonthlyReport(), category: '基本' },
      
      // 統計通知
      { name: '月初統計サマリー', method: () => this.sendMonthlyStatsSummary(), category: '統計' },
      { name: '月中トレンド分析', method: () => this.sendMonthlyTrendsAnalysis(), category: '統計' },
      { name: '月末読書統計', method: () => this.sendMonthlyBooksStatistics(), category: '統計' },
      { name: '月次比較レポート', method: () => this.sendEnhancedMonthlyComparison(), category: '統計' },
      
      // 目標管理通知
      { name: '週初目標レポート', method: () => this.sendGoalsProgressReport('weekly_start'), category: '目標' },
      { name: '週中目標レポート', method: () => this.sendGoalsProgressReport('weekly_mid'), category: '目標' },
      { name: '週末目標チェック', method: () => this.sendWeeklyGoalsFinalCheck(), category: '目標' },
      { name: 'ストリークレポート', method: () => this.sendStreakReport(), category: '目標' },
      { name: '目標調整提案', method: () => this.sendGoalsAdjustmentSuggestion(), category: '目標' },
      
      // リマインダー通知
      { name: '放置アイテムチェック', method: () => this.checkAbandonedItems(), category: 'リマインダー' },
      { name: '月次ウィッシュリスト', method: () => this.sendMonthlyWishlist(), category: 'リマインダー' },
      { name: 'ウィッシュリストリマインダー', method: () => this.sendMonthlyWishlistReminder(), category: 'リマインダー' },
      { name: '週次記事リマインダー', method: () => this.sendWeeklyArticleReminder(), category: 'リマインダー' },
      { name: '月次サマリーレポート', method: () => this.sendMonthlySummaryReport(), category: 'リマインダー' },
      
      // 特別レポート
      { name: '四半期レポート', method: () => this.sendQuarterlyReport(), category: '特別' }
    ];

    let successCount = 0;
    let failCount = 0;
    const categoryResults = {};

    for (const test of allTests) {
      try {
        console.log(`🧪 実行中: ${test.name} (${test.category})`);
        await test.method();
        successCount++;
        
        if (!categoryResults[test.category]) {
          categoryResults[test.category] = { success: 0, fail: 0, details: [] };
        }
        categoryResults[test.category].success++;
        categoryResults[test.category].details.push(`✅ ${test.name}`);
        
        // 通知間の間隔を設ける（サーバー負荷軽減）
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        failCount++;
        
        if (!categoryResults[test.category]) {
          categoryResults[test.category] = { success: 0, fail: 0, details: [] };
        }
        categoryResults[test.category].fail++;
        categoryResults[test.category].details.push(`❌ ${test.name}: ${error.message.substring(0, 50)}...`);
        
        console.error(`${test.name} テストエラー:`, error);
      }
    }

    // 結果レポートの生成
    const totalTests = allTests.length;
    const successRate = Math.round((successCount / totalTests) * 100);
    
    let finalReport = [
      '🏁 **全通知システムテスト完了**',
      `📊 総合結果: ${successCount}/${totalTests} (${successRate}%)`,
      `✅ 成功: ${successCount}件 | ❌ 失敗: ${failCount}件`,
      '',
      '📋 **カテゴリ別結果:**'
    ];

    for (const [category, result] of Object.entries(categoryResults)) {
      const categoryRate = Math.round((result.success / (result.success + result.fail)) * 100);
      finalReport.push(`**${category}**: ${result.success}/${result.success + result.fail} (${categoryRate}%)`);
    }

    finalReport.push('');
    finalReport.push('💡 詳細なログはコンソールで確認できます。');
    
    if (failCount > 0) {
      finalReport.push('⚠️ 失敗した通知については、Google Sheets接続や環境設定を確認してください。');
    } else {
      finalReport.push('🎉 すべての通知が正常に動作しています！');
    }

    await interaction.editReply(finalReport.join('\n'));
  }

  /**
   * テスト用のモックデータ生成
   */
  generateMockData() {
    return {
      books: [
        { id: 1, title: 'テスト本1', author: 'テスト作者1', status: 'reading' },
        { id: 2, title: 'テスト本2', author: 'テスト作者2', status: 'want_to_read' }
      ],
      movies: [
        { id: 1, title: 'テスト映画1', status: 'want_to_watch' },
        { id: 2, title: 'テスト映画2', status: 'watched' }
      ],
      activities: [
        { id: 1, content: 'テスト活動1', status: 'planned' },
        { id: 2, content: 'テスト活動2', status: 'done' }
      ],
      stats: {
        finishedBooks: 3,
        watchedMovies: 2,
        completedActivities: 5,
        reports: 10
      }
    };
  }

  /**
   * 通知システムの状態確認
   */
  async getSystemStatus() {
    const status = this.getStatus();
    const channelStatus = this.getNotificationChannel() ? '✅ 正常' : '❌ 未設定';
    const authStatus = this.googleSheets.auth ? '✅ 正常' : '❌ 未設定';
    
    return {
      notification: status,
      channel: channelStatus,
      googleSheets: authStatus,
      activeTasks: status.activeTasks,
      taskCount: status.taskCount
    };
  }

  /**
   * 緊急停止機能
   */
  async emergencyStop() {
    console.log('🚨 緊急停止実行...');
    this.stopAllNotifications();
    
    const channel = this.getNotificationChannel();
    if (channel) {
      await this.sendCustomNotification(
        '🛑 通知システム緊急停止',
        'すべての定期通知が停止されました。',
        [{ name: '停止時刻', value: new Date().toLocaleString('ja-JP'), inline: true }]
      );
    }
  }

  /**
   * システム再起動
   */
  async restartSystem() {
    console.log('🔄 通知システム再起動...');
    this.stopAllNotifications();
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.initializeScheduledNotifications();
    
    const channel = this.getNotificationChannel();
    if (channel) {
      await this.sendCustomNotification(
        '🔄 通知システム再起動完了',
        `${this.scheduledTasks.size}個の定期通知が再設定されました。`,
        [{ name: '再起動時刻', value: new Date().toLocaleString('ja-JP'), inline: true }]
      );
    }
  }

  stopAllNotifications() {
    console.log('🛑 すべての定期通知を停止中...');
    
    for (const [name, task] of this.scheduledTasks) {
      task.stop();
      console.log(`⏹️ ${name} を停止しました`);
    }
    
    this.scheduledTasks.clear();
    console.log('✅ すべての定期通知を停止しました');
  }

  getStatus() {
    const activeTasks = Array.from(this.scheduledTasks.keys());
    return {
      isActive: this.scheduledTasks.size > 0,
      taskCount: this.scheduledTasks.size,
      activeTasks,
      notificationChannel: this.getNotificationChannel()?.name || 'なし'
    };
  }
}

module.exports = NotificationService;
