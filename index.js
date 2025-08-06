require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
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
  
  if (!interaction.isChatInputCommand()) {
    console.log('❌ チャットコマンドではありません');
    return;
  }

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
});

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
