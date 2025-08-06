// debug_test.js - Google Sheetsサービステスト用スクリプト
const GoogleSheetsService = require('./services/googleSheets');

async function testGoogleSheetsService() {
  console.log('=== Google Sheets Service テスト開始 ===');
  
  try {
    // インスタンス作成
    const sheetsService = new GoogleSheetsService();
    console.log('✅ GoogleSheetsService インスタンス作成成功');
    console.log('利用可能なメソッド:', Object.getOwnPropertyNames(Object.getPrototypeOf(sheetsService)));
    
    // ヘルスチェック
    console.log('\n--- ヘルスチェック ---');
    const health = await sheetsService.healthCheck();
    console.log('ヘルスチェック結果:', health);
    
    // getData メソッドの存在確認
    console.log('\n--- メソッド確認 ---');
    console.log('getData メソッド存在:', typeof sheetsService.getData === 'function');
    console.log('updateData メソッド存在:', typeof sheetsService.updateData === 'function');
    console.log('appendData メソッド存在:', typeof sheetsService.appendData === 'function');
    
    // 簡単なデータ取得テスト
    console.log('\n--- データ取得テスト ---');
    try {
      const testData = await sheetsService.getData('books_master!A1:A5');
      console.log('✅ getData テスト成功, データ:', testData?.length || 0, '行');
    } catch (error) {
      console.log('❌ getData テストエラー:', error.message);
    }
    
  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
    console.error('スタックトレース:', error.stack);
  }
  
  console.log('\n=== テスト完了 ===');
}

// テスト実行
testGoogleSheetsService().catch(console.error);
