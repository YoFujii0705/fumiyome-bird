// test-token.js - Discord Token テストスクリプト
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

console.log('🔐 Discord Token テスト開始...');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID || process.env.BOT_CLIENT_ID;

if (!token) {
  console.error('❌ DISCORD_TOKEN が設定されていません');
  process.exit(1);
}

console.log(`🔍 設定確認:`);
console.log(`  Token 長さ: ${token.length} 文字`);
console.log(`  Token 形式: ${token.includes('.') ? '✅ 正しい形式' : '❌ 無効な形式'}`);
console.log(`  CLIENT_ID: ${clientId || '未設定'}`);

// Tokenの各部分を解析
const parts = token.split('.');
if (parts.length === 3) {
  try {
    // Bot IDをBase64デコードして確認
    const botId = Buffer.from(parts[0], 'base64').toString();
    console.log(`  Token内のBot ID: ${botId}`);
    
    if (clientId && botId !== clientId) {
      console.warn(`⚠️  警告: TOKEN内のBot ID (${botId}) と CLIENT_ID (${clientId}) が一致しません`);
    } else if (clientId) {
      console.log(`✅ Bot IDとCLIENT_IDが一致しています`);
    }
  } catch (error) {
    console.log(`  Token解析: エラー`);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

let connectionTimeout = setTimeout(() => {
  console.error('❌ 接続タイムアウト (30秒)');
  console.log('💡 トークンが無効または期限切れの可能性があります');
  client.destroy();
  process.exit(1);
}, 30000);

client.once('ready', () => {
  clearTimeout(connectionTimeout);
  console.log('\n✅ Discord 接続成功!');
  console.log(`🤖 Bot名: ${client.user.tag}`);
  console.log(`🆔 Bot ID: ${client.user.id}`);
  console.log(`🏛️ 参加サーバー数: ${client.guilds.cache.size}`);
  
  // 参加しているサーバーの一覧
  if (client.guilds.cache.size > 0) {
    console.log(`📋 参加サーバー:`);
    client.guilds.cache.forEach(guild => {
      console.log(`  • ${guild.name} (ID: ${guild.id})`);
    });
  } else {
    console.log('⚠️  どのサーバーにも参加していません');
    console.log('💡 Botをサーバーに招待する必要があります');
  }
  
  // 権限チェック
  const guild = client.guilds.cache.first();
  if (guild) {
    const botMember = guild.members.cache.get(client.user.id);
    if (botMember) {
      console.log(`🔐 権限確認 (${guild.name}):`);
      console.log(`  • メッセージ送信: ${botMember.permissions.has('SendMessages') ? '✅' : '❌'}`);
      console.log(`  • スラッシュコマンド: ${botMember.permissions.has('UseApplicationCommands') ? '✅' : '❌'}`);
      console.log(`  • 管理者: ${botMember.permissions.has('Administrator') ? '✅' : '❌'}`);
    }
  }
  
  console.log('\n🔌 テスト完了 - 接続終了');
  client.destroy();
  process.exit(0);
});

client.on('error', error => {
  clearTimeout(connectionTimeout);
  console.error('\n❌ Discord エラー:', error.message);
  
  if (error.code === 'DISALLOWED_INTENTS') {
    console.log('💡 Bot設定でIntentsを有効にする必要があります');
  }
  
  client.destroy();
  process.exit(1);
});

client.on('warn', warning => {
  console.warn('⚠️ Discord 警告:', warning);
});

console.log('🔄 Discord に接続中...');
console.log('   (最大30秒待機)');

client.login(token).catch(error => {
  clearTimeout(connectionTimeout);
  console.error('\n❌ ログイン失敗:', error.message);
  console.error('❌ エラーコード:', error.code);
  
  if (error.code === 'TokenInvalid') {
    console.log('\n💡 解決方法:');
    console.log('1. Discord Developer Portal でトークンを再生成');
    console.log('   → https://discord.com/developers/applications');
    console.log('2. .env ファイルの DISCORD_TOKEN を新しいトークンに更新');
    console.log('3. Botがサーバーに正しく招待されているか確認');
    console.log('4. 必要な権限 (Send Messages, Use Application Commands) が付与されているか確認');
  }
  
  process.exit(1);
});
