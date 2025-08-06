const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('🔍 アイテムの検索 - 登録済みデータから検索')
    .addSubcommand(subcommand =>
      subcommand
        .setName('book')
        .setDescription('📚 本を検索')
        .addStringOption(option =>
          option
            .setName('keyword')
            .setDescription('検索キーワード（タイトル・作者・備考）')
            .setRequired(true)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('movie')
        .setDescription('🎬 映画を検索')
        .addStringOption(option =>
          option
            .setName('keyword')
            .setDescription('検索キーワード（タイトル・備考）')
            .setRequired(true)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('activity')
        .setDescription('🎯 活動を検索')
        .addStringOption(option =>
          option
            .setName('keyword')
            .setDescription('検索キーワード（活動内容・備考）')
            .setRequired(true)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('all')
        .setDescription('🔍 全カテゴリから検索')
        .addStringOption(option =>
          option
            .setName('keyword')
            .setDescription('検索キーワード')
            .setRequired(true)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('📊 ステータス別検索')
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('検索カテゴリ')
            .setRequired(true)
            .addChoices(
              { name: '📚 本', value: 'book' },
              { name: '🎬 映画', value: 'movie' },
              { name: '🎯 活動', value: 'activity' }
            ))
        .addStringOption(option =>
          option
            .setName('status')
            .setDescription('検索ステータス')
            .setRequired(true)
            .addChoices(
              { name: '🛒 買いたい', value: 'want_to_buy' },
              { name: '📋 積読', value: 'want_to_read' },
              { name: '📖 読書中', value: 'reading' },
              { name: '✅ 読了/視聴済み/完了', value: 'finished' },
              { name: '🍿 観たい', value: 'want_to_watch' },
              { name: '🎯 予定中', value: 'planned' },
              { name: '😅 スキップ/見逃し', value: 'skipped' }
            ))),

  // コマンドの実行処理（ハンドラーに委譲）
  async execute(interaction) {
    throw new Error('このコマンドはハンドラーで処理されます');
  },

  // コマンドのメタデータ
  category: 'utility',
  permissions: [],
  cooldown: 2,
  
  // 使用例
  examples: [
    '/search book keyword:JavaScript',
    '/search movie keyword:アベンジャーズ',
    '/search activity keyword:運動',
    '/search all keyword:学習',
    '/search status category:本 status:読書中'
  ],

  // ヘルプテキスト
  help: {
    description: '登録済みのアイテムを検索する機能です。キーワードやステータスで絞り込み検索ができます。',
    usage: '以下の検索方法が利用できます：',
    subcommands: {
      book: '本のタイトル、作者、備考からキーワード検索します',
      movie: '映画のタイトル、備考からキーワード検索します',
      activity: '活動内容、備考からキーワード検索します',
      all: '全カテゴリを横断してキーワード検索します',
      status: '特定のカテゴリ・ステータスでフィルタリングします'
    },
    searchTips: [
      '🔤 部分一致で検索されるため、短いキーワードでも有効です',
      '📝 ひらがな・カタカナ・漢字すべてに対応しています',
      '🎯 複数の言葉を含む場合は、スペースで区切って検索',
      '📊 ステータス検索で進捗管理がしやすくなります'
    ],
    examples_detailed: {
      keyword_search: [
        'タイトル: "ワンピース" → ワンピース関連の本を検索',
        '作者: "村上春樹" → 村上春樹の作品を検索',
        'ジャンル: "ミステリー" → ミステリー関連作品を検索'
      ],
      status_search: [
        '読書中の本だけを確認したい時',
        '観たい映画リストをチェックしたい時',
        '完了済みの活動を振り返りたい時'
      ]
    }
  }
};
