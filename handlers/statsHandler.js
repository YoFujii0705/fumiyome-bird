// handlers/statsHandler.js - 修正版

const { EmbedBuilder } = require('discord.js');
const GoogleSheetsService = require('../services/googleSheets');
const StatsUtility = require('../services/statsUtility'); // 🆕 追加

// GoogleSheetsServiceのインスタンスを作成
const googleSheets = new GoogleSheetsService();
const statsUtil = new StatsUtility(googleSheets); // 🆕 追加

module.exports = {
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case 'summary':
          await module.exports.showSummary(interaction); // ← このように修正
          break;
        case 'weekly':
          await module.exports.showWeekly(interaction);
          break;
        case 'monthly':
          await module.exports.showMonthly(interaction);
          break;
        case 'books':
          await module.exports.showBooks(interaction);
          break;
        case 'current':
          await module.exports.showCurrent(interaction);
          break;
        case 'trends':
          await module.exports.showTrends(interaction);
          break;
        case 'goals':
          await module.exports.showGoals(interaction);
          break;
        case 'compare':
          await module.exports.showCompare(interaction);
          break;
        default:
          await interaction.editReply(`❌ 不明なサブコマンド: ${subcommand}`);
      }
    } catch (error) {
      console.error('StatsHandler エラー:', error);
      await interaction.editReply('❌ 統計情報の取得中にエラーが発生しました。');
    }
  },

  // 📊 全体統計サマリー
  async showSummary(interaction) {
    try {
      // 全ての統計データを並行取得
      const [bookCounts, movieCounts, activityCounts] = await Promise.all([
        googleSheets.getBookCounts(),
        googleSheets.getMovieCounts(),
        googleSheets.getActivityCounts()
      ]);
      
      const totalItems = bookCounts.total + movieCounts.total + activityCounts.total;
      const completedItems = bookCounts.finished + movieCounts.watched + activityCounts.done;
      const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      const embed = new EmbedBuilder()
        .setTitle('📊 全体統計サマリー')
        .setColor('#3498DB')
        .setDescription(`全体で **${totalItems}** 件のアイテムを管理中`)
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
      
      // 全体の完了率を表示
      if (totalItems > 0) {
        embed.addFields({
          name: '🏆 全体の達成状況',
          value: `完了率: **${completionRate}%** (${completedItems}/${totalItems})\n${module.exports.generateProgressBar(completionRate)}`,
          inline: false
        });
      }
      
      // 励ましのメッセージを追加
      const encouragementMessages = [
        '継続的な管理、素晴らしいですね！',
        'データが蓄積されてきています！',
        '目標に向かって着実に進んでいますね！',
        '記録する習慣が身についてきましたね！',
        'この調子で頑張りましょう！'
      ];
      
      const randomMessage = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
      embed.setFooter({ text: randomMessage });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('全体統計エラー:', error);
      await interaction.editReply('❌ 統計情報の取得中にエラーが発生しました。');
    }
  },

  // 📅 週次統計
  async showWeekly(interaction) {
    try {
      const weeklyStats = await googleSheets.getWeeklyStats();
      const recentReports = await googleSheets.getRecentReports(7);
      
      const totalCompleted = weeklyStats.finishedBooks + weeklyStats.watchedMovies + weeklyStats.completedActivities;
      
      const embed = new EmbedBuilder()
        .setTitle('📅 今週の活動統計')
        .setColor('#2ECC71')
        .setDescription(`今週は **${totalCompleted}** 件のアイテムを完了しました！`)
        .addFields(
          { name: '📚 読了した本', value: `**${weeklyStats.finishedBooks}**冊`, inline: true },
          { name: '🎬 視聴した映画', value: `**${weeklyStats.watchedMovies}**本`, inline: true },
          { name: '🎯 完了した活動', value: `**${weeklyStats.completedActivities}**件`, inline: true },
          { name: '📝 記録した日報', value: `**${recentReports.length}**件`, inline: true }
        )
        .setTimestamp();
      
      // 週次目標との比較（仮想的な目標設定）
      const weeklyGoals = {
        books: 2,
        movies: 3,
        activities: 5,
        reports: 7
      };
      
      const achievements = [];
      if (weeklyStats.finishedBooks >= weeklyGoals.books) achievements.push('📚 読書目標達成！');
      if (weeklyStats.watchedMovies >= weeklyGoals.movies) achievements.push('🎬 映画目標達成！');
      if (weeklyStats.completedActivities >= weeklyGoals.activities) achievements.push('🎯 活動目標達成！');
      if (recentReports.length >= weeklyGoals.reports) achievements.push('📝 日報目標達成！');
      
      if (achievements.length > 0) {
        embed.addFields({
          name: '🏆 今週の達成項目',
          value: achievements.join('\n'),
          inline: false
        });
      }
      
      // 曜日別の活動分析
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
      const today = new Date();
      const todayName = dayOfWeek[today.getDay()];
      
      embed.addFields({
        name: '📊 週次パフォーマンス',
        value: `今日は${todayName}曜日です\n平均: 1日${(totalCompleted / 7).toFixed(1)}件のペース`,
        inline: false
      });
      
      embed.setFooter({ text: '今週も充実した週になりましたね！来週も頑張りましょう！' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('週次統計エラー:', error);
      await interaction.editReply('❌ 週次統計の取得中にエラーが発生しました。');
    }
  },

  // 🗓️ 月次統計
  async showMonthly(interaction) {
    try {
      const [monthlyStats, bookTitles, recentReports] = await Promise.all([
        googleSheets.getMonthlyStats(),
        googleSheets.getMonthlyBookTitles(),
        googleSheets.getRecentReports(30)
      ]);
      
      const totalCompleted = monthlyStats.finishedBooks + monthlyStats.watchedMovies + monthlyStats.completedActivities;
      
      const embed = new EmbedBuilder()
        .setTitle('🗓️ 今月の活動統計')
        .setColor('#9B59B6')
        .setDescription(`今月は **${totalCompleted}** 件のアイテムを完了しました！`)
        .addFields(
          { name: '📚 読了冊数', value: `**${monthlyStats.finishedBooks}**冊`, inline: true },
          { name: '🎬 視聴本数', value: `**${monthlyStats.watchedMovies}**本`, inline: true },
          { name: '🎯 完了活動', value: `**${monthlyStats.completedActivities}**件`, inline: true },
          { name: '📝 日報件数', value: `**${recentReports.length}**件`, inline: true }
        )
        .setTimestamp();
      
      // 今月読了した本のリスト
      if (bookTitles && bookTitles.length > 0) {
        const displayTitles = bookTitles.slice(0, 8);
        const moreTitles = bookTitles.length - 8;
        
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
      
      // 月次の達成レベル評価
      const monthlyLevel = module.exports.calculateMonthlyLevel(totalCompleted);
      embed.addFields({
        name: '🌟 今月の活動レベル',
        value: `${monthlyLevel.icon} **${monthlyLevel.name}**\n${monthlyLevel.description}`,
        inline: false
      });
      
      // 来月への励ましメッセージ
      const currentDate = new Date();
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      const nextMonthName = nextMonth.toLocaleDateString('ja-JP', { month: 'long' });
      
      embed.setFooter({ text: `素晴らしい1ヶ月でした！${nextMonthName}も頑張りましょう！` });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('月次統計エラー:', error);
      await interaction.editReply('❌ 月次統計の取得中にエラーが発生しました。');
    }
  },

  // 📚 読書統計詳細
  async showBooks(interaction) {
    try {
      const [bookCounts, allStats] = await Promise.all([
        googleSheets.getBookCounts(),
        googleSheets.getAllStats()
      ]);
      
      // 読書ペースの計算
      const monthlyStats = await googleSheets.getMonthlyStats();
      const weeklyStats = await googleSheets.getWeeklyStats();
      
      const embed = new EmbedBuilder()
        .setTitle('📚 読書統計詳細')
        .setColor('#E74C3C')
        .setDescription(`全 **${bookCounts.total}** 冊の本を管理中`)
        .addFields(
          { 
            name: '📊 ステータス別統計', 
            value: `🛒 買いたい: **${bookCounts.wantToBuy || 0}**冊\n📋 積読: **${bookCounts.wantToRead || 0}**冊\n📖 読書中: **${bookCounts.reading}**冊\n✅ 読了: **${bookCounts.finished}**冊`, 
            inline: true 
          },
          { 
            name: '📅 期間別読了数', 
            value: `今月: **${monthlyStats.finishedBooks}**冊\n今週: **${weeklyStats.finishedBooks}**冊\n1日平均: **${(monthlyStats.finishedBooks / 30).toFixed(1)}**冊`, 
            inline: true 
          }
        )
        .setTimestamp();
      
      // 読書効率の分析
      const totalBooks = bookCounts.total;
      const completionRate = totalBooks > 0 ? Math.round((bookCounts.finished / totalBooks) * 100) : 0;
      
      embed.addFields({
        name: '📈 読書効率分析',
        value: `完読率: **${completionRate}%**\n${module.exports.generateProgressBar(completionRate)}\n積読消化率: **${module.exports.calculateBacklogRate(bookCounts)}%**`,
        inline: false
      });
      
      // 読書ペースの評価
      const readingPace = module.exports.evaluateReadingPace(monthlyStats.finishedBooks);
      embed.addFields({
        name: '⚡ 読書ペース評価',
        value: `${readingPace.icon} **${readingPace.level}**\n${readingPace.comment}`,
        inline: false
      });
      
      // 読書目標の提案
      const nextGoal = module.exports.suggestReadingGoal(monthlyStats.finishedBooks, bookCounts.wantToRead);
      if (nextGoal) {
        embed.addFields({
          name: '🎯 おすすめ目標',
          value: nextGoal,
          inline: false
        });
      }
      
      embed.setFooter({ text: '読書は知識の扉を開く鍵です！' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('読書統計エラー:', error);
      await interaction.editReply('❌ 読書統計の取得中にエラーが発生しました。');
    }
  },

  // ⚡ 現在の進行状況
  async showCurrent(interaction) {
    try {
      const currentProgress = await googleSheets.getCurrentProgress();
      
      const readingList = currentProgress.readingBooks.length > 0 
        ? currentProgress.readingBooks.map(book => `📖 [${book.id}] ${book.title}`).join('\n')
        : '現在読書中の本はありません';
      
      const movieList = currentProgress.wantToWatchMovies.length > 0
        ? currentProgress.wantToWatchMovies.slice(0, 8).map(movie => `🍿 [${movie.id}] ${movie.title}`).join('\n')
        : '観たい映画がありません';
      
      // 予定中の活動も取得
      const activities = await googleSheets.getActivities();
      const plannedActivities = activities.filter(activity => activity.includes('(planned)'));
      
      const activityList = plannedActivities.length > 0
        ? plannedActivities.slice(0, 8).map(activity => {
            const match = activity.match(/\[(\d+)\] (.+?) \(/);
            return match ? `🎯 [${match[1]}] ${match[2]}` : activity;
          }).join('\n')
        : '予定中の活動がありません';
      
      const embed = new EmbedBuilder()
        .setTitle('⚡ 現在の進行状況')
        .setColor('#F39C12')
        .setDescription('あなたの現在のアクティブなアイテム一覧')
        .addFields(
          { name: '📖 読書中の本', value: readingList, inline: false },
          { name: '🎬 観たい映画', value: movieList, inline: false },
          { name: '🎯 予定中の活動', value: activityList, inline: false }
        )
        .setTimestamp();
      
      // 進行状況のサマリー
      const totalInProgress = currentProgress.readingBooks.length + 
                             currentProgress.wantToWatchMovies.length + 
                             plannedActivities.length;
      
      if (totalInProgress > 0) {
        embed.addFields({
          name: '📊 進行中サマリー',
          value: `全体で **${totalInProgress}** 件のアイテムが進行中です`,
          inline: false
        });
        
        // 優先度の提案
        const suggestions = [];
        if (currentProgress.readingBooks.length > 0) {
          suggestions.push('📚 読書を進める');
        }
        if (currentProgress.wantToWatchMovies.length > 0) {
          suggestions.push('🎬 映画を観る');
        }
        if (plannedActivities.length > 0) {
          suggestions.push('🎯 活動を実行する');
        }
        
        if (suggestions.length > 0) {
          embed.addFields({
            name: '💡 今日のおすすめアクション',
            value: suggestions.join('、') + 'のいずれかに取り組んでみませんか？',
            inline: false
          });
        }
      } else {
        embed.setDescription('現在進行中のアイテムがありません。新しい目標を設定してみませんか？');
        embed.addFields({
          name: '🚀 新しく始めませんか？',
          value: '• `/book add` - 新しい本を追加\n• `/movie add` - 観たい映画を追加\n• `/activity add` - 新しい活動を追加',
          inline: false
        });
      }
      
      embed.setFooter({ text: '今日も一歩ずつ前進していきましょう！' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('進行状況エラー:', error);
      await interaction.editReply('❌ 進行状況の取得中にエラーが発生しました。');
    }
  },

  // 🎯 目標達成状況
  async showGoals(interaction) {
    try {
      const [weeklyStats, monthlyStats] = await Promise.all([
        googleSheets.getWeeklyStats(),
        googleSheets.getMonthlyStats()
      ]);

      // 目標設定（config/constants.jsから）
      const weeklyGoals = { books: 2, movies: 3, activities: 5 };
      const monthlyGoals = { books: 8, movies: 12, activities: 20 };

      const embed = new EmbedBuilder()
        .setTitle('🎯 目標達成状況')
        .setColor('#4CAF50')
        .setDescription('設定された目標に対する現在の達成状況')
        .setTimestamp();

      // 週次目標
      const bookWeeklyRate = Math.round((weeklyStats.finishedBooks / weeklyGoals.books) * 100);
      const movieWeeklyRate = Math.round((weeklyStats.watchedMovies / weeklyGoals.movies) * 100);
      const activityWeeklyRate = Math.round((weeklyStats.completedActivities / weeklyGoals.activities) * 100);

      embed.addFields({
        name: '📅 今週の目標達成状況',
        value: 
          `📚 読書: ${weeklyStats.finishedBooks}/${weeklyGoals.books}冊 (${bookWeeklyRate}%) ${module.exports.getProgressBar(bookWeeklyRate)}\n` +
          `🎬 映画: ${weeklyStats.watchedMovies}/${weeklyGoals.movies}本 (${movieWeeklyRate}%) ${module.exports.getProgressBar(movieWeeklyRate)}\n` +
          `🎯 活動: ${weeklyStats.completedActivities}/${weeklyGoals.activities}件 (${activityWeeklyRate}%) ${module.exports.getProgressBar(activityWeeklyRate)}`,
        inline: false
      });

      // 月次目標
      const bookMonthlyRate = Math.round((monthlyStats.finishedBooks / monthlyGoals.books) * 100);
      const movieMonthlyRate = Math.round((monthlyStats.watchedMovies / monthlyGoals.movies) * 100);
      const activityMonthlyRate = Math.round((monthlyStats.completedActivities / monthlyGoals.activities) * 100);

      embed.addFields({
        name: '🗓️ 今月の目標達成状況',
        value: 
          `📚 読書: ${monthlyStats.finishedBooks}/${monthlyGoals.books}冊 (${bookMonthlyRate}%) ${module.exports.getProgressBar(bookMonthlyRate)}\n` +
          `🎬 映画: ${monthlyStats.watchedMovies}/${monthlyGoals.movies}本 (${movieMonthlyRate}%) ${module.exports.getProgressBar(movieMonthlyRate)}\n` +
          `🎯 活動: ${monthlyStats.completedActivities}/${monthlyGoals.activities}件 (${activityMonthlyRate}%) ${module.exports.getProgressBar(activityMonthlyRate)}`,
        inline: false
      });

      // 達成バッジ
      const badges = [];
      if (bookWeeklyRate >= 100) badges.push('📚 週間読書達成');
      if (movieWeeklyRate >= 100) badges.push('🎬 週間映画達成');
      if (activityWeeklyRate >= 100) badges.push('🎯 週間活動達成');
      if (bookMonthlyRate >= 100) badges.push('📚 月間読書達成');
      if (movieMonthlyRate >= 100) badges.push('🎬 月間映画達成');
      if (activityMonthlyRate >= 100) badges.push('🎯 月間活動達成');

      if (badges.length > 0) {
        embed.addFields({
          name: '🏆 獲得バッジ',
          value: badges.join('\n'),
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('目標状況エラー:', error);
      await interaction.editReply('❌ 目標達成状況の取得中にエラーが発生しました。');
    }
  },

  // 📈 トレンド分析（StatsUtilityを使用する版に更新）
  async showTrends(interaction) {
    try {
      const [weeklyStats, monthlyStats, reports, detailedTrends] = await Promise.all([
        googleSheets.getWeeklyStats(),
        googleSheets.getMonthlyStats(), 
        googleSheets.getRecentReports(60),
        statsUtil.calculateDetailedTrends() // 🆕 StatsUtilityを使用
      ]);

      const embed = new EmbedBuilder()
        .setTitle('📈 活動トレンド分析')
        .setColor('#FF5722')
        .setDescription('過去の活動パターンから傾向を分析しました')
        .addFields(
          { 
            name: '📊 詳細ペース分析', 
            value: detailedTrends.paceAnalysis, // 🆕 詳細な分析結果
            inline: false 
          },
          { 
            name: '📅 活動パターン', 
            value: `最も活発: ${detailedTrends.mostActiveDay}\nカテゴリ別: ${detailedTrends.categoryTrends}`,
            inline: false 
          },
          { 
            name: '🔥 活動レベル', 
            value: this.analyzeActivityLevel(reports),
            inline: true 
          },
          { 
            name: '📈 成長予測', 
            value: this.predictGrowth(reports),
            inline: true 
          }
        )
        .setFooter({ text: 'トレンド分析は継続的な記録でより正確になります' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('トレンド分析エラー:', error);
      await interaction.editReply('❌ トレンド分析中にエラーが発生しました。');
    }
  },

  // 📊 期間比較（完全版に更新）
  async showCompare(interaction) {
    try {
      const period = interaction.options.getString('period');
      
      let compareData;
      switch (period) {
        case 'week':
          compareData = await this.compareWeeks(); // 🆕 完全版に更新
          break;
        case 'month':
          compareData = await this.compareMonths(); // 🆕 完全版に更新
          break;
        case 'year':
          compareData = await this.compareYears();
          break;
        default:
          await interaction.editReply('❌ 無効な期間が指定されました。');
          return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📊 ${compareData.title}`)
        .setColor('#9C27B0')
        .setDescription(compareData.description)
        .addFields(...compareData.fields)
        .setFooter({ text: compareData.footer })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('期間比較エラー:', error);
      await interaction.editReply('❌ 期間比較中にエラーが発生しました。');
    }
  },

  // ===============================
  // ヘルパーメソッド（更新版）
  // ===============================

  // 📅 完全版週次比較
  async compareWeeks() {
    try {
      const comparison = await statsUtil.getEnhancedWeeklyComparison(); // 🆕 StatsUtilityを使用
      
      if (!comparison) {
        return {
          title: '今週 vs 先週の比較',
          description: 'データ取得中です...',
          fields: [{ name: 'ステータス', value: 'しばらくお待ちください', inline: false }],
          footer: '継続的な記録でより正確な比較が可能になります'
        };
      }

      return {
        title: '📅 週次比較分析 - 過去3週間',
        description: '週単位での活動量推移を詳しく分析しました',
        fields: [
          {
            name: '📊 3週間の推移',
            value: comparison.comparison,
            inline: false
          },
          {
            name: '📈 成長分析',
            value: comparison.growth.summary,
            inline: false
          },
          {
            name: '🔮 来週の予測',
            value: comparison.trend,
            inline: false
          },
          {
            name: '💡 分析結果',
            value: this.generateWeeklyInsights(comparison.growth), // 🆕 洞察生成
            inline: false
          }
        ],
        footer: '週次データの蓄積により、より精密な分析が可能です'
      };
    } catch (error) {
      console.error('週次比較エラー:', error);
      return {
        title: '週次比較',
        description: 'データ取得に失敗しました',
        fields: [{ name: 'エラー', value: '後でもう一度お試しください', inline: false }],
        footer: 'エラーが発生しました'
      };
    }
  },

  // 📊 完全版月次比較
  async compareMonths() {
    try {
      // 過去3ヶ月のデータを取得
      const [thisMonth, lastMonth, twoMonthsAgo] = await Promise.all([
        googleSheets.getMonthlyStats(),
        statsUtil.getMonthlyStatsForDate(statsUtil.getPreviousMonth(1)), // 🆕 StatsUtilityを使用
        statsUtil.getMonthlyStatsForDate(statsUtil.getPreviousMonth(2))  // 🆕 StatsUtilityを使用
      ]);

      const monthNames = statsUtil.getLastThreeMonthNames(); // 🆕 StatsUtilityを使用
      const growthAnalysis = statsUtil.calculateGrowthRates(twoMonthsAgo, lastMonth, thisMonth); // 🆕 StatsUtilityを使用
      
      return {
        title: '📊 月次比較分析 - 過去3ヶ月',
        description: '月単位での成長パターンと傾向を分析しました',
        fields: [
          {
            name: '📈 3ヶ月間の推移',
            value: statsUtil.formatThreeMonthComparison(twoMonthsAgo, lastMonth, thisMonth, monthNames), // 🆕 StatsUtilityを使用
            inline: false
          },
          {
            name: '📊 成長率分析',
            value: growthAnalysis.summary,
            inline: false
          },
          {
            name: '🎯 カテゴリ別比較',
            value: this.generateCategoryComparison(twoMonthsAgo, lastMonth, thisMonth), // 新規メソッド
            inline: false
          },
          {
            name: '🔮 来月の予測',
            value: this.predictNextMonthTrend(twoMonthsAgo, lastMonth, thisMonth), // 新規メソッド
            inline: false
          }
        ],
        footer: '継続的な記録により、より正確な月次比較が可能になります'
      };
    } catch (error) {
      console.error('月次比較エラー:', error);
      return {
        title: '月次比較',
        description: 'データ取得に失敗しました',
        fields: [{ name: 'エラー', value: '後でもう一度お試しください', inline: false }],
        footer: 'エラーが発生しました'
      };
    }
  },

  // 🆕 週次洞察生成
  generateWeeklyInsights(growth) {
    const { monthlyGrowth } = growth;
    
    if (monthlyGrowth >= 20) {
      return '🚀 **急成長中！** 素晴らしいペースです！この調子で継続しましょう！';
    } else if (monthlyGrowth >= 10) {
      return '📈 **順調な成長** が見られます。安定したペースを保っていますね！';
    } else if (monthlyGrowth >= 0) {
      return '➡️ **安定したペース** です。継続的な活動が素晴らしいですね！';
    } else {
      return '🔄 **調整期間** かもしれません。無理せず、自分のペースで続けましょう！';
    }
  },

  // 🆕 カテゴリ別比較生成
  generateCategoryComparison(twoMonthsAgo, lastMonth, thisMonth) {
    const categories = ['finishedBooks', 'watchedMovies', 'completedActivities'];
    const categoryNames = ['📚 読書', '🎬 映画', '🎯 活動'];
    
    return categories.map((category, index) => {
      const thisValue = thisMonth[category] || 0;
      const lastValue = lastMonth[category] || 0;
      const change = statsUtil.getChangeIndicator(thisValue, lastValue); // 🆕 StatsUtilityを使用
      
      return `${categoryNames[index]}: ${thisValue}件 (${change})`;
    }).join('\n');
  },

  // 🆕 来月予測生成
  predictNextMonthTrend(twoMonthsAgo, lastMonth, thisMonth) {
    const trends = [thisMonth, lastMonth, twoMonthsAgo].map(month => 
      (month.finishedBooks || 0) + (month.watchedMovies || 0) + (month.completedActivities || 0)
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
  },

  // 既存のヘルパーメソッド（変更なし）
  calculateWeeklyTrend() {
    return {
      description: '📈 活動量が増加傾向にあります\n最も活発: 月曜日\n最も静か: 日曜日'
    };
  },

  calculateMonthlyTrend() {
    return {
      description: '📊 先月比120%の活動量\n特に読書活動が活発です'
    };
  },

  analyzeActivityLevel(reports) {
    const recentReports = reports.slice(0, 7);
    if (recentReports.length >= 5) return '🔥 非常に活発';
    if (recentReports.length >= 3) return '⚡ 活発';
    if (recentReports.length >= 1) return '💪 普通';
    return '😴 低調';
  },

  predictGrowth(reports) {
    if (reports.length >= 30) return '📈 今後も継続的な成長が期待されます';
    if (reports.length >= 15) return '📊 良いペースで成長中です';
    return '🌱 成長の兆しが見えています';
  },

  getProgressBar(percentage, length = 10) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    
    if (percentage >= 100) return `${bar} ✅`;
    if (percentage >= 80) return `${bar} 🟢`;
    if (percentage >= 50) return `${bar} 🟡`;
    return `${bar} 🔴`;
  },

  async compareYears() {
    return {
      title: '今年 vs 昨年の比較',
      description: '年間の活動量を比較（簡易版）',
      fields: [
        {
          name: '📈 年間トレンド',
          value: '今年: 順調に記録を継続中\n昨年: データなし',
          inline: false
        }
      ],
      footer: '継続的な記録で年間比較が可能になります'
    };
  },

  // StatsUtilityに移動したメソッドは削除（重複回避）
  // - generateProgressBar → statsUtil.generateProgressBar
  // - calculateBacklogRate → statsUtil.calculateBacklogRate
  // - getChangeIndicator → statsUtil.getChangeIndicator

  // 月次レベルを計算（既存のまま）
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
  },

  // 読書ペースを評価（既存のまま）
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
  },

  // 読書目標を提案（既存のまま）
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
  },

// プログレスバーを生成
  generateProgressBar(percentage, length = 10) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percentage}%`;
  },

  // 積読消化率を計算
  calculateBacklogRate(bookCounts) {
    const totalOwned = (bookCounts.wantToRead || 0) + bookCounts.finished;
    return totalOwned > 0 ? Math.round((bookCounts.finished / totalOwned) * 100) : 0;
  },
};
