const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anime')
    .setDescription('📺 アニメの管理 - アニメライフをサポート')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('📺 新しいアニメを追加')
        .addStringOption(option =>
          option
            .setName('title')
            .setDescription('アニメのタイトル')
            .setRequired(true))
        .addIntegerOption(option =>
          option
            .setName('episodes')
            .setDescription('総話数')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(9999))
        .addStringOption(option =>
          option
            .setName('genre')
            .setDescription('ジャンル（任意）')
            .setRequired(false)
            .addChoices(
              { name: 'アクション', value: 'action' },
              { name: 'アドベンチャー', value: 'adventure' },
              { name: 'コメディ', value: 'comedy' },
              { name: 'ドラマ', value: 'drama' },
              { name: 'ファンタジー', value: 'fantasy' },
              { name: 'ホラー', value: 'horror' },
              { name: 'ミステリー', value: 'mystery' },
              { name: 'ロマンス', value: 'romance' },
              { name: 'SF', value: 'sci-fi' },
              { name: 'スポーツ', value: 'sports' },
              { name: 'スリラー', value: 'thriller' },
              { name: 'その他', value: 'other' }
            ))
        .addStringOption(option =>
          option
            .setName('memo')
            .setDescription('備考・メモ（任意）')
            .setRequired(false)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('watch')
        .setDescription('📺 話数を視聴完了（選択式）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('🚀 アニメの視聴を開始（選択式）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('finish')
        .setDescription('🎉 アニメを完走（選択式）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('drop')
        .setDescription('💔 アニメを視聴中断（選択式）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('📺 登録されている全てのアニメを表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('watchlist')
        .setDescription('🍿 観たいアニメ一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('watching')
        .setDescription('📺 視聴中アニメ一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('completed')
        .setDescription('✅ 完走済みアニメ一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('progress')
        .setDescription('📊 アニメの視聴進捗を表示（選択式）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('📄 アニメの詳細情報を表示（選択式）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('log')
        .setDescription('📝 話数ごとの視聴ログを表示（選択式）')),
  
  // コマンドの実行処理（ハンドラーに委譲）
  async execute(interaction) {
    throw new Error('このコマンドはハンドラーで処理されます');
  },
  
  // メタデータ
  category: 'management',
  permissions: [],
  cooldown: 3,
  
  examples: [
    '/anime add title:鬼滅の刃 episodes:26 genre:action',
    '/anime add title:進撃の巨人 episodes:75 genre:action memo:Season1-4まで',
    '/anime watch （選択式で話数を選択）',
    '/anime start （選択式）',
    '/anime finish （選択式）',
    '/anime drop （選択式）',
    '/anime list',
    '/anime watchlist',
    '/anime watching',
    '/anime completed',
    '/anime progress （選択式）',
    '/anime info （選択式）',
    '/anime log （選択式）'
  ],
  
  help: {
    description: 'アニメの管理機能です。観たいアニメリストの管理と視聴記録をサポートします。話数ごとの進捗管理も可能です。',
    usage: '以下のサブコマンドが利用できます：',
    subcommands: {
      add: '新しいアニメを観たいリストに登録します。総話数の指定が必要です。',
      watch: '特定の話数を視聴完了として記録します。（選択式）',
      start: 'アニメの視聴を開始し、視聴中ステータスに変更します。（選択式）',
      finish: 'アニメを完走し、完了ステータスに変更します。（選択式）',
      drop: 'アニメの視聴を中断し、中断ステータスに変更します。（選択式）',
      list: 'すべてのアニメをステータス別に表示します。',
      watchlist: '観たいアニメのみを表示します。',
      watching: '視聴中のアニメのみを表示します。',
      completed: '完走済みのアニメのみを表示します。',
      progress: '特定のアニメの視聴進捗を詳細表示します。（選択式）',
      info: '特定のアニメの詳細情報を表示します。（選択式）',
      log: '特定のアニメの話数ごとの視聴ログを表示します。（選択式）'
    },
    tips: [
      '📝 アニメの感想は /report で記録できます（選択式）',
      '🔍 アニメの検索は /search anime コマンドが便利です',
      '📊 視聴統計は /stats コマンドで確認できます',
      '📺 話数ごとの詳細な感想も記録可能です',
      '🎯 進捗管理で未視聴の話数が一目でわかります'
    ]
  }
};
