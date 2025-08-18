const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('book')
    .setDescription('📚 本の管理 - 読書ライフをサポート')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('📖 新しい本を追加')
        .addStringOption(option =>
          option
            .setName('title')
            .setDescription('本のタイトル')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('author')
            .setDescription('作者名')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('status')
            .setDescription('初期ステータス（デフォルト: 積読）')
            .setRequired(false)
            .addChoices(
              { name: '🛒 買いたい', value: 'want_to_buy' },
              { name: '📋 積読', value: 'want_to_read' }
            ))
        .addStringOption(option =>
          option
            .setName('memo')
            .setDescription('備考・メモ（任意）')
            .setRequired(false)))
    
    // 🆕 選択式に変更（IDオプション削除）
    .addSubcommand(subcommand =>
      subcommand
        .setName('buy')
        .setDescription('🛒 本を購入完了（買いたい → 積読）選択式'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('📖 読書を開始（積読 → 読書中）選択式'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('finish')
        .setDescription('✅ 読書を完了（読書中 → 読了）選択式'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('📚 登録されている全ての本を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('wishlist')
        .setDescription('🛒 買いたい本一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('reading')
        .setDescription('📖 現在読書中の本を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('finished')
        .setDescription('✅ 読了済みの本を表示'))
    
    // 🆕 選択式に変更（IDオプション削除）
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('📄 本の詳細情報を表示（選択式）')),
  
  // コマンドの実行処理（ハンドラーに委譲）
  async execute(interaction) {
    throw new Error('このコマンドはハンドラーで処理されます');
  },
  
  // メタデータ
  category: 'management',
  permissions: [],
  cooldown: 3,
  
  // 🆕 更新された使用例
  examples: [
    '/book add title:鬼滅の刃 author:吾峠呼世晴',
    '/book add title:JavaScript入門 author:山田太郎 status:買いたい memo:プログラミング学習用',
    '/book buy （選択式）',
    '/book start （選択式）',
    '/book finish （選択式）',
    '/book list',
    '/book wishlist',
    '/book reading',
    '/book info （選択式）'
  ],
  
  help: {
    description: '本の管理機能です。読書の進捗を追跡し、読書習慣の形成をサポートします。',
    usage: '以下のサブコマンドが利用できます：',
    subcommands: {
      add: '新しい本を登録します。買いたい本リストまたは積読リストに追加できます。',
      buy: '買いたい本を購入完了し、積読リストに移動します。（選択式）',
      start: '積読本の読書を開始し、読書中ステータスに変更します。（選択式）',
      finish: '読書中の本を読了完了し、読了リストに移動します。（選択式）',
      list: 'すべての本をステータス別に表示します。',
      wishlist: '買いたい本のみを表示します。',
      reading: '現在読書中の本のみを表示します。',
      finished: '読了済みの本のみを表示します。',
      info: '特定の本の詳細情報を表示します。（選択式）'
    },
    tips: [
      '📝 読書の記録は /report で日報として残せます（選択式）',
      '🔍 本の検索は /search book コマンドが便利です',
      '📊 読書統計は /stats books コマンドで確認できます'
    ]
  }
};
