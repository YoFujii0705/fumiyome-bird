const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('manga')
    .setDescription('📚 漫画の管理 - 漫画ライフをサポート')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('📚 新しい漫画を追加')
        .addStringOption(option =>
          option
            .setName('title')
            .setDescription('漫画のタイトル')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('author')
            .setDescription('作者名')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('作品タイプ')
            .setRequired(true)
            .addChoices(
              { name: 'シリーズもの', value: 'series' },
              { name: '読切', value: 'oneshot' }
            ))
        .addStringOption(option =>
          option
            .setName('format')
            .setDescription('形式')
            .setRequired(true)
            .addChoices(
              { name: '単行本', value: 'volume' },
              { name: '話数', value: 'chapter' }
            ))
        .addIntegerOption(option =>
          option
            .setName('total_count')
            .setDescription('総数（巻数/話数）※完結済みの場合のみ')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(9999))
        .addStringOption(option =>
          option
            .setName('status')
            .setDescription('作品ステータス')
            .setRequired(false)
            .addChoices(
              { name: '連載中/未完結', value: 'ongoing' },
              { name: '完結済み', value: 'completed' }
            ))
        .addStringOption(option =>
          option
            .setName('memo')
            .setDescription('備考・メモ（任意）')
            .setRequired(false))
    // 🆕 連載スケジュール追加
        .addStringOption(option =>
          option.setName('update_schedule')
            .setDescription('更新スケジュール（例: weekly-monday, monthly-15, irregular）')
            .setRequired(false))
        // 🆕 公式URL追加
        .addStringOption(option =>
          option.setName('series_url')
            .setDescription('公式サイト・連載サイトのURL')
            .setRequired(false)))

    .addSubcommand(subcommand =>
  subcommand
    .setName('test')
    .setDescription('🧪 通知テスト機能（開発・デバッグ用）')
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('テスト内容')
        .setRequired(true)
        .addChoices(
          { name: '指定漫画の通知テスト', value: 'notification' },
          { name: '全アクティブ通知テスト', value: 'all_notifications' },
          { name: '通知設定ステータス確認', value: 'check_status' },
          { name: '次回通知日時更新', value: 'update_schedule' }
        ))
    .addIntegerOption(option =>
      option
        .setName('manga_id')
        .setDescription('漫画ID（notification, check_status, update_scheduleで使用）')
        .setRequired(false)))

.addSubcommand(subcommand =>
  subcommand
    .setName('debug')
    .setDescription('🔧 通知設定デバッグ情報表示（開発用）'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('read')
        .setDescription('📚 巻数/話数を読了（選択式）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('🚀 漫画の読書を開始（選択式）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('finish')
        .setDescription('🎉 漫画を完走（選択式）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('drop')
        .setDescription('💔 漫画の読書を中断（選択式）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('📚 登録されている全ての漫画を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('reading')
        .setDescription('📖 読書中漫画一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('completed')
        .setDescription('✅ 読了済み漫画一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('progress')
        .setDescription('📊 漫画の読書進捗を表示（選択式）'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('📄 漫画の詳細情報を表示（選択式）')),
  
  // コマンドの実行処理（ハンドラーに委譲）
  async execute(interaction) {
    throw new Error('このコマンドはハンドラーで処理されます');
  },
  
  // メタデータ
  category: 'management',
  permissions: [],
  cooldown: 3,
  
  examples: [
    '/manga add title:進撃の巨人 author:諫山創 type:series format:volume total_count:34 status:completed',
    '/manga add title:ワンピース author:尾田栄一郎 type:series format:volume status:ongoing',
    '/manga add title:読切作品 author:作者名 type:oneshot format:chapter total_count:1',
    '/manga read （選択式で巻数/話数を選択）',
    '/manga start （選択式）',
    '/manga finish （選択式）',
    '/manga drop （選択式）',
    '/manga list',
    '/manga reading',
    '/manga completed',
    '/manga progress （選択式）',
    '/manga info （選択式）'
  ],
  
  help: {
    description: '漫画の管理機能です。読みたい漫画リストの管理と読書記録をサポートします。巻数・話数ごとの進捗管理も可能です。',
    usage: '以下のサブコマンドが利用できます：',
    subcommands: {
      add: '新しい漫画を読みたいリストに登録します。作品タイプと形式の指定が必要です。',
      read: '特定の巻数/話数を読了として記録します。（選択式）',
      start: '漫画の読書を開始し、読書中ステータスに変更します。（選択式）',
      finish: '漫画を完走し、完了ステータスに変更します。（選択式）',
      drop: '漫画の読書を中断し、中断ステータスに変更します。（選択式）',
      list: 'すべての漫画をステータス別に表示します。',
      reading: '読書中の漫画のみを表示します。',
      completed: '読了済みの漫画のみを表示します。',
      progress: '特定の漫画の読書進捗を詳細表示します。（選択式）',
      info: '特定の漫画の詳細情報を表示します。（選択式）'
    },
    tips: [
      '📝 漫画の感想は /report manga で記録できます（選択式）',
      '🔍 漫画の検索は /search manga コマンドが便利です',
      '📊 読書統計は /stats コマンドで確認できます',
      '📚 巻別・話別の詳細な感想も記録可能です',
      '🎯 進捗管理で未読の巻数/話数が一目でわかります',
      '📖 単行本形式と話数形式の両方に対応しています'
    ]
  }
};
