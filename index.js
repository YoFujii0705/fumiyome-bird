require('dotenv').config();

const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const MangaNotificationScheduler = require('./services/mangaNotificationScheduler');
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

// 🆕 漫画通知スケジューラーのインスタンス
let mangaNotificationScheduler;

client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} でログインしました！`);
  
  // 🆕 漫画通知スケジューラーを開始
  try {
    mangaNotificationScheduler = new MangaNotificationScheduler(client);
    mangaNotificationScheduler.start();
    
    console.log('🔔 漫画通知スケジューラーが開始されました');
    
    // スケジューラーの状態をログ出力
    const status = mangaNotificationScheduler.getStatus();
    console.log('📊 スケジューラー状態:', {
      isRunning: status.isRunning,
      checkInterval: `${status.checkInterval / (60 * 1000)}分`,
      notificationChannelId: status.notificationChannelId,
      nextCheck: status.nextCheck
    });
    
  } catch (error) {
    console.error('❌ 漫画通知スケジューラーの開始に失敗:', error);
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
      // 🆕 活動関連の選択メニュー処理
      else if (interaction.customId.startsWith('activity_')) {
        await handleActivitySelection(interaction);
      }
        // アニメ関連の選択メニュー処理
     else if (interaction.customId.startsWith('anime_')) {
     await handleAnimeSelection(interaction);
       }
      else if (interaction.customId.startsWith('manga_')) {
     await handleMangaSelection(interaction);
       }
      // 🆕 レポート関連の選択メニュー処理
      else if (interaction.customId.startsWith('report_')) {
        await handleReportSelection(interaction);
      }
      // 🆕 レポート履歴関連の選択メニュー処理
      else if (interaction.customId.startsWith('reports_')) {
        await handleReportsSelection(interaction);
      }
      
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
      // 🆕 活動のページネーション処理
      else if (interaction.customId.startsWith('activity_')) {
        await handleActivityPagination(interaction);
      }
        // アニメのページネーション処理
      else if (interaction.customId.startsWith('anime_')) {
　　　  await handleAnimePagination(interaction);
　　　　}
        else if (interaction.customId.startsWith('manga_')) {
  await handleMangaPagination(interaction);
      }
      // 🆕 レポート・レポート履歴のページネーション処理
      else if (interaction.customId.startsWith('report_') || interaction.customId.startsWith('reports_')) {
        await handleReportPagination(interaction);
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
// 🆕 本の選択メニュー処理（完全版）
async function handleBookSelection(interaction) {
  try {
    const selectedBookId = interaction.values[0];
    const customId = interaction.customId;
    
    console.log(`📚 本選択処理開始: ${customId}, ID: ${selectedBookId}`);
    
    // GoogleSheetsサービスの状態確認
    if (!googleSheets || !googleSheets.auth) {
      console.error('❌ GoogleSheetsサービスが利用できません');
      await interaction.editReply({ 
        content: '❌ データベース接続に問題があります。しばらく待ってから再試行してください。', 
        components: [] 
      });
      return;
    }

    // タイムアウト設定（30秒）
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('処理がタイムアウトしました')), 30000)
    );

    // 🛒 本を購入済みに変更
    if (customId.startsWith('book_buy_select')) {
      console.log('🛒 本購入処理開始');
      
      const buyPromise = googleSheets.buyBook(selectedBookId);
      const boughtBook = await Promise.race([buyPromise, timeout]);
      
      if (boughtBook) {
        const embed = new EmbedBuilder()
          .setTitle('🛒 本を購入しました！')
          .setColor('#2196F3')
          .setDescription('購入おめでとうございます！積読リストに追加されました！📚✨')
          .addFields(
            { name: 'ID', value: boughtBook.id.toString(), inline: true },
            { name: 'タイトル', value: boughtBook.title, inline: true },
            { name: '作者', value: boughtBook.author || '不明', inline: true },
            { name: 'ステータス変更', value: '🛒 買いたい → 📋 積読', inline: false }
          )
          .setFooter({ text: '読む準備ができたら /book start で読書を開始しましょう！' })
          .setTimestamp();
        
        if (boughtBook.memo) {
          embed.addFields({ name: '備考', value: boughtBook.memo, inline: false });
        }
        
        console.log('✅ 本購入完了');
        await interaction.editReply({ embeds: [embed], components: [] });
      } else {
        console.log('❌ 本購入失敗');
        await interaction.editReply({ 
          content: '❌ 指定された本が見つからないか、既に購入済みです。', 
          components: [] 
        });
      }
    }
    
    // 📖 読書を開始
    else if (customId.startsWith('book_start_select')) {
      console.log('📖 読書開始処理開始');
      
      const startPromise = googleSheets.startReading(selectedBookId);
      const startedBook = await Promise.race([startPromise, timeout]);
      
      if (startedBook) {
        const embed = new EmbedBuilder()
          .setTitle('📖 読書開始！')
          .setColor('#FF9800')
          .setDescription('素晴らしい！新しい読書の旅が始まりますね！📚✨')
          .addFields(
            { name: 'ID', value: startedBook.id.toString(), inline: true },
            { name: 'タイトル', value: startedBook.title, inline: true },
            { name: '作者', value: startedBook.author || '不明', inline: true },
            { name: 'ステータス変更', value: '📋 積読 → 📖 読書中', inline: false }
          )
          .setFooter({ text: '読了したら /book finish で完了記録を！進捗は /report book で記録できます' })
          .setTimestamp();
        
        if (startedBook.memo) {
          embed.addFields({ name: '備考', value: startedBook.memo, inline: false });
        }
        
        console.log('✅ 読書開始完了');
        await interaction.editReply({ embeds: [embed], components: [] });
      } else {
        console.log('❌ 読書開始失敗');
        await interaction.editReply({ 
          content: '❌ 指定された本が見つからないか、既に読書開始済みです。', 
          components: [] 
        });
      }
    }
    
    // ✅ 読書を完了
    else if (customId.startsWith('book_finish_select')) {
      console.log('✅ 読書完了処理開始');
      
      const finishPromise = googleSheets.finishReading(selectedBookId);
      const finishedBook = await Promise.race([finishPromise, timeout]);
      
      if (finishedBook) {
        const embed = new EmbedBuilder()
          .setTitle('🎉 読了おめでとうございます！')
          .setColor('#FFD700')
          .setDescription('素晴らしい達成感ですね！また一つ知識の扉が開かれました📚✨')
          .addFields(
            { name: 'ID', value: finishedBook.id.toString(), inline: true },
            { name: 'タイトル', value: finishedBook.title, inline: true },
            { name: '作者', value: finishedBook.author || '不明', inline: true },
            { name: 'ステータス変更', value: '📖 読書中 → ✅ 読了', inline: false }
          )
          .setFooter({ text: '感想を /report book で記録してみませんか？' })
          .setTimestamp();
        
        if (finishedBook.memo) {
          embed.addFields({ name: '備考', value: finishedBook.memo, inline: false });
        }
        
        console.log('✅ 読書完了完了');
        await interaction.editReply({ embeds: [embed], components: [] });
      } else {
        console.log('❌ 読書完了失敗');
        await interaction.editReply({ 
          content: '❌ 指定された本が見つからないか、既に読了済みです。', 
          components: [] 
        });
      }
    }
    
    // 📄 本の詳細情報を表示
    else if (customId.startsWith('book_info_select')) {
      console.log('📄 本詳細情報取得開始');
      
      const infoPromise = googleSheets.getBookById(selectedBookId);
      const bookInfo = await Promise.race([infoPromise, timeout]);
      
      console.log('📖 取得した本情報:', bookInfo);
      
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
            { name: '作者', value: bookInfo.author || '不明', inline: true },
            { name: 'ステータス', value: statusText[bookInfo.status] || bookInfo.status, inline: true }
          )
          .setTimestamp();
        
        // 日付情報がある場合のみ追加
        if (bookInfo.created_at && bookInfo.created_at.trim() !== '') {
          embed.addFields({ name: '登録日', value: bookInfo.created_at, inline: true });
        }
        if (bookInfo.updated_at && bookInfo.updated_at.trim() !== '') {
          embed.addFields({ name: '更新日', value: bookInfo.updated_at, inline: true });
        }
        
        if (bookInfo.memo && bookInfo.memo.trim() !== '') {
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
        
        console.log('✅ 本詳細情報表示完了');
        await interaction.editReply({ embeds: [embed], components: [] });
        
      } else {
        console.log('❌ 本が見つからない');
        await interaction.editReply({ 
          content: '❌ 指定された本の詳細情報が見つかりません。', 
          components: [] 
        });
      }
    }
    
    // 🔄 ページネーション処理
    else if (customId.includes('_page_')) {
      console.log('📄 ページネーション処理');
      
      const parts = customId.split('_');
      const action = parts[1]; // buy, start, finish, info
      const page = parseInt(parts[parts.length - 1]);
      
      console.log(`ページネーション: ${action}, ページ: ${page}`);
      
      // 各アクションに応じたデータを取得
      let books = [];
      switch (action) {
        case 'buy':
          books = await Promise.race([googleSheets.getBooksByStatus('want_to_buy'), timeout]);
          break;
        case 'start':
          books = await Promise.race([googleSheets.getBooksByStatus('want_to_read'), timeout]);
          break;
        case 'finish':
          books = await Promise.race([googleSheets.getBooksByStatus('reading'), timeout]);
          break;
        case 'info':
          books = await Promise.race([googleSheets.getAllBooks(), timeout]);
          break;
      }
      
      if (books && books.length > 0) {
        const bookHandler = require('./handlers/bookHandler');
        
        switch (action) {
          case 'buy':
            await bookHandler.handleBuyWithPagination(interaction, books, page);
            break;
          case 'start':
            await bookHandler.handleStartWithPagination(interaction, books, page);
            break;
          case 'finish':
            await bookHandler.handleFinishWithPagination(interaction, books, page);
            break;
          case 'info':
            await bookHandler.handleInfoWithPagination(interaction, books, page);
            break;
        }
      } else {
        await interaction.editReply({ 
          content: '❌ データの取得に失敗しました。', 
          components: [] 
        });
      }
    }
    
    // 🔄 その他の処理
    else {
      console.log('❓ 不明な選択処理:', customId);
      await interaction.editReply({ 
        content: '❌ 不明な操作です。', 
        components: [] 
      });
    }
    
  } catch (error) {
    console.error('❌ handleBookSelection エラー:', error);
    console.error('❌ エラーメッセージ:', error.message);
    console.error('❌ エラースタック:', error.stack);
    
    // エラーの種類に応じたメッセージ
    let errorMessage = '❌ 本の選択処理中にエラーが発生しました。';
    
    if (error.message.includes('タイムアウト')) {
      errorMessage = '❌ 処理がタイムアウトしました。ネットワーク接続を確認してください。';
    } else if (error.message.includes('認証')) {
      errorMessage = '❌ データベース認証エラーです。管理者に連絡してください。';
    } else if (error.message.includes('権限')) {
      errorMessage = '❌ データベースアクセス権限がありません。管理者に連絡してください。';
    }
    
    try {
      await interaction.editReply({ 
        content: errorMessage + '\n\n🔧 詳細: ' + error.message, 
        components: [] 
      });
    } catch (replyError) {
      console.error('❌ エラー応答送信失敗:', replyError);
      
      // 最後の手段として、新しい応答を試行
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ 
            content: errorMessage, 
            ephemeral: true 
          });
        }
      } catch (finalError) {
        console.error('❌ 最終エラー応答も失敗:', finalError);
      }
    }
  }
}

/**
 * アニメの選択メニュー処理
 */
async function handleAnimeSelection(interaction) {
  try {
    const selectedAnimeId = interaction.values[0];
    const customId = interaction.customId;
    
    console.log(`📺 アニメ選択処理開始: ${customId}, ID: ${selectedAnimeId}`);
    
    // GoogleSheetsサービスの状態確認
    if (!googleSheets || !googleSheets.auth) {
      console.error('❌ GoogleSheetsサービスが利用できません');
      await interaction.editReply({ 
        content: '❌ データベース接続に問題があります。しばらく待ってから再試行してください。', 
        components: [] 
      });
      return;
    }

    // タイムアウト設定（30秒）
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('処理がタイムアウトしました')), 30000)
    );

    // 📺 話数を視聴
    if (customId.startsWith('anime_watch_select')) {
      console.log('📺 話数視聴処理開始');
      
      const watchPromise = googleSheets.watchNextEpisode(selectedAnimeId);
      const watchedAnime = await Promise.race([watchPromise, timeout]);
      
      if (watchedAnime) {
        const anime = await googleSheets.getAnimeById(selectedAnimeId);
        const isCompleted = anime && anime.watched_episodes >= anime.total_episodes;
        
        const embed = new EmbedBuilder()
          .setTitle(isCompleted ? '🎉 アニメ完走！' : '📺 話数視聴記録！')
          .setColor(isCompleted ? '#FFD700' : '#2196F3')
          .setDescription(isCompleted ? '素晴らしい！アニメを完走しました！🎉✨' : '新しい話数を視聴しました！📺✨')
          .addFields(
            { name: 'ID', value: watchedAnime.id.toString(), inline: true },
            { name: 'タイトル', value: watchedAnime.title, inline: true },
            { name: '進捗', value: `${watchedAnime.watched_episodes}/${watchedAnime.total_episodes}話`, inline: true }
          )
          .setTimestamp();

        if (isCompleted) {
          embed.addFields({ name: 'ステータス変更', value: '📺 視聴中 → ✅ 完走済み', inline: false });
          embed.setFooter({ text: '感想を /report anime で記録してみませんか？' });
        } else {
          embed.setFooter({ text: '次の話数も /anime watch で記録できます' });
        }
        
        console.log('✅ 話数視聴完了');
        await interaction.editReply({ embeds: [embed], components: [] });
      } else {
        console.log('❌ 話数視聴失敗');
        await interaction.editReply({ 
          content: '❌ 指定されたアニメが見つからないか、既に全話視聴済みです。', 
          components: [] 
        });
      }
    }
    
    // 🚀 視聴開始
    else if (customId.startsWith('anime_start_select')) {
      console.log('🚀 視聴開始処理開始');
      
      const startPromise = googleSheets.startWatchingAnime(selectedAnimeId);
      const startedAnime = await Promise.race([startPromise, timeout]);
      
      if (startedAnime) {
        const embed = new EmbedBuilder()
          .setTitle('🚀 アニメ視聴開始！')
          .setColor('#FF9800')
          .setDescription('素晴らしい！新しいアニメの視聴が始まりますね！📺✨')
          .addFields(
            { name: 'ID', value: startedAnime.id.toString(), inline: true },
            { name: 'タイトル', value: startedAnime.title, inline: true },
            { name: '総話数', value: `${startedAnime.total_episodes}話`, inline: true },
            { name: 'ステータス変更', value: '🍿 観たい → 📺 視聴中', inline: false }
          )
          .setFooter({ text: '話数を視聴したら /anime watch で記録しましょう！' })
          .setTimestamp();
        
        if (startedAnime.memo) {
          embed.addFields({ name: '備考', value: startedAnime.memo, inline: false });
        }
        
        console.log('✅ 視聴開始完了');
        await interaction.editReply({ embeds: [embed], components: [] });
      } else {
        console.log('❌ 視聴開始失敗');
        await interaction.editReply({ 
          content: '❌ 指定されたアニメが見つからないか、既に視聴開始済みです。', 
          components: [] 
        });
      }
    }
    
    // 🎉 完走記録
    else if (customId.startsWith('anime_finish_select')) {
      console.log('🎉 完走処理開始');
      
      const finishPromise = googleSheets.completeAnime(selectedAnimeId);
      const finishedAnime = await Promise.race([finishPromise, timeout]);
      
      if (finishedAnime) {
        const embed = new EmbedBuilder()
          .setTitle('🎉 アニメ完走おめでとうございます！')
          .setColor('#FFD700')
          .setDescription('素晴らしい達成感ですね！また一つ素晴らしい作品を完走されました📺✨')
          .addFields(
            { name: 'ID', value: finishedAnime.id.toString(), inline: true },
            { name: 'タイトル', value: finishedAnime.title, inline: true },
            { name: '総話数', value: `${finishedAnime.total_episodes}話`, inline: true },
            { name: 'ステータス変更', value: '📺 視聴中 → ✅ 完走済み', inline: false }
          )
          .setFooter({ text: '感想を /report anime で記録してみませんか？' })
          .setTimestamp();
        
        if (finishedAnime.memo) {
          embed.addFields({ name: '備考', value: finishedAnime.memo, inline: false });
        }
        
        console.log('✅ 完走記録完了');
        await interaction.editReply({ embeds: [embed], components: [] });
      } else {
        console.log('❌ 完走記録失敗');
        await interaction.editReply({ 
          content: '❌ 指定されたアニメが見つからないか、既に完走済みです。', 
          components: [] 
        });
      }
    }
    
    // 💔 視聴中断
    else if (customId.startsWith('anime_drop_select')) {
      console.log('💔 視聴中断処理開始');
      
      const dropPromise = googleSheets.dropAnime(selectedAnimeId);
      const droppedAnime = await Promise.race([dropPromise, timeout]);
      
      if (droppedAnime) {
        const embed = new EmbedBuilder()
          .setTitle('💔 アニメ視聴を中断しました')
          .setColor('#FF9800')
          .setDescription('大丈夫です！時には見送ることも必要ですね。また機会があればチャレンジしてみてください。')
          .addFields(
            { name: 'ID', value: droppedAnime.id.toString(), inline: true },
            { name: 'タイトル', value: droppedAnime.title, inline: true },
            { name: 'ステータス変更', value: '📺 視聴中 → 💔 中断', inline: false }
          )
          .setFooter({ text: '新しいアニメを探してみましょう！' })
          .setTimestamp();
        
        if (droppedAnime.memo) {
          embed.addFields({ name: '備考', value: droppedAnime.memo, inline: false });
        }
        
        console.log('✅ 視聴中断完了');
        await interaction.editReply({ embeds: [embed], components: [] });
      } else {
        console.log('❌ 視聴中断失敗');
        await interaction.editReply({ 
          content: '❌ 指定されたアニメが見つからないか、既に処理済みです。', 
          components: [] 
        });
      }
    }
    
    // 📊 進捗表示
    else if (customId.startsWith('anime_progress_select')) {
      console.log('📊 進捗表示処理開始');
      
      const progressPromise = googleSheets.getAnimeById(selectedAnimeId);
      const animeInfo = await Promise.race([progressPromise, timeout]);
      
      if (animeInfo) {
        const percentage = Math.round((animeInfo.watched_episodes / animeInfo.total_episodes) * 100);
        const progressBar = getProgressBar(animeInfo.watched_episodes, animeInfo.total_episodes);
        
        const statusText = {
          'want_to_watch': '🍿 観たい',
          'watching': '📺 視聴中',
          'completed': '✅ 完走済み',
          'dropped': '💔 中断'
        };
        
        const embed = new EmbedBuilder()
          .setTitle('📊 アニメ視聴進捗')
          .setColor('#3F51B5')
          .setDescription(`📺 ${animeInfo.title}`)
          .addFields(
            { name: 'ID', value: animeInfo.id.toString(), inline: true },
            { name: 'ステータス', value: statusText[animeInfo.status] || animeInfo.status, inline: true },
            { name: 'ジャンル', value: getGenreText(animeInfo.genre), inline: true },
            { name: '進捗', value: `${animeInfo.watched_episodes} / ${animeInfo.total_episodes}話`, inline: true },
            { name: '進捗率', value: `${percentage}%`, inline: true },
            { name: '進捗バー', value: progressBar, inline: false }
          )
          .setTimestamp();
        
        // 日付情報がある場合のみ追加
        if (animeInfo.start_date && animeInfo.start_date.trim() !== '') {
          embed.addFields({ name: '視聴開始日', value: animeInfo.start_date, inline: true });
        }
        if (animeInfo.finish_date && animeInfo.finish_date.trim() !== '') {
          embed.addFields({ name: '完走日', value: animeInfo.finish_date, inline: true });
        }
        
        if (animeInfo.memo && animeInfo.memo.trim() !== '') {
          embed.addFields({ name: '備考', value: animeInfo.memo, inline: false });
        }
        
        // ステータスに応じたアクションヒント
        let actionHint = '';
        switch (animeInfo.status) {
          case 'want_to_watch':
            actionHint = '視聴開始: /anime start（選択式）';
            break;
          case 'watching':
            actionHint = '話数記録: /anime watch | 完走記録: /anime finish（選択式）';
            break;
          case 'completed':
            actionHint = '感想記録: /report anime（選択式）';
            break;
          case 'dropped':
            actionHint = '再チャレンジしたい場合は新しく追加してください';
            break;
        }
        
        if (actionHint) {
          embed.setFooter({ text: actionHint });
        }
        
        console.log('✅ 進捗表示完了');
        await interaction.editReply({ embeds: [embed], components: [] });
        
      } else {
        console.log('❌ アニメが見つからない');
        await interaction.editReply({ 
          content: '❌ 指定されたアニメの進捗情報が見つかりません。', 
          components: [] 
        });
      }
    }
    
    // 📄 詳細情報表示
    else if (customId.startsWith('anime_info_select')) {
      console.log('📄 詳細情報取得開始');
      
      const infoPromise = googleSheets.getAnimeById(selectedAnimeId);
      const animeInfo = await Promise.race([infoPromise, timeout]);
      
      console.log('📺 取得したアニメ情報:', animeInfo);
      
      if (animeInfo) {
        const statusText = {
          'want_to_watch': '🍿 観たい',
          'watching': '📺 視聴中',
          'completed': '✅ 完走済み',
          'dropped': '💔 中断'
        };
        
        const embed = new EmbedBuilder()
          .setTitle('📄 アニメの詳細情報')
          .setColor('#3F51B5')
          .setDescription(`📺 ${animeInfo.title}`)
          .addFields(
            { name: 'ID', value: animeInfo.id.toString(), inline: true },
            { name: 'ステータス', value: statusText[animeInfo.status] || animeInfo.status, inline: true },
            { name: 'ジャンル', value: getGenreText(animeInfo.genre), inline: true },
            { name: '総話数', value: `${animeInfo.total_episodes}話`, inline: true },
            { name: '視聴済み', value: `${animeInfo.watched_episodes}話`, inline: true },
            { name: '進捗率', value: `${Math.round((animeInfo.watched_episodes / animeInfo.total_episodes) * 100)}%`, inline: true }
          )
          .setTimestamp();
        
        // 日付情報がある場合のみ追加
        if (animeInfo.created_at && animeInfo.created_at.trim() !== '') {
          embed.addFields({ name: '登録日', value: animeInfo.created_at, inline: true });
        }
        if (animeInfo.start_date && animeInfo.start_date.trim() !== '') {
          embed.addFields({ name: '視聴開始日', value: animeInfo.start_date, inline: true });
        }
        if (animeInfo.finish_date && animeInfo.finish_date.trim() !== '') {
          embed.addFields({ name: '完走日', value: animeInfo.finish_date, inline: true });
        }
        
        if (animeInfo.memo && animeInfo.memo.trim() !== '') {
          embed.addFields({ name: '備考', value: animeInfo.memo, inline: false });
        }
        
        // ステータスに応じたアクションヒント
        let actionHint = '';
        switch (animeInfo.status) {
          case 'want_to_watch':
            actionHint = '視聴開始: /anime start（選択式）';
            break;
          case 'watching':
            actionHint = '話数記録: /anime watch | 完走記録: /anime finish（選択式）';
            break;
          case 'completed':
            actionHint = '感想記録: /report anime（選択式）';
            break;
          case 'dropped':
            actionHint = '再チャレンジしたい場合は新しく追加してください';
            break;
        }
        
        if (actionHint) {
          embed.setFooter({ text: actionHint });
        }
        
        console.log('✅ 詳細情報表示完了');
        await interaction.editReply({ embeds: [embed], components: [] });
        
      } else {
        console.log('❌ アニメが見つからない');
        await interaction.editReply({ 
          content: '❌ 指定されたアニメの詳細情報が見つかりません。', 
          components: [] 
        });
      }
    }
    
    // 📝 視聴ログ表示
    else if (customId.startsWith('anime_log_select')) {
      console.log('📝 視聴ログ取得開始');
      
      const logPromise = googleSheets.getAnimeEpisodeLogs(selectedAnimeId);
      const animeInfoPromise = googleSheets.getAnimeById(selectedAnimeId);
      
      const [logs, animeInfo] = await Promise.all([
        Promise.race([logPromise, timeout]),
        Promise.race([animeInfoPromise, timeout])
      ]);
      
      if (animeInfo) {
        const embed = new EmbedBuilder()
          .setTitle('📝 アニメ視聴ログ')
          .setColor('#795548')
          .setDescription(`📺 ${animeInfo.title}`)
          .addFields(
            { name: 'ID', value: animeInfo.id.toString(), inline: true },
            { name: '総話数', value: `${animeInfo.total_episodes}話`, inline: true },
            { name: '視聴済み', value: `${animeInfo.watched_episodes}話`, inline: true }
          )
          .setTimestamp();
        
        if (logs && logs.length > 0) {
          const logText = logs.slice(0, 10).map(log => {
            const ratingText = log.rating ? ` ⭐${log.rating}` : '';
            const notesText = log.notes ? ` - ${log.notes}` : '';
            return `第${log.episodeNumber}話 (${log.watchedDate})${ratingText}${notesText}`;
          }).join('\n');
          
          embed.addFields({
            name: `📝 視聴ログ (${logs.length}件)`,
            value: logText.slice(0, 1024),
            inline: false
          });
          
          if (logs.length > 10) {
            embed.addFields({ name: '📋 その他', value: `... 他${logs.length - 10}件のログ`, inline: false });
          }
        } else {
          embed.addFields({
            name: '📝 視聴ログ',
            value: 'まだ視聴ログがありません',
            inline: false
          });
        }
        
        embed.setFooter({ text: '話数を視聴すると自動的にログが記録されます' });
        
        console.log('✅ 視聴ログ表示完了');
        await interaction.editReply({ embeds: [embed], components: [] });
        
      } else {
        console.log('❌ アニメが見つからない');
        await interaction.editReply({ 
          content: '❌ 指定されたアニメの視聴ログが見つかりません。', 
          components: [] 
        });
      }
    }
    
    // 🔄 ページネーション処理
    else if (customId.includes('_page_')) {
      console.log('📄 ページネーション処理');
      
      const parts = customId.split('_');
      const action = parts[1]; // watch, start, finish, drop, progress, info, log
      const page = parseInt(parts[parts.length - 1]);
      
      console.log(`ページネーション: ${action}, ページ: ${page}`);
      
      // 各アクションに応じたデータを取得
      let animes = [];
      switch (action) {
        case 'watch':
        case 'finish':
        case 'drop':
          animes = await Promise.race([googleSheets.getAnimesByStatus('watching'), timeout]);
          break;
        case 'start':
          animes = await Promise.race([googleSheets.getAnimesByStatus('want_to_watch'), timeout]);
          break;
        case 'progress':
        case 'info':
        case 'log':
          animes = await Promise.race([googleSheets.getAllAnimes(), timeout]);
          break;
      }
      
      if (animes && animes.length > 0) {
        const animeHandler = require('./handlers/animeHandler');
        
        switch (action) {
          case 'watch':
            await animeHandler.handleWatchWithPagination(interaction, animes, page);
            break;
          case 'start':
            await animeHandler.handleStartWithPagination(interaction, animes, page);
            break;
          case 'finish':
            await animeHandler.handleFinishWithPagination(interaction, animes, page);
            break;
          case 'drop':
            await animeHandler.handleDropWithPagination(interaction, animes, page);
            break;
          case 'progress':
            await animeHandler.handleProgressWithPagination(interaction, animes, page);
            break;
          case 'info':
            await animeHandler.handleInfoWithPagination(interaction, animes, page);
            break;
          case 'log':
            await animeHandler.handleLogWithPagination(interaction, animes, page);
            break;
        }
      } else {
        await interaction.editReply({ 
          content: '❌ データの取得に失敗しました。', 
          components: [] 
        });
      }
    }
    
    // 🔄 その他の処理
    else {
      console.log('❓ 不明な選択処理:', customId);
      await interaction.editReply({ 
        content: '❌ 不明な操作です。', 
        components: [] 
      });
    }
    
  } catch (error) {
    console.error('❌ handleAnimeSelection エラー:', error);
    console.error('❌ エラーメッセージ:', error.message);
    console.error('❌ エラースタック:', error.stack);
    
    // エラーの種類に応じたメッセージ
    let errorMessage = '❌ アニメの選択処理中にエラーが発生しました。';
    
    if (error.message.includes('タイムアウト')) {
      errorMessage = '❌ 処理がタイムアウトしました。ネットワーク接続を確認してください。';
    } else if (error.message.includes('認証')) {
      errorMessage = '❌ データベース認証エラーです。管理者に連絡してください。';
    } else if (error.message.includes('権限')) {
      errorMessage = '❌ データベースアクセス権限がありません。管理者に連絡してください。';
    }
    
    try {
      await interaction.editReply({ 
        content: errorMessage + '\n\n🔧 詳細: ' + error.message, 
        components: [] 
      });
    } catch (replyError) {
      console.error('❌ エラー応答送信失敗:', replyError);
      
      // 最後の手段として、新しい応答を試行
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ 
            content: errorMessage, 
            ephemeral: true 
          });
        }
      } catch (finalError) {
        console.error('❌ 最終エラー応答も失敗:', finalError);
      }
    }
  }
}

/**
 * アニメのページネーション処理
 */
async function handleAnimePagination(interaction) {
  const customId = interaction.customId;
  
  if (customId.includes('anime_watch_')) {
    const page = parseInt(customId.split('_').pop());
    const watchingAnimes = await googleSheets.getAnimesByStatus('watching');
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const animeHandler = require('./handlers/animeHandler');
      await animeHandler.handleWatchWithPagination(interaction, watchingAnimes, page);
    }
  }
  
  else if (customId.includes('anime_start_')) {
    const page = parseInt(customId.split('_').pop());
    const wantToWatchAnimes = await googleSheets.getAnimesByStatus('want_to_watch');
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const animeHandler = require('./handlers/animeHandler');
      await animeHandler.handleStartWithPagination(interaction, wantToWatchAnimes, page);
    }
  }
  
  else if (customId.includes('anime_finish_')) {
    const page = parseInt(customId.split('_').pop());
    const watchingAnimes = await googleSheets.getAnimesByStatus('watching');
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const animeHandler = require('./handlers/animeHandler');
      await animeHandler.handleFinishWithPagination(interaction, watchingAnimes, page);
    }
  }
  
  else if (customId.includes('anime_drop_')) {
    const page = parseInt(customId.split('_').pop());
    const watchingAnimes = await googleSheets.getAnimesByStatus('watching');
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const animeHandler = require('./handlers/animeHandler');
      await animeHandler.handleDropWithPagination(interaction, watchingAnimes, page);
    }
  }
  
  else if (customId.includes('anime_progress_')) {
    const page = parseInt(customId.split('_').pop());
    const allAnimes = await googleSheets.getAllAnimes();
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const animeHandler = require('./handlers/animeHandler');
      await animeHandler.handleProgressWithPagination(interaction, allAnimes, page);
    }
  }
  
  else if (customId.includes('anime_info_')) {
    const page = parseInt(customId.split('_').pop());
    const allAnimes = await googleSheets.getAllAnimes();
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const animeHandler = require('./handlers/animeHandler');
      await animeHandler.handleInfoWithPagination(interaction, allAnimes, page);
    }
  }
  
  else if (customId.includes('anime_log_')) {
    const page = parseInt(customId.split('_').pop());
    const allAnimes = await googleSheets.getAllAnimes();
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const animeHandler = require('./handlers/animeHandler');
      await animeHandler.handleLogWithPagination(interaction, allAnimes, page);
    }
  }
}

// ヘルパー関数
function getProgressBar(watched, total) {
  if (total === 0) return '━━━━━━━━━━ 0%';
  
  const percentage = Math.round((watched / total) * 100);
  const filledBars = Math.round((watched / total) * 10);
  const emptyBars = 10 - filledBars;
  
  return '█'.repeat(filledBars) + '░'.repeat(emptyBars) + ` ${percentage}%`;
}

function getGenreText(genre) {
  const genres = {
    'action': 'アクション',
    'adventure': 'アドベンチャー',
    'comedy': 'コメディ',
    'drama': 'ドラマ',
    'fantasy': 'ファンタジー',
    'horror': 'ホラー',
    'mystery': 'ミステリー',
    'romance': 'ロマンス',
    'sci-fi': 'SF',
    'sports': 'スポーツ',
    'thriller': 'スリラー',
    'other': 'その他'
  };
  return genres[genre] || genre;
}

/**
 * 漫画の選択メニュー処理（修正版）
 */
async function handleMangaSelection(interaction) {
  try {
    const selectedMangaId = interaction.values[0];
    const customId = interaction.customId;
    
    console.log(`📚 漫画選択処理開始: ${customId}, ID: ${selectedMangaId}`);
    
    // GoogleSheetsサービスの状態確認
    if (!googleSheets || !googleSheets.auth) {
      console.error('❌ GoogleSheetsサービスが利用できません');
      await interaction.editReply({ 
        content: '❌ データベース接続に問題があります。しばらく待ってから再試行してください。', 
        components: [] 
      });
      return;
    }

    // タイムアウト設定（30秒）
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('処理がタイムアウトしました')), 30000)
    );

    // 📚 巻数/話数を読了
    if (customId.startsWith('manga_read_select')) {
      console.log('📚 巻数/話数読了処理開始');
      
      const readPromise = googleSheets.readNextManga(selectedMangaId);
      const readManga = await Promise.race([readPromise, timeout]);
      
      if (readManga) {
        const unit = readManga.format === 'volume' ? '巻' : '話';
        
        const embed = new EmbedBuilder()
          .setTitle('📚 巻数/話数読了記録！')
          .setColor('#2196F3')
          .setDescription('新しい巻数/話数を読了しました！📚✨')
          .addFields(
            { name: 'ID', value: readManga.id.toString(), inline: true },
            { name: 'タイトル', value: readManga.title, inline: true },
            { name: '作者', value: readManga.author, inline: true },
            { name: '進捗', value: `${readManga.read_count}${readManga.total_count ? `/${readManga.total_count}` : ''}${unit}`, inline: true }
          )
          .setTimestamp();

        if (readManga.memo) {
          embed.addFields({ name: '備考', value: readManga.memo, inline: false });
        }
        
        embed.setFooter({ text: '続きの巻数/話数も /manga read で記録できます' });
        
        console.log('✅ 巻数/話数読了完了');
        await interaction.editReply({ embeds: [embed], components: [] });
      } else {
        console.log('❌ 巻数/話数読了失敗');
        await interaction.editReply({ 
          content: '❌ 指定された漫画が見つからないか、既に処理済みです。', 
          components: [] 
        });
      }
    }
    
    // 🚀 読書開始
    else if (customId.startsWith('manga_start_select')) {
      console.log('🚀 読書開始処理開始');
      
      const startPromise = googleSheets.startReadingManga(selectedMangaId);
      const startedManga = await Promise.race([startPromise, timeout]);
      
      if (startedManga) {
        const unit = startedManga.format === 'volume' ? '巻' : '話';
        
        const embed = new EmbedBuilder()
          .setTitle('🚀 漫画読書開始！')
          .setColor('#FF9800')
          .setDescription('素晴らしい！新しい漫画の読書が始まりますね！📚✨')
          .addFields(
            { name: 'ID', value: startedManga.id.toString(), inline: true },
            { name: 'タイトル', value: startedManga.title, inline: true },
            { name: '作者', value: startedManga.author, inline: true },
            { name: '形式', value: getMangaTypeFormatText(startedManga.type, startedManga.format), inline: true },
            { name: 'ステータス変更', value: '📖 読みたい → 📚 読書中', inline: false }
          )
          .setFooter({ text: '巻数/話数を読了したら /manga read で記録しましょう！' })
          .setTimestamp();
        
        if (startedManga.total_count) {
          embed.addFields({ name: `総${unit}数`, value: `${startedManga.total_count}${unit}`, inline: true });
        }
        
        if (startedManga.memo) {
          embed.addFields({ name: '備考', value: startedManga.memo, inline: false });
        }
        
        console.log('✅ 読書開始完了');
        await interaction.editReply({ embeds: [embed], components: [] });
      } else {
        console.log('❌ 読書開始失敗');
        await interaction.editReply({ 
          content: '❌ 指定された漫画が見つからないか、既に読書開始済みです。', 
          components: [] 
        });
      }
    }
    
    // 🎉 読書完了
    else if (customId.startsWith('manga_finish_select')) {
      console.log('🎉 読書完了処理開始');
      
      const finishPromise = googleSheets.finishReadingManga(selectedMangaId);
      const finishedManga = await Promise.race([finishPromise, timeout]);
      
      if (finishedManga) {
        const unit = finishedManga.format === 'volume' ? '巻' : '話';
        
        const embed = new EmbedBuilder()
          .setTitle('🎉 漫画読了おめでとうございます！')
          .setColor('#FFD700')
          .setDescription('素晴らしい達成感ですね！また一つ素晴らしい作品を読了されました📚✨')
          .addFields(
            { name: 'ID', value: finishedManga.id.toString(), inline: true },
            { name: 'タイトル', value: finishedManga.title, inline: true },
            { name: '作者', value: finishedManga.author, inline: true },
            { name: 'ステータス変更', value: '📚 読書中 → ✅ 読了済み', inline: false }
          )
          .setFooter({ text: '感想を /report manga で記録してみませんか？' })
          .setTimestamp();
        
        if (finishedManga.total_count) {
          embed.addFields({ name: `総${unit}数`, value: `${finishedManga.total_count}${unit}`, inline: true });
        }
        
        if (finishedManga.memo) {
          embed.addFields({ name: '備考', value: finishedManga.memo, inline: false });
        }
        
        console.log('✅ 読書完了完了');
        await interaction.editReply({ embeds: [embed], components: [] });
      } else {
        console.log('❌ 読書完了失敗');
        await interaction.editReply({ 
          content: '❌ 指定された漫画が見つからないか、既に読了済みです。', 
          components: [] 
        });
      }
    }
    
    // 💔 読書中断
    else if (customId.startsWith('manga_drop_select')) {
      console.log('💔 読書中断処理開始');
      
      const dropPromise = googleSheets.dropManga(selectedMangaId);
      const droppedManga = await Promise.race([dropPromise, timeout]);
      
      if (droppedManga) {
        const embed = new EmbedBuilder()
          .setTitle('💔 漫画読書を中断しました')
          .setColor('#FF9800')
          .setDescription('大丈夫です！時には見送ることも必要ですね。また機会があればチャレンジしてみてください。')
          .addFields(
            { name: 'ID', value: droppedManga.id.toString(), inline: true },
            { name: 'タイトル', value: droppedManga.title, inline: true },
            { name: '作者', value: droppedManga.author, inline: true },
            { name: 'ステータス変更', value: '📚 読書中 → 💔 中断', inline: false }
          )
          .setFooter({ text: '新しい漫画を探してみましょう！' })
          .setTimestamp();
        
        if (droppedManga.memo) {
          embed.addFields({ name: '備考', value: droppedManga.memo, inline: false });
        }
        
        console.log('✅ 読書中断完了');
        await interaction.editReply({ embeds: [embed], components: [] });
      } else {
        console.log('❌ 読書中断失敗');
        await interaction.editReply({ 
          content: '❌ 指定された漫画が見つからないか、既に処理済みです。', 
          components: [] 
        });
      }
    }
    
    // 📊 進捗表示
    else if (customId.startsWith('manga_progress_select')) {
      console.log('📊 進捗表示処理開始');
      
      const progressPromise = googleSheets.getMangaById(selectedMangaId);
      const mangaInfo = await Promise.race([progressPromise, timeout]);
      
      if (mangaInfo) {
        const unit = mangaInfo.format === 'volume' ? '巻' : '話';
        const percentage = mangaInfo.total_count && mangaInfo.total_count > 0 
          ? Math.round((mangaInfo.read_count / mangaInfo.total_count) * 100) 
          : null;
        const progressBar = getMangaProgressBar(mangaInfo.read_count, mangaInfo.total_count);
        
        const statusText = {
          'want_to_read': '📖 読みたい',
          'reading': '📚 読書中',
          'finished': '✅ 読了済み',
          'dropped': '💔 中断'
        };
        
        const embed = new EmbedBuilder()
          .setTitle('📊 漫画読書進捗')
          .setColor('#3F51B5')
          .setDescription(`📚 ${mangaInfo.title}`)
          .addFields(
            { name: 'ID', value: mangaInfo.id.toString(), inline: true },
            { name: '作者', value: mangaInfo.author, inline: true },
            { name: 'ステータス', value: statusText[mangaInfo.reading_status] || mangaInfo.reading_status, inline: true },
            { name: '形式', value: getMangaTypeFormatText(mangaInfo.type, mangaInfo.format), inline: true },
            { name: '作品状態', value: mangaInfo.current_status === 'completed' ? '完結済み' : '連載中/未完結', inline: true },
            { name: '進捗', value: `${mangaInfo.read_count}${mangaInfo.total_count ? `/${mangaInfo.total_count}` : ''}${unit}`, inline: true }
          )
          .setTimestamp();
        
        if (percentage !== null) {
          embed.addFields(
            { name: '進捗率', value: `${percentage}%`, inline: true },
            { name: '進捗バー', value: progressBar, inline: false }
          );
        } else {
          embed.addFields({ name: '進捗バー', value: progressBar, inline: false });
        }
        
        // 日付情報がある場合のみ追加
        if (mangaInfo.start_date && mangaInfo.start_date.trim() !== '') {
          embed.addFields({ name: '読書開始日', value: mangaInfo.start_date, inline: true });
        }
        if (mangaInfo.finish_date && mangaInfo.finish_date.trim() !== '') {
          embed.addFields({ name: '読了完了日', value: mangaInfo.finish_date, inline: true });
        }
        
        if (mangaInfo.memo && mangaInfo.memo.trim() !== '') {
          embed.addFields({ name: '備考', value: mangaInfo.memo, inline: false });
        }
        
        // ステータスに応じたアクションヒント
        let actionHint = '';
        switch (mangaInfo.reading_status) {
          case 'want_to_read':
            actionHint = '読書開始: /manga start（選択式）';
            break;
          case 'reading':
            actionHint = `${unit}記録: /manga read | 読了記録: /manga finish（選択式）`;
            break;
          case 'finished':
            actionHint = '感想記録: /report manga（選択式）';
            break;
          case 'dropped':
            actionHint = '再チャレンジしたい場合は新しく追加してください';
            break;
        }
        
        if (actionHint) {
          embed.setFooter({ text: actionHint });
        }
        
        console.log('✅ 進捗表示完了');
        await interaction.editReply({ embeds: [embed], components: [] });
        
      } else {
        console.log('❌ 漫画が見つからない');
        await interaction.editReply({ 
          content: '❌ 指定された漫画の進捗情報が見つかりません。', 
          components: [] 
        });
      }
    }
    
    // 📄 詳細情報表示
    else if (customId.startsWith('manga_info_select')) {
      console.log('📄 詳細情報取得開始');
      
      const infoPromise = googleSheets.getMangaById(selectedMangaId);
      const mangaInfo = await Promise.race([infoPromise, timeout]);
      
      console.log('📚 取得した漫画情報:', mangaInfo);
      
      if (mangaInfo) {
        const unit = mangaInfo.format === 'volume' ? '巻' : '話';
        const statusText = {
          'want_to_read': '📖 読みたい',
          'reading': '📚 読書中',
          'finished': '✅ 読了済み',
          'dropped': '💔 中断'
        };
        
        const embed = new EmbedBuilder()
          .setTitle('📄 漫画の詳細情報')
          .setColor('#3F51B5')
          .setDescription(`📚 ${mangaInfo.title}`)
          .addFields(
            { name: 'ID', value: mangaInfo.id.toString(), inline: true },
            { name: '作者', value: mangaInfo.author, inline: true },
            { name: 'ステータス', value: statusText[mangaInfo.reading_status] || mangaInfo.reading_status, inline: true },
            { name: '形式', value: getMangaTypeFormatText(mangaInfo.type, mangaInfo.format), inline: true },
            { name: '作品状態', value: mangaInfo.current_status === 'completed' ? '完結済み' : '連載中/未完結', inline: true },
            { name: '読了数', value: `${mangaInfo.read_count}${unit}`, inline: true }
          )
          .setTimestamp();
        
        if (mangaInfo.total_count) {
          embed.addFields({ 
            name: `総${unit}数`, 
            value: `${mangaInfo.total_count}${unit}`, 
            inline: true 
          });
        }
        
        // 日付情報がある場合のみ追加
        if (mangaInfo.created_at && mangaInfo.created_at.trim() !== '') {
          embed.addFields({ name: '登録日', value: mangaInfo.created_at, inline: true });
        }
        if (mangaInfo.start_date && mangaInfo.start_date.trim() !== '') {
          embed.addFields({ name: '読書開始日', value: mangaInfo.start_date, inline: true });
        }
        if (mangaInfo.finish_date && mangaInfo.finish_date.trim() !== '') {
          embed.addFields({ name: '読了完了日', value: mangaInfo.finish_date, inline: true });
        }
        
        if (mangaInfo.series_url && mangaInfo.series_url.trim() !== '') {
          embed.addFields({ name: '公式URL', value: mangaInfo.series_url, inline: false });
        }
        
        if (mangaInfo.memo && mangaInfo.memo.trim() !== '') {
          embed.addFields({ name: '備考', value: mangaInfo.memo, inline: false });
        }
        
        // ステータスに応じたアクションヒント
        let actionHint = '';
        switch (mangaInfo.reading_status) {
          case 'want_to_read':
            actionHint = '読書開始: /manga start（選択式）';
            break;
          case 'reading':
            actionHint = `${unit}記録: /manga read | 読了記録: /manga finish（選択式）`;
            break;
          case 'finished':
            actionHint = '感想記録: /report manga（選択式）';
            break;
          case 'dropped':
            actionHint = '再チャレンジしたい場合は新しく追加してください';
            break;
        }
        
        if (actionHint) {
          embed.setFooter({ text: actionHint });
        }
        
        console.log('✅ 詳細情報表示完了');
        await interaction.editReply({ embeds: [embed], components: [] });
        
      } else {
        console.log('❌ 漫画が見つからない');
        await interaction.editReply({ 
          content: '❌ 指定された漫画の詳細情報が見つかりません。', 
          components: [] 
        });
      }
    }
    
    // 🔄 ページネーション処理
    else if (customId.includes('_page_')) {
      console.log('📄 ページネーション処理');
      
      const parts = customId.split('_');
      const action = parts[1]; // read, start, finish, drop, progress, info
      const page = parseInt(parts[parts.length - 1]);
      
      console.log(`ページネーション: ${action}, ページ: ${page}`);
      
      // 各アクションに応じたデータを取得
      let mangas = [];
      switch (action) {
        case 'read':
        case 'finish':
        case 'drop':
          mangas = await Promise.race([googleSheets.getMangasByStatus('reading'), timeout]);
          break;
        case 'start':
          mangas = await Promise.race([googleSheets.getMangasByStatus('want_to_read'), timeout]);
          break;
        case 'progress':
        case 'info':
          mangas = await Promise.race([googleSheets.getAllMangas(), timeout]);
          break;
      }
      
      if (mangas && mangas.length > 0) {
        const mangaHandler = require('./handlers/mangaHandler');
        
        switch (action) {
          case 'read':
            await mangaHandler.handleReadWithPagination(interaction, mangas, page);
            break;
          case 'start':
            await mangaHandler.handleStartWithPagination(interaction, mangas, page);
            break;
          case 'finish':
            await mangaHandler.handleFinishWithPagination(interaction, mangas, page);
            break;
          case 'drop':
            await mangaHandler.handleDropWithPagination(interaction, mangas, page);
            break;
          case 'progress':
            await mangaHandler.handleProgressWithPagination(interaction, mangas, page);
            break;
          case 'info':
            await mangaHandler.handleInfoWithPagination(interaction, mangas, page);
            break;
        }
      } else {
        await interaction.editReply({ 
          content: '❌ データの取得に失敗しました。', 
          components: [] 
        });
      }
    }
    
    // 🔄 その他の処理
    else {
      console.log('❓ 不明な選択処理:', customId);
      await interaction.editReply({ 
        content: '❌ 不明な操作です。', 
        components: [] 
      });
    }
    
  } catch (error) {
    console.error('❌ handleMangaSelection エラー:', error);
    console.error('❌ エラーメッセージ:', error.message);
    console.error('❌ エラースタック:', error.stack);
    
    // エラーの種類に応じたメッセージ
    let errorMessage = '❌ 漫画の選択処理中にエラーが発生しました。';
    
    if (error.message.includes('タイムアウト')) {
      errorMessage = '❌ 処理がタイムアウトしました。ネットワーク接続を確認してください。';
    } else if (error.message.includes('認証')) {
      errorMessage = '❌ データベース認証エラーです。管理者に連絡してください。';
    } else if (error.message.includes('権限')) {
      errorMessage = '❌ データベースアクセス権限がありません。管理者に連絡してください。';
    }
    
    try {
      await interaction.editReply({ 
        content: errorMessage + '\n\n🔧 詳細: ' + error.message, 
        components: [] 
      });
    } catch (replyError) {
      console.error('❌ エラー応答送信失敗:', replyError);
      
      // 最後の手段として、新しい応答を試行
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ 
            content: errorMessage, 
            ephemeral: true 
          });
        }
      } catch (finalError) {
        console.error('❌ 最終エラー応答も失敗:', finalError);
      }
    }
  }
}

/**
 * 漫画のページネーション処理（修正版）
 */
async function handleMangaPagination(interaction) {
  const customId = interaction.customId;
  
  try {
    if (customId.includes('manga_read_')) {
      const page = parseInt(customId.split('_').pop());
      const readingMangas = await googleSheets.getMangasByStatus('reading');
      
      if (customId.includes('_prev_') || customId.includes('_next_')) {
        const mangaHandler = require('./handlers/mangaHandler');
        await mangaHandler.handleReadWithPagination(interaction, readingMangas, page);
      }
    }
    
    else if (customId.includes('manga_start_')) {
      const page = parseInt(customId.split('_').pop());
      const wantToReadMangas = await googleSheets.getMangasByStatus('want_to_read');
      
      if (customId.includes('_prev_') || customId.includes('_next_')) {
        const mangaHandler = require('./handlers/mangaHandler');
        await mangaHandler.handleStartWithPagination(interaction, wantToReadMangas, page);
      }
    }
    
    else if (customId.includes('manga_finish_')) {
      const page = parseInt(customId.split('_').pop());
      const readingMangas = await googleSheets.getMangasByStatus('reading');
      
      if (customId.includes('_prev_') || customId.includes('_next_')) {
        const mangaHandler = require('./handlers/mangaHandler');
        await mangaHandler.handleFinishWithPagination(interaction, readingMangas, page);
      }
    }
    
    else if (customId.includes('manga_drop_')) {
      const page = parseInt(customId.split('_').pop());
      const readingMangas = await googleSheets.getMangasByStatus('reading');
      
      if (customId.includes('_prev_') || customId.includes('_next_')) {
        const mangaHandler = require('./handlers/mangaHandler');
        await mangaHandler.handleDropWithPagination(interaction, readingMangas, page);
      }
    }
    
    else if (customId.includes('manga_progress_')) {
      const page = parseInt(customId.split('_').pop());
      const allMangas = await googleSheets.getAllMangas();
      
      if (customId.includes('_prev_') || customId.includes('_next_')) {
        const mangaHandler = require('./handlers/mangaHandler');
        await mangaHandler.handleProgressWithPagination(interaction, allMangas, page);
      }
    }
    
    else if (customId.includes('manga_info_')) {
      const page = parseInt(customId.split('_').pop());
      const allMangas = await googleSheets.getAllMangas();
      
      if (customId.includes('_prev_') || customId.includes('_next_')) {
        const mangaHandler = require('./handlers/mangaHandler');
        await mangaHandler.handleInfoWithPagination(interaction, allMangas, page);
      }
    }
  } catch (error) {
    console.error('❌ handleMangaPagination エラー:', error);
    await interaction.editReply({ 
      content: '❌ ページネーション処理中にエラーが発生しました。', 
      components: [] 
    });
  }
}

// ヘルパー関数
function getMangaTypeFormatText(type, format) {
  const typeText = type === 'series' ? 'シリーズ' : '読切';
  const formatText = format === 'volume' ? '単行本' : '話数';
  return `${typeText}・${formatText}`;
}

function getMangaProgressBar(readCount, totalCount) {
  if (!totalCount || totalCount === 0) {
    return `🔄 ${readCount}巻/話 読了中`;
  }
  
  const percentage = Math.round((readCount / totalCount) * 100);
  const filledBars = Math.round((readCount / totalCount) * 10);
  const emptyBars = 10 - filledBars;
  
  return '█'.repeat(filledBars) + '░'.repeat(emptyBars) + ` ${percentage}%`;
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

// 🆕 活動の選択メニュー処理
async function handleActivitySelection(interaction) {
  const selectedActivityId = interaction.values[0];
  const customId = interaction.customId;
  
  console.log(`🎯 活動選択処理: ${customId}, ID: ${selectedActivityId}`);
  
  if (customId.startsWith('activity_done_select')) {
    // 活動を完了に変更
    const doneActivity = await googleSheets.doneActivity(selectedActivityId);
    
    if (doneActivity) {
      const congratsMessages = [
        '継続は力なり！次の活動も頑張りましょう！',
        'お疲れ様でした！着実に前進していますね！',
        '素晴らしい成果です！この調子で行きましょう！',
        '目標達成おめでとうございます！次はどんな挑戦をしますか？',
        '努力が実を結びましたね！次のステップも楽しみです！'
      ];
      
      const randomMessage = congratsMessages[Math.floor(Math.random() * congratsMessages.length)];
      
      const embed = new EmbedBuilder()
        .setTitle('🎉 活動完了！')
        .setColor('#4CAF50')
        .setDescription(randomMessage + ' 🎉✨')
        .addFields(
          { name: 'ID', value: doneActivity.id.toString(), inline: true },
          { name: '活動内容', value: doneActivity.content, inline: true },
          { name: 'ステータス変更', value: '🎯 予定 → ✅ 完了', inline: true }
        )
        .setFooter({ text: '感想を /report で記録してみませんか？（選択式）' })
        .setTimestamp();
      
      if (doneActivity.memo) {
        embed.addFields({ name: '備考', value: doneActivity.memo, inline: false });
      }
      
      await interaction.editReply({ embeds: [embed], components: [] });
    } else {
      await interaction.editReply({ 
        content: '❌ 指定された活動が見つからないか、既に完了済みです。', 
        components: [] 
      });
    }
  }
  
  else if (customId.startsWith('activity_skip_select')) {
    // 活動をスキップ
    const skippedActivity = await googleSheets.skipActivity(selectedActivityId);
    
    if (skippedActivity) {
      const embed = new EmbedBuilder()
        .setTitle('😅 活動をスキップしました')
        .setColor('#FF9800')
        .setDescription('大丈夫です！時には見送ることも必要ですね。また機会があればチャレンジしてみてください！')
        .addFields(
          { name: 'ID', value: skippedActivity.id.toString(), inline: true },
          { name: '活動内容', value: skippedActivity.content, inline: true },
          { name: 'ステータス変更', value: '🎯 予定 → 😅 スキップ', inline: true }
        )
        .setFooter({ text: '新しい活動を追加して再チャレンジしてみましょう！' })
        .setTimestamp();
      
      if (skippedActivity.memo) {
        embed.addFields({ name: '備考', value: skippedActivity.memo, inline: false });
      }
      
      await interaction.editReply({ embeds: [embed], components: [] });
    } else {
      await interaction.editReply({ 
        content: '❌ 指定された活動が見つからないか、既に処理済みです。', 
        components: [] 
      });
    }
  }
  
  else if (customId.startsWith('activity_info_select')) {
    // 活動の詳細情報を表示
    const activityInfo = await googleSheets.getActivityById(selectedActivityId);
    
    if (activityInfo) {
      const statusText = {
        'planned': '🎯 予定中',
        'done': '✅ 完了',
        'skipped': '😅 スキップ'
      };
      
      const embed = new EmbedBuilder()
        .setTitle('📄 活動の詳細情報')
        .setColor('#3F51B5')
        .setDescription(`🎯 ${activityInfo.content}`)
        .addFields(
          { name: 'ID', value: activityInfo.id.toString(), inline: true },
          { name: 'ステータス', value: statusText[activityInfo.status] || activityInfo.status, inline: true },
          { name: '登録日', value: activityInfo.created_at, inline: true },
          { name: '更新日', value: activityInfo.updated_at, inline: true }
        )
        .setTimestamp();
      
      if (activityInfo.memo) {
        embed.addFields({ name: '備考', value: activityInfo.memo, inline: false });
      }
      
      // ステータスに応じたアクションヒント
      let actionHint = '';
      switch (activityInfo.status) {
        case 'planned':
          actionHint = '完了記録: /activity done（選択式） | スキップ: /activity skip（選択式）';
          break;
        case 'done':
          actionHint = '振り返り記録: /report（選択式）';
          break;
        case 'skipped':
          actionHint = '再チャレンジしたい場合は新しく追加してください';
          break;
      }
      
      if (actionHint) {
        embed.setFooter({ text: actionHint });
      }
      
      await interaction.editReply({ embeds: [embed], components: [] });
    } else {
      await interaction.editReply({ 
        content: '❌ 指定された活動の詳細情報が見つかりません。', 
        components: [] 
      });
    }
  }
}

// 🆕 レポートの選択メニュー処理
async function handleReportSelection(interaction) {
  const customId = interaction.customId;
  
  console.log(`📝 レポート選択処理: ${customId}`);
  
  if (customId === 'report_category_select') {
    // カテゴリが選択された
    const selectedCategory = interaction.values[0];
    const reportHandler = require('./handlers/reportHandler');
    await reportHandler.showItemSelection(interaction, selectedCategory);
  }
  
  else if (customId.startsWith('report_item_select_')) {
    // アイテムが選択された
    const parts = customId.split('_');
    const category = parts[3]; // report_item_select_book → book
    const selectedItemId = interaction.values[0];
    
    // レポート入力画面を表示
    const reportHandler = require('./handlers/reportHandler');
    await reportHandler.showReportInput(interaction, category, selectedItemId);
  }
}

// 🆕 レポート履歴の選択メニュー処理
async function handleReportsSelection(interaction) {
  const customId = interaction.customId;
  
  console.log(`📋 レポート履歴選択処理: ${customId}`);
  
  if (customId === 'reports_history_category_select') {
    // カテゴリが選択された
    const selectedCategory = interaction.values[0];
    const reportsHandler = require('./handlers/reportsHandler');
    await reportsHandler.showHistoryItemSelection(interaction, selectedCategory);
  }
  
  else if (customId.startsWith('reports_history_item_select_')) {
    // アイテムが選択された
    const parts = customId.split('_');
    const category = parts[4]; // reports_history_item_select_book → book
    const selectedItemId = interaction.values[0];
    
    // 履歴を表示
    const reportsHandler = require('./handlers/reportsHandler');
    await reportsHandler.showItemHistory(interaction, category, selectedItemId);
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

// 🆕 活動のページネーション処理
async function handleActivityPagination(interaction) {
  const customId = interaction.customId;
  
  if (customId.includes('activity_done_')) {
    const page = parseInt(customId.split('_').pop());
    const plannedActivities = await googleSheets.getActivitiesByStatus('planned');
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const activityHandler = require('./handlers/activityHandler');
      await activityHandler.handleDoneWithPagination(interaction, plannedActivities, page);
    }
  }
  
  else if (customId.includes('activity_skip_')) {
    const page = parseInt(customId.split('_').pop());
    const plannedActivities = await googleSheets.getActivitiesByStatus('planned');
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const activityHandler = require('./handlers/activityHandler');
      await activityHandler.handleSkipWithPagination(interaction, plannedActivities, page);
    }
  }
  
  else if (customId.includes('activity_info_')) {
    const page = parseInt(customId.split('_').pop());
    const allActivities = await googleSheets.getAllActivities();
    
    if (customId.includes('_prev_') || customId.includes('_next_')) {
      const activityHandler = require('./handlers/activityHandler');
      await activityHandler.handleInfoWithPagination(interaction, allActivities, page);
    }
  }
}

// 🆕 レポート・レポート履歴のページネーション処理
async function handleReportPagination(interaction) {
  const customId = interaction.customId;
  
  // reportハンドラーのページネーション
  if (customId.startsWith('report_') && (customId.includes('_prev_') || customId.includes('_next_'))) {
    const parts = customId.split('_');
    const category = parts[1]; // report_book_prev_1 → book
    const page = parseInt(parts.pop());
    
    let items = [];
    switch (category) {
      case 'book':
        items = await googleSheets.getAllBooks();
        break;
      case 'movie':
        items = await googleSheets.getAllMovies();
        break;
      case 'activity':
        items = await googleSheets.getAllActivities();
        break;
    }
    
    const reportHandler = require('./handlers/reportHandler');
    await reportHandler.showItemSelectionWithPagination(interaction, category, items, page);
  }
  
  // reportsハンドラーのページネーション
  else if (customId.startsWith('reports_history_') && (customId.includes('_prev_') || customId.includes('_next_'))) {
    const parts = customId.split('_');
    const category = parts[2]; // reports_history_book_prev_1 → book
    const page = parseInt(parts.pop());
    
    let items = [];
    switch (category) {
      case 'book':
        items = await googleSheets.getAllBooks();
        break;
      case 'movie':
        items = await googleSheets.getAllMovies();
        break;
      case 'activity':
        items = await googleSheets.getAllActivities();
        break;
    }
    
    const reportsHandler = require('./handlers/reportsHandler');
    await reportsHandler.showHistoryItemSelectionWithPagination(interaction, category, items, page);
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

  if (mangaNotificationScheduler) {
    mangaNotificationScheduler.stop();
    console.log('🔔 漫画通知スケジューラーを停止しました');
  }
  
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
