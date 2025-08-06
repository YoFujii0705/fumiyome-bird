// check_new_sheets.js - 新しいシートの確認用スクリプト
require('dotenv').config();
const GoogleSheetsService = require('./services/googleSheets');

async function checkNewSheets() {
  console.log('🔍 新しいシートの存在確認中...');
  
  const googleSheets = new GoogleSheetsService();
  
  try {
    // 基本的な接続確認
    const healthCheck = await googleSheets.healthCheck();
    console.log('🏥 Google Sheets接続状態:', healthCheck.status, '-', healthCheck.message);
    
    if (healthCheck.status !== 'healthy') {
      console.log('❌ Google Sheetsに接続できません。認証情報を確認してください。');
      return;
    }

    // ウィッシュリストシートの確認
    console.log('\n🛒 wishlist_master シートを確認中...');
    try {
      const wishlistResponse = await googleSheets.getData('wishlist_master!A1:J1');
      
      if (wishlistResponse && wishlistResponse.length > 0) {
        console.log('✅ wishlist_master シートが存在します');
        console.log('📋 ヘッダー:', wishlistResponse[0]);
        
        // 期待されるヘッダーと比較
        const expectedHeaders = ['ID', 'Created_At', 'Name', 'Price', 'Actual_Price', 'URL', 'Priority', 'Memo', 'Status', 'Updated_At'];
        const actualHeaders = wishlistResponse[0];
        
        const headersMatch = expectedHeaders.every((header, index) => header === actualHeaders[index]);
        if (headersMatch) {
          console.log('✅ ヘッダーは正しく設定されています');
        } else {
          console.log('⚠️ ヘッダーが期待値と異なります');
          console.log('期待値:', expectedHeaders);
          console.log('実際値:', actualHeaders);
        }
      } else {
        console.log('⚠️ wishlist_master シートは存在しますが、ヘッダーがありません');
        console.log('💡 A1行にヘッダーを設定してください: ID, Created_At, Name, Price, Actual_Price, URL, Priority, Memo, Status, Updated_At');
      }
    } catch (error) {
      console.log('❌ wishlist_master シートが見つかりません');
      console.log('💡 Google Sheetsで「wishlist_master」シートを作成してください');
      console.log('エラー詳細:', error.message);
    }
    
    // 記事シートの確認
    console.log('\n📰 articles_master シートを確認中...');
    try {
      const articlesResponse = await googleSheets.getData('articles_master!A1:K1');
      
      if (articlesResponse && articlesResponse.length > 0) {
        console.log('✅ articles_master シートが存在します');
        console.log('📋 ヘッダー:', articlesResponse[0]);
        
        // 期待されるヘッダーと比較
        const expectedHeaders = ['ID', 'Created_At', 'Title', 'URL', 'Category', 'Priority', 'Memo', 'Status', 'Rating', 'Review', 'Updated_At'];
        const actualHeaders = articlesResponse[0];
        
        const headersMatch = expectedHeaders.every((header, index) => header === actualHeaders[index]);
        if (headersMatch) {
          console.log('✅ ヘッダーは正しく設定されています');
        } else {
          console.log('⚠️ ヘッダーが期待値と異なります');
          console.log('期待値:', expectedHeaders);
          console.log('実際値:', actualHeaders);
        }
      } else {
        console.log('⚠️ articles_master シートは存在しますが、ヘッダーがありません');
        console.log('💡 A1行にヘッダーを設定してください: ID, Created_At, Title, URL, Category, Priority, Memo, Status, Rating, Review, Updated_At');
      }
    } catch (error) {
      console.log('❌ articles_master シートが見つかりません');
      console.log('💡 Google Sheetsで「articles_master」シートを作成してください');
      console.log('エラー詳細:', error.message);
    }
    
    // 既存シートの確認
    console.log('\n📚 既存シートの確認...');
    const existingSheets = ['books_master', 'movies_master', 'activities_master'];
    
    for (const sheetName of existingSheets) {
      try {
        const response = await googleSheets.getData(`${sheetName}!A1:A1`);
        if (response && response.length > 0) {
          console.log(`✅ ${sheetName} シートは正常に動作しています`);
        } else {
          console.log(`⚠️ ${sheetName} シートにデータがありません`);
        }
      } catch (error) {
        console.log(`❌ ${sheetName} シートでエラー:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Google Sheets接続エラー:', error.message);
    console.log('\n🔧 考えられる原因:');
    console.log('1. SPREADSHEET_ID が正しく設定されていない');
    console.log('2. Google Sheets APIの認証情報が無効');
    console.log('3. スプレッドシートへのアクセス権限がない');
    console.log('4. 新しいシート（wishlist_master, articles_master）が未作成');
  }
}

// テスト用の新機能実行関数
async function testNewFeatures() {
  console.log('\n🧪 新機能のテスト実行...');
  
  const googleSheets = new GoogleSheetsService();
  
  try {
    // ウィッシュリスト機能のテスト
    console.log('\n🛒 ウィッシュリスト機能テスト...');
    
    // テストアイテムの追加
    console.log('📝 テストアイテムを追加中...');
    const testId = await googleSheets.addWishlistItem(
      'テスト商品',
      1000,
      'https://example.com',
      'medium',
      'テスト用のアイテムです'
    );
    console.log(`✅ テストアイテム追加成功 ID: ${testId}`);
    
    // アイテム一覧の取得
    console.log('📋 アイテム一覧を取得中...');
    const items = await googleSheets.getWishlistItems();
    console.log(`✅ ${items.length}個のアイテムを取得しました`);
    if (items.length > 0) {
      console.log('最新のアイテム:', items[items.length - 1]);
    }
    
  } catch (error) {
    console.error('❌ 新機能テストエラー:', error.message);
    console.log('💡 まず上記のシート作成手順を完了してください');
  }
}

// スクリプト実行
if (require.main === module) {
  checkNewSheets()
    .then(() => {
      console.log('\n✅ 確認完了');
      
      // ユーザーに次のステップを提示
      console.log('\n🎯 次のステップ:');
      console.log('1. 不足しているシートを Google Sheets で手動作成');
      console.log('2. ヘッダー行を正確に設定');
      console.log('3. 再度このスクリプトを実行して確認');
      console.log('4. /wishlist add コマンドを試す');
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 確認失敗:', error);
      process.exit(1);
    });
}

module.exports = { checkNewSheets, testNewFeatures };
