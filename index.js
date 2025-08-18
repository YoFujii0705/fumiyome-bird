require('dotenv').config();

const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// クライアントの作成（最初に定義）
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// サービスのインポートと初期化
const GoogleSheetsService = require('./services/googleSheets');
const goalService = require('./services/goalService');
const NotificationService = require('./services/notifications');

// GoogleSheetsService のインスタンス作成
const googleSheets = new GoogleSheetsService();

// GoalServiceの初期化
goalService.setGoogleSheetsService(googleSheets);

// 通知サービス用の変数（後で初期化）
let notificationService;

console.log('✅ 基本サービスの設定が完了しました');

// コマンドコレクション
client.commands = new Collection();

// コマンドの読み込み
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('📋 コマンド読み込み開始...');
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  
  try {
    // requireキャッシュをクリア（開発時用）
    delete require.cache[require.resolve(filePath)];
    
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`✅ コマンド読み込み成功: ${command.data.name} (${file})`);
    } else {
      console.log(`⚠️ ${filePath} - data または execute プロパティが不足しています`);
      console.log(`   data: ${!!command.data}, execute: ${!!command.execute}`);
    }
  } catch (error) {
    console.error(`❌ コマンド読み込みエラー (${file}):`, error.message);
  }
}

console.log(`📊 合計 ${client.commands.size} 個のコマンドを読み込みました`);

// ボット起動時の処理
client.once('ready', async () => {
  console.log(`🤖 ${client.user.tag} でログインしました！`);
  console.log(`🎯 CLIENT_ID: ${client.user.id}`);
  console.log(`📋 登録されたコマンド: ${Array.from(client.commands.keys()).join(', ')}`);
  
  try {
    // GoogleSheetsサービスを client に設定
    client.googleSheetsService = googleSheets;
    
    // 接続テスト
    console.log('🔍 Google Sheets接続テスト中...');
    const isConnected = await googleSheets.testConnection();
    
    if (isConnected) {
      console.log('✅ Google Sheets接続成功');
      
      // 通知サービスの初期化（clientが利用可能になってから）
      notificationService = new NotificationService(client, googleSheets);
      client.notificationService = notificationService;
      
      console.log('📢 通知サービス初期化完了');
      
      // システム状態の表示
      const status = await notificationService.getSystemStatus();
      console.log('📊 システム状態:', {
        通知サービス: status.notification.isActive ? '✅ 稼働中' : '❌ 停止中',
        タスク数: status.taskCount,
        Google_Sheets: status.googleSheets,
        通知チャンネル: status.channel
      });
      
      console.log('✅ 全サービスの初期化が完了しました');
      
    } else {
      console.error('❌ Google Sheets接続失敗 - 通知サービスは起動しません');
    }
    
  } catch (error) {
    console.error('❌ サービス初期化エラー:', error);
  }
});

