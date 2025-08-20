// handlers/statsHandler.js - アニメ対応修正版

const { EmbedBuilder } = require('discord.js');
const GoogleSheetsService = require('../services/googleSheets');
const StatsUtility = require('../services/statsUtility');

// GoogleSheetsServiceのインスタンスを作成
const googleSheets = new GoogleSheetsService();
const statsUtil = new StatsUtility(googleSheets);

module.exports = {
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case 'summary':
          await module.exports.showSummary(interaction);
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
        case 'anime': // 🆕 アニメ統計追加
          await module.exports.showAnime(interaction);
          break;
        case 'manga': // 🆕 漫画統計追加
  　　　　　await module.exports.showManga(interaction);
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

  // 📊 全体統計サマリー（アニメ追加）
  // showSummary メソッドの更新（漫画追加）
async showSummary(interaction) {
  try {
    // 全ての統計データを並行取得（漫画追加）
    const [bookCounts, movieCounts, activityCounts, animeCounts, mangaCounts] = await Promise.all([
      googleSheets.getBookCounts(),
      googleSheets.getMovieCounts(),
      googleSheets.getActivityCounts(),
      googleSheets.getAnimeCounts(),
      googleSheets.getMangaCounts() // 🆕 漫画カウント追加
    ]);
    
    const totalItems = bookCounts.total + movieCounts.total + activityCounts.total + 
                      animeCounts.total + mangaCounts.total; // 🆕 漫画追加
    const completedItems = bookCounts.finished + movieCounts.watched + activityCounts.done + 
                          animeCounts.completed + mangaCounts.finished; // 🆕 漫画追加
    const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    const embed = new EmbedBuilder()
      .setTitle('📊 全体統計サマリー')
      .setColor('#3498DB')
      .setDescription(`全体で **${totalItems}** 件のアイテムを管理中（漫画含む）`)
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
          name: '📺 アニメの管理状況',
          value: `🍿 観たい: **${animeCounts.wantToWatch || 0}**本\n📺 視聴中: **${animeCounts.watching || 0}**本\n✅ 完走済み: **${animeCounts.completed || 0}**本\n💔 中断: **${animeCounts.dropped || 0}**本`, 
          inline: true 
        },
        { 
          // 🆕 漫画の管理状況セクション追加
          name: '📖 漫画の管理状況', 
          value: `📖 読みたい: **${mangaCounts.wantToRead || 0}**本\n📚 読書中: **${mangaCounts.reading || 0}**本\n✅ 読了済み: **${mangaCounts.finished || 0}**本\n💔 中断: **${mangaCounts.dropped || 0}**本`, 
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

  async showWeekly(interaction) {
  try {
    const weeklyStats = await googleSheets.getWeeklyStats();
    const recentReports = await googleSheets.getRecentReports(7);
    
    const totalCompleted = weeklyStats.finishedBooks + weeklyStats.watchedMovies + 
                         weeklyStats.completedActivities + (weeklyStats.completedAnimes || 0) + 
                         (weeklyStats.completedMangas || 0); // 🆕 漫画追加
    
    const embed = new EmbedBuilder()
      .setTitle('📅 今週の活動統計')
      .setColor('#2ECC71')
      .setDescription(`今週は **${totalCompleted}** 件のアイテムを完了しました！`)
      .addFields(
        { name: '📚 読了した本', value: `**${weeklyStats.finishedBooks}**冊`, inline: true },
        { name: '🎬 視聴した映画', value: `**${weeklyStats.watchedMovies}**本`, inline: true },
        { name: '📺 完走したアニメ', value: `**${weeklyStats.completedAnimes || 0}**本`, inline: true },
        { name: '📖 読了した漫画', value: `**${weeklyStats.completedMangas || 0}**本`, inline: true }, // 🆕 漫画追加
        { name: '🎯 完了した活動', value: `**${weeklyStats.completedActivities}**件`, inline: true },
        { name: '📝 記録した日報', value: `**${recentReports.length}**件`, inline: true }
      )
      .setTimestamp();
    
    // 週次目標との比較（漫画追加）
    const weeklyGoals = {
      books: 2,
      movies: 3,
      animes: 1,
      mangas: 2, // 🆕 漫画目標追加
      activities: 5,
      reports: 7
    };
    
    const achievements = [];
    if (weeklyStats.finishedBooks >= weeklyGoals.books) achievements.push('📚 読書目標達成！');
    if (weeklyStats.watchedMovies >= weeklyGoals.movies) achievements.push('🎬 映画目標達成！');
    if ((weeklyStats.completedAnimes || 0) >= weeklyGoals.animes) achievements.push('📺 アニメ目標達成！');
    if ((weeklyStats.completedMangas || 0) >= weeklyGoals.mangas) achievements.push('📖 漫画目標達成！'); // 🆕 漫画目標
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
  
  // 🗓️ 月次統計（アニメ追加）
  // showMonthly メソッドの更新（漫画追加）
async showMonthly(interaction) {
  try {
    const [monthlyStats, bookTitles, animeTitles, mangaTitles, recentReports] = await Promise.all([
      googleSheets.getMonthlyStats(),
      googleSheets.getMonthlyBookTitles(),
      googleSheets.getMonthlyAnimeTitles(),
      googleSheets.getMonthlyMangaTitles(), // 🆕 漫画タイトル追加
      googleSheets.getRecentReports(30)
    ]);
    
    const totalCompleted = monthlyStats.finishedBooks + monthlyStats.watchedMovies + 
                         monthlyStats.completedActivities + (monthlyStats.completedAnimes || 0) + 
                         (monthlyStats.completedMangas || 0); // 🆕 漫画追加
    
    const embed = new EmbedBuilder()
      .setTitle('🗓️ 今月の活動統計')
      .setColor('#9B59B6')
      .setDescription(`今月は **${totalCompleted}** 件のアイテムを完了しました！`)
      .addFields(
        { name: '📚 読了冊数', value: `**${monthlyStats.finishedBooks}**冊`, inline: true },
        { name: '🎬 視聴本数', value: `**${monthlyStats.watchedMovies}**本`, inline: true },
        { name: '📺 完走作品', value: `**${monthlyStats.completedAnimes || 0}**本`, inline: true },
        { name: '📖 読了漫画', value: `**${monthlyStats.completedMangas || 0}**本`, inline: true }, // 🆕 漫画追加
        { name: '🎯 完了活動', value: `**${monthlyStats.completedActivities}**件`, inline: true },
        { name: '📝 日報件数', value: `**${recentReports.length}**件`, inline: true }
      )
      .setTimestamp();
    
    // 今月読了した本のリスト
    if (bookTitles && bookTitles.length > 0) {
      const displayTitles = bookTitles.slice(0, 5);
      const moreTitles = bookTitles.length - 5;
      
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

    // 今月完走したアニメのリスト
    if (animeTitles && animeTitles.length > 0) {
      const displayTitles = animeTitles.slice(0, 5);
      const moreTitles = animeTitles.length - 5;
      
      let titlesList = displayTitles.map((title, index) => `${index + 1}. ${title}`).join('\n');
      if (moreTitles > 0) {
        titlesList += `\n... 他${moreTitles}本`;
      }
      
      embed.addFields({ 
        name: '🎉 今月完走したアニメ', 
        value: titlesList, 
        inline: false 
      });
    }
    
    // 🆕 今月読了した漫画のリスト
    if (mangaTitles && mangaTitles.length > 0) {
      const displayTitles = mangaTitles.slice(0, 5);
      const moreTitles = mangaTitles.length - 5;
      
      let titlesList = displayTitles.map((title, index) => `${index + 1}. ${title}`).join('\n');
      if (moreTitles > 0) {
        titlesList += `\n... 他${moreTitles}本`;
      }
      
      embed.addFields({ 
        name: '📖 今月読了した漫画', 
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

  // 📚 読書統計詳細（既存のまま）
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

  // 🆕 📖 漫画読書統計詳細
async showManga(interaction) {
  try {
    console.log('📊 漫画統計取得開始');
    
    const [mangaCounts, allStats] = await Promise.all([
      googleSheets.getMangaCounts(),
      googleSheets.getAllStats()
    ]);
    
    // 漫画読書ペースの計算
    const monthlyStats = await googleSheets.getMonthlyStats();
    const weeklyStats = await googleSheets.getWeeklyStats();
    
    const embed = new EmbedBuilder()
      .setTitle('📖 漫画読書統計詳細')
      .setColor('#FF6B35')
      .setDescription(`全 **${mangaCounts.total}** 本の漫画を管理中`)
      .addFields(
        { 
          name: '📊 ステータス別統計', 
          value: `📖 読みたい: **${mangaCounts.wantToRead || 0}**本\n📚 読書中: **${mangaCounts.reading || 0}**本\n✅ 読了済み: **${mangaCounts.finished || 0}**本\n💔 中断: **${mangaCounts.dropped || 0}**本`, 
          inline: true 
        },
        { 
          name: '📅 期間別読了数', 
          value: `今月: **${monthlyStats.completedMangas || 0}**本\n今週: **${weeklyStats.completedMangas || 0}**本\n1日平均: **${((monthlyStats.completedMangas || 0) / 30).toFixed(1)}**本`, 
          inline: true 
        }
      )
      .setTimestamp();
    
    // 漫画読書効率の分析
    const totalMangas = mangaCounts.total;
    const completionRate = totalMangas > 0 ? Math.round(((mangaCounts.finished || 0) / totalMangas) * 100) : 0;
    const dropRate = totalMangas > 0 ? Math.round(((mangaCounts.dropped || 0) / totalMangas) * 100) : 0;
    
    embed.addFields({
      name: '📈 漫画読書効率分析',
      value: `読了率: **${completionRate}%**\n${module.exports.generateProgressBar(completionRate)}\n中断率: **${dropRate}%**\n継続力: **${100 - dropRate}%**`,
      inline: false
    });
    
    // 漫画読書ペースの評価
    const mangaPace = module.exports.evaluateMangaPace(monthlyStats.completedMangas || 0);
    embed.addFields({
      name: '⚡ 漫画読書ペース評価',
      value: `${mangaPace.icon} **${mangaPace.level}**\n${mangaPace.comment}`,
      inline: false
    });
    
    // 読書中漫画の進捗分析
    if (mangaCounts.reading > 0) {
      embed.addFields({
        name: '📚 現在の読書状況',
        value: `${mangaCounts.reading}本の漫画を同時読書中です。\n集中して読了を目指しましょう！`,
        inline: false
      });
    }
    
    // 漫画読書目標の提案
    const nextGoal = module.exports.suggestMangaGoal(monthlyStats.completedMangas || 0, mangaCounts.wantToRead || 0);
    if (nextGoal) {
      embed.addFields({
        name: '🎯 おすすめ目標',
        value: nextGoal,
        inline: false
      });
    }
    
    // 形式別統計（単行本 vs 連載）
    try {
      const formatStats = await googleSheets.getMangaFormatStats();
      if (formatStats) {
        embed.addFields({
          name: '📖 形式別統計',
          value: `📚 単行本: ${formatStats.volume || 0}本\n📱 話数: ${formatStats.chapter || 0}話\nシリーズ: ${formatStats.series || 0}本\n読切: ${formatStats.oneshot || 0}本`,
          inline: true
        });
      }
    } catch (error) {
      // 形式別統計が取得できない場合はスキップ
      console.log('形式別統計の取得をスキップしました');
    }
    
    embed.setFooter({ text: '漫画は心を豊かにする素晴らしいエンターテイメントです！' });
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('漫画統計取得エラー:', error);
    await interaction.editReply('❌ 漫画統計の取得中にエラーが発生しました。');
  }
},

// 🆕 漫画読書ペース評価メソッド
evaluateMangaPace(monthlyMangas) {
  if (monthlyMangas >= 10) {
    return { icon: '🚀', level: '超高速ペース', comment: '月10本以上！驚異的な読書量です！' };
  } else if (monthlyMangas >= 6) {
    return { icon: '⚡', level: '高速ペース', comment: '月6本以上！素晴らしいペースです！' };
  } else if (monthlyMangas >= 3) {
    return { icon: '📈', level: '標準ペース', comment: '月3本以上！良いペースを保っています！' };
  } else if (monthlyMangas >= 1) {
    return { icon: '📖', level: '安定ペース', comment: '月1本！継続が大切です！' };
  } else {
    return { icon: '🌱', level: 'スタート', comment: 'まずは月1本の読了を目指してみませんか？' };
  }
},

// 🆕 漫画読書目標提案メソッド
suggestMangaGoal(currentMonthly, wantToReadCount) {
  if (currentMonthly < 1) {
    return '📖 まずは月1本の読了を目指してみましょう！';
  } else if (currentMonthly < 3) {
    return '📚 月3本読了を目指して、読書習慣を強化しませんか？';
  } else if (wantToReadCount > 20) {
    return '📖 読みたい漫画が多いので、計画的に読み進めていきましょう！';
  } else if (currentMonthly >= 6) {
    return '🏆 素晴らしいペース！このまま継続して年間80本を目指しませんか？';
  } else {
    return '⭐ 月5本読了にチャレンジしてみませんか？';
  }
},

  // 🆕 📺 アニメ統計詳細
  async showAnime(interaction) {
    try {
      const [animeCounts, allStats] = await Promise.all([
        googleSheets.getAnimeCounts(),
        googleSheets.getAllStats()
      ]);
      
      // アニメ視聴ペースの計算
      const monthlyStats = await googleSheets.getMonthlyStats();
      const weeklyStats = await googleSheets.getWeeklyStats();
      
      const embed = new EmbedBuilder()
        .setTitle('📺 アニメ視聴統計詳細')
        .setColor('#FF6B6B')
        .setDescription(`全 **${animeCounts.total}** 本のアニメを管理中`)
        .addFields(
          { 
            name: '📊 ステータス別統計', 
            value: `🍿 観たい: **${animeCounts.wantToWatch || 0}**本\n📺 視聴中: **${animeCounts.watching || 0}**本\n✅ 完走済み: **${animeCounts.completed || 0}**本\n💔 中断: **${animeCounts.dropped || 0}**本`, 
            inline: true 
          },
          { 
            name: '📅 期間別完走数', 
            value: `今月: **${monthlyStats.completedAnimes || 0}**本\n今週: **${weeklyStats.completedAnimes || 0}**本\n1日平均: **${((monthlyStats.completedAnimes || 0) / 30).toFixed(1)}**本`, 
            inline: true 
          }
        )
        .setTimestamp();
      
      // アニメ視聴効率の分析
      const totalAnimes = animeCounts.total;
      const completionRate = totalAnimes > 0 ? Math.round(((animeCounts.completed || 0) / totalAnimes) * 100) : 0;
      const dropRate = totalAnimes > 0 ? Math.round(((animeCounts.dropped || 0) / totalAnimes) * 100) : 0;
      
      embed.addFields({
        name: '📈 アニメ視聴効率分析',
        value: `完走率: **${completionRate}%**\n${module.exports.generateProgressBar(completionRate)}\n中断率: **${dropRate}%**\n継続力: **${100 - dropRate}%**`,
        inline: false
      });
      
      // アニメ視聴ペースの評価
      const animePace = module.exports.evaluateAnimePace(monthlyStats.completedAnimes || 0);
      embed.addFields({
        name: '⚡ アニメ視聴ペース評価',
        value: `${animePace.icon} **${animePace.level}**\n${animePace.comment}`,
        inline: false
      });
      
      // アニメ視聴目標の提案
      const nextGoal = module.exports.suggestAnimeGoal(monthlyStats.completedAnimes || 0, animeCounts.wantToWatch || 0);
      if (nextGoal) {
        embed.addFields({
          name: '🎯 おすすめ目標',
          value: nextGoal,
          inline: false
        });
      }
      
      // 視聴中アニメの進捗情報
      if (animeCounts.watching > 0) {
        embed.addFields({
          name: '📺 現在の視聴状況',
          value: `${animeCounts.watching}本のアニメを同時視聴中です。\n集中して完走を目指しましょう！`,
          inline: false
        });
      }
      
      embed.setFooter({ text: 'アニメは心を豊かにする素晴らしいエンターテイメントです！' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('アニメ統計エラー:', error);
      await interaction.editReply('❌ アニメ統計の取得中にエラーが発生しました。');
    }
  },

 // showCurrent メソッドの更新（漫画追加）
async showCurrent(interaction) {
  try {
    const currentProgress = await googleSheets.getCurrentProgress();
    
    const readingList = currentProgress.readingBooks.length > 0 
      ? currentProgress.readingBooks.map(book => `📖 [${book.id}] ${book.title}`).join('\n')
      : '現在読書中の本はありません';
    
    const movieList = currentProgress.wantToWatchMovies.length > 0
      ? currentProgress.wantToWatchMovies.slice(0, 8).map(movie => `🍿 [${movie.id}] ${movie.title}`).join('\n')
      : '観たい映画がありません';
    
    // 視聴中アニメの取得
    const watchingAnimes = await googleSheets.getAnimesByStatus('watching');
    const animeList = watchingAnimes.length > 0
      ? watchingAnimes.slice(0, 8).map(anime => `📺 [${anime.id}] ${anime.title} (${anime.watched_episodes}/${anime.total_episodes}話)`).join('\n')
      : '現在視聴中のアニメはありません';
    
    // 🆕 読書中漫画の取得
    const readingMangas = await googleSheets.getMangasByStatus('reading');
    const mangaList = readingMangas.length > 0
      ? readingMangas.slice(0, 8).map(manga => {
          const unit = manga.format === 'volume' ? '巻' : '話';
          const progress = manga.total_count 
            ? `(${manga.read_count}/${manga.total_count}${unit})`
            : `(${manga.read_count}${unit})`;
          return `📖 [${manga.id}] ${manga.title} ${progress}`;
        }).join('\n')
      : '現在読書中の漫画はありません';
    
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
      .setDescription('あなたの現在のアクティブなアイテム一覧（漫画含む）')
      .addFields(
        { name: '📖 読書中の本', value: readingList, inline: false },
        { name: '🎬 観たい映画', value: movieList, inline: false },
        { name: '📺 視聴中のアニメ', value: animeList, inline: false },
        { name: '📖 読書中の漫画', value: mangaList, inline: false }, // 🆕 漫画追加
        { name: '🎯 予定中の活動', value: activityList, inline: false }
      )
      .setTimestamp();
    
    // 進行状況のサマリー
    const totalInProgress = currentProgress.readingBooks.length + 
                           currentProgress.wantToWatchMovies.length + 
                           watchingAnimes.length + 
                           readingMangas.length + // 🆕 漫画追加
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
      if (watchingAnimes.length > 0) {
        suggestions.push('📺 アニメを視聴する');
      }
      if (readingMangas.length > 0) { // 🆕 漫画追加
        suggestions.push('📖 漫画を読む');
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
        value: '• `/book add` - 新しい本を追加\n• `/movie add` - 観たい映画を追加\n• `/anime add` - 新しいアニメを追加\n• `/manga add` - 新しい漫画を追加\n• `/activity add` - 新しい活動を追加', // 🆕 漫画追加
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

 // showGoals メソッドの更新（漫画追加）
async showGoals(interaction) {
  try {
    const [weeklyStats, monthlyStats] = await Promise.all([
      googleSheets.getWeeklyStats(),
      googleSheets.getMonthlyStats()
    ]);

    // 目標設定（漫画追加）
    const weeklyGoals = { books: 2, movies: 3, animes: 1, mangas: 2, activities: 5 }; // 🆕 漫画追加
    const monthlyGoals = { books: 8, movies: 12, animes: 4, mangas: 8, activities: 20 }; // 🆕 漫画追加

    const embed = new EmbedBuilder()
      .setTitle('🎯 目標達成状況')
      .setColor('#4CAF50')
      .setDescription('設定された目標に対する現在の達成状況（漫画含む）')
      .setTimestamp();

    // 週次目標
    const bookWeeklyRate = Math.round((weeklyStats.finishedBooks / weeklyGoals.books) * 100);
    const movieWeeklyRate = Math.round((weeklyStats.watchedMovies / weeklyGoals.movies) * 100);
    const animeWeeklyRate = Math.round(((weeklyStats.completedAnimes || 0) / weeklyGoals.animes) * 100);
    const mangaWeeklyRate = Math.round(((weeklyStats.completedMangas || 0) / weeklyGoals.mangas) * 100); // 🆕 漫画追加
    const activityWeeklyRate = Math.round((weeklyStats.completedActivities / weeklyGoals.activities) * 100);

    embed.addFields({
      name: '📅 今週の目標達成状況',
      value: 
        `📚 読書: ${weeklyStats.finishedBooks}/${weeklyGoals.books}冊 (${bookWeeklyRate}%) ${module.exports.getProgressBar(bookWeeklyRate)}\n` +
        `🎬 映画: ${weeklyStats.watchedMovies}/${weeklyGoals.movies}本 (${movieWeeklyRate}%) ${module.exports.getProgressBar(movieWeeklyRate)}\n` +
        `📺 アニメ: ${weeklyStats.completedAnimes || 0}/${weeklyGoals.animes}本 (${animeWeeklyRate}%) ${module.exports.getProgressBar(animeWeeklyRate)}\n` +
        `📖 漫画: ${weeklyStats.completedMangas || 0}/${weeklyGoals.mangas}本 (${mangaWeeklyRate}%) ${module.exports.getProgressBar(mangaWeeklyRate)}\n` + // 🆕 漫画追加
        `🎯 活動: ${weeklyStats.completedActivities}/${weeklyGoals.activities}件 (${activityWeeklyRate}%) ${module.exports.getProgressBar(activityWeeklyRate)}`,
      inline: false
    });

    // 月次目標
    const bookMonthlyRate = Math.round((monthlyStats.finishedBooks / monthlyGoals.books) * 100);
    const movieMonthlyRate = Math.round((monthlyStats.watchedMovies / monthlyGoals.movies) * 100);
    const animeMonthlyRate = Math.round(((monthlyStats.completedAnimes || 0) / monthlyGoals.animes) * 100);
    const mangaMonthlyRate = Math.round(((monthlyStats.completedMangas || 0) / monthlyGoals.mangas) * 100); // 🆕 漫画追加
    const activityMonthlyRate = Math.round((monthlyStats.completedActivities / monthlyGoals.activities) * 100);

    embed.addFields({
      name: '🗓️ 今月の目標達成状況',
      value: 
        `📚 読書: ${monthlyStats.finishedBooks}/${monthlyGoals.books}冊 (${bookMonthlyRate}%) ${module.exports.getProgressBar(bookMonthlyRate)}\n` +
        `🎬 映画: ${monthlyStats.watchedMovies}/${monthlyGoals.movies}本 (${movieMonthlyRate}%) ${module.exports.getProgressBar(movieMonthlyRate)}\n` +
        `📺 アニメ: ${monthlyStats.completedAnimes || 0}/${monthlyGoals.animes}本 (${animeMonthlyRate}%) ${module.exports.getProgressBar(animeMonthlyRate)}\n` +
        `📖 漫画: ${monthlyStats.completedMangas || 0}/${monthlyGoals.mangas}本 (${mangaMonthlyRate}%) ${module.exports.getProgressBar(mangaMonthlyRate)}\n` + // 🆕 漫画追加
        `🎯 活動: ${monthlyStats.completedActivities}/${monthlyGoals.activities}件 (${activityMonthlyRate}%) ${module.exports.getProgressBar(activityMonthlyRate)}`,
      inline: false
    });

    // 達成バッジ（漫画追加）
    const badges = [];
    if (bookWeeklyRate >= 100) badges.push('📚 週間読書達成');
    if (movieWeeklyRate >= 100) badges.push('🎬 週間映画達成');
    if (animeWeeklyRate >= 100) badges.push('📺 週間アニメ達成');
    if (mangaWeeklyRate >= 100) badges.push('📖 週間漫画達成'); // 🆕 漫画追加
    if (activityWeeklyRate >= 100) badges.push('🎯 週間活動達成');
    if (bookMonthlyRate >= 100) badges.push('📚 月間読書達成');
    if (movieMonthlyRate >= 100) badges.push('🎬 月間映画達成');
    if (animeMonthlyRate >= 100) badges.push('📺 月間アニメ達成');
    if (mangaMonthlyRate >= 100) badges.push('📖 月間漫画達成'); // 🆕 漫画追加
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

  // 📈 トレンド分析（アニメ対応版）
  async showTrends(interaction) {
    try {
      const [weeklyStats, monthlyStats, reports, detailedTrends] = await Promise.all([
        googleSheets.getWeeklyStats(),
        googleSheets.getMonthlyStats(), 
        googleSheets.getRecentReports(60),
        statsUtil.calculateDetailedTrends() // StatsUtilityを使用
      ]);

      const embed = new EmbedBuilder()
        .setTitle('📈 活動トレンド分析')
        .setColor('#FF5722')
        .setDescription('過去の活動パターンから傾向を分析しました（アニメ含む）')
        .addFields(
          { 
            name: '📊 詳細ペース分析', 
            value: detailedTrends.paceAnalysis,
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

  // 📊 期間比較（アニメ対応版）
  async showCompare(interaction) {
    try {
      const period = interaction.options.getString('period');
      
      let compareData;
      switch (period) {
        case 'week':
          compareData = await this.compareWeeks();
          break;
        case 'month':
          compareData = await this.compareMonths();
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
  // ヘルパーメソッド（アニメ対応版）
  // ===============================

  // 📅 アニメ対応週次比較
  async compareWeeks() {
    try {
      const comparison = await statsUtil.getEnhancedWeeklyComparison();
      
      if (!comparison) {
        return {
          title: '今週 vs 先週の比較',
          description: 'データ取得中です...',
          fields: [{ name: 'ステータス', value: 'しばらくお待ちください', inline: false }],
          footer: '継続的な記録でより正確な比較が可能になります'
        };
      }

      return {
        title: '📅 週次比較分析 - 過去3週間（アニメ含む）',
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
            value: this.generateWeeklyInsights(comparison.growth),
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

  // 📊 アニメ対応月次比較
  async compareMonths() {
    try {
      const [thisMonth, lastMonth, twoMonthsAgo] = await Promise.all([
        googleSheets.getMonthlyStats(),
        statsUtil.getMonthlyStatsForDate(statsUtil.getPreviousMonth(1)),
        statsUtil.getMonthlyStatsForDate(statsUtil.getPreviousMonth(2))
      ]);

      const monthNames = statsUtil.getLastThreeMonthNames();
      const growthAnalysis = statsUtil.calculateGrowthRates(twoMonthsAgo, lastMonth, thisMonth);
      
      return {
        title: '📊 月次比較分析 - 過去3ヶ月（アニメ含む）',
        description: '月単位での成長パターンと傾向を分析しました',
        fields: [
          {
            name: '📈 3ヶ月間の推移',
            value: statsUtil.formatThreeMonthComparison(twoMonthsAgo, lastMonth, thisMonth, monthNames),
            inline: false
          },
          {
            name: '📊 成長率分析',
            value: growthAnalysis.summary,
            inline: false
          },
          {
            name: '🎯 カテゴリ別比較（アニメ含む）',
            value: this.generateCategoryComparisonWithAnime(twoMonthsAgo, lastMonth, thisMonth),
            inline: false
          },
          {
            name: '🔮 来月の予測',
            value: this.predictNextMonthTrendWithAnime(twoMonthsAgo, lastMonth, thisMonth),
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

  // generateCategoryComparisonWithAnime メソッドの更新（漫画追加）
generateCategoryComparisonWithAnime(twoMonthsAgo, lastMonth, thisMonth) {
  const categories = ['finishedBooks', 'watchedMovies', 'completedAnimes', 'completedMangas', 'completedActivities']; // 🆕 漫画追加
  const categoryNames = ['📚 読書', '🎬 映画', '📺 アニメ', '📖 漫画', '🎯 活動']; // 🆕 漫画追加
  
  return categories.map((category, index) => {
    const thisValue = thisMonth[category] || 0;
    const lastValue = lastMonth[category] || 0;
    const change = statsUtil.getChangeIndicator(thisValue, lastValue);
    
    return `${categoryNames[index]}: ${thisValue}件 (${change})`;
  }).join('\n');
},

// predictNextMonthTrendWithAnime メソッドの更新（漫画追加）
predictNextMonthTrendWithAnime(twoMonthsAgo, lastMonth, thisMonth) {
  const trends = [thisMonth, lastMonth, twoMonthsAgo].map(month => 
    (month.finishedBooks || 0) + (month.watchedMovies || 0) + 
    (month.completedAnimes || 0) + (month.completedMangas || 0) + // 🆕 漫画追加
    (month.completedActivities || 0)
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

  // 🆕 アニメ視聴ペース評価
  evaluateAnimePace(monthlyAnimes) {
    if (monthlyAnimes >= 6) {
      return { icon: '🚀', level: '超高速ペース', comment: '月6本以上！驚異的な視聴量です！' };
    } else if (monthlyAnimes >= 4) {
      return { icon: '⚡', level: '高速ペース', comment: '月4本以上！素晴らしいペースです！' };
    } else if (monthlyAnimes >= 2) {
      return { icon: '📈', level: '標準ペース', comment: '月2本以上！良いペースを保っています！' };
    } else if (monthlyAnimes >= 1) {
      return { icon: '📺', level: '安定ペース', comment: '月1本！継続が大切です！' };
    } else {
      return { icon: '🌱', level: 'スタート', comment: 'まずは月1本完走を目指してみませんか？' };
    }
  },

  // 🆕 アニメ視聴目標提案
  suggestAnimeGoal(currentMonthly, wantToWatchCount) {
    if (currentMonthly < 1) {
      return '📺 まずは月1本の完走を目指してみましょう！';
    } else if (currentMonthly < 2) {
      return '📺 月2本完走を目指して、視聴習慣を強化しませんか？';
    } else if (wantToWatchCount > 20) {
      return '📺 観たいアニメが多いので、計画的に視聴していきましょう！';
    } else if (currentMonthly >= 4) {
      return '🏆 素晴らしいペース！このまま継続して年間50本を目指しませんか？';
    } else {
      return '⭐ 月3本完走にチャレンジしてみませんか？';
    }
  },

  // 既存メソッド（変更なし）
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

  generateProgressBar(percentage, length = 10) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percentage}%`;
  },

  calculateBacklogRate(bookCounts) {
    const totalOwned = (bookCounts.wantToRead || 0) + bookCounts.finished;
    return totalOwned > 0 ? Math.round((bookCounts.finished / totalOwned) * 100) : 0;
  },
};
