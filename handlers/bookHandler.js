const { EmbedBuilder } = require('discord.js');
const GoogleSheetsService = require('../services/googleSheets');

// GoogleSheetsServiceのインスタンスを作成
const googleSheets = new GoogleSheetsService();

module.exports = {
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case 'add':
          await this.handleAdd(interaction);
          break;
        case 'buy':
          await this.handleBuy(interaction);
          break;
        case 'start':
          await this.handleStart(interaction);
          break;
        case 'finish':
          await this.handleFinish(interaction);
          break;
        case 'list':
          await this.handleList(interaction);
          break;
        case 'wishlist':
          await this.handleWishlist(interaction);
          break;
        case 'reading':
          await this.handleReading(interaction);
          break;
        case 'finished':
          await this.handleFinished(interaction);
          break;
        case 'info':
          await this.handleInfo(interaction);
          break;
        default:
          await interaction.editReply(`❌ 不明なサブコマンド: ${subcommand}`);
      }
    } catch (error) {
      console.error('BookHandler エラー:', error);
      await interaction.editReply('❌ 処理中にエラーが発生しました。');
    }
  },

  async handleAdd(interaction) {
    const title = interaction.options.getString('title');
    const author = interaction.options.getString('author');
    const status = interaction.options.getString('status') || 'want_to_read';
    const memo = interaction.options.getString('memo') || '';
    
    try {
      const bookId = await googleSheets.addBook(title, author, memo, status);
      
      const statusText = {
        'want_to_buy': '買いたい',
        'want_to_read': '積んでいる'
      };
      
      const statusEmoji = {
        'want_to_buy': '🛒',
        'want_to_read': '📋'
      };
      
      const embed = new EmbedBuilder()
        .setTitle('📚 本を追加しました！')
        .setColor('#4CAF50')
        .setDescription(`${statusEmoji[status]} 本棚に新しい本が追加されました！`)
        .addFields(
          { name: 'ID', value: bookId.toString(), inline: true },
          { name: 'タイトル', value: title, inline: true },
          { name: '作者', value: author, inline: true },
          { name: 'ステータス', value: statusText[status], inline: true }
        )
        .setTimestamp();
      
      if (memo) {
        embed.addFields({ name: '備考', value: memo, inline: false });
      }
      
      // ステータスに応じたフッターメッセージ
      if (status === 'want_to_buy') {
        embed.setFooter({ text: '購入したら /book buy で積読リストに移動できます' });
      } else {
        embed.setFooter({ text: '読む準備ができたら /book start で読書を開始しましょう！' });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('本追加エラー:', error);
      await interaction.editReply('❌ 本の追加中にエラーが発生しました。');
    }
  },

  async handleBuy(interaction) {
    const buyId = interaction.options.getInteger('id');
    
    try {
      const boughtBook = await googleSheets.buyBook(buyId);
      
      if (boughtBook) {
        const embed = new EmbedBuilder()
          .setTitle('🛒 本を購入しました！')
          .setColor('#2196F3')
          .setDescription('購入おめでとうございます！積読リストに追加されました！📚✨')
          .addFields(
            { name: 'ID', value: boughtBook.id.toString(), inline: true },
            { name: 'タイトル', value: boughtBook.title, inline: true },
            { name: '作者', value: boughtBook.author, inline: true },
            { name: 'ステータス変更', value: '🛒 買いたい → 📋 積読', inline: false }
          )
          .setFooter({ text: '読む準備ができたら /book start で読書を開始しましょう！' })
          .setTimestamp();
        
        if (boughtBook.memo) {
          embed.addFields({ name: '備考', value: boughtBook.memo, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❓ 本が見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${buyId} の本が見つからないか、既に購入済みです。`)
          .addFields(
            { name: '💡 確認方法', value: '`/book wishlist` で買いたい本一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('本購入エラー:', error);
      await interaction.editReply('❌ 本の購入記録中にエラーが発生しました。');
    }
  },

  async handleStart(interaction) {
    const startId = interaction.options.getInteger('id');
    
    try {
      const startedBook = await googleSheets.startReading(startId);
      
      if (startedBook) {
        const embed = new EmbedBuilder()
          .setTitle('📖 読書開始！')
          .setColor('#FF9800')
          .setDescription('素晴らしい！新しい読書の旅が始まりますね！📚✨')
          .addFields(
            { name: 'ID', value: startedBook.id.toString(), inline: true },
            { name: 'タイトル', value: startedBook.title, inline: true },
            { name: '作者', value: startedBook.author, inline: true },
            { name: 'ステータス変更', value: '📋 積読 → 📖 読書中', inline: false }
          )
          .setFooter({ text: '読了したら /book finish で完了記録を！進捗は /report book で記録できます' })
          .setTimestamp();
        
        if (startedBook.memo) {
          embed.addFields({ name: '備考', value: startedBook.memo, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❓ 本が見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${startId} の本が見つからないか、既に読書開始済みです。`)
          .addFields(
            { name: '💡 確認方法', value: '`/book list` で本一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('読書開始エラー:', error);
      await interaction.editReply('❌ 読書開始の記録中にエラーが発生しました。');
    }
  },

  async handleFinish(interaction) {
    const finishId = interaction.options.getInteger('id');
    
    try {
      const finishedBook = await googleSheets.finishReading(finishId);
      
      if (finishedBook) {
        const embed = new EmbedBuilder()
          .setTitle('🎉 読了おめでとうございます！')
          .setColor('#FFD700')
          .setDescription('素晴らしい達成感ですね！また一つ知識の扉が開かれました📚✨')
          .addFields(
            { name: 'ID', value: finishedBook.id.toString(), inline: true },
            { name: 'タイトル', value: finishedBook.title, inline: true },
            { name: '作者', value: finishedBook.author, inline: true },
            { name: 'ステータス変更', value: '📖 読書中 → ✅ 読了', inline: false }
          )
          .setFooter({ text: '感想を /report book で記録してみませんか？' })
          .setTimestamp();
        
        if (finishedBook.memo) {
          embed.addFields({ name: '備考', value: finishedBook.memo, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❓ 本が見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${finishId} の本が見つからないか、既に読了済みです。`)
          .addFields(
            { name: '💡 確認方法', value: '`/book list` で本一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('読了記録エラー:', error);
      await interaction.editReply('❌ 読了記録中にエラーが発生しました。');
    }
  },

  async handleList(interaction) {
    try {
      const books = await googleSheets.getBooks();
      
      if (books.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📚 本一覧')
          .setColor('#9C27B0')
          .setDescription('まだ本が登録されていません。')
          .addFields(
            { name: '📖 本を追加', value: '`/book add [タイトル] [作者]` で本を追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // 本をステータス別に分類
      const statusOrder = ['want_to_buy', 'want_to_read', 'reading', 'finished', 'abandoned'];
      const groupedBooks = books.reduce((acc, book) => {
        // 本の文字列からステータスを抽出
        const statusMatch = book.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : 'want_to_read';
        
        if (!acc[status]) acc[status] = [];
        acc[status].push(book);
        return acc;
      }, {});
      
      const embed = new EmbedBuilder()
        .setTitle('📚 本一覧')
        .setColor('#9C27B0')
        .setDescription(`全 ${books.length} 冊の本が登録されています`)
        .setTimestamp();
      
      // ステータス別に表示
      statusOrder.forEach(status => {
        if (groupedBooks[status] && groupedBooks[status].length > 0) {
          const statusName = {
            'want_to_buy': '🛒 買いたい本',
            'want_to_read': '📋 積読本',
            'reading': '📖 読書中',
            'finished': '✅ 読了済み',
            'abandoned': '❌ 中断'
          }[status] || status;
          
          // 最大8件まで表示
          const displayBooks = groupedBooks[status].slice(0, 8);
          const moreCount = groupedBooks[status].length - 8;
          
          let fieldValue = displayBooks.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}冊`;
          }
          
          embed.addFields({
            name: `${statusName} (${groupedBooks[status].length}冊)`,
            value: fieldValue,
            inline: false
          });
        }
      });
      
      embed.setFooter({ text: '操作: /book start [ID], /book finish [ID], /book buy [ID]' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('本一覧取得エラー:', error);
      await interaction.editReply('❌ 本一覧の取得中にエラーが発生しました。');
    }
  },

  // 🔧 修正されたwishlistハンドラー
  async handleWishlist(interaction) {
    try {
      // books_masterシートから want_to_buy ステータスの本を取得
      const allBooks = await googleSheets.getBooks();
      
      // want_to_buyステータスの本のみをフィルタリング
      const wishlistBooks = allBooks.filter(book => {
        // 本の文字列からステータスを抽出 (例: "ID: 1 - タイトル by 作者 (want_to_buy)")
        const statusMatch = book.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : '';
        return status === 'want_to_buy';
      });
      
      if (wishlistBooks.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🛒 買いたい本一覧')
          .setColor('#E91E63')
          .setDescription('買いたい本はまだ登録されていません。')
          .addFields(
            { name: '📚 本を追加', value: '`/book add [タイトル] [作者] want_to_buy` で買いたい本を追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // 買いたい本をカテゴリ分けするための簡易分類
      const categories = {
        '📖 小説・文学': [],
        '📚 技術書・実用書': [],
        '🎯 自己啓発・ビジネス': [],
        '📋 その他': []
      };
      
      // 簡易的なカテゴリ分類（タイトルからキーワードで判定）
      wishlistBooks.forEach(book => {
        const title = book.toLowerCase();
        if (title.includes('小説') || title.includes('文学') || title.includes('物語') || title.includes('ノベル')) {
          categories['📖 小説・文学'].push(book);
        } else if (title.includes('技術') || title.includes('プログラミング') || title.includes('デザイン') || title.includes('入門')) {
          categories['📚 技術書・実用書'].push(book);
        } else if (title.includes('ビジネス') || title.includes('成功') || title.includes('経営') || title.includes('自己啓発')) {
          categories['🎯 自己啓発・ビジネス'].push(book);
        } else {
          categories['📋 その他'].push(book);
        }
      });
      
      const embed = new EmbedBuilder()
        .setTitle('🛒 買いたい本一覧')
        .setColor('#E91E63')
        .setDescription(`購入予定の本が ${wishlistBooks.length} 冊あります`)
        .setTimestamp();
      
      // カテゴリ別に表示
      Object.entries(categories).forEach(([categoryName, books]) => {
        if (books.length > 0) {
          // 最大5件まで表示
          const displayBooks = books.slice(0, 5);
          const moreCount = books.length - 5;
          
          let fieldValue = displayBooks.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}冊`;
          }
          
          embed.addFields({
            name: `${categoryName} (${books.length}冊)`,
            value: fieldValue,
            inline: false
          });
        }
      });
      
      embed.setFooter({ text: '購入したら /book buy [ID] で積読リストに移動できます' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('買いたい本一覧取得エラー:', error);
      await interaction.editReply('❌ 買いたい本一覧の取得中にエラーが発生しました。');
    }
  },

  // 🆕 読書中の本を表示するハンドラー
  async handleReading(interaction) {
    try {
      const allBooks = await googleSheets.getBooks();
      
      // readingステータスの本のみをフィルタリング
      const readingBooks = allBooks.filter(book => {
        const statusMatch = book.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : '';
        return status === 'reading';
      });
      
      if (readingBooks.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📖 読書中の本')
          .setColor('#FF9800')
          .setDescription('現在読書中の本はありません。')
          .addFields(
            { name: '📚 読書を開始', value: '`/book start [ID]` で積読本の読書を開始できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('📖 読書中の本')
        .setColor('#FF9800')
        .setDescription(`現在 ${readingBooks.length} 冊を読書中です`)
        .setTimestamp();
      
      // 最大10件まで表示
      const displayBooks = readingBooks.slice(0, 10);
      const moreCount = readingBooks.length - 10;
      
      let fieldValue = displayBooks.join('\n');
      if (moreCount > 0) {
        fieldValue += `\n... 他${moreCount}冊`;
      }
      
      embed.addFields({
        name: `📚 読書中 (${readingBooks.length}冊)`,
        value: fieldValue,
        inline: false
      });
      
      embed.setFooter({ text: '読了したら /book finish [ID] で完了記録を！' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('読書中本一覧取得エラー:', error);
      await interaction.editReply('❌ 読書中の本一覧の取得中にエラーが発生しました。');
    }
  },

  // 🆕 読了済みの本を表示するハンドラー
  async handleFinished(interaction) {
    try {
      const allBooks = await googleSheets.getBooks();
      
      // finishedステータスの本のみをフィルタリング
      const finishedBooks = allBooks.filter(book => {
        const statusMatch = book.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : '';
        return status === 'finished';
      });
      
      if (finishedBooks.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('✅ 読了済みの本')
          .setColor('#4CAF50')
          .setDescription('まだ読了した本はありません。')
          .addFields(
            { name: '📚 読書を完了', value: '`/book finish [ID]` で読書を完了できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('✅ 読了済みの本')
        .setColor('#4CAF50')
        .setDescription(`これまでに ${finishedBooks.length} 冊読了しました！`)
        .setTimestamp();
      
      // 最大10件まで表示（最新から）
      const displayBooks = finishedBooks.slice(0, 10);
      const moreCount = finishedBooks.length - 10;
      
      let fieldValue = displayBooks.join('\n');
      if (moreCount > 0) {
        fieldValue += `\n... 他${moreCount}冊`;
      }
      
      embed.addFields({
        name: `📚 読了済み (${finishedBooks.length}冊)`,
        value: fieldValue,
        inline: false
      });
      
      embed.setFooter({ text: '感想は /report book で記録できます' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('読了済み本一覧取得エラー:', error);
      await interaction.editReply('❌ 読了済みの本一覧の取得中にエラーが発生しました。');
    }
  },

  // 🆕 本の詳細情報を表示するハンドラー
  async handleInfo(interaction) {
    const bookId = interaction.options.getInteger('id');
    
    try {
      // 特定の本の詳細情報を取得（この機能がgoogleSheetsServiceに実装されている場合）
      const bookInfo = await googleSheets.getBookById(bookId);
      
      if (!bookInfo) {
        const embed = new EmbedBuilder()
          .setTitle('❓ 本が見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${bookId} の本が見つかりません。`)
          .addFields(
            { name: '💡 確認方法', value: '`/book list` で本一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const statusText = {
        'want_to_buy': '🛒 買いたい',
        'want_to_read': '📋 積読',
        'reading': '📖 読書中',
        'finished': '✅ 読了済み',
        'abandoned': '❌ 中断'
      };
      
      const embed = new EmbedBuilder()
        .setTitle('📄 本の詳細情報')
        .setColor('#3F51B5')
        .setDescription(`📚 ${bookInfo.title}`)
        .addFields(
          { name: 'ID', value: bookInfo.id.toString(), inline: true },
          { name: '作者', value: bookInfo.author, inline: true },
          { name: 'ステータス', value: statusText[bookInfo.status] || bookInfo.status, inline: true },
          { name: '登録日', value: bookInfo.created_at, inline: true },
          { name: '更新日', value: bookInfo.updated_at, inline: true }
        )
        .setTimestamp();
      
      if (bookInfo.memo) {
        embed.addFields({ name: '備考', value: bookInfo.memo, inline: false });
      }
      
      // ステータスに応じたアクションヒント
      let actionHint = '';
      switch (bookInfo.status) {
        case 'want_to_buy':
          actionHint = '購入: /book buy ' + bookInfo.id;
          break;
        case 'want_to_read':
          actionHint = '読書開始: /book start ' + bookInfo.id;
          break;
        case 'reading':
          actionHint = '読了記録: /book finish ' + bookInfo.id;
          break;
        case 'finished':
          actionHint = '感想記録: /report book';
          break;
      }
      
      if (actionHint) {
        embed.setFooter({ text: actionHint });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('本詳細取得エラー:', error);
      await interaction.editReply('❌ 本の詳細情報の取得中にエラーが発生しました。');
    }
  }
};