// インタラクション処理
client.on('interactionCreate', async interaction => {
  console.log(`🔔 インタラクション受信: ${interaction.type} - ${interaction.user.tag}`);
  
  // 🆕 選択メニューの処理
  if (interaction.isStringSelectMenu()) {
    try {
      await interaction.deferUpdate(); // 応答時間確保
      
      // 本関連の選択メニュー処理
      if (interaction.customId.startsWith('book_')) {
        await handleBookSelection(interaction);
      }
      // 映画関連の選択メニュー処理
      else if (interaction.customId.startsWith('movie_')) {
        await handleMovieSelection(interaction);
      }
      // 将来的に活動も追加
      // else if (interaction.customId.startsWith('activity_')) {
      //   await handleActivitySelection(interaction);
      // }
      
    } catch (error) {
      console.error('選択メニュー処理エラー:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ 処理中にエラーが発生しました。', ephemeral: true });
      } else {
        await interaction.editReply({ content: '❌ 処理中にエラーが発生しました。', components: [] });
      }
    }
  }
  
  // 🆕 ボタンクリックの処理
  else if (interaction.isButton()) {
    try {
      await interaction.deferUpdate();
      
      if (interaction.customId.startsWith('book_')) {
        await handleBookPagination(interaction);
      }
      // 映画のページネーション処理
      else if (interaction.customId.startsWith('movie_')) {
        await handleMoviePagination(interaction);
      }
      
    } catch (error) {
      console.error('ボタン処理エラー:', error);
      await interaction.editReply({ content: '❌ 処理中にエラーが発生しました。', components: [] });
    }
  }
  
  // スラッシュコマンドの処理
  else if (interaction.isChatInputCommand()) {
    const commandName = interaction.commandName;
    const command = interaction.client.commands.get(commandName);

    console.log(`🎯 コマンド検索: ${commandName}`);
    console.log(`📋 利用可能なコマンド: ${Array.from(interaction.client.commands.keys()).join(', ')}`);

    if (!command) {
      console.error(`❌ コマンドが見つかりません: ${commandName}`);
      console.error(`📊 登録済みコマンド数: ${interaction.client.commands.size}`);
      
      try {
        await interaction.reply({
          content: `❌ コマンド "${commandName}" が見つかりません。\n利用可能なコマンド: ${Array.from(interaction.client.commands.keys()).join(', ')}`,
          ephemeral: true
        });
      } catch (replyError) {
        console.error('❌ エラー応答の送信に失敗:', replyError);
      }
      return;
    }

    console.log(`✅ コマンド見つかりました: ${commandName}`);

    try {
      console.log(`🚀 コマンド実行開始: ${commandName}`);
      console.log('🔍 デバッグ情報:');
      console.log(`  コマンド名: ${commandName}`);
      console.log(`  ユーザー: ${interaction.user.username}`);
      console.log(`  サーバー: ${interaction.guild?.name || 'DM'}`);
      console.log(`  チャンネル: ${interaction.channel?.name || 'Unknown'}`);
      console.log(`  登録済みコマンド: ${Array.from(client.commands.keys()).join(',')}`);
      
      await command.execute(interaction);
      console.log(`✅ コマンド実行完了: ${commandName}`);
    } catch (error) {
      console.error(`❌ コマンド実行エラー (${commandName}):`, error.message);
      
      // 「このコマンドはハンドラーで処理されます」の場合はハンドラーに委譲
      if (error.message === 'このコマンドはハンドラーで処理されます') {
        console.log(`🔄 ハンドラーに処理を委譲: ${commandName}`);
        
        try {
          // ハンドラーファイルを動的に読み込み
          const handlerPath = path.join(__dirname, 'handlers', `${commandName}Handler.js`);
          
          if (fs.existsSync(handlerPath)) {
            // requireキャッシュをクリア（開発時の更新反映のため）
            delete require.cache[require.resolve(handlerPath)];
            const handler = require(handlerPath);
            
            console.log(`📥 ハンドラー読み込み成功: ${commandName}Handler.js`);
            
            // ハンドラー実行前にdeferReplyを呼ぶ（ハンドラーがeditReplyを使用するため）
            if (!interaction.replied && !interaction.deferred) {
              await interaction.deferReply();
              console.log(`⏳ ${commandName}コマンドの処理を開始（defer）`);
            }
            
            // ハンドラーを実行
            await handler.execute(interaction);
            console.log(`✅ ハンドラー実行完了: ${commandName}`);
            
          } else {
            console.error(`❌ ハンドラーファイルが見つかりません: ${handlerPath}`);
            await interaction.reply({
              content: `❌ ${commandName}コマンドのハンドラーが見つかりません。`,
              ephemeral: true
            });
          }
          
        } catch (handlerError) {
          console.error(`❌ ハンドラー実行エラー (${commandName}):`, handlerError.message);
          console.error('❌ エラースタック:', handlerError.stack);
          
          try {
            if (interaction.replied || interaction.deferred) {
              await interaction.editReply({ 
                content: `❌ ${commandName}コマンドの処理中にエラーが発生しました。\nエラー: ${handlerError.message}`,
                ephemeral: true 
              });
            } else {
              await interaction.reply({ 
                content: `❌ ${commandName}コマンドの処理中にエラーが発生しました。\nエラー: ${handlerError.message}`,
                ephemeral: true 
              });
            }
          } catch (replyError) {
            console.error('❌ エラー応答の送信に失敗:', replyError);
          }
        }
        
      } else {
        // その他のエラー（通常のエラー処理）
        console.error('❌ エラースタック:', error.stack);
        
        const errorMessage = `❌ コマンド実行中にエラーが発生しました。\nエラー: ${error.message}`;
        
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: errorMessage, ephemeral: true });
          } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
          }
        } catch (replyError) {
          console.error('❌ エラー応答の送信に失敗:', replyError);
        }
      }
    }
  } else {
    console.log('❌ サポートされていないインタラクションタイプです');
  }
});

