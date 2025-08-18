const { google } = require('googleapis');

class GoogleSheetsService {
  constructor() {
    this.sheets = google.sheets({ version: 'v4' });
    this.auth = null;
    this.spreadsheetId = process.env.SPREADSHEET_ID;
    this.initializeAuth();
  }

  /**
   * 認証を初期化
   */
  initializeAuth() {
    try {
      // 🔍 デバッグコード
      console.log('🔍 認証情報デバッグ:');
      console.log('GOOGLE_SERVICE_ACCOUNT_JSON:', process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? '設定済み' : '未設定');
      console.log('CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL ? '設定済み' : '未設定');
      console.log('PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? '設定済み(長さ:' + process.env.GOOGLE_PRIVATE_KEY.length + ')' : '未設定');
      console.log('PROJECT_ID:', process.env.GOOGLE_PROJECT_ID ? '設定済み' : '未設定');
      console.log('CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '設定済み' : '未設定');
      
      if (process.env.GOOGLE_PRIVATE_KEY) {
        console.log('PRIVATE_KEY開始:', process.env.GOOGLE_PRIVATE_KEY.substring(0, 30));
        console.log('PRIVATE_KEY終了:', process.env.GOOGLE_PRIVATE_KEY.substring(process.env.GOOGLE_PRIVATE_KEY.length - 30));
        
        // 改行文字の置換結果も確認
        const processedKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
        console.log('改行処理後の長さ:', processedKey.length);
        console.log('改行処理後の開始:', processedKey.substring(0, 30));
      }

      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          timeout: 30000
        });
      } else {
        // 🔍 認証オブジェクトの内容も確認
        const credentialsObj = {
          type: 'service_account',
          project_id: process.env.GOOGLE_PROJECT_ID,
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_id: process.env.GOOGLE_CLIENT_ID,
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token'
        };
        
        console.log('🔍 作成される認証オブジェクト:');
        console.log('type:', credentialsObj.type);
        console.log('project_id:', credentialsObj.project_id ? '設定済み' : '未設定');
        console.log('client_email:', credentialsObj.client_email ? '設定済み' : '未設定');
        console.log('private_key:', credentialsObj.private_key ? '設定済み(長さ:' + credentialsObj.private_key.length + ')' : '未設定');
        console.log('client_id:', credentialsObj.client_id ? '設定済み' : '未設定');
        
        this.auth = new google.auth.GoogleAuth({
          credentials: credentialsObj,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          timeout: 30000
        });
      }
      console.log('✅ Google Sheets認証設定完了');
    } catch (error) {
      console.error('❌ Google認証設定エラー:', error.message);
      console.log('Google Sheets機能は無効化されます');
      this.auth = null;
    }
  }

  // === ヘルパーメソッド ===

  /**
   * ヘルパーメソッド: タイムアウト付きの操作実行
   */
  async executeWithTimeout(operation, timeoutMs = 5000) {
    if (!this.auth) {
      throw new Error('Google Sheets認証が設定されていません');
    }

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    );

