// deploy-commands.js
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// コマンドデータを収集
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ コマンド収集: ${command.data.name}`);
  } else {
    console.log(`⚠️ ${filePath} - 必要なプロパティが不足しています`);
  }
}

// Discord APIクライアントの初期化
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// コマンドのデプロイ
(async () => {
  try {
    console.log(`🚀 ${commands.length}個のアプリケーションコマンドをデプロイ開始...`);

    // ギルド固有のコマンドとしてデプロイ（テスト用）
    if (process.env.GUILD_ID) {
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );
      console.log(`✅ ${data.length}個のギルドコマンドをデプロイしました (Guild ID: ${process.env.GUILD_ID})`);
    } else {
      // グローバルコマンドとしてデプロイ（本番用）
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      console.log(`✅ ${data.length}個のグローバルコマンドをデプロイしました`);
    }

    console.log('🎉 コマンドデプロイ完了！');
    
    // デプロイされたコマンドの詳細を表示
    commands.forEach(cmd => {
      console.log(`📋 ${cmd.name}: ${cmd.description}`);
      if (cmd.options && cmd.options.length > 0) {
        cmd.options.forEach(option => {
          console.log(`   └─ ${option.name} (${option.type}): ${option.description}`);
        });
      }
    });

  } catch (error) {
    console.error('❌ コマンドデプロイエラー:', error);
  }
})();
