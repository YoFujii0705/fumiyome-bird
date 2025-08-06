// diagnose-env.js - 環境変数診断スクリプト
require('dotenv').config();

console.log('🔍 環境変数診断スクリプト');
console.log('================================');

// 必要な環境変数をチェック
const requiredEnvVars = [
  'DISCORD_TOKEN',
  'SPREADSHEET_ID',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'NOTIFICATION_CHANNEL_ID'
];

const optionalEnvVars = [
  'GOOGLE_PROJECT_ID',
  'GOOGLE_CLIENT_EMAIL', 
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_CLIENT_ID',
  'GUILD_ID',
  'GOALS_NOTIFICATION_USERS'
];

console.log('📋 必須環境変数:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅ 設定済み' : '❌ 未設定';
  const preview = value ? 
    (varName.includes('TOKEN') || varName.includes('KEY') || varName.includes('JSON') ? 
     `(${value.length}文字)` : 
     value.substring(0, 20) + '...') : 
    'なし';
  
  console.log(`  ${varName}: ${status} ${preview}`);
});

console.log('\n📋 オプション環境変数:');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅ 設定済み' : '⚠️  未設定';
  const preview = value ? 
    (varName.includes('TOKEN') || varName.includes('KEY') ? 
     `(${value.length}文字)` : 
     value.substring(0, 20) + '...') : 
    'なし';
  
  console.log(`  ${varName}: ${status} ${preview}`);
});

// .envファイルの存在確認
const fs = require('fs');
const path = require('path');

console.log('\n📁 ファイル確認:');
console.log(`  .env ファイル: ${fs.existsSync('.env') ? '✅ 存在' : '❌ 不存在'}`);
console.log(`  現在のディレクトリ: ${process.cwd()}`);

// .envファイルの内容確認（安全な部分のみ）
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  console.log(`  .env 行数: ${lines.length}`);
  
  console.log('\n📝 .env ファイル構造:');
  lines.forEach(line => {
    const [key] = line.split('=');
    if (key) {
      const isSensitive = key.includes('TOKEN') || key.includes('KEY') || key.includes('JSON');
      console.log(`  ${key}: ${isSensitive ? '[隠匿]' : '値あり'}`);
    }
  });
}

// Discord Token の形式チェック
if (process.env.DISCORD_TOKEN) {
  const token = process.env.DISCORD_TOKEN;
  console.log('\n🔐 Discord Token 診断:');
  console.log(`  長さ: ${token.length} 文字`);
  console.log(`  形式: ${token.includes('.') ? '✅ 正しい形式 (3部構成)' : '❌ 無効な形式'}`);
  
  // Bot Token の典型的な形式をチェック
  const parts = token.split('.');
  if (parts.length === 3) {
    console.log(`  パート1 (Bot ID): ${parts[0].length} 文字`);
    console.log(`  パート2 (Created At): ${parts[1].length} 文字`);
    console.log(`  パート3 (Token): ${parts[2].length} 文字`);
    
    // 基本的な形式チェック
    const isValidFormat = parts[0].length >= 17 && parts[1].length >= 6 && parts[2].length >= 27;
    console.log(`  形式有効性: ${isValidFormat ? '✅ 有効' : '❌ 無効'}`);
  }
}

console.log('\n💡 診断完了');
console.log('================================');

// 推奨事項
console.log('\n🔧 推奨事項:');
if (!process.env.DISCORD_TOKEN) {
  console.log('1. Discord Developer Portal から新しいトークンを取得');
  console.log('2. .env ファイルに DISCORD_TOKEN=your_token_here を追加');
}
if (!process.env.SPREADSHEET_ID) {
  console.log('3. Google Sheets の ID を SPREADSHEET_ID に設定');
}
if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_CLIENT_EMAIL) {
  console.log('4. Google Sheets API の認証情報を設定');
}

console.log('\n📞 次のステップ:');
console.log('1. 問題がある環境変数を修正');
console.log('2. node diagnose-env.js を再実行して確認');
console.log('3. node index.js でボットを起動');
