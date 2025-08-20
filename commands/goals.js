const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('goals')
    .setDescription('🎯 個人目標の設定・管理')
    .addSubcommand(subcommand =>
      subcommand
        .setName('show')
        .setDescription('📊 現在の目標設定を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('⚙️ 目標を設定')
        .addStringOption(option =>
          option
            .setName('period')
            .setDescription('期間')
            .setRequired(true)
            .addChoices(
              { name: '週次目標', value: 'weekly' },
              { name: '月次目標', value: 'monthly' }
            ))
        .addStringOption(option =>
  option
    .setName('category')
    .setDescription('カテゴリ')
    .setRequired(true)
    .addChoices(
      { name: '📚 本', value: 'books' },
      { name: '🎬 映画', value: 'movies' },
      { name: '📺 アニメ', value: 'animes' }, 
      { name: '📖 漫画', value: 'mangas' }, // 🆕 漫画追加
      { name: '🎯 活動', value: 'activities' },
      { name: '📝 日報', value: 'reports' }
    ))
        .addIntegerOption(option =>
          option
            .setName('target')
            .setDescription('目標数値')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(100)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('🔄 目標をデフォルトに戻す')
        .addStringOption(option =>
          option
            .setName('period')
            .setDescription('リセットする期間（省略時は全て）')
            .setRequired(false)
            .addChoices(
              { name: '週次目標', value: 'weekly' },
              { name: '月次目標', value: 'monthly' },
              { name: '全ての目標', value: 'all' }
            )))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('quick')
        .setDescription('⚡ クイック設定（よく使われる組み合わせ）')
        .addStringOption(option =>
          option
            .setName('preset')
            .setDescription('プリセット')
            .setRequired(true)
            .addChoices(
              { name: '🌱 初心者向け', value: 'beginner' },
              { name: '📈 標準', value: 'standard' },
              { name: '🔥 チャレンジ', value: 'challenge' },
              { name: '🏆 エキスパート', value: 'expert' }
            )))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('progress')
        .setDescription('📊 目標達成進捗を詳細表示')),

  // 実行メソッド
  async execute(interaction) {
    console.log(`[DEBUG] goals コマンド実行: ${interaction.options.getSubcommand()}`);
    
    try {
      // goalsHandlerに処理を委譲
      const goalsHandler = require('../handlers/goalsHandler');
      return await goalsHandler.execute(interaction);
    } catch (error) {
      console.error('[ERROR] goals コマンドでエラー:', error);
      
      // エラーメッセージを送信
      const errorMessage = '❌ コマンドの実行中にエラーが発生しました。';
      
      if (interaction.deferred) {
        return await interaction.editReply(errorMessage);
      } else {
        return await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },

  // コマンドのメタデータ
  category: 'settings',
  permissions: [],
  cooldown: 3,
  
  // 使用例
  examples: [
    '/goals show',
    '/goals set period:週次目標 category:本 target:3',
    '/goals quick preset:チャレンジ',
    '/goals reset period:週次目標',
    '/goals progress'
  ],

  // ヘルプテキスト
  help: {
    description: '個人的な目標を設定・管理する機能です。自分のペースに合わせた目標設定が可能です。',
    usage: '以下の目標管理機能が利用できます：',
    subcommands: {
      show: '現在設定されている目標を表示します',
      set: '個別に目標数値を設定します',
      reset: '目標をデフォルト値に戻します',
      quick: 'あらかじめ用意されたプリセットで一括設定',
      progress: '目標達成状況の詳細分析を表示'
    },
    presets: {
      beginner: '週: 本1冊, 映画2本, 活動3件, 日報5件',
      standard: '週: 本2冊, 映画3本, 活動5件, 日報7件',
      challenge: '週: 本3冊, 映画4本, 活動7件, 日報10件',
      expert: '週: 本4冊, 映画5本, 活動10件, 日報14件'
    },
    tips: [
      '🎯 現実的な目標設定が継続の鍵です',
      '📈 段階的に目標を上げていくことをお勧めします',
      '📊 進捗を定期的に確認して調整しましょう',
      '💪 達成できなくても落ち込まず、次に活かしましょう'
    ]
  }
};
