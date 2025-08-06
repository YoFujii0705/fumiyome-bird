// commands/test-notifications.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test-notifications')
    .setDescription('通知システムのテスト')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('single')
        .setDescription('個別通知のテスト')
        .addStringOption(option =>
          option.setName('notification')
            .setDescription('テストする通知名')
            .setRequired(true)
            .addChoices(
              { name: '朝の挨拶', value: 'morning_greeting' },
              { name: '日報リマインダー', value: 'daily_report_reminder' },
              { name: '週次レポート', value: 'weekly_report' },
              { name: '月次レポート', value: 'monthly_report' },
              { name: '放置アイテムチェック', value: 'abandoned_items_check' },
              { name: '週初目標レポート', value: 'goals_weekly_start' },
              { name: '週中目標レポート', value: 'goals_weekly_mid' },
              { name: '週末目標チェック', value: 'weekly_goals_final' },
              { name: 'ストリークレポート', value: 'streak_report' },
              { name: '目標調整提案', value: 'goals_adjustment' },
              { name: '月初統計サマリー', value: 'monthly_stats_summary' },
              { name: '月中トレンド分析', value: 'monthly_trends_analysis' },
              { name: '月末読書統計', value: 'monthly_books_stats' },
              { name: '月次比較レポート', value: 'monthly_comparison' },
              { name: '月次ウィッシュリスト', value: 'monthly_wishlist' },
              { name: 'ウィッシュリストリマインダー', value: 'monthly_wishlist_reminder' },
              { name: '週次記事リマインダー', value: 'weekly_article_reminder' },
              { name: '月次サマリーレポート', value: 'monthly_summary_report' },
              { name: '四半期レポート', value: 'quarterly_report' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('category')
        .setDescription('カテゴリ別テスト')
        .addStringOption(option =>
          option.setName('category')
            .setDescription('テストするカテゴリ')
            .setRequired(true)
            .addChoices(
              { name: '基本通知', value: 'basic' },
              { name: '統計通知', value: 'stats' },
              { name: '目標通知', value: 'goals' },
              { name: 'リマインダー', value: 'reminders' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('all')
        .setDescription('全通知テスト（⚠️時間がかかります）'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('通知システムの状態確認'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('restart')
        .setDescription('通知システムの再起動'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('stop')
        .setDescription('通知システムの緊急停止')),

  async execute(interaction) {
    console.log(`🧪 test-notifications コマンド実行: ${interaction.user.tag}`);
    
    // 管理者権限チェック
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return await interaction.reply({ 
        content: '❌ この機能は管理者のみ使用できます。', 
        ephemeral: true 
      });
    }

    const notifications = interaction.client.notificationService;
    
    if (!notifications) {
      console.error('❌ NotificationService が見つかりません');
      return await interaction.reply({ 
        content: '❌ 通知サービスが初期化されていません。ボットを再起動してください。', 
        ephemeral: true 
      });
    }

    const subcommand = interaction.options.getSubcommand();
    console.log(`📋 実行するサブコマンド: ${subcommand}`);

    try {
      switch (subcommand) {
        case 'single':
        case 'category':
        case 'all':
          console.log(`🔄 ${subcommand} テストを開始...`);
          await notifications.handleTestCommand(interaction);
          break;
          
        case 'status':
          await this.handleStatusCommand(interaction, notifications);
          break;
          
        case 'restart':
          await this.handleRestartCommand(interaction, notifications);
          break;
          
        case 'stop':
          await this.handleStopCommand(interaction, notifications);
          break;
          
        default:
          await interaction.reply({ 
            content: `❌ 無効なサブコマンドです: ${subcommand}`, 
            ephemeral: true 
          });
      }
    } catch (error) {
      console.error('❌ test-notifications コマンドエラー:', error);
      
      const errorContent = `❌ コマンド実行中にエラーが発生しました:\n\`\`\`${error.message}\`\`\``;
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: errorContent, 
          ephemeral: true 
        });
      } else {
        await interaction.editReply(errorContent);
      }
    }
  },

  async handleStatusCommand(interaction, notifications) {
    console.log('📊 ステータス確認開始...');
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const status = await notifications.getSystemStatus();
      
      const statusEmbed = {
        title: '📊 通知システム状態',
        color: status.notification.isActive ? 0x00FF00 : 0xFF0000,
        fields: [
          {
            name: '🔔 通知サービス',
            value: status.notification.isActive ? '✅ 稼働中' : '❌ 停止中',
            inline: true
          },
          {
            name: '📢 通知チャンネル',
            value: status.channel,
            inline: true
          },
          {
            name: '📊 Google Sheets',
            value: status.googleSheets,
            inline: true
          },
          {
            name: '⏰ アクティブタスク数',
            value: `${status.taskCount}個`,
            inline: true
          },
          {
            name: '📋 稼働中の通知',
            value: status.activeTasks.length > 0 ? 
              status.activeTasks.slice(0, 10).map(task => `• ${task}`).join('\n') + 
              (status.activeTasks.length > 10 ? `\n... 他${status.activeTasks.length - 10}個` : '') :
              'なし',
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'システム状態の詳細確認'
        }
      };

      await interaction.editReply({ embeds: [statusEmbed] });
      console.log('✅ ステータス確認完了');
    } catch (error) {
      console.error('❌ 状態確認エラー:', error);
      await interaction.editReply('❌ 状態確認中にエラーが発生しました。');
    }
  },

  async handleRestartCommand(interaction, notifications) {
    console.log('🔄 システム再起動開始...');
    await interaction.deferReply({ ephemeral: true });
    
    try {
      await interaction.editReply('🔄 通知システムを再起動しています...');
      await notifications.restartSystem();
      await interaction.editReply('✅ 通知システムの再起動が完了しました。');
      console.log('✅ システム再起動完了');
    } catch (error) {
      console.error('❌ 再起動エラー:', error);
      await interaction.editReply('❌ 再起動中にエラーが発生しました。');
    }
  },

  async handleStopCommand(interaction, notifications) {
    console.log('🛑 システム停止開始...');
    await interaction.deferReply({ ephemeral: true });
    
    try {
      await interaction.editReply('🛑 通知システムを停止しています...');
      await notifications.emergencyStop();
      await interaction.editReply('✅ 通知システムを停止しました。');
      console.log('✅ システム停止完了');
    } catch (error) {
      console.error('❌ 停止エラー:', error);
      await interaction.editReply('❌ 停止中にエラーが発生しました。');
    }
  }
};
