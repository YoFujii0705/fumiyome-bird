const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('article')
    .setDescription('📰 読みたい記事リスト管理 - 記事を効率的に読もう')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('📝 新しい記事を追加')
        .addStringOption(option =>
          option
            .setName('title')
            .setDescription('記事のタイトル')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('url')
            .setDescription('記事のURL')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('priority')
            .setDescription('優先度（デフォルト: 中）')
            .setRequired(false)
            .addChoices(
              { name: '🔴 高', value: 'high' },
              { name: '🟡 中', value: 'medium' },
              { name: '🟢 低', value: 'low' }
            ))
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('カテゴリ（デフォルト: 一般）')
            .setRequired(false)
            .addChoices(
              { name: '💻 技術', value: 'tech' },
              { name: '💼 ビジネス', value: 'business' },
              { name: '🌟 ライフスタイル', value: 'lifestyle' },
              { name: '📰 ニュース', value: 'news' },
              { name: '🎓 学術', value: 'academic' },
              { name: '📄 一般', value: 'general' }
            ))
        .addStringOption(option =>
          option
            .setName('memo')
            .setDescription('備考・メモ（任意）')
            .setRequired(false)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('read')
        .setDescription('✅ 記事を読了完了')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('読了した記事のID')
            .setRequired(true))
        .addIntegerOption(option =>
          option
            .setName('rating')
            .setDescription('記事の評価（1-5星）')
            .setRequired(false)
            .addChoices(
              { name: '⭐ 1星', value: 1 },
              { name: '⭐⭐ 2星', value: 2 },
              { name: '⭐⭐⭐ 3星', value: 3 },
              { name: '⭐⭐⭐⭐ 4星', value: 4 },
              { name: '⭐⭐⭐⭐⭐ 5星', value: 5 }
            ))
        .addStringOption(option =>
          option
            .setName('review')
            .setDescription('感想・レビュー（任意）')
            .setRequired(false)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('📋 全記事一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('pending')
        .setDescription('📝 未読記事一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('read_list')
        .setDescription('✅ 読了済み記事一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('📄 特定の記事の詳細情報を表示')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('詳細を見たい記事のID')
            .setRequired(true)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('🗑️ 記事を削除')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('削除する記事のID')
            .setRequired(true))),
  
  // コマンドの実行処理（ハンドラーに委譲）
  async execute(interaction) {
    // このコマンドは articleHandler.js で処理される
    throw new Error('このコマンドはハンドラーで処理されます');
  },
  
  // コマンドのメタデータ
  category: 'reading',
  permissions: [],
  cooldown: 3, // 3秒のクールダウン
  
  // 使用例
  examples: [
    '/article add title:"React 18の新機能" url:https://example.com/react18 category:技術 priority:高',
    '/article add title:"時間管理術" url:https://example.com/time-management category:ライフスタイル',
    '/article read id:1 rating:4 review:"とても参考になりました"',
    '/article list',
    '/article pending',
    '/article read_list',
    '/article info id:1',
    '/article remove id:5'
  ],
  
  // ヘルプテキスト
  help: {
    description: '読みたい記事リストの管理機能です。記事を整理し、効率的な読書習慣を形成できます。',
    usage: '以下のサブコマンドが利用できます：',
    subcommands: {
      add: '新しい記事を読書リストに追加します。カテゴリや優先度も設定できます。',
      read: '記事を読了完了し、評価やレビューも記録できます。',
      list: 'すべての記事をステータス別に表示します。',
      pending: '未読の記事のみをカテゴリ・優先度別に表示します。',
      read_list: '読了済みの記事一覧を表示します。',
      info: '特定の記事の詳細情報（URL、評価、レビューなど）を表示します。',
      remove: '記事を読書リストから削除します。'
    },
    tips: [
      '📅 毎週金曜日に未読記事の通知が届きます',
      '🔍 記事の検索は /search article コマンドが便利です',
      '📊 読書統計は /stats articles で確認できます'
    ],
    features: [
      '📰 カテゴリ別記事管理',
      '🎯 優先度付けシステム',
      '⭐ 記事評価・レビュー機能',
      '📅 定期的な読書リマインダー',
      '📊 読書統計の記録',
      '🔗 URLの自動保存'
    ],
    categories: {
      tech: '💻 プログラミング、IT、テクノロジー関連',
      business: '💼 ビジネス、マーケティング、経営関連',
      lifestyle: '🌟 ライフハック、健康、趣味関連',
      news: '📰 ニュース、時事問題関連',
      academic: '🎓 学術論文、研究関連',
      general: '📄 その他一般的な記事'
    }
  }
};
