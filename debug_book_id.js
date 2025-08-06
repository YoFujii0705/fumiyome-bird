// debug_book_id.js - Book ID問題のデバッグスクリプト
const GoogleSheetsService = require('./services/googleSheets');
require('dotenv').config();

class BookIDDebugger {
  constructor() {
    this.googleSheets = new GoogleSheetsService();
  }

  async diagnoseBookIDIssue() {
    console.log('🔍 Book ID問題を診断中...\n');
    
    try {
      // 1. 全ての本データを取得
      console.log('📚 現在の本データを取得中...');
      const allBooks = await this.getAllBooksData();
      
      if (!allBooks || allBooks.length === 0) {
        console.log('❌ 本データが見つかりません');
        return;
      }
      
      console.log(`📊 取得した本の数: ${allBooks.length}件`);
      
      // 🆕 生データの構造を確認
      console.log('\n🔍 データ構造の分析:');
      console.log('最初の3件のデータ:');
      allBooks.slice(0, 3).forEach((book, index) => {
        console.log(`  ${index + 1}. データ構造:`, JSON.stringify(book, null, 2));
      });
      
      // データのキーを確認
      if (allBooks.length > 0) {
        const sampleBook = allBooks[0];
        console.log('\n📋 利用可能なデータキー:', Object.keys(sampleBook));
        
        // 可能性のあるIDフィールドを検索
        const possibleIdFields = Object.keys(sampleBook).filter(key => 
          key.toLowerCase().includes('id') || 
          key.toLowerCase() === 'no' ||
          key.toLowerCase() === 'number' ||
          key === '0' // 最初の列の場合
        );
        console.log('🔍 IDの可能性があるフィールド:', possibleIdFields);
      }
      
      // 2. ID の分析（複数パターンを試行）
      console.log('\n🔍 ID分析:');
      
      // パターン1: 'id' フィールド
      let ids = allBooks.map(book => this.extractId(book, 'id')).filter(id => !isNaN(id) && id !== null);
      console.log(`パターン1 (id): ${ids.length}個の有効ID`);
      
      // パターン2: 'ID' フィールド
      if (ids.length === 0) {
        ids = allBooks.map(book => this.extractId(book, 'ID')).filter(id => !isNaN(id) && id !== null);
        console.log(`パターン2 (ID): ${ids.length}個の有効ID`);
      }
      
      // パターン3: '0' フィールド（最初の列）
      if (ids.length === 0) {
        ids = allBooks.map(book => this.extractId(book, '0')).filter(id => !isNaN(id) && id !== null);
        console.log(`パターン3 (0): ${ids.length}個の有効ID`);
      }
      
      // パターン4: すべてのフィールドから数値を探す
      if (ids.length === 0) {
        console.log('パターン4: 全フィールドから数値を検索中...');
        for (const book of allBooks.slice(0, 1)) { // 最初の1件で確認
          Object.entries(book).forEach(([key, value]) => {
            const numValue = parseInt(String(value));
            if (!isNaN(numValue) && numValue > 0) {
              console.log(`  フィールド "${key}": ${value} (数値: ${numValue})`);
            }
          });
        }
      }
      
      if (ids.length === 0) {
        console.log('❌ 有効なIDが見つかりません');
        console.log('\n💡 対処方法:');
        console.log('1. GoogleSheetsのヘッダー行を確認してください');
        console.log('2. ID列が正しく設定されているか確認してください');
        console.log('3. データの最初の行がヘッダーになっているか確認してください');
        return;
      }
      
      const maxId = Math.max(...ids);
      const minId = Math.min(...ids);
      const duplicateIds = this.findDuplicateIds(ids);
      
      console.log(`  最大ID: ${maxId}`);
      console.log(`  最小ID: ${minId}`);
      console.log(`  重複ID: ${duplicateIds.length > 0 ? duplicateIds.join(', ') : 'なし'}`);
      
      // 3. 重複データの詳細表示
      if (duplicateIds.length > 0) {
        console.log('\n⚠️  重複IDの詳細:');
        for (const dupId of duplicateIds) {
          const duplicates = allBooks.filter(book => {
            const bookId = this.extractId(book, this.detectIdField(allBooks[0]));
            return parseInt(bookId) === dupId;
          });
          console.log(`  ID ${dupId}:`);
          duplicates.forEach((book, index) => {
            console.log(`    ${index + 1}. "${book.title || book.Title || book['1'] || 'タイトル不明'}" - ${book.author || book.Author || book['2'] || '著者不明'} (${book.status || book.Status || book['3'] || 'ステータス不明'})`);
          });
        }
      }
      
      // 4. 最新のID生成をテスト
      console.log('\n🧪 次のID生成テスト:');
      const nextId = await this.getNextBookId();
      console.log(`  生成される次のID: ${nextId}`);
      
      // 5. 最近追加された本を表示
      console.log('\n📖 最近追加された本 (最新5件):');
      const recentBooks = allBooks.slice(-5);
      recentBooks.forEach(book => {
        const bookId = this.extractId(book, this.detectIdField(book));
        const title = book.title || book.Title || book['1'] || 'タイトル不明';
        const author = book.author || book.Author || book['2'] || '著者不明';
        const status = book.status || book.Status || book['3'] || 'ステータス不明';
        console.log(`  ID ${bookId}: "${title}" - ${author} (${status})`);
      });
      
      // 6. 修復の提案
      console.log('\n💡 修復提案:');
      if (duplicateIds.length > 0) {
        console.log('  1. 重複IDを修正する必要があります');
        console.log('  2. ID生成ロジックを確認してください');
      }
      
      if (maxId > 100 && minId === 1) {
        console.log('  3. データが部分的にリセットされた可能性があります');
        console.log('  4. バックアップから復元を検討してください');
      }
      
      return {
        totalBooks: allBooks.length,
        maxId,
        minId,
        duplicateIds,
        nextId,
        recentBooks
      };
      
    } catch (error) {
      console.error('❌ 診断エラー:', error.message);
      throw error;
    }
  }

