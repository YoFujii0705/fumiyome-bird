const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity')
    .setDescription('🎯 活動の管理 - 目標達成をサポート')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('🎯 新しい活動を追加')
        .addStringOption(option =>
          option
            .setName('content')
            .setDescription('活動内容')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('memo')
            .setDescription('備考・メモ（任意）')
            .setRequired(false)))
    
    // 🆕 選択式に変更（IDオプション削除）
    .addSubcommand(subcommand =>
      subcommand
        .setName('done')
        .setDescription('✅ 活動を完了（選択式）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('skip')
        .setDescription('😅 活動をスキップ（選択式）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('🎯 登録されている全ての活動を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('planned')
        .setDescription('🎯 予定中の活動一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('completed')
        .setDescription('✅ 完了済み活動一覧を表示'))
    
    // 🆕 選択式に変更（IDオプション削除）
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('📄 活動の詳細情報を表示（選択式）')),
  
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
    '/activity add content:毎日30分運動する',
    '/activity add content:新しいプログラミング言語を学ぶ memo:Python学習',
    '/activity done （選択式）',
    '/activity skip （選択式）',
    '/activity list',
    '/activity planned',
    '/activity info （選択式）'
  ],
  
  help: {
    description: '活動・目標の管理機能です。日々の活動や目標の達成をサポートします。',
    usage: '以下のサブコマンドが利用できます：',
    subcommands: {
      add: '新しい活動や目標を予定リストに登録します。',
      done: '活動を完了し、完了済みリストに移動します。（選択式）',
      skip: '活動をスキップとしてマークします。（選択式）',
      list: 'すべての活動をステータス別に表示します。',
      planned: '予定中の活動のみを表示します。',
      completed: '完了済みの活動のみを表示します。',
      info: '特定の活動の詳細情報を表示します。（選択式）'
    },
    tips: [
      '📝 活動の進捗は /report で記録できます（選択式）',
      '🔍 活動の検索は /search activity コマンドが便利です',
      '📊 活動統計は /stats コマンドで確認できます'
    ]
  }
};