// 🆕 本の選択メニュー処理
async function handleBookSelection(interaction) {
  const selectedBookId = interaction.values[0];
  const customId = interaction.customId;
  
  console.log(`📚 本選択処理: ${customId}, ID: ${selectedBookId}`);
  
  if (customId.startsWith('book_buy_select')) {
    // 本を購入済みに変更
    const boughtBook = await googleSheets.buyBook(selectedBookId);
    
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
      
      await interaction.editReply({ embeds: [embed], components: [] });
    } else {
      await interaction.editReply({ 
        content: '❌ 指定された本が見つからないか、既に購入済みです。', 
        components: [] 
      });
    }
  }
  
  else if (customId.startsWith('book_start_select')) {
    // 読書を開始
    const startedBook = await googleSheets.startReading(selectedBookId);
    
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
      
      await interaction.editReply({ embeds: [embed], components: [] });
    } else {
      await interaction.editReply({ 
        content: '❌ 指定された本が見つからないか、既に読書開始済みです。', 
        components: [] 
      });
    }
  }
  
  else if (customId.startsWith('book_finish_select')) {
    // 読書を完了
    const finishedBook = await googleSheets.finishReading(selectedBookId);
    
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
      
      await interaction.editReply({ embeds: [embed], components: [] });
    } else {
      await interaction.editReply({ 
        content: '❌ 指定された本が見つからないか、既に読了済みです。', 
        components: [] 
      });
    }
  }
  
  else if (customId.startsWith('book_info_select')) {
    // 本の詳細情報を表示
    const bookInfo = await googleSheets.getBookById(selectedBookId);
    
    if (bookInfo) {
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
          actionHint = '購入記録: /book buy（選択式）';
          break;
        case 'want_to_read':
          actionHint = '読書開始: /book start（選択式）';
          break;
        case 'reading':
          actionHint = '読了記録: /book finish（選択式）';
          break;
        case 'finished':
          actionHint = '感想記録: /report book（選択式）';
          break;
      }
      
      if (actionHint) {
        embed.setFooter({ text: actionHint });
      }
      
      await interaction.editReply({ embeds: [embed], components: [] });
    } else {
      await interaction.editReply({ 
        content: '❌ 指定された本の詳細情報が見つかりません。', 
        components: [] 
      });
    }
  }
}

// 🆕 映画の選択メニュー処理
async function handleMovieSelection(interaction) {
  const selectedMovieId = interaction.values[0];
  const customId = interaction.customId;
  
  console.log(`🎬 映画選択処理: ${customId}, ID: ${selectedMovieId}`);
  
  if (customId.startsWith('movie_watch_select')) {
    // 映画を視聴済みに変更
    const watchedMovie = await googleSheets.watchMovie(selectedMovieId);
    
    if (watchedMovie) {
      const embed = new EmbedBuilder()
        .setTitle('🎬 映画を視聴しました！')
        .setColor('#2196F3')
        .setDescription('視聴おめでとうございます！映画リストに記録されました！🎬✨')
        .addFields(
          { name: 'ID', value: watchedMovie.id.toString(), inline: true },
          { name: 'タイトル', value: watchedMovie.title, inline: true },
          { name: 'ステータス変更', value: '🎬 観たい → ✅ 視聴済み', inline: false }
        )
        .setFooter({ text: '感想を /report movie で記録してみませんか？' })
        .setTimestamp();
      
      if (watchedMovie.memo) {
        embed.addFields({ name: '備考', value: watchedMovie.memo, inline: false });
      }
      
      await interaction.editReply({ embeds: [embed], components: [] });
    } else {
      await interaction.editReply({ 
        content: '❌ 指定された映画が見つからないか、既に視聴済みです。', 
        components: [] 
      });
    }
  }
  
  else if (customId.startsWith('movie_skip_select')) {
    // 映画をスキップ
    const skippedMovie = await googleSheets.skipMovie(selectedMovieId);
    
    if (skippedMovie) {
      const embed = new EmbedBuilder()
        .setTitle('😅 映画をスキップしました')
        .setColor('#FF9800')
        .setDescription('また次の機会に観ることができますね！')
        .addFields(
          { name: 'ID', value: skippedMovie.id.toString(), inline: true },
          { name: 'タイトル', value: skippedMovie.title, inline: true },
          { name: 'ステータス変更', value: '🎬 観たい → 😅 見逃し', inline: false }
        )
        .setFooter({ text: '他にも観たい映画を探してみましょう！' })
        .setTimestamp();
      
      if (skippedMovie.memo) {
        embed.addFields({ name: '備考', value: skippedMovie.memo, inline: false });
      }
      
      await interaction.editReply({ embeds: [embed], components: [] });
    } else {
      await interaction.editReply({ 
        content: '❌ 指定された映画が見つからないか、既に処理済みです。', 
        components: [] 
      });
    }
  }
  
  else if (customId.startsWith('movie_info_select')) {
    // 映画の詳細情報を表示
    const movieInfo = await googleSheets.getMovieById(selectedMovieId);
    
    if (movieInfo) {
      const statusText = {
        'want_to_watch': '🎬 観たい',
        'watched': '✅ 視聴済み',
        'missed': '😅 見逃し'
      };
      
      const embed = new EmbedBuilder()
        .setTitle('📄 映画の詳細情報')
        .setColor('#3F51B5')
        .setDescription(`🎬 ${movieInfo.title}`)
        .addFields(
          { name: 'ID', value: movieInfo.id.toString(), inline: true },
          { name: 'ステータス', value: statusText[movieInfo.status] || movieInfo.status, inline: true },
          { name: '登録日', value: movieInfo.created_at, inline: true },
          { name: '更新日', value: movieInfo.updated_at, inline: true }
        )
        .setTimestamp();
      
      if (movieInfo.memo) {
        embed.addFields({ name: '備考', value: movieInfo.memo, inline: false });
      }
      
      // ステータスに応じたアクションヒント
      let actionHint = '';
      switch (movieInfo.status) {
        case 'want_to_watch':
          actionHint = '視聴記録: /movie watch（選択式） | スキップ: /movie skip（選択式）';
          break;
        case 'watched':
          actionHint = '感想記録: /report movie（選択式）';
          break;
        case 'missed':
          actionHint = '再度観たい場合は新しく追加してください';
          break;
      }
      
      if (actionHint) {
        embed.setFooter({ text: actionHint });
      }
      
      await interaction.editReply({ embeds: [embed], components: [] });
    } else {
      await interaction.editReply({ 
        content: '❌ 指定された映画の詳細情報が見つかりません。', 
        components: [] 
      });
    }
  }
}

