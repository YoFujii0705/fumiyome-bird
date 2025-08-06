const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('movie')
    .setDescription('🎬 映画の管理 - 映画ライフをサポート')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('🎬 新しい映画を追加')
        .addStringOption(option =>
          option
            .setName('title')
            .setDescription('映画のタイトル')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('memo')
            .setDescription('備考・メモ（任意）')
            .setRequired(false)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('watch')
        .setDescription('✅ 映画を視聴完了')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('視聴した映画のID')
            .setRequired(true)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('skip')
        .setDescription('😅 映画を見逃し・スキップ')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('見逃した映画のID')
            .setRequired(true)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('🎬 登録されている全ての映画を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('watchlist')
        .setDescription('🍿 観たい映画一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('watched')
        .setDescription('✅ 視聴済み映画一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('📄 特定の映画の詳細情報を表示')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('詳細を見たい映画のID')
            .setRequired(true))),

  // コマンドの実行処理（ハンドラーに委譲）
  async execute(interaction) {
    throw new Error('このコマンドはハンドラーで処理されます');
  },

  // コマンドのメタデータ
  category: 'management',
  permissions: [],
  cooldown: 3,
  
  // 使用例
  examples: [
    '/movie add title:君の名は。',
    '/movie add title:アベンジャーズ memo:マーベル映画',
    '/movie watch id:1',
    '/movie skip id:2',
    '/movie list',
    '/movie watchlist',
    '/movie watched',
    '/movie info id:1'
  ],

  // ヘルプテキスト
  help: {
    description: '映画の管理機能です。観たい映画リストの管理と視聴記録をサポートします。',
    usage: '以下のサブコマンドが利用できます：',
    subcommands: {
      add: '新しい映画を観たいリストに登録します。',
      watch: '映画を視聴完了し、視聴済みリストに移動します。',
      skip: '映画を見逃し・スキップとしてマークします。',
      list: 'すべての映画をステータス別に表示します。',
      watchlist: '観たい映画のみを表示します。',
      watched: '視聴済みの映画のみを表示します。',
      info: '特定の映画の詳細情報を表示します。'
    },
    tips: [
      '📝 映画の感想は /report movie コマンドで記録できます',
      '🔍 映画の検索は /search movie コマンドが便利です',
      '📊 視聴統計は /stats コマンドで確認できます'
    ]
  }
};
