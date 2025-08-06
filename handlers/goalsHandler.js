const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const goalService = require('../services/goalService');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../utils/embedUtils');
const { formatNumber, getProgressBar, getTimeRemaining } = require('../utils/formatUtils');

/**
 * 目標管理ハンドラー - 完全機能版
 * 個人目標の設定・管理・進捗追跡を行う
 */
class GoalsHandler {
  constructor() {
    this.presets = {
      beginner: {
        weekly: { books: 1, movies: 2, activities: 3, reports: 5 },
        monthly: { books: 4, movies: 8, activities: 12, reports: 20 }
      },
      standard: {
        weekly: { books: 2, movies: 3, activities: 5, reports: 7 },
        monthly: { books: 8, movies: 12, activities: 20, reports: 28 }
      },
      challenge: {
        weekly: { books: 3, movies: 4, activities: 7, reports: 10 },
        monthly: { books: 12, movies: 16, activities: 28, reports: 40 }
      },
      expert: {
        weekly: { books: 4, movies: 5, activities: 10, reports: 14 },
        monthly: { books: 16, movies: 20, activities: 40, reports: 56 }
      }
    };

    this.categoryEmojis = {
      books: '📚',
      movies: '🎬',
      activities: '🎯',
      reports: '📝'
    };

    this.categoryNames = {
      books: '本',
      movies: '映画',
      activities: '活動',
      reports: '日報'
    };
  }