  // 🆕 ID抽出のヘルパーメソッド
  extractId(book, fieldName) {
    if (!book || !fieldName) return null;
    
    const value = book[fieldName];
    if (value === undefined || value === null || value === '') return null;
    
    const numValue = parseInt(String(value));
    return isNaN(numValue) ? null : numValue;
  }

  // 🆕 IDフィールドを検出
  detectIdField(sampleBook) {
    if (!sampleBook) return 'id';
    
    const possibleFields = ['id', 'ID', '0', 'No', 'no', 'number'];
    
    for (const field of possibleFields) {
      if (sampleBook.hasOwnProperty(field)) {
        const value = this.extractId(sampleBook, field);
        if (value !== null && value > 0) {
          return field;
        }
      }
    }
    
    return 'id'; // デフォルト
  }

  async getAllBooksData() {
    try {
      // GoogleSheetsServiceの既存メソッドを使用
      // 実際のメソッド名に合わせて調整してください
      return await this.googleSheets.getAllBooks?.() || 
             await this.googleSheets.getBooks?.() ||
             await this.googleSheets.getBooksData?.();
    } catch (error) {
      console.error('本データ取得エラー:', error.message);
      throw error;
    }
  }

  async getNextBookId() {
    try {
      // ID生成ロジックをテスト
      const allBooks = await this.getAllBooksData();
      if (!allBooks || allBooks.length === 0) {
        return 1;
      }
      
      const ids = allBooks.map(book => parseInt(book.id)).filter(id => !isNaN(id));
      return ids.length > 0 ? Math.max(...ids) + 1 : 1;
    } catch (error) {
      console.error('次ID生成エラー:', error.message);
      return null;
    }
  }

  findDuplicateIds(ids) {
    const seen = new Set();
    const duplicates = new Set();
    
    for (const id of ids) {
      if (seen.has(id)) {
        duplicates.add(id);
      } else {
        seen.add(id);
      }
    }
    
    return Array.from(duplicates);
  }

  async fixDuplicateIds() {
    console.log('🔧 重複ID修復を開始...\n');
    
    try {
      const allBooks = await this.getAllBooksData();
      const ids = allBooks.map(book => parseInt(book.id)).filter(id => !isNaN(id));
      const duplicates = this.findDuplicateIds(ids);
      
      if (duplicates.length === 0) {
        console.log('✅ 重複IDは見つかりませんでした');
        return;
      }
      
      console.log(`🔧 ${duplicates.length}個の重複IDを修復中...`);
      
      let maxId = Math.max(...ids);
      let fixedCount = 0;
      
      for (const dupId of duplicates) {
        const duplicateBooks = allBooks.filter(book => parseInt(book.id) === dupId);
        
        // 最初の本以外のIDを更新
        for (let i = 1; i < duplicateBooks.length; i++) {
          maxId++;
          const book = duplicateBooks[i];
          
          console.log(`  ID ${dupId} -> ${maxId}: "${book.title}"`);
          
          // ここで実際のID更新処理を実行
          // await this.googleSheets.updateBookId(book, maxId);
          
          fixedCount++;
        }
      }
      
      console.log(`\n✅ ${fixedCount}個のIDを修復しました`);
      console.log('💡 実際の修復を実行するには、updateBookIdメソッドのコメントアウトを解除してください');
      
    } catch (error) {
      console.error('❌ 修復エラー:', error.message);
      throw error;
    }
  }

  async showBookIdStatus() {
    try {
      const result = await this.diagnoseBookIDIssue();
      
      console.log('\n' + '='.repeat(50));
      console.log('📋 Book ID ステータス サマリー:');
      console.log('='.repeat(50));
      console.log(`総書籍数: ${result.totalBooks}`);
      console.log(`ID範囲: ${result.minId} - ${result.maxId}`);
      console.log(`重複ID: ${result.duplicateIds.length > 0 ? result.duplicateIds.length + '個' : 'なし'}`);
      console.log(`次のID: ${result.nextId}`);
      
      if (result.duplicateIds.length > 0) {
        console.log('\n⚠️  アクション必要: 重複IDの修復が必要です');
        console.log('実行: node debug_book_id.js fix');
      } else {
        console.log('\n✅ ID管理は正常です');
      }
      
    } catch (error) {
      console.error('❌ ステータス確認エラー:', error);
    }
  }
}

async function main() {
  const bookDebugger = new BookIDDebugger();
  
  try {
    const args = process.argv.slice(2);
    const command = args[0] || 'diagnose';
    
    switch (command) {
      case 'diagnose':
      case 'check':
        await bookDebugger.diagnoseBookIDIssue();
        break;
        
      case 'fix':
        console.log('⚠️  注意: この操作はデータを変更します');
        console.log('バックアップを取ってから実行することを推奨します\n');
        await bookDebugger.fixDuplicateIds();
        break;
        
      case 'status':
        await bookDebugger.showBookIdStatus();
        break;
        
      default:
        console.log('📖 使用方法:');
        console.log('  node debug_book_id.js diagnose  - ID問題を診断');
        console.log('  node debug_book_id.js fix       - 重複IDを修復');
        console.log('  node debug_book_id.js status    - ステータス確認');
    }
    
  } catch (error) {
    console.error('❌ 実行エラー:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = BookIDDebugger;