// 🆕 本のページネーション処理
async function handleBookPagination(interaction) {
  const customId = interaction.customId;
  
  if (customId.includes('book_buy_')) {
    const page = parseInt(customId.split('_').pop());
    const wantToBuyBooks = await googleSheets.getBooksByStatus('want_to_buy');
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const bookHandler = require('./handlers/bookHandler');
      await bookHandler.handleBuyWithPagination(interaction, wantToBuyBooks, page);
    }
  }
  
  else if (customId.includes('book_start_')) {
    const page = parseInt(customId.split('_').pop());
    const wantToReadBooks = await googleSheets.getBooksByStatus('want_to_read');
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const bookHandler = require('./handlers/bookHandler');
      await bookHandler.handleStartWithPagination(interaction, wantToReadBooks, page);
    }
  }
  
  else if (customId.includes('book_finish_')) {
    const page = parseInt(customId.split('_').pop());
    const readingBooks = await googleSheets.getBooksByStatus('reading');
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const bookHandler = require('./handlers/bookHandler');
      await bookHandler.handleFinishWithPagination(interaction, readingBooks, page);
    }
  }
  
  else if (customId.includes('book_info_')) {
    const page = parseInt(customId.split('_').pop());
    const allBooks = await googleSheets.getAllBooks();
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const bookHandler = require('./handlers/bookHandler');
      await bookHandler.handleInfoWithPagination(interaction, allBooks, page);
    }
  }
}

// 🆕 映画のページネーション処理
async function handleMoviePagination(interaction) {
  const customId = interaction.customId;
  
  if (customId.includes('movie_watch_')) {
    const page = parseInt(customId.split('_').pop());
    const wantToWatchMovies = await googleSheets.getMoviesByStatus('want_to_watch');
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const movieHandler = require('./handlers/movieHandler');
      await movieHandler.handleWatchWithPagination(interaction, wantToWatchMovies, page);
    }
  }
  
  else if (customId.includes('movie_skip_')) {
    const page = parseInt(customId.split('_').pop());
    const wantToWatchMovies = await googleSheets.getMoviesByStatus('want_to_watch');
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const movieHandler = require('./handlers/movieHandler');
      await movieHandler.handleSkipWithPagination(interaction, wantToWatchMovies, page);
    }
  }
  
  else if (customId.includes('movie_info_')) {
    const page = parseInt(customId.split('_').pop());
    const allMovies = await googleSheets.getAllMovies();
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const movieHandler = require('./handlers/movieHandler');
      await movieHandler.handleInfoWithPagination(interaction, allMovies, page);
    }
  }
}

// エラーハンドリング
client.on('error', error => {
  console.error('❌ Discord クライアントエラー:', error);
});

client.on('warn', warn => {
  console.warn('⚠️ Discord クライアント警告:', warn);
});

process.on('unhandledRejection', error => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('❌ Uncaught exception:', error);
});

// 終了処理
process.on('SIGINT', async () => {
  console.log('🛑 シャットダウン処理開始...');
  
  if (notificationService) {
    await notificationService.emergencyStop();
    console.log('✅ 通知サービス停止完了');
  }
  
  if (client) {
    client.destroy();
    console.log('✅ Discord クライアント切断完了');
  }
  
  console.log('👋 シャットダウン完了');
  process.exit(0);
});

// ログイン
console.log('🔐 Discord ボットにログイン中...');
client.login(process.env.DISCORD_TOKEN);
