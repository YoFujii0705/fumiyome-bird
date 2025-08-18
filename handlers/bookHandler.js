const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

  // 🆕 選択式 - 買いたい本から選択
  async handleBuy(interaction) {
  try {
    console.log('🔍 handleBuy 開始');
    console.log('📊 GoogleSheets認証状態:', !!googleSheets.auth);
    
    const wantToBuyBooks = await googleSheets.getBooksByStatus('want_to_buy');
    console.log(`📚 取得した買いたい本の数: ${wantToBuyBooks.length}`);
    console.log('📋 買いたい本リスト:', wantToBuyBooks);
    
    if (wantToBuyBooks.length === 0) {
      console.log('❌ 買いたい本が0冊');
      const embed = new EmbedBuilder()
        .setTitle('🛒 本の購入記録')
        .setColor('#FF5722')
        .setDescription('買いたい本がありません。')
        .addFields(
          { name: '💡 ヒント', value: '`/book add [タイトル] [作者] want_to_buy` で買いたい本を追加してください', inline: false }
        );
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    console.log('📝 選択メニュー作成開始');
    
    if (wantToBuyBooks.length <= 25) {
      console.log('🎯 通常の選択メニューを作成');
      
      // 選択メニューのオプションを作成
      const options = wantToBuyBooks.map(book => {
        console.log(`📖 Book option: ID=${book.id}, Title="${book.title}", Author="${book.author}"`);
        return {
          label: `${book.title}`.slice(0, 100),
          description: `作者: ${book.author}`.slice(0, 100),
          value: book.id.toString()
        };
      });
      
      console.log('🎨 作成されたオプション:', options);
      
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('book_buy_select')
        .setPlaceholder('購入した本を選択してください')
        .addOptions(options);
      
      const row = new ActionRowBuilder().addComponents(selectMenu);
      
      const embed = new EmbedBuilder()
        .setTitle('🛒 本の購入記録')
        .setColor('#2196F3')
        .setDescription(`買いたい本が ${wantToBuyBooks.length} 冊あります。購入した本を選択してください。`)
        .addFields(
          { name: '🛒 買いたい本', value: wantToBuyBooks.map(book => `📚 ${book.title} - ${book.author}`).join('\n').slice(0, 1024), inline: false }
        );
      
      console.log('📤 選択メニュー付きの返信を送信');
      await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
      console.log('📄 ページネーション使用');
      await this.handleBuyWithPagination(interaction, wantToBuyBooks);
    }
  } catch (error) {
    console.error('❌ 本購入選択エラー:', error);
    console.error('❌ エラースタック:', error.stack);
    await interaction.editReply('❌ 購入本選択中にエラーが発生しました。');
  }
},

  // 🆕 選択式 - 積読本から選択
  async handleStart(interaction) {
    try {
      const wantToReadBooks = await googleSheets.getBooksByStatus('want_to_read');
      
      if (wantToReadBooks.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📖 読書開始')
          .setColor('#FF5722')
          .setDescription('積読本がありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/book add [タイトル] [作者]` で本を追加してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (wantToReadBooks.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('book_start_select')
          .setPlaceholder('読書を開始する本を選択してください')
          .addOptions(
            wantToReadBooks.map(book => ({
              label: `${book.title}`.slice(0, 100),
              description: `作者: ${book.author}`.slice(0, 100),
              value: book.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('📖 読書開始')
          .setColor('#FF9800')
          .setDescription(`積読本が ${wantToReadBooks.length} 冊あります。読書を開始する本を選択してください。`)
          .addFields(
            { name: '📋 積読本', value: wantToReadBooks.map(book => `📚 ${book.title} - ${book.author}`).join('\n').slice(0, 1024), inline: false }
          );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleStartWithPagination(interaction, wantToReadBooks);
      }
    } catch (error) {
      console.error('読書開始選択エラー:', error);
      await interaction.editReply('❌ 読書開始選択中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 読書中の本から選択
  async handleFinish(interaction) {
    try {
      const readingBooks = await googleSheets.getBooksByStatus('reading');
      
      if (readingBooks.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📖 読了記録')
          .setColor('#FF5722')
          .setDescription('現在読書中の本がありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/book start` で読書を開始してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (readingBooks.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('book_finish_select')
          .setPlaceholder('読了する本を選択してください')
          .addOptions(
            readingBooks.map(book => ({
              label: `${book.title}`.slice(0, 100),
              description: `作者: ${book.author}`.slice(0, 100),
              value: book.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('📖 読了記録')
          .setColor('#FF9800')
          .setDescription(`読書中の本が ${readingBooks.length} 冊あります。読了する本を選択してください。`)
          .addFields(
            { name: '📖 読書中の本', value: readingBooks.map(book => `📚 ${book.title} - ${book.author}`).join('\n').slice(0, 1024), inline: false }
          );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleFinishWithPagination(interaction, readingBooks);
      }
    } catch (error) {
      console.error('読了記録選択エラー:', error);
      await interaction.editReply('❌ 読了記録選択中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 全ての本から選択
async handleInfo(interaction) {
  try {
    console.log('📄 handleInfo 開始');
    
    // デバッグ: GoogleSheetsサービスの状態確認
    console.log('📊 GoogleSheets認証状態:', !!googleSheets.auth);
    
    const allBooks = await googleSheets.getAllBooks();
    console.log(`📚 取得した全ての本の数: ${allBooks.length}`);
    console.log('📋 全ての本リスト:', allBooks);
    
    if (allBooks.length === 0) {
      console.log('❌ 登録されている本が0冊');
      const embed = new EmbedBuilder()
        .setTitle('📄 本の詳細情報')
        .setColor('#FF5722')
        .setDescription('登録されている本がありません。')
        .addFields(
          { name: '💡 ヒント', value: '`/book add [タイトル] [作者]` で本を追加してください', inline: false }
        );
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    console.log('📝 選択メニュー作成開始');
    
    if (allBooks.length <= 25) {
      console.log('🎯 通常の選択メニューを作成');
      
      // 選択メニューのオプションを作成
      const options = allBooks.map(book => {
        console.log(`📖 Book option: ID=${book.id}, Title="${book.title}", Author="${book.author}", Status="${book.status}"`);
        
        // データの検証
        if (!book.id || !book.title) {
          console.error('❌ 不正な本データ:', book);
          return null;
        }
        
        return {
          label: `${book.title}`.slice(0, 100),
          description: `作者: ${book.author || '不明'} | ${this.getStatusText(book.status)}`.slice(0, 100),
          value: book.id.toString()
        };
      }).filter(option => option !== null); // null を除外
      
      console.log('🎨 作成されたオプション:', options);
      
      if (options.length === 0) {
        console.error('❌ 有効なオプションがありません');
        await interaction.editReply({ 
          content: '❌ 本の情報に問題があります。管理者に連絡してください。', 
          components: [] 
        });
        return;
      }
      
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('book_info_select')
        .setPlaceholder('詳細を確認する本を選択してください')
        .addOptions(options);
      
      const row = new ActionRowBuilder().addComponents(selectMenu);
      
      const embed = new EmbedBuilder()
        .setTitle('📄 本の詳細情報')
        .setColor('#3F51B5')
        .setDescription(`登録されている本が ${allBooks.length} 冊あります。詳細を確認する本を選択してください。`)
        .addFields(
          { name: '📚 登録済みの本', value: allBooks.slice(0, 10).map(book => `${this.getStatusEmoji(book.status)} ${book.title} - ${book.author || '不明'}`).join('\n').slice(0, 1024), inline: false }
        );
      
      if (allBooks.length > 10) {
        embed.addFields({ name: '📝 その他', value: `... 他${allBooks.length - 10}冊`, inline: false });
      }
      
      console.log('📤 選択メニュー付きの返信を送信');
      await interaction.editReply({ embeds: [embed], components: [row] });
      
    } else {
      console.log('📄 ページネーション使用');
      await this.handleInfoWithPagination(interaction, allBooks);
    }
    
  } catch (error) {
    console.error('❌ 本詳細選択エラー:', error);
    console.error('❌ エラースタック:', error.stack);
    
    try {
      await interaction.editReply('❌ 本詳細選択中にエラーが発生しました。');
    } catch (replyError) {
      console.error('❌ エラー応答送信失敗:', replyError);
    }
  }
},

  // 既存のメソッド（変更なし）
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
      
      const statusOrder = ['want_to_buy', 'want_to_read', 'reading', 'finished', 'abandoned'];
      const groupedBooks = books.reduce((acc, book) => {
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
      
      statusOrder.forEach(status => {
        if (groupedBooks[status] && groupedBooks[status].length > 0) {
          const statusName = {
            'want_to_buy': '🛒 買いたい本',
            'want_to_read': '📋 積読本',
            'reading': '📖 読書中',
            'finished': '✅ 読了済み',
            'abandoned': '❌ 中断'
          }[status] || status;
          
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
      
      embed.setFooter({ text: '操作: /book start, /book finish, /book buy (選択式で実行可能)' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('本一覧取得エラー:', error);
      await interaction.editReply('❌ 本一覧の取得中にエラーが発生しました。');
    }
  },

  async handleWishlist(interaction) {
    try {
      console.log('🛒 /book wishlist コマンド実行開始');
      
      const wishlistBooks = await googleSheets.getWishlistBooks();
      
      console.log(`🛒 取得した買いたい本: ${wishlistBooks.length}冊`);
      
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
      
      const embed = new EmbedBuilder()
        .setTitle('🛒 買いたい本一覧')
        .setColor('#E91E63')
        .setDescription(`購入予定の本が ${wishlistBooks.length} 冊あります`)
        .setTimestamp();
      
      const sortedBooks = wishlistBooks.sort((a, b) => {
        const idA = parseInt(a.match(/\[(\d+)\]/)?.[1] || 0);
        const idB = parseInt(b.match(/\[(\d+)\]/)?.[1] || 0);
        return idB - idA;
      });
      
      const maxDisplay = 15;
      const displayBooks = sortedBooks.slice(0, maxDisplay);
      const moreCount = sortedBooks.length - maxDisplay;
      
      let fieldValue = displayBooks.join('\n');
      if (moreCount > 0) {
        fieldValue += `\n... 他${moreCount}冊`;
      }
      
      embed.addFields({
        name: `🛒 買いたい本 (${wishlistBooks.length}冊)`,
        value: fieldValue,
        inline: false
      });
      
      embed.setFooter({ text: '購入したら /book buy で積読リストに移動できます（選択式）' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ 買いたい本一覧取得エラー:', error);
      await interaction.editReply('❌ 買いたい本一覧の取得中にエラーが発生しました。');
    }
  },

  async handleReading(interaction) {
    try {
      const allBooks = await googleSheets.getBooks();
      
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
            { name: '📚 読書を開始', value: '`/book start` で積読本の読書を開始できます（選択式）', inline: false }
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
      
      embed.setFooter({ text: '読了したら /book finish で完了記録を！（選択式）' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('読書中本一覧取得エラー:', error);
      await interaction.editReply('❌ 読書中の本一覧の取得中にエラーが発生しました。');
    }
  },

  async handleFinished(interaction) {
    try {
      const allBooks = await googleSheets.getBooks();
      
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
            { name: '📚 読書を完了', value: '`/book finish` で読書を完了できます（選択式）', inline: false }
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

  // ページネーション用のヘルパーメソッド
  async handleBuyWithPagination(interaction, books, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(books.length / itemsPerPage);
    const currentBooks = books.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`book_buy_select_page_${page}`)
      .setPlaceholder('購入した本を選択してください')
      .addOptions(
        currentBooks.map(book => ({
          label: `${book.title}`.slice(0, 100),
          description: `作者: ${book.author}`.slice(0, 100),
          value: book.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`book_buy_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`book_buy_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🛒 本の購入記録')
      .setColor('#2196F3')
      .setDescription(`買いたい本が ${books.length} 冊あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { name: '🛒 買いたい本', value: currentBooks.map(book => `📚 ${book.title} - ${book.author}`).join('\n').slice(0, 1024), inline: false }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  // bookHandler.jsに追加する不足しているページネーションメソッド

async handleStartWithPagination(interaction, books, page = 0) {
  try {
    console.log(`📖 handleStartWithPagination: ページ ${page}, 本数 ${books.length}`);
    
    const itemsPerPage = 25;
    const totalPages = Math.ceil(books.length / itemsPerPage);
    const currentBooks = books.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    console.log(`📊 ページ情報: ${page + 1}/${totalPages}, 表示数: ${currentBooks.length}`);
    
    if (currentBooks.length === 0) {
      await interaction.editReply({ 
        content: '❌ 表示する本がありません。', 
        components: [] 
      });
      return;
    }
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`book_start_select_page_${page}`)
      .setPlaceholder('読書を開始する本を選択してください')
      .addOptions(
        currentBooks.map(book => ({
          label: `${book.title}`.slice(0, 100),
          description: `作者: ${book.author || '不明'}`.slice(0, 100),
          value: book.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    // ページネーションボタンを追加
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`book_start_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`book_start_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📖 読書開始')
      .setColor('#FF9800')
      .setDescription(`積読本が ${books.length} 冊あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { name: '📋 積読本', value: currentBooks.map(book => `📚 ${book.title} - ${book.author || '不明'}`).join('\n').slice(0, 1024), inline: false }
      );
    
    console.log('📤 読書開始ページネーション付きの返信を送信');
    await interaction.editReply({ embeds: [embed], components });
    
  } catch (error) {
    console.error('❌ handleStartWithPagination エラー:', error);
    await interaction.editReply({ 
      content: '❌ 読書開始ページネーション処理中にエラーが発生しました。', 
      components: [] 
    });
  }
},

async handleFinishWithPagination(interaction, books, page = 0) {
  try {
    console.log(`✅ handleFinishWithPagination: ページ ${page}, 本数 ${books.length}`);
    
    const itemsPerPage = 25;
    const totalPages = Math.ceil(books.length / itemsPerPage);
    const currentBooks = books.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    console.log(`📊 ページ情報: ${page + 1}/${totalPages}, 表示数: ${currentBooks.length}`);
    
    if (currentBooks.length === 0) {
      await interaction.editReply({ 
        content: '❌ 表示する本がありません。', 
        components: [] 
      });
      return;
    }
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`book_finish_select_page_${page}`)
      .setPlaceholder('読了する本を選択してください')
      .addOptions(
        currentBooks.map(book => ({
          label: `${book.title}`.slice(0, 100),
          description: `作者: ${book.author || '不明'}`.slice(0, 100),
          value: book.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    // ページネーションボタンを追加
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`book_finish_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`book_finish_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📖 読了記録')
      .setColor('#FF9800')
      .setDescription(`読書中の本が ${books.length} 冊あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { name: '📖 読書中の本', value: currentBooks.map(book => `📚 ${book.title} - ${book.author || '不明'}`).join('\n').slice(0, 1024), inline: false }
      );
    
    console.log('📤 読了記録ページネーション付きの返信を送信');
    await interaction.editReply({ embeds: [embed], components });
    
  } catch (error) {
    console.error('❌ handleFinishWithPagination エラー:', error);
    await interaction.editReply({ 
      content: '❌ 読了記録ページネーション処理中にエラーが発生しました。', 
      components: [] 
    });
  }
},

  async handleInfoWithPagination(interaction, books, page = 0) {
  try {
    console.log(`📄 handleInfoWithPagination: ページ ${page}, 本数 ${books.length}`);
    
    const itemsPerPage = 25;
    const totalPages = Math.ceil(books.length / itemsPerPage);
    const currentBooks = books.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    console.log(`📊 ページ情報: ${page + 1}/${totalPages}, 表示数: ${currentBooks.length}`);
    
    if (currentBooks.length === 0) {
      await interaction.editReply({ 
        content: '❌ 表示する本がありません。', 
        components: [] 
      });
      return;
    }
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`book_info_select_page_${page}`)
      .setPlaceholder('詳細を確認する本を選択してください')
      .addOptions(
        currentBooks.map(book => ({
          label: `${book.title}`.slice(0, 100),
          description: `作者: ${book.author || '不明'} | ${this.getStatusText(book.status)}`.slice(0, 100),
          value: book.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    // ページネーションボタンを追加
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`book_info_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`book_info_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📄 本の詳細情報')
      .setColor('#3F51B5')
      .setDescription(`登録されている本が ${books.length} 冊あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { name: '📚 登録済みの本', value: currentBooks.map(book => `${this.getStatusEmoji(book.status)} ${book.title} - ${book.author || '不明'}`).join('\n').slice(0, 1024), inline: false }
      );
    
    console.log('📤 ページネーション付きの返信を送信');
    await interaction.editReply({ embeds: [embed], components });
    
  } catch (error) {
    console.error('❌ handleInfoWithPagination エラー:', error);
    await interaction.editReply({ 
      content: '❌ ページネーション処理中にエラーが発生しました。', 
      components: [] 
    });
  }
},

  // ヘルパーメソッド
  getStatusEmoji(status) {
    const emojis = {
      'want_to_buy': '🛒',
      'want_to_read': '📋',
      'reading': '📖',
      'finished': '✅',
      'abandoned': '❌'
    };
    return emojis[status] || '❓';
  },

  getStatusText(status) {
    const texts = {
      'want_to_buy': '買いたい',
      'want_to_read': '積読',
      'reading': '読書中',
      'finished': '読了',
      'abandoned': '中断'
    };
    return texts[status] || status;
  }
};
