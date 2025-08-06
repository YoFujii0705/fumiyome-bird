const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wishlist')
    .setDescription('🛒 買いたいものリスト管理 - 欲しいものを整理しよう')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('🛍️ 新しいアイテムを追加')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('アイテム名')
            .setRequired(true))
        .addIntegerOption(option =>
          option
            .setName('price')
            .setDescription('予定価格（円）')
            .setRequired(false))
        .addStringOption(option =>
          option
            .setName('url')
            .setDescription('商品URL（任意）')
            .setRequired(false))
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
            .setName('memo')
            .setDescription('備考・メモ（任意）')
            .setRequired(false)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('buy')
        .setDescription('💳 アイテムを購入完了')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('購入したアイテムのID')
            .setRequired(true))
        .addIntegerOption(option =>
          option
            .setName('actual_price')
            .setDescription('実際の購入価格（円）')
            .setRequired(false)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('📋 全アイテム一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('pending')
        .setDescription('🛒 未購入アイテム一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('bought')
        .setDescription('✅ 購入済みアイテム一覧を表示'))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('📄 特定のアイテムの詳細情報を表示')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('詳細を見たいアイテムのID')
            .setRequired(true)))
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('🗑️ アイテムを削除')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('削除するアイテムのID')
            .setRequired(true))),
  
  // コマンドの実行処理（ハンドラーに委譲）
  async execute(interaction) {
    // このコマンドは wishlistHandler.js で処理される
    throw new Error('このコマンドはハンドラーで処理されます');
  },
  
  // コマンドのメタデータ
  category: 'shopping',
  permissions: [],
  cooldown: 3, // 3秒のクールダウン
  
  // 使用例
  examples: [
    '/wishlist add name:MacBook Pro price:200000 priority:高 url:https://apple.com memo:動画編集用',
    '/wishlist add name:読書ライト price:3000',
    '/wishlist buy id:1 actual_price:198000',
    '/wishlist list',
    '/wishlist pending',
    '/wishlist bought',
    '/wishlist info id:1',
    '/wishlist remove id:5'
  ],
  
  // ヘルプテキスト
  help: {
    description: '買いたいものリストの管理機能です。欲しいものを整理し、購入計画を立てるのに役立ちます。',
    usage: '以下のサブコマンドが利用できます：',
    subcommands: {
      add: '新しいアイテムをウィッシュリストに追加します。価格や優先度、URLも記録できます。',
      buy: 'アイテムを購入完了し、実際の購入価格も記録できます。',
      list: 'すべてのアイテムをステータス別に表示します。',
      pending: '未購入のアイテムのみを優先度別に表示します。',
      bought: '購入済みのアイテム一覧を表示します。',
      info: '特定のアイテムの詳細情報（価格、URL、メモなど）を表示します。',
      remove: 'アイテムをウィッシュリストから削除します。'
    },
    tips: [
      '💡 毎月1日に未購入アイテムの通知が届きます',
      '🔍 購入履歴は /stats で統計として確認できます',
      '📊 予算管理には優先度機能を活用しましょう'
    ],
    features: [
      '🛒 優先度別アイテム管理',
      '💰 価格・予算トラッキング',
      '🔗 商品URLの保存',
      '📅 定期的な購入リマインダー',
      '📊 購入統計の記録'
    ]
  }
};
