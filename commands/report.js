const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('📝 日報の記録 - 活動の振り返りをサポート（選択式）')
    // 🆕 選択式に変更（categoryとidオプションを削除、contentオプションも削除）
    // すべて選択式のUIで行う
    ,
  
  // コマンドの実行処理（ハンドラーに委譲）
  async execute(interaction) {
    throw new Error('このコマンドはハンドラーで処理されます');
  },
  
  // メタデータ
  category: 'tracking',
  permissions: [],
  cooldown: 2,
  
  // 🆕 更新された使用例
  examples: [
    '/report （選択式で記録対象を選択）',
    '→ カテゴリ選択 → アイテム選択 → 内容入力'
  ],
  
  help: {
    description: '日報・進捗記録機能です。本・映画・活動の進捗や感想を選択式で記録し、継続をサポートします。',
    usage: 'コマンド実行後に選択式UIでカテゴリ→アイテム→内容を順番に選択・入力します。',
    flow: [
      '1. /report コマンドを実行',
      '2. カテゴリ（本/映画/活動）を選択',
      '3. 記録したいアイテムを選択',
      '4. モーダルで記録内容を入力'
    ],
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
