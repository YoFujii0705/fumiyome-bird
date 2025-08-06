// debug_wishlist.js - ウィッシュリストデバッグ用スクリプト
require('dotenv').config();
const GoogleSheetsService = require('./services/googleSheets');

async function debugWishlist() {
  console.log('🔍 ウィッシュリストデバッグ開始...');
  
  const googleSheets = new GoogleSheetsService();
  
  try {
    // 1. 認証確認
    console.log('\n1️⃣ 認証状態確認');
    const healthCheck = await googleSheets.healthCheck();
    console.log(`認証状態: ${healthCheck.status} - ${healthCheck.message}`);
    
    if (healthCheck.status !== 'healthy') {
      console.log('❌ 認証に問題があります。処理を中断します。');
      return;
    }
    
    // 2. 生データの確認
    console.log('\n2️⃣ wishlist_master 生データ確認');
    await googleSheets.debugWishlistData();
    
    // 3. メソッドのテスト
    console.log('\n3️⃣ getWishlistItems() メソッドテスト');
    const items = await googleSheets.getWishlistItems();
    console.log(`取得結果: ${items.length}個のアイテム`);
    
    if (items.length > 0) {
      console.log('📋 取得されたアイテム:');
      items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item}`);
      });
    } else {
      console.log('📭 アイテムが取得されませんでした');
    }
    
    // 4. 未購入アイテムの確認
    console.log('\n4️⃣ getPendingWishlistItems() メソッドテスト');
    const pendingItems = await googleSheets.getPendingWishlistItems();
    console.log(`未購入アイテム: ${pendingItems.length}個`);
    
    pendingItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item}`);
    });
    
    // 5. 購入済みアイテムの確認
    console.log('\n5️⃣ getBoughtItems() メソッドテスト');
    const boughtItems = await googleSheets.getBoughtItems();
    console.log(`購入済みアイテム: ${boughtItems.length}個`);
    
    boughtItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item}`);
    });
    
    // 6. 統計情報の確認
    console.log('\n6️⃣ ウィッシュリスト統計');
    try {
      const stats = await googleSheets.getWishlistStats();
      console.log('統計情報:', stats);
    } catch (error) {
      console.log('統計取得エラー:', error.message);
    }
    
  } catch (error) {
    console.error('❌ デバッグ実行エラー:', error);
  }
}

// 簡易テストアイテム追加
async function addTestItem() {
  console.log('\n🧪 テストアイテム追加...');
  
  const googleSheets = new GoogleSheetsService();
  
  try {
    const testId = await googleSheets.addWishlistItem(
      `テストアイテム_${Date.now()}`,
      Math.floor(Math.random() * 10000) + 1000,
      'https://example.com/test',
      'medium',
      'デバッグ用テストアイテム'
    );
    
    console.log(`✅ テストアイテム追加成功 ID: ${testId}`);
    
    // 追加後の確認
    console.log('\n📋 追加後のアイテム一覧:');
    const items = await googleSheets.getWishlistItems();
    console.log(`総アイテム数: ${items.length}`);
    
    if (items.length > 0) {
      const latestItem = items[items.length - 1];
      console.log(`最新アイテム: ${latestItem}`);
    }
    
  } catch (error) {
    console.error('❌ テストアイテム追加エラー:', error);
  }
}

// メイン実行部分
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--add-test')) {
    addTestItem()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('テスト実行失敗:', error);
        process.exit(1);
      });
  } else {
    debugWishlist()
      .then(() => {
        console.log('\n✅ デバッグ完了');
        
        console.log('\n🎯 次のステップ:');
        console.log('1. データが存在する場合: handlerの問題を確認');
        console.log('2. データが存在しない場合: 追加処理の問題を確認');
        console.log('3. テストアイテムを追加: node debug_wishlist.js --add-test');
        
        process.exit(0);
      })
      .catch(error => {
        console.error('デバッグ失敗:', error);
        process.exit(1);
      });
  }
}

module.exports = { debugWishlist, addTestItem };
