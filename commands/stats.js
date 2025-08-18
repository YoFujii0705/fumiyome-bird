const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('📊 統計情報の表示 - 活動データの分析')
    .addSubcommand(subcommand =>
      subcommand
        .setName('summary')
        .setDescription('📊 全体統計サマリー'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('weekly')
        .setDescription('📅 今週の活動統計'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('monthly')
        .setDescription('🗓️ 今月の活動統計'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('books')
        .setDescription('📚 読書統計詳細'))
    
    .addSubcommand(subcommand => // 🆕 アニメサブコマンド追加
      subcommand
        .setName('anime')
        .setDescription('アニメ視聴統計の詳細を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('current')
        .setDescription('⚡ 現在の進行状況'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('trends')
        .setDescription('📈 活動トレンド分析'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('goals')
        .setDescription('🎯 目標達成状況'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('compare')
        .setDescription('📊 期間比較統計')
        .addStringOption(option =>
          option
            .setName('period')
            .setDescription('比較期間')
            .setRequired(true)
            .addChoices(
              { name: '今週 vs 先週', value: 'week' },
              { name: '今月 vs 先月', value: 'month' },
              { name: '今年 vs 昨年', value: 'year' }
            ))),

  // コマンドの実行処理（ハンドラーに委譲）
  async execute(interaction) {
    throw new Error('このコマンドはハンドラーで処理されます');
  },

  // コマンドのメタデータ
  category: 'analytics',
  permissions: [],
  cooldown: 5,
  
  // 使用例
  examples: [
    '/stats summary',
    '/stats weekly',
    '/stats monthly',
    '/stats books',
    '/stats current'
  ],

  // ヘルプテキスト
  help: {
    description: '活動データの統計情報を表示する機能です。進捗の可視化と分析をサポートします。',
    usage: '以下の統計レポートが利用できます：',
    subcommands: {
      summary: '本・映画・活動の全体的な統計サマリーを表示',
      weekly: '今週完了したアイテム数と活動状況を表示',
      monthly: '今月の実績と達成状況を詳細表示',
      books: '読書に特化した詳細統計（読了数、ペース、分析）',
      current: '現在進行中のアイテム一覧と進捗状況'
    },
    metrics: [
      '📚 読書: 読了冊数、読書ペース、完読率',
      '🎬 映画: 視聴本数、完了率',
      '🎯 活動: 完了率、継続性、達成度',
      '📝 記録: 日報投稿頻度、記録継続日数'
    ],
    benefits: [
      '📈 進捗の可視化でモチベーション向上',
      '🎯 達成度の明確化',
      '📊 改善点の発見',
      '🏆 達成感の増強と継続意欲の向上'
    ]
  }
};
