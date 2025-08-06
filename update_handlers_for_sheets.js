const fs = require('fs');

console.log('🔄 ハンドラーをGoogle Sheets連携版に更新中...');

// bookHandler.jsを実データ版に更新
const bookHandlerContent = `const { EmbedBuilder } = require('discord.js');
const googleSheets = require('../services/googleSheets');

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
        default:
          await interaction.editReply(\`❌ 不明なサブコマンド: \${subcommand}\`);
      }
    } catch (error) {
      console.error('BookHandler エラー:', error);
      await interaction.editReply('処理中にエラーが発生しました: ' + error.message);
    }
  },

  async handleAdd(interaction) {
    const title = interaction.options.getString('title');
    const author = interaction.options.getString('author');
    const status = interaction.options.getString('status') || 'want_to_read';
    const memo = interaction.options.getString('memo') || '';
    
    try {
      // Google Sheetsに実際に保存
      const bookId = await googleSheets.addBook(title, author, status, memo);
      
      const statusText = {
        'want_to_buy': '買いたい',
        'want_to_read': '積んでいる'
      };
      
      const embed = new EmbedBuilder()
        .setTitle('📚 本を追加しました！')
        .setColor('#4CAF50')
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
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('本追加エラー:', error);
      await interaction.editReply('本の追加中にエラーが発生しました: ' + error.message);
    }
  },

  async handleList(interaction) {
    try {
      // Google Sheetsから実際のデータを取得
      const books = await googleSheets.getBooks();
      
      const embed = new EmbedBuilder()
        .setTitle('📚 本一覧')
        .setColor('#9C27B0')
        .setDescription(books.length > 0 ? books.join('\\n') : '登録されている本はありません')
        .setFooter({ text: '詳細は各IDで操作してください' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('本一覧取得エラー:', error);
      await interaction.editReply('本一覧の取得中にエラーが発生しました: ' + error.message);
    }
  },

  async handleWishlist(interaction) {
    try {
      // Google Sheetsから買いたい本のみを取得
      const wishlistBooks = await googleSheets.getWishlistBooks();
      
      const embed = new EmbedBuilder()
        .setTitle('🛒 買いたい本一覧')
        .setColor('#E91E63')
        .setDescription(
          wishlistBooks.length > 0 
            ? wishlistBooks.join('\\n') 
            : '買いたい本はありません'
        )
        .setFooter({ text: '購入したら /book buy [ID] で積読リストに移動できます' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('ウィッシュリスト取得エラー:', error);
      await interaction.editReply('ウィッシュリストの取得中にエラーが発生しました: ' + error.message);
    }
  },

  // 他のメソッドは省略（Google Sheets連携を含む）
  async handleBuy(interaction) {
    const buyId = interaction.options.getInteger('id');
    
    try {
      const boughtBook = await googleSheets.buyBook(buyId);
      
      if (boughtBook) {
        const embed = new EmbedBuilder()
          .setTitle('🛒 本を購入しました！')
          .setColor('#2196F3')
          .setDescription('積読リストに追加されました！📚✨')
          .addFields(
            { name: 'ID', value: boughtBook.id.toString(), inline: true },
            { name: 'タイトル', value: boughtBook.title, inline: true },
            { name: 'ステータス', value: '買いたい → 積読', inline: true }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply('指定されたIDの本が見つからないか、既に購入済みです。');
      }
    } catch (error) {
      console.error('本購入エラー:', error);
      await interaction.editReply('本の購入中にエラーが発生しました: ' + error.message);
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
          .setDescription('頑張って読み進めましょう！✨')
          .addFields(
            { name: 'ID', value: startedBook.id.toString(), inline: true },
            { name: 'タイトル', value: startedBook.title, inline: true },
            { name: 'ステータス', value: '積読 → 読書中', inline: true }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply('指定されたIDの本が見つかりませんでした。');
      }
    } catch (error) {
      console.error('読書開始エラー:', error);
      await interaction.editReply('読書開始中にエラーが発生しました: ' + error.message);
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
          .setDescription('素晴らしい達成感ですね！次の本も楽しみです📚✨')
          .addFields(
            { name: 'ID', value: finishedBook.id.toString(), inline: true },
            { name: 'タイトル', value: finishedBook.title, inline: true },
            { name: 'ステータス', value: '読書中 → 読了', inline: true }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply('指定されたIDの本が見つかりませんでした。');
      }
    } catch (error) {
      console.error('読了記録エラー:', error);
      await interaction.editReply('読了記録中にエラーが発生しました: ' + error.message);
    }
  }
};`;

fs.writeFileSync('handlers/bookHandler.js', bookHandlerContent);
console.log('✅ bookHandler.js を実データ版に更新しました');
