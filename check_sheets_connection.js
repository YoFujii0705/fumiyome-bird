require('dotenv').config();
const { google } = require('googleapis');

async function checkConnection() {
  console.log('🔍 Google Sheets接続テスト開始...');
  
  try {
    let auth;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.log('📝 JSON形式で認証中...');
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    } else if (process.env.GOOGLE_CLIENT_EMAIL) {
      console.log('📝 環境変数形式で認証中...');
      auth = new google.auth.GoogleAuth({
        credentials: {
          type: 'service_account',
          project_id: process.env.GOOGLE_PROJECT_ID,
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_id: process.env.GOOGLE_CLIENT_ID,
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token'
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    } else {
      throw new Error('Google認証情報が設定されていません');
    }
    
    console.log('🔑 認証情報取得中...');
    const client = await auth.getClient();
    
    console.log('📊 スプレッドシート接続テスト中...');
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    if (!process.env.SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません');
    }
    
    // シート一覧を取得
    const response = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID
    });
    
    console.log('✅ Google Sheets接続成功！');
    console.log('📋 スプレッドシート名:', response.data.properties.title);
    console.log('📄 利用可能なシート:');
    response.data.sheets.forEach(sheet => {
      console.log(`  - ${sheet.properties.title}`);
    });
    
    // 本マスターデータを取得してテスト
    console.log('📚 books_masterからデータ取得テスト...');
    const booksData = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'books_master!A:G'
    });
    
    const books = booksData.data.values || [];
    console.log(`📊 登録済み本数: ${books.length - 1}冊`); // ヘッダー除く
    
    if (books.length > 1) {
      console.log('📖 最新の本3冊:');
      books.slice(-3).forEach(book => {
        console.log(`  - [${book[0]}] ${book[2]} - ${book[3]} (${book[5]})`);
      });
    }
    
    console.log('🎉 Google Sheets連携は正常に動作しています！');
    
  } catch (error) {
    console.error('❌ Google Sheets接続エラー:', error.message);
    console.log('🔧 確認事項:');
    console.log('  1. 環境変数が正しく設定されているか');
    console.log('  2. Google Sheets APIが有効になっているか');
    console.log('  3. サービスアカウントにスプレッドシートの編集権限があるか');
  }
}

checkConnection();
