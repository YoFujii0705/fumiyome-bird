// check-env-reload.js - 環境変数再読み込み確認
console.log('🔄 環境変数再読み込みテスト');
console.log('===============================');

// 1. dotenvなしでの読み込み
console.log('1️⃣ システム環境変数:');
console.log(`DISCORD_TOKEN: ${process.env.DISCORD_TOKEN ? `設定済み (${process.env.DISCORD_TOKEN.length}文字)` : '未設定'}`);

// 2. dotenvありでの読み込み
console.log('\n2️⃣ .env ファイル読み込み後:');
require('dotenv').config();
console.log(`DISCORD_TOKEN: ${process.env.DISCORD_TOKEN ? `設定済み (${process.env.DISCORD_TOKEN.length}文字)` : '未設定'}`);

// 3. .envファイルの直接確認
console.log('\n3️⃣ .env ファイル直接確認:');
const fs = require('fs');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const tokenLine = envContent.split('\n').find(line => line.startsWith('DISCORD_TOKEN='));
  
  if (tokenLine) {
    const tokenValue = tokenLine.split('=')[1];
    console.log(`DISCORD_TOKEN行: ${tokenLine.substring(0, 50)}...`);
    console.log(`トークン値の長さ: ${tokenValue ? tokenValue.length : 0}文字`);
    
    // 不正な文字のチェック
    if (tokenValue) {
      const hasQuotes = tokenValue.includes('"') || tokenValue.includes("'");
      const hasSpaces = tokenValue.includes(' ');
      const hasNewlines = tokenValue.includes('\n') || tokenValue.includes('\r');
      
      console.log(`引用符チェック: ${hasQuotes ? '❌ 引用符あり' : '✅ なし'}`);
      console.log(`スペースチェック: ${hasSpaces ? '❌ スペースあり' : '✅ なし'}`);
      console.log(`改行チェック: ${hasNewlines ? '❌ 改行あり' : '✅ なし'}`);
      
      // トークンの形式チェック
      const cleanToken = tokenValue.replace(/["'\s\n\r]/g, '');
      console.log(`クリーンアップ後: ${cleanToken.length}文字`);
      console.log(`形式チェック: ${cleanToken.includes('.') ? '✅ 正しい形式' : '❌ 無効な形式'}`);
      
      if (cleanToken.includes('.')) {
        const parts = cleanToken.split('.');
        console.log(`パート数: ${parts.length}`);
        console.log(`パート1: ${parts[0] ? parts[0].length : 0}文字`);
        console.log(`パート2: ${parts[1] ? parts[1].length : 0}文字`);
        console.log(`パート3: ${parts[2] ? parts[2].length : 0}文字`);
      }
    }
  } else {
    console.log('❌ DISCORD_TOKEN行が見つかりません');
  }
} else {
  console.log('❌ .env ファイルが存在しません');
}

// 4. 現在のディレクトリ確認
console.log('\n4️⃣ ディレクトリ情報:');
console.log(`現在のディレクトリ: ${process.cwd()}`);
console.log(`index.js 存在: ${fs.existsSync('index.js') ? '✅' : '❌'}`);
console.log(`.env 存在: ${fs.existsSync('.env') ? '✅' : '❌'}`);

// 5. 環境変数の比較
console.log('\n5️⃣ 最終比較:');
const envToken = process.env.DISCORD_TOKEN;
if (envToken && fs.existsSync('.env')) {
  const envFileContent = fs.readFileSync('.env', 'utf8');
  const tokenLine = envFileContent.split('\n').find(line => line.startsWith('DISCORD_TOKEN='));
  
  if (tokenLine) {
    const fileToken = tokenLine.split('=')[1].replace(/["'\s\n\r]/g, '');
    const envTokenClean = envToken.replace(/["'\s\n\r]/g, '');
    
    console.log(`process.env: ${envTokenClean.substring(0, 20)}... (${envTokenClean.length}文字)`);
    console.log(`ファイル内: ${fileToken.substring(0, 20)}... (${fileToken.length}文字)`);
    console.log(`一致: ${envTokenClean === fileToken ? '✅' : '❌'}`);
  }
}

console.log('\n💡 推奨アクション:');
if (!process.env.DISCORD_TOKEN) {
  console.log('1. .env ファイルにDISCORD_TOKEN=your_token_here を追加');
} else {
  console.log('1. Discord Developer Portal で新しいトークンを生成');
  console.log('2. .env ファイルのトークンを置き換え（引用符なし）');
  console.log('3. ファイル保存後、Ctrl+C でプロセス終了してから再実行');
}
