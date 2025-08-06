// debug_discord_id.js - Discord IDを確認するスクリプト

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log('🔍 Discord ID デバッグ情報:');
  console.log('=====================================');
  
  // 環境変数の確認
  console.log('📋 環境変数:');
  console.log(`GOALS_NOTIFICATION_USERS: "${process.env.GOALS_NOTIFICATION_USERS}"`);
  
  // 環境変数をパース
  const userIds = process.env.GOALS_NOTIFICATION_USERS?.split(',') || [];
  console.log(`パースされたユーザーID配列:`, userIds);
  
  // 各ユーザーIDを検証
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i].trim();
    console.log(`\n👤 ユーザー ${i + 1}:`);
    console.log(`  生のID: "${userIds[i]}"`);
    console.log(`  トリム後: "${userId}"`);
    console.log(`  長さ: ${userId.length}`);
    console.log(`  数字のみ: ${/^\d+$/.test(userId)}`);
    
    try {
      const user = await client.users.fetch(userId);
      console.log(`  ✅ ユーザー見つかりました: ${user.username}#${user.discriminator}`);
    } catch (error) {
      console.log(`  ❌ ユーザーが見つかりません: ${error.message}`);
    }
  }
  
  console.log('\n=====================================');
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
