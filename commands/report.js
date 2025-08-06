const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('📝 日報の記録 - 活動の振り返りをサポート')
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('記録対象のカテゴリ')
        .setRequired(true)
        .addChoices(
          { name: '📚 本', value: 'book' },
          { name: '🎬 映画', value: 'movie' },
          { name: '🎯 活動', value: 'activity' }
        ))
    .addIntegerOption(option =>
      option
        .setName('id')
        .setDescription('対象のアイテムID')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('content')
        .setDescription('記録内容・感想・進捗など')
        .setRequired(true)),

  // コマンドの実行処理（ハンドラーに委譲）
  async execute(interaction) {
    throw new Error('このコマンドはハンドラーで処理されます');
  },

  // コマンドのメタデータ
  category: 'tracking',
  permissions: [],
  cooldown: 2,
  
  // 使用例
  examples: [
    '/report category:本 id:1 content:第3章まで読了。主人公の心境変化が興味深い',
    '/report category:映画 id:2 content:感動的なストーリーでした。評価★★★★☆',
    '/report category:活動 id:3 content:今日は30分ジョギング完了。体調良好',
    '/report category:本 id:4 content:50ページ進んだ。難しい内容だが理解できている',
    '/report category:活動 id:5 content:プログラミング学習2時間。配列の概念を習得'
  ],

  // ヘルプテキスト
  help: {
    description: '日報・進捗記録機能です。本・映画・活動の進捗や感想を記録し、継続をサポートします。',
    usage: 'カテゴリ、ID、記録内容を指定して日報を作成します。',
    parameters: {
      category: '記録対象（本/映画/活動）を選択します',
      id: '記録したいアイテムのIDを指定します',
      content: '今日の進捗、感想、気づきなどを自由に記録します'
    },
    tips: [
      '📊 記録した内容は /reports コマンドで後から確認できます',
      '🔍 キーワード検索は /reports search で可能です',
      '📈 継続的な記録で成長を実感できます',
      '💭 短い記録でも継続することが重要です'
    ],
    goodPractices: [
      '読書: 読んだページ数、印象に残った部分、理解度など',
      '映画: 感想、評価、印象的なシーンなど',
      '活動: 実行時間、達成度、課題、次の目標など'
    ]
  }
};