  /**
   * メインハンドラー - サブコマンドに応じて処理を分岐
   */
  async execute(interaction) {
    console.log(`[DEBUG] goalsHandler.execute 呼び出し: ${interaction.options.getSubcommand()}`);
    
    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case 'show':
          return await this.handleShow(interaction);
        case 'set':
          return await this.handleSet(interaction);
        case 'reset':
          return await this.handleReset(interaction);
        case 'quick':
          return await this.handleQuick(interaction);
        case 'progress':
          return await this.handleProgress(interaction);
        default:
          throw new Error(`未知のサブコマンド: ${subcommand}`);
      }
    } catch (error) {
      console.error(`❌ 目標コマンド実行エラー [${subcommand}]:`, error);
      
      const embed = createErrorEmbed(
        '❌ エラーが発生しました',
        `コマンドの実行中にエラーが発生しました。\n詳細: ${error.message}`
      );
      
      if (interaction.deferred) {
        return await interaction.editReply({ embeds: [embed] });
      } else {
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }

  /**
   * 現在の目標設定を表示
   */
  async handleShow(interaction) {
    console.log('[DEBUG] handleShow 実行');

    try {
      const userId = interaction.user.id;
      const goals = await goalService.getGoals(userId);
      const currentStats = await goalService.getCurrentProgress(userId);

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('🎯 現在の目標設定')
        .setDescription('あなたの目標設定と今期の進捗状況です')
        .setTimestamp();

      // 週次目標
      if (goals.weekly && Object.keys(goals.weekly).length > 0) {
        const weeklyText = this.formatGoalSection('weekly', goals.weekly, currentStats.weekly);
        embed.addFields({
          name: '📅 週次目標 (今週)',
          value: weeklyText,
          inline: false
        });
      }

      // 月次目標
      if (goals.monthly && Object.keys(goals.monthly).length > 0) {
        const monthlyText = this.formatGoalSection('monthly', goals.monthly, currentStats.monthly);
        embed.addFields({
          name: '🗓️ 月次目標 (今月)',
          value: monthlyText,
          inline: false
        });
      }

      // 目標が設定されていない場合
      if ((!goals.weekly || Object.keys(goals.weekly).length === 0) && 
          (!goals.monthly || Object.keys(goals.monthly).length === 0)) {
        embed.setDescription('まだ目標が設定されていません。\n`/goals quick` でクイック設定するか、`/goals set` で個別に設定してください。');
        embed.setColor('#95a5a6');
      }

      // アクションボタン
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('goals_quick_setup')
            .setLabel('⚡ クイック設定')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('goals_detailed_progress')
            .setLabel('📊 詳細進捗')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('goals_reset')
            .setLabel('🔄 リセット')
            .setStyle(ButtonStyle.Danger)
        );

      if (interaction.deferred) {
        return await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        return await interaction.reply({ embeds: [embed], components: [row] });
      }

    } catch (error) {
      console.error('目標表示エラー:', error);
      const embed = createErrorEmbed(
        '❌ 表示エラー',
        '目標の取得中にエラーが発生しました。'
      );
      
      if (interaction.deferred) {
        return await interaction.editReply({ embeds: [embed] });
      } else {
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }

  /**
   * 個別目標設定
   */
  async handleSet(interaction) {
    console.log('[DEBUG] handleSet 実行');

    try {
      const userId = interaction.user.id;
      const period = interaction.options.getString('period');
      const category = interaction.options.getString('category');
      const target = interaction.options.getInteger('target');

      console.log(`[DEBUG] 設定内容: ${period}, ${category}, ${target}`);

      // 目標を設定
      await goalService.setGoal(userId, period, category, target);

      const emoji = this.categoryEmojis[category];
      const categoryName = this.categoryNames[category];
      const periodName = period === 'weekly' ? '週次' : '月次';

      const embed = createSuccessEmbed(
        '✅ 目標を設定しました',
        `${emoji} **${categoryName}** の${periodName}目標を **${target}** に設定しました。\n\n頑張って達成しましょう！ 💪`
      );

      // 現在の進捗を取得して表示
      const currentStats = await goalService.getCurrentProgress(userId);
      const current = period === 'weekly' ? currentStats.weekly[category] || 0 : currentStats.monthly[category] || 0;
      const percentage = Math.min(Math.round((current / target) * 100), 100);
      const progressBar = getProgressBar(percentage);

      embed.addFields({
        name: '📊 現在の進捗',
        value: `${progressBar} **${current}/${target}** (${percentage}%)`,
        inline: false
      });

      // 励ましメッセージ
      if (percentage >= 100) {
        embed.addFields({
          name: '🎉 すでに達成済み！',
          value: '素晴らしい成果です！さらなる目標に挑戦してみませんか？',
          inline: false
        });
      } else if (percentage >= 75) {
        embed.addFields({
          name: '🔥 あと少し！',
          value: 'ゴールまでもう少しです。最後まで頑張りましょう！',
          inline: false
        });
      } else if (percentage >= 50) {
        embed.addFields({
          name: '📈 順調です',
          value: '半分を超えました！この調子で続けましょう。',
          inline: false
        });
      }

      if (interaction.deferred) {
        return await interaction.editReply({ embeds: [embed] });
      } else {
        return await interaction.reply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('目標設定エラー:', error);
      const embed = createErrorEmbed(
        '❌ 設定エラー',
        '目標の設定中にエラーが発生しました。'
      );
      
      if (interaction.deferred) {
        return await interaction.editReply({ embeds: [embed] });
      } else {
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }

  /**
   * 目標リセット
   */
  async handleReset(interaction) {
    console.log('[DEBUG] handleReset 実行');

    try {
      const userId = interaction.user.id;
      const period = interaction.options.getString('period') || 'all';

      if (period === 'all') {
        await goalService.resetAllGoals(userId);
        var message = '全ての目標をリセットしました。';
      } else {
        await goalService.resetGoals(userId, period);
        const periodName = period === 'weekly' ? '週次' : '月次';
        var message = `${periodName}目標をリセットしました。`;
      }

      const embed = createSuccessEmbed(
        '🔄 目標をリセットしました',
        `${message}\n\n新しい目標を設定して、再スタートしましょう！`
      );

      // クイック設定のボタンを追加
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('goals_quick_setup')
            .setLabel('⚡ クイック設定')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('goals_custom_setup')
            .setLabel('⚙️ 個別設定')
            .setStyle(ButtonStyle.Secondary)
        );

      if (interaction.deferred) {
        return await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        return await interaction.reply({ embeds: [embed], components: [row] });
      }

    } catch (error) {
      console.error('目標リセットエラー:', error);
      const embed = createErrorEmbed(
        '❌ リセットエラー',
        '目標のリセット中にエラーが発生しました。'
      );
      
      if (interaction.deferred) {
        return await interaction.editReply({ embeds: [embed] });
      } else {
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }

  /**
   * クイック設定（プリセット）
   */
  async handleQuick(interaction) {
    console.log('[DEBUG] handleQuick 実行');

    try {
      const userId = interaction.user.id;
      const preset = interaction.options.getString('preset');

      console.log(`[DEBUG] 選択されたプリセット: ${preset}`);

      if (!this.presets[preset]) {
        throw new Error(`無効なプリセット: ${preset}`);
      }

      const presetData = this.presets[preset];
      
      // プリセットの目標を一括設定
      await goalService.setGoalsFromPreset(userId, presetData);

      const presetNames = {
        beginner: '🌱 初心者向け',
        standard: '📈 標準',
        challenge: '🔥 チャレンジ',
        expert: '🏆 エキスパート'
      };

      const embed = createSuccessEmbed(
        '⚡ クイック設定完了！',
        `**${presetNames[preset]}** プリセットで目標を設定しました。`
      );

      // 設定された目標の詳細表示
      const weeklyDetails = Object.entries(presetData.weekly)
        .map(([category, target]) => `${this.categoryEmojis[category]} ${this.categoryNames[category]}: ${target}`)
        .join('\n');

      const monthlyDetails = Object.entries(presetData.monthly)
        .map(([category, target]) => `${this.categoryEmojis[category]} ${this.categoryNames[category]}: ${target}`)
        .join('\n');

      embed.addFields(
        { name: '📅 週次目標', value: weeklyDetails, inline: true },
        { name: '🗓️ 月次目標', value: monthlyDetails, inline: true },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: '💡 ヒント', value: '`/goals progress` で詳細な進捗を確認できます！', inline: false }
      );

      // 現在の進捗も表示
      const currentStats = await goalService.getCurrentProgress(userId);
      const progressText = this.formatQuickProgressOverview(presetData, currentStats);
      
      if (progressText) {
        embed.addFields({
          name: '📊 現在の進捗概要',
          value: progressText,
          inline: false
        });
      }

      if (interaction.deferred) {
        return await interaction.editReply({ embeds: [embed] });
      } else {
        return await interaction.reply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('クイック設定エラー:', error);
      const embed = createErrorEmbed(
        '❌ 設定エラー',
        'クイック設定中にエラーが発生しました。'
      );
      
      if (interaction.deferred) {
        return await interaction.editReply({ embeds: [embed] });
      } else {
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }

  /**
   * 詳細進捗表示
   */
  async handleProgress(interaction) {
    console.log('[DEBUG] handleProgress 実行');

    try {
      const userId = interaction.user.id;
      const goals = await goalService.getGoals(userId);
      const currentStats = await goalService.getCurrentProgress(userId);
      const progressAnalysis = await goalService.getProgressAnalysis(userId);

      if ((!goals.weekly || Object.keys(goals.weekly).length === 0) && 
          (!goals.monthly || Object.keys(goals.monthly).length === 0)) {
        const embed = createInfoEmbed(
          '📊 進捗表示',
          'まだ目標が設定されていません。\n`/goals quick` でクイック設定してから進捗を確認してください。'
        );
        
        if (interaction.deferred) {
          return await interaction.editReply({ embeds: [embed] });
        } else {
          return await interaction.reply({ embeds: [embed] });
        }
      }

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('📊 目標達成進捗 - 詳細分析')
        .setDescription('あなたの目標達成状況を詳しく分析します')
        .setTimestamp();

      // 週次進捗
      if (goals.weekly && Object.keys(goals.weekly).length > 0) {
        const weeklyAnalysis = this.analyzeProgress('weekly', goals.weekly, currentStats.weekly, progressAnalysis.weekly);
        embed.addFields({
          name: '📅 週次目標 - 今週の進捗',
          value: weeklyAnalysis.summary,
          inline: false
        });

        if (weeklyAnalysis.details) {
          embed.addFields({
            name: '📈 詳細分析 (週次)',
            value: weeklyAnalysis.details,
            inline: false
          });
        }
      }

      // 月次進捗
      if (goals.monthly && Object.keys(goals.monthly).length > 0) {
        const monthlyAnalysis = this.analyzeProgress('monthly', goals.monthly, currentStats.monthly, progressAnalysis.monthly);
        embed.addFields({
          name: '🗓️ 月次目標 - 今月の進捗',
          value: monthlyAnalysis.summary,
          inline: false
        });

        if (monthlyAnalysis.details) {
          embed.addFields({
            name: '📈 詳細分析 (月次)',
            value: monthlyAnalysis.details,
            inline: false
          });
        }
      }

      // 全体サマリー
      const overallSummary = this.generateOverallSummary(goals, currentStats, progressAnalysis);
      if (overallSummary) {
        embed.addFields({
          name: '🎯 全体サマリー',
          value: overallSummary,
          inline: false
        });
      }

      // アドバイス
      const advice = this.generateAdvice(goals, currentStats, progressAnalysis);
      if (advice) {
        embed.addFields({
          name: '💡 アドバイス',
          value: advice,
          inline: false
        });
      }

      if (interaction.deferred) {
        return await interaction.editReply({ embeds: [embed] });
      } else {
        return await interaction.reply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('進捗表示エラー:', error);
      const embed = createErrorEmbed(
        '❌ 表示エラー',
        '進捗の取得中にエラーが発生しました。'
      );
      
      if (interaction.deferred) {
        return await interaction.editReply({ embeds: [embed] });
      } else {
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }

  /**
   * 目標セクションのフォーマット
   */
  formatGoalSection(period, goals, currentStats) {
    return Object.entries(goals)
      .map(([category, target]) => {
        const current = currentStats[category] || 0;
        const percentage = Math.min(Math.round((current / target) * 100), 100);
        const progressBar = getProgressBar(percentage);
        const emoji = this.categoryEmojis[category];
        const name = this.categoryNames[category];
        
        let status = '';
        if (percentage >= 100) status = '✅';
        else if (percentage >= 75) status = '🔥';
        else if (percentage >= 50) status = '📈';
        else if (percentage >= 25) status = '🚀';
        else status = '📍';

        return `${status} ${emoji} **${name}**: ${progressBar} **${current}/${target}** (${percentage}%)`;
      })
      .join('\n');
  }

  /**
   * クイック設定後の進捗概要フォーマット
   */
  formatQuickProgressOverview(presetData, currentStats) {
    const weeklyTotal = Object.values(presetData.weekly).reduce((sum, target) => sum + target, 0);
    const weeklyCompleted = Object.entries(presetData.weekly).reduce((sum, [category, target]) => {
      const current = Math.min(currentStats.weekly[category] || 0, target);
      return sum + current;
    }, 0);

    const monthlyTotal = Object.values(presetData.monthly).reduce((sum, target) => sum + target, 0);
    const monthlyCompleted = Object.entries(presetData.monthly).reduce((sum, [category, target]) => {
      const current = Math.min(currentStats.monthly[category] || 0, target);
      return sum + current;
    }, 0);

    const weeklyPercentage = Math.round((weeklyCompleted / weeklyTotal) * 100);
    const monthlyPercentage = Math.round((monthlyCompleted / monthlyTotal) * 100);

    return `📅 **今週**: ${getProgressBar(weeklyPercentage)} ${weeklyCompleted}/${weeklyTotal} (${weeklyPercentage}%)\n` +
           `🗓️ **今月**: ${getProgressBar(monthlyPercentage)} ${monthlyCompleted}/${monthlyTotal} (${monthlyPercentage}%)`;
  }

  /**
   * 進捗分析
   */
  analyzeProgress(period, goals, currentStats, analysisData) {
    const entries = Object.entries(goals);
    const results = entries.map(([category, target]) => {
      const current = currentStats[category] || 0;
      const percentage = Math.min(Math.round((current / target) * 100), 100);
      return { category, target, current, percentage };
    });

    // サマリー
    const summary = results
      .map(({ category, target, current, percentage }) => {
        const emoji = this.categoryEmojis[category];
        const name = this.categoryNames[category];
        const progressBar = getProgressBar(percentage);
        
        let trend = '';
        if (analysisData && analysisData[category]) {
          const trendValue = analysisData[category].trend || 0;
          if (trendValue > 0) trend = ' 📈';
          else if (trendValue < 0) trend = ' 📉';
        }

        return `${emoji} **${name}**: ${progressBar} **${current}/${target}** (${percentage}%)${trend}`;
      })
      .join('\n');

    // 詳細分析
    let details = '';
    const avgPercentage = Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length);
    const completedCount = results.filter(r => r.percentage >= 100).length;
    const onTrackCount = results.filter(r => r.percentage >= 75).length;

    if (completedCount > 0) {
      details += `🎉 **達成済み**: ${completedCount}/${results.length} カテゴリ\n`;
    }
    if (onTrackCount > completedCount) {
      details += `🔥 **順調**: ${onTrackCount - completedCount} カテゴリが75%以上達成\n`;
    }
    details += `📊 **平均進捗**: ${avgPercentage}%`;

    // 期間残り時間の情報
    const timeRemaining = getTimeRemaining(period);
    if (timeRemaining) {
      details += `\n⏰ **残り時間**: ${timeRemaining}`;
    }

    return { summary, details };
  }

  /**
   * 全体サマリー生成
   */
  generateOverallSummary(goals, currentStats, progressAnalysis) {
    let summary = '';
    const now = new Date();

    // 今日の実績
    if (progressAnalysis.today) {
      const todayTotal = Object.values(progressAnalysis.today).reduce((sum, count) => sum + count, 0);
      if (todayTotal > 0) {
        summary += `📅 **今日の実績**: ${todayTotal}件の活動を完了\n`;
      }
    }

    // 今週・今月の達成率
    let weeklyAchieved = 0;
    let weeklyTotal = 0;
    if (goals.weekly) {
      weeklyTotal = Object.keys(goals.weekly).length;
      weeklyAchieved = Object.entries(goals.weekly).filter(([category, target]) => {
        const current = currentStats.weekly[category] || 0;
        return current >= target;
      }).length;
    }

    let monthlyAchieved = 0;
    let monthlyTotal = 0;
    if (goals.monthly) {
      monthlyTotal = Object.keys(goals.monthly).length;
      monthlyAchieved = Object.entries(goals.monthly).filter(([category, target]) => {
        const current = currentStats.monthly[category] || 0;
        return current >= target;
      }).length;
    }

    if (weeklyTotal > 0) {
      summary += `📈 **週次達成率**: ${weeklyAchieved}/${weeklyTotal} カテゴリ\n`;
    }
    if (monthlyTotal > 0) {
      summary += `📊 **月次達成率**: ${monthlyAchieved}/${monthlyTotal} カテゴリ\n`;
    }

    // ストリーク情報
    if (progressAnalysis.streak) {
      summary += `🔥 **継続ストリーク**: ${progressAnalysis.streak}日間`;
    }

    return summary || null;
  }

  /**
   * アドバイス生成
   */
  generateAdvice(goals, currentStats, progressAnalysis) {
    const advice = [];
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const dayOfMonth = now.getDate();

    // 週次目標のアドバイス
    if (goals.weekly) {
      const weeklyResults = Object.entries(goals.weekly).map(([category, target]) => {
        const current = currentStats.weekly[category] || 0;
        const percentage = (current / target) * 100;
        return { category, target, current, percentage };
      });

      const avgWeeklyProgress = weeklyResults.reduce((sum, r) => sum + r.percentage, 0) / weeklyResults.length;
      
      if (dayOfWeek <= 3 && avgWeeklyProgress < 30) { // 月〜水で30%未満
        advice.push('📅 週の前半です。ペースを上げて目標達成を目指しましょう！');
      } else if (dayOfWeek >= 4 && avgWeeklyProgress < 60) { // 木〜日で60%未満
        advice.push('⚡ 週末が近づいています。ラストスパートをかけましょう！');
      } else if (avgWeeklyProgress >= 100) {
        advice.push('🎉 週次目標を全て達成！さらなる挑戦を検討してみては？');
      }
    }

    // 月次目標のアドバイス
    if (goals.monthly) {
      const monthlyResults = Object.entries(goals.monthly).map(([category, target]) => {
        const current = currentStats.monthly[category] || 0;
        const percentage = (current / target) * 100;
        return { category, target, current, percentage };
      });

      const avgMonthlyProgress = monthlyResults.reduce((sum, r) => sum + r.percentage, 0) / monthlyResults.length;
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const expectedProgress = (dayOfMonth / daysInMonth) * 100;

      if (avgMonthlyProgress < expectedProgress - 20) {
        advice.push('📊 月次目標が予定より遅れています。計画を見直してみましょう。');
      } else if (avgMonthlyProgress > expectedProgress + 20) {
        advice.push('🚀 月次目標が予定より早く進んでいます！この調子で続けましょう。');
      }
    }

    // 特定のカテゴリへのアドバイス
    const allStats = { ...currentStats.weekly, ...currentStats.monthly };
    const lowPerformance = Object.entries(allStats).filter(([category, count]) => count === 0);
    
    if (lowPerformance.length > 0) {
      const categories = lowPerformance.map(([category]) => this.categoryNames[category]).join('、');
      advice.push(`💡 ${categories}の活動がまだありません。小さな一歩から始めてみましょう。`);
    }

    // 継続に関するアドバイス
    if (progressAnalysis.streak >= 7) {
      advice.push('🔥 素晴らしい継続力です！この調子で習慣を維持しましょう。');
    } else if (progressAnalysis.streak === 0) {
      advice.push('🌱 今日から新しいスタートです。小さな目標から始めてみましょう。');
    }

    return advice.length > 0 ? advice.join('\n\n') : null;
  }
}

module.exports = new GoalsHandler();