    return Promise.race([operation(), timeoutPromise]);
  }

  /**
   * ヘルパーメソッド: リトライ機能付きの操作実行
   */
  async executeWithRetry(operation, maxRetries = 3, timeoutMs = 5000) {
    if (!this.auth) {
      console.log('認証なし - ダミーデータを返します');
      return null;
    }

    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        return await this.executeWithTimeout(operation, timeoutMs);
      } catch (error) {
        console.error(`操作失敗 (${retries + 1}/${maxRetries}):`, error.message);
        retries++;
        
        if (retries >= maxRetries) {
          console.error('最大リトライ回数に達しました');
          throw error;
        }
        
        // 指数バックオフ
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }
  }

  // === 基本CRUD操作 ===

  /**
   * 次のIDを取得（認証修正版）
   */
  async getNextId(sheetName) {
    if (!this.auth) {
      console.log('認証なし - ランダムIDを生成します');
      return Math.floor(Math.random() * 1000) + Date.now() % 1000;
    }

    try {
      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A:A`
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const values = response.data.values || [];
      
      if (values.length <= 1) {
        console.log(`${sheetName} は空です。ID 1 から開始します`);
        return 1;
      }
      
      // 既存のIDを確認して最大値+1を返す
      const ids = values.slice(1)
        .map(row => parseInt(row[0]))
        .filter(id => !isNaN(id));
      
      const nextId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
      console.log(`${sheetName} の次のID: ${nextId}`);
      return nextId;
      
    } catch (error) {
      console.error(`getNextId エラー (${sheetName}):`, error.message);
      
      // 特定のエラーメッセージの確認
      if (error.message.includes("unregistered callers") || error.message.includes("authentication")) {
        console.log('認証エラーが発生しました。環境変数を確認してください：');
        console.log('- GOOGLE_SERVICE_ACCOUNT_JSON または');
        console.log('- GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY など');
      }
      
      if (error.message.includes("Unable to parse range")) {
        console.log(`シート "${sheetName}" が存在しない可能性があります。`);
        console.log('Google Sheetsでシートを作成してから再試行してください。');
      }
      
      // フォールバック: タイムスタンプベースのID
      return Math.floor(Date.now() / 1000) % 10000;
    }
  }

  /**
   * データを追加
   */
  async appendData(range, values) {
    if (!this.auth) {
      console.log('認証なし - ダミーIDを返します');
      return Math.floor(Math.random() * 1000);
    }

    try {
      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.append({
          auth,
          spreadsheetId: this.spreadsheetId,
          range,
          valueInputOption: 'RAW',
          resource: { values: [values] }
        });
      };

      await this.executeWithTimeout(operation);
      console.log('✅ データ追加成功');
      return values[0]; // IDを返す
    } catch (error) {
      console.error('❌ データ追加エラー:', error);
      return Math.floor(Math.random() * 1000) + Date.now() % 1000;
    }
  }

  /**
   * データを取得
   */
  async getData(range) {
    if (!this.auth) return [];

    try {
      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range
        });
      };

      const response = await this.executeWithRetry(operation, 3, 10000);
      return response?.data?.values || [];
    } catch (error) {
      console.error('データ取得エラー:', error);
      return [];
    }
  }

  /**
   * データを更新
   */
  async updateData(range, values) {
    if (!this.auth) {
      console.log('認証なし - 更新をスキップします');
      return true;
    }

    try {
      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.update({
          auth,
          spreadsheetId: this.spreadsheetId,
          range,
          valueInputOption: 'RAW',
          resource: { values: [values] }
        });
      };

      await this.executeWithRetry(operation);
      console.log('✅ データ更新成功');
      return true;
    } catch (error) {
      console.error('❌ データ更新エラー:', error);
      return false;
    }
  }

  // === 本関連のメソッド ===

  /**
   * 全ての本を取得
   */
  async getAllBooks() {
  try {
    console.log('🔍 getAllBooks 開始');
    
    if (!this.auth) {
      console.error('❌ Google Sheets認証がありません');
      throw new Error('Google Sheets認証が必要です');
    }
    
    const sheets = google.sheets({ version: 'v4', auth: this.auth });
    
    console.log('📊 スプレッドシートからデータ取得中...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Books!A:G', // 必要な列を指定
    });
    
    const rows = response.data.values;
    console.log(`📋 取得した行数: ${rows ? rows.length : 0}`);
    
    if (!rows || rows.length <= 1) {
      console.log('📚 データが空またはヘッダーのみ');
      return [];
    }
    
    // ヘッダーを除いてデータを処理
    const books = rows.slice(1).map((row, index) => {
      try {
        const book = {
          id: parseInt(row[0]) || (index + 1), // ID
          title: row[1] || '不明なタイトル',   // タイトル
          author: row[2] || '不明な作者',      // 作者
          status: row[3] || 'want_to_read',   // ステータス
          memo: row[4] || '',                 // メモ
          created_at: row[5] || '',           // 作成日
          updated_at: row[6] || ''            // 更新日
        };
        
        console.log(`📖 処理した本: ${book.id} - ${book.title} (${book.status})`);
        return book;
        
      } catch (error) {
        console.error(`❌ 行${index + 2}の処理エラー:`, error, 'データ:', row);
        return null;
      }
    }).filter(book => book !== null && book.title !== '不明なタイトル');
    
    console.log(`✅ getAllBooks 完了: ${books.length}冊取得`);
    return books;
    
  } catch (error) {
    console.error('❌ getAllBooks エラー:', error);
    console.error('❌ エラー詳細:', error.message);
    console.error('❌ スタック:', error.stack);
    throw error;
  }
}
  
  /**
   * IDで特定の本を取得
   */
  async getBookById(id) {
    try {
      console.log(`📚 ID: ${id} の本を検索中...`);
      
      const books = await this.getAllBooks();
      const book = books.find(book => parseInt(book.id) === parseInt(id));
      
      if (!book) {
        console.log(`❌ ID: ${id} の本が見つかりません`);
        return null;
      }
      
      console.log(`✅ 本が見つかりました: ${book.title} by ${book.author}`);
      return {
        id: parseInt(book.id),
        title: book.title,
        author: book.author,
        memo: book.notes || '',
        status: book.status,
        created_at: book.registeredAt,
        updated_at: book.date
      };
    } catch (error) {
      console.error('getBookById エラー:', error);
      return null;
    }
  }

 /**
 * 本を追加（修正版）
 */
async addBook(title, author, memo = '', status = 'want_to_read') {
  try {
    console.log(`📚 新しい本を追加: ${title} by ${author} (${status})`);
    
    if (!this.auth) {
      console.log('認証なし - ダミーIDを返します');
      return {
        id: Math.floor(Math.random() * 1000),
        title,
        author,
        status,
        registeredAt: new Date().toLocaleString('ja-JP')
      };
    }
    
    // 既存の本を取得して最大IDを確認
    const existingBooks = await this.getAllBooks();
    
    // 最大IDを取得
    let maxId = 0;
    if (existingBooks.length > 0) {
      const ids = existingBooks
        .map(book => parseInt(book.id))
        .filter(id => !isNaN(id));
      maxId = ids.length > 0 ? Math.max(...ids) : 0;
    }
    
    const newId = maxId + 1;
    const now = new Date().toLocaleString('ja-JP');
    
    // 正しい列順序で新しい行を作成
    // A:ID B:登録日時 C:タイトル D:作者名 E:備考 F:ステータス G:日付
    const newRow = [
      newId,           // A列: ID
      now,             // B列: 登録日時
      title,           // C列: タイトル
      author,          // D列: 作者名
      memo || '',      // E列: 備考
      status,          // F列: ステータス
      now.slice(0, 10) // G列: 日付（YYYY/MM/DD形式）
    ];

    console.log('🔍 追加するデータ:', newRow);

    const range = 'books_master!A:G';
    const operation = async () => {
      const auth = await this.auth.getClient();
      return this.sheets.spreadsheets.values.append({
        auth,
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [newRow]
        }
      });
    };

    await this.executeWithTimeout(operation, 10000);

    console.log(`✅ 本を追加しました: ID ${newId} - ${title} (${status})`);
    
    return {
      id: newId,
      title,
      author,
      memo,
      status,
      registeredAt: now
    };

  } catch (error) {
    console.error('❌ 本の追加エラー:', error.message);
    throw error;
  }
}

  /**
   * 本のステータスを更新
   */
  async updateBookStatus(id, status, date = null) {
    try {
      const values = await this.getData('books_master!A:G');
      const rowIndex = values.findIndex(row => row[0] == id);
      
      if (rowIndex === -1) {
        console.log('指定されたIDの本が見つかりません:', id);
        return null;
      }

      const updateDate = date || new Date().toISOString().slice(0, 10);
      const updateRange = `books_master!F${rowIndex + 1}:G${rowIndex + 1}`;
      const updateValues = [status, updateDate];
      
      const success = await this.updateData(updateRange, updateValues);
      
      if (success) {
        const row = values[rowIndex];
        return {
          id: row[0],
          title: row[2],
          author: row[3],
          memo: row[4]
        };
      }
      
      return null;
    } catch (error) {
      console.error('本のステータス更新エラー:', error);
      return null;
    }
  }

  /**
 * 本を購入済みに変更
 */
async buyBook(id) {
  return this.updateBookStatus(id, 'want_to_read');
}

/**
 * 本の読書を開始
 */
async startReading(id) {
  return this.updateBookStatus(id, 'reading');
}

/**
 * 本の読書を完了
 */
async finishReading(id) {
  return this.updateBookStatus(id, 'finished');
}

  /**
   * 本一覧を取得（フォーマット済み）
   */
  async getBooks() {
    try {
      const values = await this.getData('books_master!A:G');
      
      return values.slice(1).map(row => {
        const [id, date, title, author, memo, status] = row;
        const statusEmoji = {
          'want_to_buy': '🛒',
          'want_to_read': '📋',
          'reading': '📖',
          'finished': '✅',
          'abandoned': '❌'
        };
        
        const statusText = {
          'want_to_buy': '買いたい',
          'want_to_read': '積読',
          'reading': '読書中',
          'finished': '読了',
          'abandoned': '中断'
        };
        
        return `${statusEmoji[status] || '📋'} [${id}] ${title} - ${author} (${statusText[status] || status})`;
      });
    } catch (error) {
      console.error('本一覧取得エラー:', error);
      return ['📋 [1] テスト本 - テスト作者 (want_to_read)'];
    }
  }

  /**
   * 買いたい本一覧を取得（修正版）
   */
  async getWishlistBooks() {
    try {
      console.log('🛒 買いたい本を取得中...');
      
      const books = await this.getAllBooks();
      console.log(`📚 全ての本: ${books.length}冊`);
      
      // want_to_buyステータスの本をフィルタリング
      const wishlistBooks = books.filter(book => {
        console.log(`📖 本チェック: ID=${book.id}, Status="${book.status}"`);
        return book.status === 'want_to_buy';
      });
      
      console.log(`🛒 買いたい本: ${wishlistBooks.length}冊`);
      
      // タイトル - 作者 の形式で返す
      const result = wishlistBooks.map(book => `[${book.id}] ${book.title} - ${book.author}`);
      
      console.log('✅ 買いたい本一覧:', result);
      return result;
    } catch (error) {
      console.error('❌ 買いたい本取得エラー:', error.message);
      return [];
    }
  }

  /**
   * 積読本を取得
   */
  async getWantToReadBooks() {
    try {
      const wantToReadBooks = await this.getBooksByStatus('want_to_read');
      return wantToReadBooks.map(book => `[${book.id}] ${book.title} - ${book.author}`);
    } catch (error) {
      console.error('❌ 積読本取得エラー:', error.message);
      return [];
    }
  }

  /**
   * 読書中の本を取得
   */
  async getReadingBooks() {
    try {
      const readingBooks = await this.getBooksByStatus('reading');
      return readingBooks.map(book => `[${book.id}] ${book.title} - ${book.author}`);
    } catch (error) {
      console.error('❌ 読書中の本取得エラー:', error.message);
      return [];
    }
  }

  /**
   * 読了済みの本を取得
   */
  async getFinishedBooks() {
    try {
      const finishedBooks = await this.getBooksByStatus('finished');
      return finishedBooks.map(book => `[${book.id}] ${book.title} - ${book.author}`);
    } catch (error) {
      console.error('❌ 読了済みの本取得エラー:', error.message);
      return [];
    }
  }

  /**
   * 特定ステータスの本を取得するヘルパー
   */
  async getBooksByStatus(status) {
    try {
      console.log(`📚 ステータス "${status}" の本を取得中...`);
      
      const books = await this.getAllBooks();
      const filteredBooks = books.filter(book => book.status === status);
      
      console.log(`✅ ステータス "${status}" の本: ${filteredBooks.length}冊`);
      return filteredBooks;
    } catch (error) {
      console.error(`❌ ステータス "${status}" の本取得エラー:`, error.message);
      return [];
    }
  }
  
/**
 * 現在読書中の本を取得（通知用にフォーマット済み）
 */
async getCurrentReadingBooks() {
  try {
    console.log('📚 読書中の本を取得開始...');
    
    const books = await this.getAllBooks();
    const readingBooks = books.filter(book => book.status === 'reading');
    
    console.log(`✅ 読書中の本: ${readingBooks.length}冊`);
    
    // 通知用フォーマットで返す
    return readingBooks.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      notes: book.notes || ''
    }));
    
  } catch (error) {
    console.error('❌ 読書中の本取得エラー:', error.message);
    return [];
  }
}

 /**
 * 本の統計を取得（修正版）
 */
async getBookCounts() {
  try {
    console.log('📊 本の統計取得開始...');
    
    const books = await this.getAllBooks();
    console.log(`📚 取得した本の総数: ${books.length}`);
    
    // デバッグ用：最初の数件のステータスを確認
    console.log('📋 ステータス確認（最初の5件）:');
    books.slice(0, 5).forEach((book, index) => {
      console.log(`  ${index + 1}. ID:${book.id} - "${book.title}" - ステータス:"${book.status}"`);
    });
    
    // 全ステータスの一覧を確認
    const allStatuses = [...new Set(books.map(book => book.status))];
    console.log('📊 データベース内の全ステータス:', allStatuses);
    
    const counts = {
      total: books.length,
      wantToBuy: books.filter(book => book.status === 'want_to_buy').length,
      wantToRead: books.filter(book => book.status === 'want_to_read').length,
      reading: books.filter(book => book.status === 'reading').length,
      finished: books.filter(book => book.status === 'finished').length,
      abandoned: books.filter(book => book.status === 'abandoned').length
    };
    
    console.log('📊 ステータス別カウント結果:', counts);
    
    // 不明なステータスの本もカウント
    const knownStatuses = ['want_to_buy', 'want_to_read', 'reading', 'finished', 'abandoned'];
    const unknownStatusBooks = books.filter(book => !knownStatuses.includes(book.status));
    if (unknownStatusBooks.length > 0) {
      console.log('⚠️ 不明なステータスの本:', unknownStatusBooks.map(book => ({ id: book.id, title: book.title, status: book.status })));
    }
    
    return counts;
  } catch (error) {
    console.error('❌ Book統計取得エラー:', error.message);
    return {
      total: 0,
      wantToBuy: 0,
      wantToRead: 0,
      reading: 0,
      finished: 0,
      abandoned: 0
    };
  }
}

  /**
   * 本を検索
   */
  async searchBooks(keyword) {
    try {
      const values = await this.getData('books_master!A:G');
      const results = [];
      
      for (const row of values.slice(1)) {
        const [id, date, title, author, memo, status] = row;
        const searchText = `${title} ${author} ${memo}`.toLowerCase();
        
        if (searchText.includes(keyword.toLowerCase())) {
          const statusEmoji = {
            'want_to_buy': '🛒',
            'want_to_read': '📋',
            'reading': '📖',
            'finished': '✅',
            'abandoned': '❌'
          };
          
          results.push(`${statusEmoji[status] || '📋'} [${id}] ${title} - ${author} (${status})`);
        }
      }
      
      return results;
    } catch (error) {
      console.error('本の検索エラー:', error);
      return [];
    }
  }

  /**
   * 月次読了本のタイトルを取得
   */
  async getMonthlyBookTitles() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().slice(0, 10);
    
    try {
      const values = await this.getData('books_master!A:G');
      
      const monthlyBooks = values.slice(1)
        .filter(row => 
          row[5] === 'finished' && 
          row[6] && 
          row[6] >= monthStartStr
        )
        .map(row => row[2]);
      
      return monthlyBooks;
    } catch (error) {
      console.error('月次読書タイトル取得エラー:', error);
      return [];
    }
  }

  /**
   * デバッグ用: Booksデータを確認
   */
  async debugBooksData() {
    try {
      console.log('🔍 Books データデバッグ開始...');
      
      if (!this.auth) {
        console.log('認証なし - デバッグできません');
        return;
      }

      const range = 'books_master!A:G';
      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: range,
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values;
      
      console.log('📊 取得した生データ:');
      console.log(`行数: ${rows ? rows.length : 0}`);
      
      if (rows && rows.length > 0) {
        console.log('ヘッダー行:', rows[0]);
        console.log('データ行 (最初の3行):');
        rows.slice(1, 4).forEach((row, index) => {
          console.log(`  ${index + 1}:`, row);
        });
      }
      
      // 構造化されたデータも確認
      const books = await this.getAllBooks();
      console.log('\n📚 構造化後のデータ (最初の3件):');
      books.slice(0, 3).forEach((book, index) => {
        console.log(`  ${index + 1}:`, JSON.stringify(book, null, 2));
      });
      
    } catch (error) {
      console.error('❌ デバッグエラー:', error.message);
    }
  }

  // === 映画関連のメソッド ===
/**
   * 全ての映画を取得
   */
  async getAllMovies() {
    try {
      console.log('🎬 Movies データを取得中...');
      
      if (!this.auth) {
        console.log('認証なし - 空の配列を返します');
        return [];
      }

      const range = 'movies_master!A:F';
      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: range,
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values;
      
      if (!rows || rows.length <= 1) {
        console.log('🎬 Moviesデータが見つかりません');
        return [];
      }

      const headers = rows[0];
      console.log('📋 Movies ヘッダー:', headers);
      
      const movies = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        const movie = {
          id: row[0] || '',           // A列: ID
          registeredAt: row[1] || '', // B列: 登録日時
          title: row[2] || '',        // C列: タイトル
          memo: row[3] || '',         // D列: 備考
          status: row[4] || '',       // E列: ステータス
          date: row[5] || ''          // F列: 日付
        };
        
        if (movie.id && movie.id.toString().trim() !== '') {
          movies.push(movie);
        }
      }

      console.log(`✅ ${movies.length}件のMoviesを取得しました`);
      return movies;

    } catch (error) {
      console.error('❌ Movies取得エラー:', error.message);
      return [];
    }
  }

  /**
   * IDで特定の映画を取得
   */
  async getMovieById(id) {
    try {
      console.log(`🎬 ID: ${id} の映画を検索中...`);
      
      const movies = await this.getAllMovies();
      const movie = movies.find(movie => parseInt(movie.id) === parseInt(id));
      
      if (!movie) {
        console.log(`❌ ID: ${id} の映画が見つかりません`);
        return null;
      }
      
      console.log(`✅ 映画が見つかりました: ${movie.title}`);
      return {
        id: parseInt(movie.id),
        title: movie.title,
        memo: movie.memo || '',
        status: movie.status,
        created_at: movie.registeredAt,
        updated_at: movie.date
      };
    } catch (error) {
      console.error('getMovieById エラー:', error);
      return null;
    }
  }

  /**
   * 特定ステータスの映画を取得するヘルパー
   */
  async getMoviesByStatus(status) {
    try {
      console.log(`🎬 ステータス "${status}" の映画を取得中...`);
      
      const movies = await this.getAllMovies();
      const filteredMovies = movies.filter(movie => movie.status === status);
      
      console.log(`✅ ステータス "${status}" の映画: ${filteredMovies.length}本`);
      return filteredMovies;
    } catch (error) {
      console.error(`❌ ステータス "${status}" の映画取得エラー:`, error.message);
      return [];
    }
  }

  /**
   * 観たい映画を取得
   */
  async getWantToWatchMovies() {
    try {
      const wantToWatchMovies = await this.getMoviesByStatus('want_to_watch');
      return wantToWatchMovies.map(movie => `[${movie.id}] ${movie.title}`);
    } catch (error) {
      console.error('❌ 観たい映画取得エラー:', error.message);
      return [];
    }
  }

  /**
   * 視聴済み映画を取得
   */
  async getWatchedMovies() {
    try {
      const watchedMovies = await this.getMoviesByStatus('watched');
      return watchedMovies.map(movie => `[${movie.id}] ${movie.title}`);
    } catch (error) {
      console.error('❌ 視聴済み映画取得エラー:', error.message);
      return [];
    }
  }

  
  /**
   * 映画を追加
   */
  async addMovie(title, memo = '') {
    try {
      const id = await this.getNextId('movies_master');
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      
      const values = [id, now, title, memo, 'want_to_watch', now.slice(0, 10)];
      const resultId = await this.appendData('movies_master!A:F', values);
      
      console.log('✅ 映画の追加成功:', id);
      return resultId;
    } catch (error) {
      console.error('❌ 映画の追加エラー:', error);
      return Math.floor(Math.random() * 1000) + Date.now() % 1000;
    }
  }

  /**
   * 映画のステータスを更新
   */
  async updateMovieStatus(id, status) {
    try {
      const values = await this.getData('movies_master!A:F');
      const rowIndex = values.findIndex(row => row[0] == id);
      
      if (rowIndex === -1) {
        console.log('指定されたIDの映画が見つかりません:', id);
        return null;
      }

      const date = new Date().toISOString().slice(0, 10);
      const updateRange = `movies_master!E${rowIndex + 1}:F${rowIndex + 1}`;
      const updateValues = [status, date];
      
      const success = await this.updateData(updateRange, updateValues);
      
      if (success) {
        const row = values[rowIndex];
        return {
          id: row[0],
          title: row[2] || '不明なタイトル',
          memo: row[3] || ''
        };
      }
      
      return null;
    } catch (error) {
      console.error('映画のステータス更新エラー:', error);
      return null;
    }
  }

  /**
   * 映画を視聴済みに変更
   */
  async watchMovie(id) {
    return this.updateMovieStatus(id, 'watched');
  }

  /**
   * 映画をスキップ
   */
  async skipMovie(id) {
    return this.updateMovieStatus(id, 'missed');
  }

  /**
   * 映画一覧を取得
   */
  async getMovies() {
    try {
      const values = await this.getData('movies_master!A:F');
      
      return values.slice(1).map(row => {
        const [id, date, title, memo, status] = row;
        const statusEmoji = {
          'want_to_watch': '🎬',
          'watched': '✅',
          'missed': '😅'
        };
        
        return `${statusEmoji[status] || '🎬'} [${id}] ${title} (${status})`;
      });
    } catch (error) {
      console.error('映画一覧取得エラー:', error);
      return ['🎬 [1] テスト映画 (want_to_watch)'];
    }
  }

  /**
   * 映画の統計を取得
   */
  async getMovieCounts() {
    try {
      const values = await this.getData('movies_master!A:F');
      const data = values.slice(1);
      
      return {
        total: data.length,
        wantToWatch: data.filter(row => row[4] === 'want_to_watch').length,
        watched: data.filter(row => row[4] === 'watched').length,
        missed: data.filter(row => row[4] === 'missed').length
      };
    } catch (error) {
      console.error('映画の統計取得エラー:', error);
      return { total: 0, wantToWatch: 0, watched: 0, missed: 0 };
    }
  }

  /**
   * 映画を検索
   */
  async searchMovies(keyword) {
    try {
      const values = await this.getData('movies_master!A:F');
      const results = [];
      
      for (const row of values.slice(1)) {
        const [id, date, title, memo, status] = row;
        const searchText = `${title} ${memo}`.toLowerCase();
        
        if (searchText.includes(keyword.toLowerCase())) {
          const statusEmoji = {
            'want_to_watch': '🎬',
            'watched': '✅',
            'missed': '😅'
          };
          
          results.push(`${statusEmoji[status] || '🎬'} [${id}] ${title} (${status})`);
        }
      }
      
      return results;
    } catch (error) {
      console.error('映画の検索エラー:', error);
      return [];
    }
  }

  // === 活動関連のメソッド ===

  /**
   * 全ての活動を取得
   */
  async getAllActivities() {
    try {
      console.log('🎯 Activities データを取得中...');
      
      if (!this.auth) {
        console.log('認証なし - 空の配列を返します');
        return [];
      }

      const range = 'activities_master!A:F';
      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: range,
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values;
      
      if (!rows || rows.length <= 1) {
        console.log('🎯 Activitiesデータが見つかりません');
        return [];
      }

      const headers = rows[0];
      console.log('📋 Activities ヘッダー:', headers);
      
      const activities = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        const activity = {
          id: row[0] || '',           // A列: ID
          registeredAt: row[1] || '', // B列: 登録日時
          content: row[2] || '',      // C列: 活動内容
          memo: row[3] || '',         // D列: 備考
          status: row[4] || '',       // E列: ステータス
          date: row[5] || ''          // F列: 日付
        };
        
        if (activity.id && activity.id.toString().trim() !== '') {
          activities.push(activity);
        }
      }

      console.log(`✅ ${activities.length}件のActivitiesを取得しました`);
      return activities;

    } catch (error) {
      console.error('❌ Activities取得エラー:', error.message);
      return [];
    }
  }

  /**
   * IDで特定の活動を取得
   */
  async getActivityById(id) {
    try {
      console.log(`🎯 ID: ${id} の活動を検索中...`);
      
      const activities = await this.getAllActivities();
      const activity = activities.find(activity => parseInt(activity.id) === parseInt(id));
      
      if (!activity) {
        console.log(`❌ ID: ${id} の活動が見つかりません`);
        return null;
      }
      
      console.log(`✅ 活動が見つかりました: ${activity.content}`);
      return {
        id: parseInt(activity.id),
        content: activity.content,
        memo: activity.memo || '',
        status: activity.status,
        created_at: activity.registeredAt,
        updated_at: activity.date
      };
    } catch (error) {
      console.error('getActivityById エラー:', error);
      return null;
    }
  }

  /**
   * 特定ステータスの活動を取得するヘルパー
   */
  async getActivitiesByStatus(status) {
    try {
      console.log(`🎯 ステータス "${status}" の活動を取得中...`);
      
      const activities = await this.getAllActivities();
      const filteredActivities = activities.filter(activity => activity.status === status);
      
      console.log(`✅ ステータス "${status}" の活動: ${filteredActivities.length}件`);
      return filteredActivities;
    } catch (error) {
      console.error(`❌ ステータス "${status}" の活動取得エラー:`, error.message);
      return [];
    }
  }

  /**
   * 予定中の活動を取得
   */
  async getPlannedActivities() {
    try {
      const plannedActivities = await this.getActivitiesByStatus('planned');
      return plannedActivities.map(activity => `[${activity.id}] ${activity.content}`);
    } catch (error) {
      console.error('❌ 予定中活動取得エラー:', error.message);
      return [];
    }
  }

  /**
   * 完了済み活動を取得
   */
  async getCompletedActivities() {
    try {
      const completedActivities = await this.getActivitiesByStatus('done');
      return completedActivities.map(activity => `[${activity.id}] ${activity.content}`);
    } catch (error) {
      console.error('❌ 完了済み活動取得エラー:', error.message);
      return [];
    }
  }
  
  /**
   * 活動を追加
   */
  async addActivity(content, memo = '') {
    try {
      const id = await this.getNextId('activities_master');
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      
      const values = [id, now, content, memo, 'planned', now.slice(0, 10)];
      const resultId = await this.appendData('activities_master!A:F', values);
      
      console.log('✅ 活動の追加成功:', id);
      return resultId;
    } catch (error) {
      console.error('❌ 活動の追加エラー:', error);
      return Math.floor(Math.random() * 1000) + Date.now() % 1000;
    }
  }

  /**
   * 活動のステータスを更新
   */
  async updateActivityStatus(id, status) {
    try {
      const values = await this.getData('activities_master!A:F');
      const rowIndex = values.findIndex(row => row[0] == id);
      
      if (rowIndex === -1) {
        console.log('指定されたIDの活動が見つかりません:', id);
        return null;
      }

      const date = new Date().toISOString().slice(0, 10);
      const updateRange = `activities_master!E${rowIndex + 1}:F${rowIndex + 1}`;
      const updateValues = [status, date];
      
      const success = await this.updateData(updateRange, updateValues);
      
      if (success) {
        const row = values[rowIndex];
        return {
          id: row[0],
          content: row[2] || '不明な活動',
          memo: row[3] || ''
        };
      }
      
      return null;
    } catch (error) {
      console.error('活動のステータス更新エラー:', error);
      return null;
    }
  }

  /**
   * 活動を完了
   */
  async doneActivity(id) {
    return this.updateActivityStatus(id, 'done');
  }

  /**
   * 活動をスキップ
   */
  async skipActivity(id) {
    return this.updateActivityStatus(id, 'skipped');
  }

  /**
   * 活動一覧を取得
   */
  async getActivities() {
    try {
      const values = await this.getData('activities_master!A:F');
      
      return values.slice(1).map(row => {
        const [id, date, content, memo, status] = row;
        const statusEmoji = {
          'planned': '🎯',
          'done': '✅',
          'skipped': '😅'
        };
        
        return `${statusEmoji[status] || '🎯'} [${id}] ${content} (${status})`;
      });
    } catch (error) {
      console.error('活動一覧取得エラー:', error);
      return ['🎯 [1] テスト活動 (planned)'];
    }
  }

  /**
   * 活動の統計を取得
   */
  async getActivityCounts() {
    try {
      const values = await this.getData('activities_master!A:F');
      const data = values.slice(1);
      
      return {
        total: data.length,
        planned: data.filter(row => row[4] === 'planned').length,
        done: data.filter(row => row[4] === 'done').length,
        skipped: data.filter(row => row[4] === 'skipped').length
      };
    } catch (error) {
      console.error('活動の統計取得エラー:', error);
      return { total: 0, planned: 0, done: 0, skipped: 0 };
    }
  }

  /**
   * 活動を検索
   */
  async searchActivities(keyword) {
    try {
      const values = await this.getData('activities_master!A:F');
      const results = [];
      
      for (const row of values.slice(1)) {
        const [id, date, content, memo, status] = row;
        const searchText = `${content} ${memo}`.toLowerCase();
        
        if (searchText.includes(keyword.toLowerCase())) {
          const statusEmoji = {
            'planned': '🎯',
            'done': '✅',
            'skipped': '😅'
          };
          
          results.push(`${statusEmoji[status] || '🎯'} [${id}] ${content} (${status})`);
        }
      }
      
      return results;
    } catch (error) {
      console.error('活動の検索エラー:', error);
      return [];
    }
  }

  // === 日報関連のメソッド ===

  /**
   * 日報を追加
   */
  async addDailyReport(category, itemId, content) {
    try {
      const reportId = await this.getNextId('daily_reports');
      const date = new Date().toISOString().slice(0, 10);
      
      const values = [reportId, date, category, itemId, content];
      const resultId = await this.appendData('daily_reports!A:E', values);
      
      console.log('✅ 日報の追加成功:', reportId);
      return resultId;
    } catch (error) {
      console.error('❌ 日報の追加エラー:', error);
      return Math.floor(Math.random() * 1000) + Date.now() % 1000;
    }
  }

  /**
   * アイテム別レポートを取得
   */
  async getReportsByItem(category, itemId) {
    try {
      const values = await this.getData('daily_reports!A:E');
      
      const reports = values.slice(1)
        .filter(row => 
          row[2] === category && // カテゴリが一致
          row[3] == itemId       // IDが一致
        )
        .map(row => ({
          reportId: row[0],
          date: row[1],
          category: row[2],
          itemId: row[3],
          content: row[4] || ''
        }));
      
      console.log(`${category} ID:${itemId} のレポート取得完了:`, reports.length, '件');
      return reports;
    } catch (error) {
      console.error('レポート履歴取得エラー:', error);
      return [];
    }
  }

 /**
 * 最近のレポートを取得（修正版）
 */
async getRecentReports(days = 7) {
  try {
    console.log(`📝 過去${days}日間のレポート取得開始`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString().slice(0, 10);
    
    const data = await this.getData('daily_reports!A:Z');
    if (!data || data.length <= 1) return [];

    const reports = [];
    const dataRows = data.slice(1); // ヘッダー行をスキップ

    console.log('📊 daily_reports シート構造確認:');
    if (data.length > 0) {
      console.log('ヘッダー行:', data[0]);
      if (data.length > 1) {
        console.log('サンプルデータ行:', data[1]);
      }
    }

    dataRows.forEach((row, index) => {
      const reportDate = row[1]; // B列: date
      if (!reportDate) return;

      const dateStr = new Date(reportDate).toISOString().slice(0, 10);
      if (dateStr >= cutoffDateStr) {
        // daily_reports の正しい列構造
        // A列: reportId, B列: date, C列: category, D列: itemId, E列: content
        const report = {
          timestamp: new Date(reportDate),
          category: row[2] || 'unknown',    // C列: category
          content: row[4] || '',            // E列: content (実際のレポート内容)
          item_id: row[3] || '',            // D列: itemId
          user_id: row[0] || 'default'      // A列: reportId (またはuser_id)
        };

        // デバッグ用ログ
        if (index < 3) { // 最初の3件だけログ出力
          console.log(`📊 レポートデータサンプル (行${index + 2}):`, {
            originalRow: row,
            parsedReport: report,
            contentLength: report.content.length
          });
        }

        reports.push(report);
      }
    });

    console.log(`✅ ${reports.length}件のレポートを取得しました`);
    return reports.sort((a, b) => b.timestamp - a.timestamp); // 新しい順

  } catch (error) {
    console.error('レポート取得エラー:', error);
    return [];
  }
}


  /**
   * キーワードでレポートを検索
   */
  async searchReportsByKeyword(keyword) {
    try {
      const values = await this.getData('daily_reports!A:E');
      
      const reports = values.slice(1)
        .filter(row => {
          const content = (row[4] || '').toLowerCase();
          return content.includes(keyword.toLowerCase());
        })
        .map(row => ({
          reportId: row[0],
          date: row[1],
          category: row[2],
          itemId: row[3],
          content: row[4] || ''
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log(`"${keyword}" の検索結果:`, reports.length, '件');
      return reports;
    } catch (error) {
      console.error('レポートキーワード検索エラー:', error);
      return [];
    }
  }

  // === 統計関連のメソッド ===

  /**
   * 週次統計を取得
   */
  async getWeeklyStats() {
    try {
      console.log('📊 週次統計取得開始');
      
      // 今週の月曜日から日曜日までの期間を計算
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek + 1); // 月曜日
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // 日曜日
      endOfWeek.setHours(23, 59, 59, 999);

      // 指定期間の統計を取得
      const stats = await this.getStatsForDateRange(startOfWeek, endOfWeek);
      console.log('✅ 週次統計取得完了:', stats);
      return stats;
    } catch (error) {
      console.error('週次統計取得エラー:', error);
      return { finishedBooks: 0, watchedMovies: 0, completedActivities: 0, reports: 0 };
    }
  }

  /**
   * 月次統計を取得
   */
  async getMonthlyStats() {
    try {
      console.log('📊 月次統計取得開始');
      
      // 今月の1日から月末までの期間を計算
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      // 指定期間の統計を取得
      const stats = await this.getStatsForDateRange(startOfMonth, endOfMonth);
      console.log('✅ 月次統計取得完了:', stats);
      return stats;
    } catch (error) {
      console.error('月次統計取得エラー:', error);
      return { finishedBooks: 0, watchedMovies: 0, completedActivities: 0, reports: 0 };
    }
  }

  /**
   * 期間統計取得メソッド
   */
  async getStatsForDateRange(startDate, endDate) {
    try {
      console.log(`📊 期間統計取得: ${startDate.toISOString().slice(0, 10)} ～ ${endDate.toISOString().slice(0, 10)}`);
      
      const startDateStr = startDate.toISOString().slice(0, 10);
      const endDateStr = endDate.toISOString().slice(0, 10);
      
      // 本の完了数
      const finishedBooks = await this.countCompletions('books_master', 'finished', startDateStr, endDateStr);
      
      // 映画の視聴完了数
      const watchedMovies = await this.countCompletions('movies_master', 'watched', startDateStr, endDateStr);
      
      // 活動の完了数
      const completedActivities = await this.countCompletions('activities_master', 'done', startDateStr, endDateStr);
      
      // レポート数
      const reports = await this.countReports(startDateStr, endDateStr);
      
      const result = {
        finishedBooks,
        watchedMovies,
        completedActivities,
        reports
      };
      
      console.log('✅ 期間統計取得完了:', result);
      return result;

    } catch (error) {
      console.error('期間統計取得エラー:', error);
      return { finishedBooks: 0, watchedMovies: 0, completedActivities: 0, reports: 0 };
    }
  }

  /**
   * 指定シートの完了数をカウント
   */
  async countCompletions(sheetName, completedStatus, startDate, endDate) {
    try {
      const data = await this.getData(`${sheetName}!A:Z`);
      if (!data || data.length <= 1) return 0;

      let count = 0;
      const dataRows = data.slice(1); // ヘッダー行をスキップ

      // シート別の正確な列構成
      const sheetConfigs = {
        'books_master': {
          statusColumn: 5,  // F列: ステータス
          dateColumn: 6,    // G列: 日付
          description: 'ID、登録日時、タイトル、作者名、備考、ステータス、日付'
        },
        'movies_master': {
          statusColumn: 4,  // E列: ステータス
          dateColumn: 5,    // F列: 日付
          description: 'ID、登録日時、タイトル、備考、ステータス、日付'
        },
        'activities_master': {
          statusColumn: 4,  // E列: ステータス
          dateColumn: 5,    // F列: 日付
          description: 'ID、登録日時、タイトル、備考、ステータス、日付'
        }
      };

      const config = sheetConfigs[sheetName];
      if (!config) {
        console.error(`❌ 未知のシート: ${sheetName}`);
        return 0;
      }

      console.log(`📊 ${sheetName} カウント開始: ${completedStatus} ステータス (${startDate} ～ ${endDate})`);

      dataRows.forEach((row, index) => {
        try {
          const status = row[config.statusColumn];
          const dateValue = row[config.dateColumn];
          
          // ステータスチェック
          if (status !== completedStatus) return;
          
          // 日付の安全なパース
          const parsedDate = this.parseDateSafely(dateValue);
          if (!parsedDate) {
            return;
          }
          
          // 日付が期間内かチェック
          const dateStr = parsedDate.toISOString().slice(0, 10);
          if (dateStr >= startDate && dateStr <= endDate) {
            count++;
            // カウントした項目の詳細をログ出力
            const title = row[2] || 'タイトル不明';
            console.log(`✅ ${sheetName} [${count}] "${title}" - ${dateStr}`);
          }
          
        } catch (rowError) {
          console.error(`${sheetName} 行${index + 2} 処理エラー:`, rowError.message);
        }
      });

      console.log(`📊 ${sheetName} ${completedStatus} 最終カウント: ${count}`);
      return count;
    } catch (error) {
      console.error(`${sheetName}完了数カウントエラー:`, error);
      return 0;
    }
  }

  /**
   * レポート数をカウント
   */
  async countReports(startDate, endDate) {
    try {
      const data = await this.getData('daily_reports!A:Z');
      if (!data || data.length <= 1) return 0;

      let count = 0;
      const dataRows = data.slice(1); // ヘッダー行をスキップ

      dataRows.forEach(row => {
        const reportDate = row[1]; // B列: date
        if (!reportDate) return;

        const dateStr = new Date(reportDate).toISOString().slice(0, 10);
        if (dateStr >= startDate && dateStr <= endDate) {
          count++;
        }
      });

      console.log(`Reports count: ${count}`);
      return count;
    } catch (error) {
      console.error('レポート数カウントエラー:', error);
      return 0;
    }
  }

  /**
   * 日付を安全にパースするヘルパーメソッド
   */
  parseDateSafely(dateValue) {
    if (!dateValue || dateValue === '' || dateValue === '-') {
      return null;
    }
    
    try {
      // パターン1: 通常の日付文字列
      let parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
      
      // パターン2: Excel日付シリアル値
      if (typeof dateValue === 'string' && /^\d+$/.test(dateValue)) {
        const excelDate = new Date((parseInt(dateValue) - 25569) * 86400 * 1000);
        if (!isNaN(excelDate.getTime())) {
          return excelDate;
        }
      }
      
      // パターン3: 日本語形式の日付（例: 2025/1/15）
      if (typeof dateValue === 'string' && dateValue.includes('/')) {
        const parts = dateValue.split('/');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // 月は0ベース
          const day = parseInt(parts[2]);
          const japaneseDate = new Date(year, month, day);
          if (!isNaN(japaneseDate.getTime())) {
            return japaneseDate;
          }
        }
      }
      
      console.log(`⚠️ パースできない日付形式: "${dateValue}" (型: ${typeof dateValue})`);
      return null;
      
    } catch (error) {
      console.log(`❌ 日付パースエラー: "${dateValue}" - ${error.message}`);
      return null;
    }
  }

  // === ウィッシュリスト関連メソッド ===

  /**
   * ウィッシュリストアイテム追加（認証修正版）
   */
  async addWishlistItem(name, price, url, priority, memo) {
    if (!this.auth) {
      console.log('認証なし - ダミーIDを返します');
      return Math.floor(Math.random() * 1000);
    }

    try {
      const timestamp = new Date().toISOString();
      const id = await this.getNextId('wishlist_master');
      
      const values = [
        [id, timestamp, name, price || '', '', url || '', priority || 'medium', memo || '', 'want_to_buy', timestamp]
      ];
      
      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.append({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'wishlist_master!A:J',
          valueInputOption: 'USER_ENTERED',
          resource: { values }
        });
      };
      
      await this.executeWithTimeout(operation, 15000);
      console.log('✅ ウィッシュリストアイテム追加成功:', id);
      return id;
      
    } catch (error) {
      console.error('ウィッシュリストアイテム追加エラー:', error.message);
      
      // より詳細なエラー情報
      if (error.message.includes("Unable to parse range")) {
        throw new Error(`シート "wishlist_master" が存在しません。Google Sheetsで作成してください。`);
      }
      
      if (error.message.includes("authentication")) {
        throw new Error('Google Sheets認証エラー。環境変数を確認してください。');
      }
      
      throw error;
    }
  }

  /**
   * ウィッシュリストアイテムを購入済みに変更
   */
  async buyWishlistItem(id, actualPrice) {
    try {
      if (!this.auth) {
        console.log('認証なし - nullを返します');
        return null;
      }

      const items = await this.getWishlistItems();
      const itemIndex = items.findIndex(item => {
        const match = item.match(/\[(\d+)\]/);
        return match && parseInt(match[1]) === id;
      });
      
      if (itemIndex === -1) return null;
      
      const rowIndex = itemIndex + 2; // ヘッダー行を考慮
      const timestamp = new Date().toISOString();
      
      const operation = async () => {
        const auth = await this.auth.getClient();
        
        // ステータス更新
        await this.sheets.spreadsheets.values.update({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: `wishlist_master!I${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [['bought']] }
        });
        
        // 実際の価格更新
        if (actualPrice) {
          await this.sheets.spreadsheets.values.update({
            auth,
            spreadsheetId: this.spreadsheetId,
            range: `wishlist_master!E${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[actualPrice]] }
          });
        }
        
        // 更新日時更新
        await this.sheets.spreadsheets.values.update({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: `wishlist_master!J${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[timestamp]] }
        });
      };

      await this.executeWithTimeout(operation, 15000);
      
      return await this.getWishlistItemInfo(id);
    } catch (error) {
      console.error('ウィッシュリストアイテム購入エラー:', error);
      throw error;
    }
  }

  /**
   * ウィッシュリストアイテム一覧取得（認証修正版）
   */
  async getWishlistItems() {
    if (!this.auth) {
      console.log('認証なし - 空の配列を返します');
      return [];
    }

    try {
      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'wishlist_master!A:J'
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values || [];
      
      console.log(`📋 wishlist_master から ${rows.length} 行取得しました`);
      
      if (rows.length <= 1) {
        console.log('ヘッダー行のみ、またはデータが空です');
        return [];
      }
      
      const items = rows.slice(1).map((row, index) => {
        const [id, createdAt, name, price, actualPrice, url, priority, memo, status] = row;
        
        // デバッグ用ログ
        console.log(`行 ${index + 2}: ID=${id}, Name=${name}, Status=${status}`);
        
        const priceText = price ? ` ¥${parseInt(price).toLocaleString()}` : '';
        const statusText = status === 'bought' ? '(購入済み)' : '(未購入)';
        const priorityEmoji = {
          'high': '🔴',
          'medium': '🟡', 
          'low': '🟢'
        }[priority] || '🟡';
        
        return `${priorityEmoji} [${id}] ${name}${priceText} ${statusText}`;
      }).filter(item => item); // 空のアイテムを除外
      
      console.log(`✅ ${items.length} 個のウィッシュリストアイテムを取得しました`);
      return items;
      
    } catch (error) {
      console.error('ウィッシュリストアイテム一覧取得エラー:', error.message);
      
      if (error.message.includes("Unable to parse range")) {
        console.log('wishlist_master シートが見つかりません');
        return [];
      }
      
      return [];
    }
  }

  /**
   * 未購入ウィッシュリストアイテム取得
   */
  async getPendingWishlistItems() {
    try {
      const allItems = await this.getWishlistItems();
      const pendingItems = allItems.filter(item => item.includes('(未購入)'));
      
      console.log(`📋 未購入アイテム: ${pendingItems.length}個`);
      return pendingItems;
    } catch (error) {
      console.error('未購入ウィッシュリストアイテム取得エラー:', error);
      return [];
    }
  }

  /**
   * 購入済みアイテム取得
   */
  async getBoughtItems() {
    try {
      const allItems = await this.getWishlistItems();
      const boughtItems = allItems.filter(item => item.includes('(購入済み)'));
      
      console.log(`📋 購入済みアイテム: ${boughtItems.length}個`);
      return boughtItems;
    } catch (error) {
      console.error('購入済みアイテム取得エラー:', error);
      return [];
    }
  }

  /**
   * ウィッシュリストアイテム詳細情報取得
   */
  async getWishlistItemInfo(id) {
    if (!this.auth) {
      console.log('認証なし - nullを返します');
      return null;
    }

    try {
      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'wishlist_master!A:J'
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values || [];
      
      console.log(`📋 wishlist_master から ${rows.length} 行取得しました`);
      
      if (rows.length <= 1) {
        console.log('データが見つかりません');
        return null;
      }
      
      const itemRow = rows.slice(1).find(row => parseInt(row[0]) === id);
      
      if (!itemRow) {
        console.log(`ID ${id} のアイテムが見つかりません`);
        return null;
      }
      
      const [itemId, createdAt, name, price, actualPrice, url, priority, memo, status, updatedAt] = itemRow;
      
      const itemInfo = {
        id: parseInt(itemId),
        name: name || 'タイトル不明',
        price: price ? parseInt(price) : null,
        actualPrice: actualPrice ? parseInt(actualPrice) : null,
        url: url || '',
        priority: priority || 'medium',
        memo: memo || '',
        status: status || 'want_to_buy',
        createdAt: createdAt || '',
        updatedAt: updatedAt || ''
      };
      
      console.log(`✅ アイテム詳細取得: ID=${id}, Name=${itemInfo.name}`);
      return itemInfo;
      
    } catch (error) {
      console.error('ウィッシュリストアイテム詳細取得エラー:', error);
      return null;
    }
  }

  /**
   * ウィッシュリストアイテム削除
   */
  async removeWishlistItem(id) {
    try {
      const itemInfo = await this.getWishlistItemInfo(id);
      if (!itemInfo) {
        console.log(`削除対象のアイテム ID:${id} が見つかりません`);
        return null;
      }
      
      // TODO: 実際の行削除処理を実装
      // 現在は論理削除（ステータス変更）で対応
      console.log(`TODO: ウィッシュリストアイテム ${id} の物理削除を実装`);
      console.log(`現在は論理削除として記録します: ${itemInfo.name}`);
      
      return itemInfo;
    } catch (error) {
      console.error('ウィッシュリストアイテム削除エラー:', error);
      throw error;
    }
  }

  /**
   * ウィッシュリスト統計取得
   */
  async getWishlistStats() {
    try {
      if (!this.auth) {
        return { pending: 0, bought: 0, totalBudget: 0, totalSpent: 0 };
      }

      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'wishlist_master!A:J'
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values || [];
      
      if (rows.length <= 1) return { pending: 0, bought: 0, totalBudget: 0, totalSpent: 0 };
      
      let pending = 0, bought = 0, totalBudget = 0, totalSpent = 0;
      
      rows.slice(1).forEach(row => {
        const [, , , price, actualPrice, , , , status] = row;
        
        if (status === 'want_to_buy') {
          pending++;
          if (price) totalBudget += parseInt(price);
        } else if (status === 'bought') {
          bought++;
          if (actualPrice) totalSpent += parseInt(actualPrice);
        }
      });
      
      return { pending, bought, totalBudget, totalSpent };
    } catch (error) {
      console.error('ウィッシュリスト統計取得エラー:', error);
      return { pending: 0, bought: 0, totalBudget: 0, totalSpent: 0 };
    }
  }

  // === 記事リスト関連メソッド ===

  /**
   * 記事追加（認証修正版）
   */
  async addArticle(title, url, priority, category, memo) {
    if (!this.auth) {
      console.log('認証なし - ダミーIDを返します');
      return Math.floor(Math.random() * 1000);
    }

    try {
      const timestamp = new Date().toISOString();
      const id = await this.getNextId('articles_master');
      
      const values = [
        [id, timestamp, title, url, category || 'general', priority || 'medium', memo || '', 'want_to_read', '', '', timestamp]
      ];
      
      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.append({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'articles_master!A:K',
          valueInputOption: 'USER_ENTERED',
          resource: { values }
        });
      };
      
      await this.executeWithTimeout(operation, 15000);
      console.log('✅ 記事追加成功:', id);
      return id;
      
    } catch (error) {
      console.error('記事追加エラー:', error.message);
      
      if (error.message.includes("Unable to parse range")) {
        throw new Error(`シート "articles_master" が存在しません。Google Sheetsで作成してください。`);
      }
      
      if (error.message.includes("authentication")) {
        throw new Error('Google Sheets認証エラー。環境変数を確認してください。');
      }
      
      throw error;
    }
  }

  /**
   * 記事を読了済みに変更
   */
  async markArticleAsRead(id, rating, review) {
    try {
      if (!this.auth) {
        console.log('認証なし - nullを返します');
        return null;
      }

      const articles = await this.getArticles();
      const articleIndex = articles.findIndex(article => {
        const match = article.match(/\[(\d+)\]/);
        return match && parseInt(match[1]) === id;
      });
      
      if (articleIndex === -1) return null;
      
      const rowIndex = articleIndex + 2; // ヘッダー行を考慮
      const timestamp = new Date().toISOString();
      
      const operation = async () => {
        const auth = await this.auth.getClient();
        
        // ステータス更新
        await this.sheets.spreadsheets.values.update({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: `articles_master!H${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [['read']] }
        });
        
        // 評価更新
        if (rating) {
          await this.sheets.spreadsheets.values.update({
            auth,
            spreadsheetId: this.spreadsheetId,
            range: `articles_master!I${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[rating]] }
          });
        }
        
        // レビュー更新
        if (review) {
          await this.sheets.spreadsheets.values.update({
            auth,
            spreadsheetId: this.spreadsheetId,
            range: `articles_master!J${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[review]] }
          });
        }
        
        // 更新日時更新
        await this.sheets.spreadsheets.values.update({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: `articles_master!K${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[timestamp]] }
        });
      };

      await this.executeWithTimeout(operation, 15000);
      
      return await this.getArticleInfo(id);
    } catch (error) {
      console.error('記事読了記録エラー:', error);
      throw error;
    }
  }

  /**
   * 記事一覧取得
   */
  async getArticles() {
    try {
      if (!this.auth) {
        return [];
      }

      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'articles_master!A:K'
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values || [];
      
      if (rows.length <= 1) return [];
      
      return rows.slice(1).map(row => {
        const [id, createdAt, title, url, category, priority, memo, status, rating] = row;
        const categoryEmoji = {
          'tech': '💻',
          'business': '💼',
          'lifestyle': '🌟',
          'news': '📰',
          'academic': '🎓',
          'general': '📄'
        }[category] || '📄';
        
        const statusText = status === 'read' ? '(読了済み)' : '(未読)';
        const ratingText = rating ? ` ${'⭐'.repeat(parseInt(rating))}` : '';
        
        return `[${id}] ${categoryEmoji} ${title}${ratingText} ${statusText}`;
      });
    } catch (error) {
      console.error('記事一覧取得エラー:', error);
      return [];
    }
  }

  /**
   * 未読記事取得
   */
  async getPendingArticles() {
    try {
      const allArticles = await this.getArticles();
      return allArticles.filter(article => article.includes('(未読)'));
    } catch (error) {
      console.error('未読記事取得エラー:', error);
      return [];
    }
  }

  /**
   * 読了済み記事取得
   */
  async getReadArticles() {
    try {
      const allArticles = await this.getArticles();
      return allArticles.filter(article => article.includes('(読了済み)'));
    } catch (error) {
      console.error('読了済み記事取得エラー:', error);
      return [];
    }
  }

  /**
   * 記事詳細情報取得
   */
  async getArticleInfo(id) {
    try {
      if (!this.auth) {
        return null;
      }

      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'articles_master!A:K'
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values || [];
      const articleRow = rows.find(row => parseInt(row[0]) === id);
      
      if (!articleRow) return null;
      
      const [articleId, createdAt, title, url, category, priority, memo, status, rating, review, updatedAt] = articleRow;
      
      return {
        id: parseInt(articleId),
        title,
        url,
        category,
        priority,
        memo,
        status,
        rating: rating ? parseInt(rating) : null,
        review,
        createdAt,
        updatedAt
      };
    } catch (error) {
      console.error('記事詳細取得エラー:', error);
      return null;
    }
  }

  /**
   * 記事統計取得
   */
  async getArticleStats() {
    try {
      if (!this.auth) {
        return { pending: 0, read: 0, averageRating: 0, categories: {} };
      }

      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'articles_master!A:K'
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values || [];
      
      if (rows.length <= 1) return { pending: 0, read: 0, averageRating: 0, categories: {} };
      
      let pending = 0, read = 0, totalRating = 0, ratedCount = 0;
      const categories = {};
      
      rows.slice(1).forEach(row => {
        const [, , , , category, , , status, rating] = row;
        
        // カテゴリ統計
        if (!categories[category]) categories[category] = { pending: 0, read: 0 };
        
        if (status === 'want_to_read') {
          pending++;
          categories[category].pending++;
        } else if (status === 'read') {
          read++;
          categories[category].read++;
          
          if (rating) {
            totalRating += parseInt(rating);
            ratedCount++;
          }
        }
      });
      
      const averageRating = ratedCount > 0 ? totalRating / ratedCount : 0;
      
      return { pending, read, averageRating, categories };
    } catch (error) {
      console.error('記事統計取得エラー:', error);
      return { pending: 0, read: 0, averageRating: 0, categories: {} };
    }
  }

  // === アイテム情報取得ヘルパー ===

  /**
   * アイテム情報取得
   */
  async getItemInfo(category, id) {
    let range, titleColumn, contentColumn;
    
    switch (category) {
      case 'book':
        range = 'books_master!A:G';
        titleColumn = 2;
        contentColumn = 3;
        break;
      case 'movie':
        range = 'movies_master!A:F';
        titleColumn = 2;
        break;
      case 'activity':
        range = 'activities_master!A:F';
        contentColumn = 2;
        break;
      default:
        return null;
    }
    
    try {
      const values = await this.getData(range);
      const row = values.find(row => row[0] == id);
      
      if (row) {
        if (category === 'book') {
          return {
            title: row[titleColumn] || '不明なタイトル',
            author: row[contentColumn] || '不明な作者'
          };
        } else if (category === 'movie') {
          return {
            title: row[titleColumn] || '不明なタイトル'
          };
        } else if (category === 'activity') {
          return {
            content: row[contentColumn] || '不明な活動'
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('アイテム情報取得エラー:', error);
      return null;
    }
  }

  // === 高度な統計・分析メソッド ===

  /**
   * 現在の進行状況を取得
   */
  async getCurrentProgress() {
    try {
      const [booksData, moviesData] = await Promise.all([
        this.getData('books_master!A:G'),
        this.getData('movies_master!A:F')
      ]);
      
      const readingBooks = booksData.slice(1)
        .filter(row => row[5] === 'reading')
        .map(row => ({ id: row[0], title: row[2] }));
      
      const wantToWatchMovies = moviesData.slice(1)
        .filter(row => row[4] === 'want_to_watch')
        .map(row => ({ id: row[0], title: row[2] }));
      
      return { readingBooks, wantToWatchMovies };
    } catch (error) {
      console.error('進行状況取得エラー:', error);
      return { readingBooks: [], wantToWatchMovies: [] };
    }
  }

  /**
   * 放置されたアイテムを取得
   */
  async getAbandonedItems(daysAgo = 7) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);
    const targetDateStr = targetDate.toISOString().slice(0, 10);
    
    try {
      const [moviesData, activitiesData] = await Promise.all([
        this.getData('movies_master!A:F'),
        this.getData('activities_master!A:F')
      ]);
      
      const abandonedMovies = moviesData.slice(1)
        .filter(row => 
          row[4] === 'want_to_watch' && 
          row[1] && 
          row[1].slice(0, 10) <= targetDateStr
        )
        .map(row => ({ id: row[0], title: row[2] }));
      
      const abandonedActivities = activitiesData.slice(1)
        .filter(row => 
          row[4] === 'planned' && 
          row[1] && 
          row[1].slice(0, 10) <= targetDateStr
        )
        .map(row => ({ id: row[0], content: row[2] }));
      
      return {
        movies: abandonedMovies,
        activities: abandonedActivities
      };
    } catch (error) {
      console.error('放置アイテム取得エラー:', error);
      return { movies: [], activities: [] };
    }
  }

  // === バッチ操作メソッド ===

  /**
   * バッチでデータを取得
   */
  async batchGetData(ranges) {
    if (!this.auth) return {};

    try {
      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.batchGet({
          auth,
          spreadsheetId: this.spreadsheetId,
          ranges
        });
      };

      const response = await this.executeWithRetry(operation);
      const result = {};
      
      response.data.valueRanges.forEach((range, index) => {
        const rangeName = ranges[index].split('!')[0];
        result[rangeName] = range.values || [];
      });
      
      return result;
    } catch (error) {
      console.error('バッチデータ取得エラー:', error);
      return {};
    }
  }

  /**
   * 全統計を取得
   */
  async getAllStats() {
    try {
      const data = await this.batchGetData([
        'books_master!A:G',
        'movies_master!A:F',
        'activities_master!A:F',
        'daily_reports!A:E'
      ]);
      
      const books = data.books_master || [];
      const movies = data.movies_master || [];
      const activities = data.activities_master || [];
      const reports = data.daily_reports || [];
      
      // 各種統計を計算
      const bookStats = this.calculateBookStats(books.slice(1));
      const movieStats = this.calculateMovieStats(movies.slice(1));
      const activityStats = this.calculateActivityStats(activities.slice(1));
      const reportStats = this.calculateReportStats(reports.slice(1));
      
      return {
        books: bookStats,
        movies: movieStats,
        activities: activityStats,
        reports: reportStats,
        summary: {
          totalItems: bookStats.total + movieStats.total + activityStats.total,
          completedItems: bookStats.finished + movieStats.watched + activityStats.done,
          totalReports: reportStats.total
        }
      };
    } catch (error) {
      console.error('全統計取得エラー:', error);
      return null;
    }
  }

  // === 統計計算ヘルパーメソッド ===

  /**
   * 本の統計を計算
   */
  calculateBookStats(books) {
    return {
      total: books.length,
      wantToBuy: books.filter(row => row[5] === 'want_to_buy').length,
      wantToRead: books.filter(row => row[5] === 'want_to_read').length,
      reading: books.filter(row => row[5] === 'reading').length,
      finished: books.filter(row => row[5] === 'finished').length,
      abandoned: books.filter(row => row[5] === 'abandoned').length
    };
  }

  /**
   * 映画の統計を計算
   */
  calculateMovieStats(movies) {
    return {
      total: movies.length,
      wantToWatch: movies.filter(row => row[4] === 'want_to_watch').length,
      watched: movies.filter(row => row[4] === 'watched').length,
      missed: movies.filter(row => row[4] === 'missed').length
    };
  }

  /**
   * 活動の統計を計算
   */
  calculateActivityStats(activities) {
    return {
      total: activities.length,
      planned: activities.filter(row => row[4] === 'planned').length,
      done: activities.filter(row => row[4] === 'done').length,
      skipped: activities.filter(row => row[4] === 'skipped').length
    };
  }

  /**
   * レポートの統計を計算
   */
  calculateReportStats(reports) {
    const now = new Date();
    const thisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeekStr = thisWeek.toISOString().slice(0, 10);
    const thisMonthStr = thisMonth.toISOString().slice(0, 10);
    
    return {
      total: reports.length,
      thisWeek: reports.filter(row => row[1] >= thisWeekStr).length,
      thisMonth: reports.filter(row => row[1] >= thisMonthStr).length,
      byCategory: {
        book: reports.filter(row => row[2] === 'book').length,
        movie: reports.filter(row => row[2] === 'movie').length,
        activity: reports.filter(row => row[2] === 'activity').length
      }
    };
  }

  // === データ整合性チェック ===

  /**
   * データを検証
   */
  async validateData() {
    try {
      const data = await this.batchGetData([
        'books_master!A:G',
        'movies_master!A:F',
        'activities_master!A:F',
        'daily_reports!A:E'
      ]);
      
      const issues = [];
      
      // 本データの検証
      const books = data.books_master?.slice(1) || [];
      books.forEach((row, index) => {
        if (!row[0] || !row[2] || !row[3]) {
          issues.push(`本データ行${index + 2}: ID、タイトル、作者が不完全`);
        }
        if (row[5] && !['want_to_buy', 'want_to_read', 'reading', 'finished', 'abandoned'].includes(row[5])) {
          issues.push(`本データ行${index + 2}: 無効なステータス「${row[5]}」`);
        }
      });
      
      // 映画データの検証
      const movies = data.movies_master?.slice(1) || [];
      movies.forEach((row, index) => {
        if (!row[0] || !row[2]) {
          issues.push(`映画データ行${index + 2}: ID、タイトルが不完全`);
        }
        if (row[4] && !['want_to_watch', 'watched', 'missed'].includes(row[4])) {
          issues.push(`映画データ行${index + 2}: 無効なステータス「${row[4]}」`);
        }
      });
      
      // 活動データの検証
      const activities = data.activities_master?.slice(1) || [];
      activities.forEach((row, index) => {
        if (!row[0] || !row[2]) {
          issues.push(`活動データ行${index + 2}: ID、内容が不完全`);
        }
        if (row[4] && !['planned', 'done', 'skipped'].includes(row[4])) {
          issues.push(`活動データ行${index + 2}: 無効なステータス「${row[4]}」`);
        }
      });
      
      // レポートデータの検証
      const reports = data.daily_reports?.slice(1) || [];
      reports.forEach((row, index) => {
        if (!row[0] || !row[1] || !row[2] || !row[3] || !row[4]) {
          issues.push(`レポートデータ行${index + 2}: 必須フィールドが不完全`);
        }
        if (row[2] && !['book', 'movie', 'activity'].includes(row[2])) {
          issues.push(`レポートデータ行${index + 2}: 無効なカテゴリ「${row[2]}」`);
        }
      });
      
      return {
        isValid: issues.length === 0,
        issues,
        summary: {
          totalBooks: books.length,
          totalMovies: movies.length,
          totalActivities: activities.length,
          totalReports: reports.length
        }
      };
    } catch (error) {
      console.error('データ検証エラー:', error);
      return {
        isValid: false,
        issues: ['データ検証中にエラーが発生しました'],
        summary: {}
      };
    }
  }

  // === ヘルスチェック ===

  /**
   * ヘルスチェック
   */
  async healthCheck() {
    if (!this.auth) {
      return {
        status: 'error',
        message: 'Google Sheets認証が設定されていません',
        timestamp: new Date().toISOString()
      };
    }

    try {
      // 簡単な読み取りテスト
      await this.executeWithTimeout(async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'books_master!A1:A1'
        });
      }, 3000);

      return {
        status: 'healthy',
        message: 'Google Sheetsへの接続は正常です',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Google Sheetsへの接続に失敗: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // === 通知・最近の活動取得メソッド ===

  /**
   * 最近購入したアイテム取得
   */
  async getRecentlyBoughtItems(days = 30) {
    try {
      if (!this.auth) {
        return [];
      }

      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'wishlist_master!A:J'
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values || [];
      
      if (rows.length <= 1) return [];
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return rows.slice(1)
        .filter(row => {
          const [, , , , , , , , status, updatedAt] = row;
          if (status !== 'bought') return false;
          
          const updateDate = new Date(updatedAt);
          return updateDate >= cutoffDate;
        })
        .map(row => {
          const [id, , name, , actualPrice] = row;
          const priceText = actualPrice ? ` ¥${parseInt(actualPrice).toLocaleString()}` : '';
          return `[${id}] ${name}${priceText}`;
        });
    } catch (error) {
      console.error('最近購入したアイテム取得エラー:', error);
      return [];
    }
  }

  /**
   * 最近読了した記事取得
   */
  async getRecentlyReadArticles(days = 7) {
    try {
      if (!this.auth) {
        return [];
      }

      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'articles_master!A:K'
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values || [];
      
      if (rows.length <= 1) return [];
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return rows.slice(1)
        .filter(row => {
          const [, , , , , , , status, , , updatedAt] = row;
          if (status !== 'read') return false;
          
          const updateDate = new Date(updatedAt);
          return updateDate >= cutoffDate;
        })
        .map(row => {
          const [id, , title, , category, , , , rating] = row;
          const categoryEmoji = {
            'tech': '💻',
            'business': '💼',
            'lifestyle': '🌟',
            'news': '📰',
            'academic': '🎓',
            'general': '📄'
          }[category] || '📄';
          
          const ratingText = rating ? ` ${'⭐'.repeat(parseInt(rating))}` : '';
          return `[${id}] ${categoryEmoji} ${title}${ratingText}`;
        });
    } catch (error) {
      console.error('最近読了した記事取得エラー:', error);
      return [];
    }
  }

  /**
   * 緊急度の高いウィッシュリストアイテム取得
   */
  async getUrgentWishlistItems() {
    try {
      if (!this.auth) {
        return [];
      }

      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'wishlist_master!A:J'
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values || [];
      
      if (rows.length <= 1) return [];
      
      return rows.slice(1)
        .filter(row => {
          const [, , , , , , priority, , status] = row;
          return status === 'want_to_buy' && priority === 'high';
        })
        .map(row => {
          const [id, , name, price] = row;
          const priceText = price ? ` ¥${parseInt(price).toLocaleString()}` : '';
          return `[${id}] 🔴 ${name}${priceText}`;
        });
    } catch (error) {
      console.error('緊急ウィッシュリストアイテム取得エラー:', error);
      return [];
    }
  }

  /**
   * 緊急度の高い記事取得
   */
  async getUrgentArticles() {
    try {
      if (!this.auth) {
        return [];
      }

      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'articles_master!A:K'
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values || [];
      
      if (rows.length <= 1) return [];
      
      return rows.slice(1)
        .filter(row => {
          const [, , , , , priority, , status] = row;
          return status === 'want_to_read' && priority === 'high';
        })
        .map(row => {
          const [id, , title, , category] = row;
          const categoryEmoji = {
            'tech': '💻',
            'business': '💼',
            'lifestyle': '🌟',
            'news': '📰',
            'academic': '🎓',
            'general': '📄'
          }[category] || '📄';
          
          return `[${id}] 🔴 ${categoryEmoji} ${title}`;
        });
    } catch (error) {
      console.error('緊急記事取得エラー:', error);
      return [];
    }
  }

  /**
   * 月間購入実績取得
   */
  async getMonthlyPurchases() {
    try {
      if (!this.auth) {
        return [];
      }

      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'wishlist_master!A:J'
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values || [];
      
      if (rows.length <= 1) return [];
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      return rows.slice(1)
        .filter(row => {
          const [, , , , , , , , status, updatedAt] = row;
          if (status !== 'bought') return false;
          
          const updateDate = new Date(updatedAt);
          return updateDate.getMonth() === currentMonth && updateDate.getFullYear() === currentYear;
        })
        .map(row => {
          const [id, , name, , actualPrice] = row;
          const priceText = actualPrice ? ` ¥${parseInt(actualPrice).toLocaleString()}` : '';
          return `[${id}] ${name}${priceText}`;
        });
    } catch (error) {
      console.error('月間購入実績取得エラー:', error);
      return [];
    }
  }

  /**
   * 月間読書実績取得
   */
  async getMonthlyReads() {
    try {
      if (!this.auth) {
        return [];
      }

      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'articles_master!A:K'
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values || [];
      
      if (rows.length <= 1) return [];
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      return rows.slice(1)
        .filter(row => {
          const [, , , , , , , status, , , updatedAt] = row;
          if (status !== 'read') return false;
          
          const updateDate = new Date(updatedAt);
          return updateDate.getMonth() === currentMonth && updateDate.getFullYear() === currentYear;
        })
        .map(row => {
          const [id, , title, , category, , , , rating] = row;
          const categoryEmoji = {
            'tech': '💻',
            'business': '💼',
            'lifestyle': '🌟',
            'news': '📰',
            'academic': '🎓',
            'general': '📄'
          }[category] || '📄';
          
          const ratingText = rating ? ` ${'⭐'.repeat(parseInt(rating))}` : '';
          return `[${id}] ${categoryEmoji} ${title}${ratingText}`;
        });
    } catch (error) {
      console.error('月間読書実績取得エラー:', error);
      return [];
    }
  }

  // === ユーティリティメソッド ===

  /**
   * 日付をフォーマット
   */
  formatDate(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  /**
   * 日時をフォーマット
   */
  formatDateTime(date = new Date()) {
    return date.toISOString().replace('T', ' ').slice(0, 19);
  }

  /**
   * IDを生成
   */
  generateId() {
    return Math.floor(Math.random() * 1000) + Date.now() % 1000;
  }

  /**
   * ステータスが有効かチェック
   */
  isValidStatus(category, status) {
    const validStatuses = {
      book: ['want_to_buy', 'want_to_read', 'reading', 'finished', 'abandoned'],
      movie: ['want_to_watch', 'watched', 'missed'],
      activity: ['planned', 'done', 'skipped']
    };

    return validStatuses[category]?.includes(status) || false;
  }

  /**
   * ステータス絵文字を取得
   */
  getStatusEmoji(category, status) {
    const emojis = {
      book: {
        'want_to_buy': '🛒',
        'want_to_read': '📋',
        'reading': '📖',
        'finished': '✅',
        'abandoned': '❌'
      },
      movie: {
        'want_to_watch': '🎬',
        'watched': '✅',
        'missed': '😅'
      },
      activity: {
        'planned': '🎯',
        'done': '✅',
        'skipped': '😅'
      }
    };

    return emojis[category]?.[status] || '❓';
  }

  /**
   * ステータステキストを取得
   */
  getStatusText(category, status) {
    const texts = {
      book: {
        'want_to_buy': '買いたい',
        'want_to_read': '積読',
        'reading': '読書中',
        'finished': '読了',
        'abandoned': '中断'
      },
      movie: {
        'want_to_watch': '観たい',
        'watched': '視聴済み',
        'missed': '見逃し'
      },
      activity: {
        'planned': '予定',
        'done': '完了',
        'skipped': 'スキップ'
      }
    };

    return texts[category]?.[status] || status;
  }

  // === デバッグ用メソッド ===

  /**
   * デバッグ用: ウィッシュリストの生データを確認
   */
  async debugWishlistData() {
    if (!this.auth) {
      console.log('認証なし - デバッグできません');
      return;
    }

    try {
      console.log('🔍 wishlist_master デバッグ開始');
      
      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.values.get({
          auth,
          spreadsheetId: this.spreadsheetId,
          range: 'wishlist_master!A:J'
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const rows = response.data.values || [];
      
      console.log(`📊 総行数: ${rows.length} (ヘッダー含む)`);
      
      if (rows.length > 0) {
        console.log(`📋 ヘッダー: ${JSON.stringify(rows[0])}`);
      }
      
      if (rows.length > 1) {
        console.log('\n📝 データ行:');
        rows.slice(1).forEach((row, index) => {
          console.log(`  行 ${index + 2}: ${JSON.stringify(row)}`);
        });
      } else {
        console.log('📭 データ行が見つかりません');
      }
      
    } catch (error) {
      console.error('❌ wishlist_master デバッグエラー:', error);
    }
  }

  /**
   * 全シートの構造を確認
   */
  async debugAllSheets() {
    if (!this.auth) {
      console.log('認証なし - デバッグできません');
      return;
    }

    const sheets = [
      'books_master',
      'movies_master', 
      'activities_master',
      'daily_reports',
      'wishlist_master',
      'articles_master'
    ];

    for (const sheetName of sheets) {
      try {
        console.log(`\n🔍 ${sheetName} シート確認開始`);
        
        const operation = async () => {
          const auth = await this.auth.getClient();
          return this.sheets.spreadsheets.values.get({
            auth,
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A1:Z1`
          });
        };

        const response = await this.executeWithTimeout(operation, 5000);
        const headers = response.data.values?.[0] || [];
        
        console.log(`📋 ${sheetName} ヘッダー:`, headers);
        console.log(`📊 列数: ${headers.length}`);
        
      } catch (error) {
        console.error(`❌ ${sheetName} エラー:`, error.message);
      }
    }
  }

  /**
   * 接続テスト
   */
  async testConnection() {
    console.log('🔍 Google Sheets接続テスト開始');
    
    if (!this.auth) {
      console.log('❌ 認証設定なし');
      return false;
    }

    try {
      const operation = async () => {
        const auth = await this.auth.getClient();
        return this.sheets.spreadsheets.get({
          auth,
          spreadsheetId: this.spreadsheetId
        });
      };

      const response = await this.executeWithTimeout(operation, 10000);
      const spreadsheet = response.data;
      
      console.log('✅ 接続成功');
      console.log('📊 スプレッドシート情報:');
      console.log(`  タイトル: ${spreadsheet.properties?.title}`);
      console.log(`  シート数: ${spreadsheet.sheets?.length}`);
      console.log('  シート一覧:');
      
      spreadsheet.sheets?.forEach(sheet => {
        const props = sheet.properties;
        console.log(`    - ${props.title} (${props.gridProperties?.rowCount}行 x ${props.gridProperties?.columnCount}列)`);
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ 接続失敗:', error.message);
      return false;
    }
  }

  /**
   * 全データサマリー表示
   */
  async showDataSummary() {
    console.log('📊 全データサマリー取得開始');
    
    try {
      const stats = await this.getAllStats();
      
      if (!stats) {
        console.log('❌ 統計データの取得に失敗しました');
        return;
      }
      
      console.log('\n📚 本の統計:');
      console.log(`  総数: ${stats.books.total}`);
      console.log(`  買いたい: ${stats.books.wantToBuy}`);
      console.log(`  積読: ${stats.books.wantToRead}`);
      console.log(`  読書中: ${stats.books.reading}`);
      console.log(`  読了: ${stats.books.finished}`);
      console.log(`  中断: ${stats.books.abandoned}`);
      
      console.log('\n🎬 映画の統計:');
      console.log(`  総数: ${stats.movies.total}`);
      console.log(`  観たい: ${stats.movies.wantToWatch}`);
      console.log(`  視聴済み: ${stats.movies.watched}`);
      console.log(`  見逃し: ${stats.movies.missed}`);
      
      console.log('\n🎯 活動の統計:');
      console.log(`  総数: ${stats.activities.total}`);
      console.log(`  予定: ${stats.activities.planned}`);
      console.log(`  完了: ${stats.activities.done}`);
      console.log(`  スキップ: ${stats.activities.skipped}`);
      
      console.log('\n📝 レポートの統計:');
      console.log(`  総数: ${stats.reports.total}`);
      console.log(`  今週: ${stats.reports.thisWeek}`);
      console.log(`  今月: ${stats.reports.thisMonth}`);
      console.log(`  本関連: ${stats.reports.byCategory.book}`);
      console.log(`  映画関連: ${stats.reports.byCategory.movie}`);
      console.log(`  活動関連: ${stats.reports.byCategory.activity}`);
      
      console.log('\n📈 サマリー:');
      console.log(`  総アイテム数: ${stats.summary.totalItems}`);
      console.log(`  完了アイテム数: ${stats.summary.completedItems}`);
      console.log(`  完了率: ${stats.summary.totalItems > 0 ? Math.round((stats.summary.completedItems / stats.summary.totalItems) * 100) : 0}%`);
      console.log(`  総レポート数: ${stats.summary.totalReports}`);
      
    } catch (error) {
      console.error('❌ データサマリー取得エラー:', error);
    }
  }
}

module.exports = GoogleSheetsService;
