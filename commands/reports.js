const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('reports')
    .setDescription('📝 レポート履歴の管理 - 記録した日報の検索・閲覧')
    // 🆕 history サブコマンドを選択式に変更
    .addSubcommand(subcommand =>
      subcommand
        .setName('history')
        .setDescription('📜 特定アイテムのレポート履歴を表示（選択式）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('recent')
        .setDescription('🕒 最近のレポート一覧を表示')
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('何日前まで表示するか（デフォルト: 7日）')
            .setRequired(false)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('search')
        .setDescription('🔍 レポート内容でキーワード検索')
        .addStringOption(option =>
          option
            .setName('keyword')
            .setDescription('検索キーワード')
            .setRequired(true)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('calendar')
        .setDescription('📅 カレンダー形式でレポート状況を表示')
        .addStringOption(option =>
          option
            .setName('month')
            .setDescription('表示月（YYYY-MM形式、省略時は今月）')
            .setRequired(false)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('analytics')
        .setDescription('📊 レポート分析（頻度・傾向・統計）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('export')
        .setDescription('📤 レポートデータのエクスポート')
        .addStringOption(option =>
          option
            .setName('format')
            .setDescription('出力形式')
            .setRequired(false)
            .addChoices(
              { name: 'テキスト形式', value: 'text' },
              { name: 'マークダウン形式', value: 'markdown' },
              { name: 'JSON形式', value: 'json' }
            ))
        .addStringOption(option =>
          option
            .setName('period')
            .setDescription('期間')
            .setRequired(false)
            .addChoices(
              { name: '今週', value: 'week' },
              { name: '今月', value: 'month' },
              { name: '全期間', value: 'all' }
            ))),
  
  // コマンドの実行処理（ハンドラーに委譲）
  async execute(interaction) {
    throw new Error('このコマンドはハンドラーで処理されます');
  },
  
  // メタデータ
  category: 'tracking',
  permissions: [],
  cooldown: 3,
  
  // 🆕 更新された使用例
  examples: [
    '/reports history （選択式でカテゴリ→アイテム選択）',
    '/reports recent days:14',
    '/reports search keyword:感想'
  ],
  
  help: {
    description: 'これまでに記録した日報・レポートの検索、閲覧機能です。活動の振り返りをサポートします。',
    usage: '以下のレポート管理機能が利用できます：',
    subcommands: {
      history: '特定の本・映画・活動に関するすべてのレポート履歴を時系列で表示（選択式）',
      recent: '指定した日数以内に記録されたレポートを一覧表示',
      search: 'レポート内容からキーワード検索し、関連する記録を抽出'
    },
    tips: [
      '📈 継続的な記録で成長パターンを把握',
      '🔍 キーワード検索で過去の気づきを再発見',
      '📊 レポート頻度で習慣の定着度を確認'
    ]
  }
};
