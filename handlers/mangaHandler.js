// handlers/mangaHandler.js - 漫画管理ハンドラー

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GoogleSheetsService = require('../services/googleSheets');

const googleSheets = new GoogleSheetsService();

module.exports = {
  async execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  try {
    switch (subcommand) {
      case 'add':
        await this.handleAdd(interaction);
        break;
      case 'read':
        await this.handleRead(interaction);
        break;
      case 'start':
        await this.handleStart(interaction);
        break;
      case 'finish':
        await this.handleFinish(interaction);
        break;
      case 'drop':
        await this.handleDrop(interaction);
        break;
      case 'list':
        await this.handleList(interaction);
        break;
      case 'reading':
        await this.handleReading(interaction);
        break;
      case 'completed':
        await this.handleCompleted(interaction);
        break;
      case 'progress':
        await this.handleProgress(interaction);
        break;
      case 'info':
        await this.handleInfo(interaction);
        break;
      // 🆕 連載スケジュール関連のサブコマンドを追加
      case 'schedule':
        await this.handleSchedule(interaction);
        break;
      case 'notifications':
        await this.handleNotifications(interaction);
        break;
      default:
        await interaction.editReply(`❌ 不明なサブコマンド: ${subcommand}`);
    }
  } catch (error) {
    console.error('MangaHandler エラー:', error);
    await interaction.editReply('❌ 処理中にエラーが発生しました。');
  }
},

  async handleAdd(interaction) {
  const title = interaction.options.getString('title');
  const author = interaction.options.getString('author');
  const type = interaction.options.getString('type') || 'series';
  const format = interaction.options.getString('format') || 'volume';
  const totalCount = interaction.options.getInteger('total_count') || null;
  const currentStatus = interaction.options.getString('status') || 'ongoing';
  const memo = interaction.options.getString('memo') || '';
  
  // 🆕 連載スケジュール関連のオプションを追加
  const updateSchedule = interaction.options.getString('update_schedule') || '';
  const seriesUrl = interaction.options.getString('series_url') || '';
  
  try {
    console.log('📚 漫画追加開始:', { title, author, type, format, updateSchedule, seriesUrl });
    
    const mangaId = await googleSheets.addManga(
      title, author, type, format, totalCount, currentStatus, memo, 
      'want_to_read', updateSchedule, seriesUrl
    );
    
    // 🆕 スケジュール通知を設定（読書中になったら有効化）
    let notificationSetup = false;
    if (updateSchedule && updateSchedule !== 'completed' && updateSchedule !== 'irregular') {
      try {
        notificationSetup = await this.setupUpdateNotification(mangaId, title, updateSchedule);
      } catch (error) {
        console.error('通知設定エラー:', error);
        // 通知設定に失敗しても漫画追加は成功とする
      }
    }
    
    const typeText = type === 'series' ? 'シリーズもの' : '読切';
    const formatText = format === 'volume' ? '単行本' : '話数';
    const statusText = currentStatus === 'completed' ? '完結済み' : '連載中/未完結';
    
    const embed = new EmbedBuilder()
      .setTitle('📚 漫画を追加しました！')
      .setColor('#4CAF50')
      .setDescription('📚 漫画リストに新しい作品が追加されました！')
      .addFields(
        { name: 'ID', value: mangaId.toString(), inline: true },
        { name: 'タイトル', value: title, inline: true },
        { name: '作者', value: author, inline: true },
        { name: '作品タイプ', value: typeText, inline: true },
        { name: '形式', value: formatText, inline: true },
        { name: '作品ステータス', value: statusText, inline: true },
        { name: '読書ステータス', value: '📖 読みたい', inline: true },
        { name: '進捗', value: this.getProgressText(0, totalCount, format), inline: true }
      )
      .setTimestamp();
    
    if (totalCount) {
      embed.addFields({ name: `総${formatText}数`, value: `${totalCount}${format === 'volume' ? '巻' : '話'}`, inline: true });
    }
    
    // 🆕 更新スケジュール情報を表示
    if (updateSchedule) {
      const scheduleText = this.formatUpdateSchedule(updateSchedule);
      embed.addFields({ name: '📅 更新スケジュール', value: scheduleText, inline: true });
    }
    
    // 🆕 公式URLを表示
    if (seriesUrl) {
      embed.addFields({ name: '🔗 公式サイト', value: seriesUrl, inline: false });
    }
    
    if (memo) {
      embed.addFields({ name: '備考', value: memo, inline: false });
    }
    
    // 🆕 通知設定の結果を表示
    if (updateSchedule && updateSchedule !== 'completed' && updateSchedule !== 'irregular') {
      if (notificationSetup) {
        embed.addFields({ 
          name: '📅 通知設定', 
          value: '✅ 更新通知が設定されました（読書開始時に有効化）', 
          inline: false 
        });
      } else {
        embed.addFields({ 
          name: '📅 通知設定', 
          value: '⚠️ 通知設定に失敗しましたが、後で手動設定可能です', 
          inline: false 
        });
      }
      
      embed.addFields({ 
        name: '💡 通知について', 
        value: '通知は読書を開始した漫画のみに送信されます。`/manga start` で読書を開始してください。', 
        inline: false 
      });
    }
    
    embed.setFooter({ text: '読書開始は /manga start で記録できます（選択式）' });
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('漫画追加エラー:', error);
    await interaction.editReply('❌ 漫画の追加中にエラーが発生しました。');
  }
},

  // 🆕 選択式 - 読書中漫画から巻数/話数を選択
  async handleRead(interaction) {
    try {
      const readingMangas = await googleSheets.getMangasByStatus('reading');
      
      if (readingMangas.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📚 巻数/話数読了記録')
          .setColor('#FF5722')
          .setDescription('現在読書中の漫画がありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/manga start` で読書を開始してから巻数/話数を記録してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (readingMangas.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('manga_read_select')
          .setPlaceholder('読了した漫画を選択してください')
          .addOptions(
            readingMangas.map(manga => ({
              label: `${manga.title}`.slice(0, 100),
              description: `${this.getProgressText(manga.read_count, manga.total_count, manga.format)} ${this.getProgressBar(manga.read_count, manga.total_count)}`.slice(0, 100),
              value: manga.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('📚 巻数/話数読了記録')
          .setColor('#2196F3')
          .setDescription(`読書中の漫画が ${readingMangas.length} 本あります。次の巻数/話数を読了した漫画を選択してください。`)
          .addFields(
            { 
              name: '📖 読書中の漫画', 
              value: readingMangas.map(manga => 
                `📖 ${manga.title} (${this.getProgressText(manga.read_count, manga.total_count, manga.format)})`
              ).join('\n').slice(0, 1024), 
              inline: false 
            }
          );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleReadWithPagination(interaction, readingMangas);
      }
    } catch (error) {
      console.error('漫画読了選択エラー:', error);
      await interaction.editReply('❌ 漫画読了選択中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 読みたい漫画から読書開始選択
  async handleStart(interaction) {
    try {
      const wantToReadMangas = await googleSheets.getMangasByStatus('want_to_read');
      
      if (wantToReadMangas.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🚀 漫画読書開始')
          .setColor('#FF5722')
          .setDescription('読みたい漫画がありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/manga add [タイトル] [作者]` で読みたい漫画を追加してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (wantToReadMangas.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('manga_start_select')
          .setPlaceholder('読書を開始する漫画を選択してください')
          .addOptions(
            wantToReadMangas.map(manga => ({
              label: `${manga.title}`.slice(0, 100),
              description: `${manga.author} | ${this.getTypeFormatText(manga.type, manga.format)} | ${this.getCurrentStatusText(manga.current_status)}`.slice(0, 100),
              value: manga.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('🚀 漫画読書開始')
          .setColor('#2196F3')
          .setDescription(`読みたい漫画が ${wantToReadMangas.length} 本あります。読書を開始する漫画を選択してください。`)
          .addFields(
            { 
              name: '📖 読みたい漫画', 
              value: wantToReadMangas.map(manga => 
                `📖 ${manga.title} - ${manga.author}`
              ).join('\n').slice(0, 1024), 
              inline: false 
            }
          );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleStartWithPagination(interaction, wantToReadMangas);
      }
    } catch (error) {
      console.error('漫画読書開始選択エラー:', error);
      await interaction.editReply('❌ 漫画読書開始選択中にエラーが発生しました。');
    }
  },

  // 🆕 新規追加: 読書開始時の通知有効化処理
  async activateNotificationForManga(mangaId) {
    try {
      console.log(`🔔 通知有効化開始: 漫画ID ${mangaId}`);
      
      // notification_schedulesから該当の漫画通知を検索
      const notificationData = await googleSheets.getData('notification_schedules!A:I');
      if (!notificationData || notificationData.length <= 1) {
        console.log('通知設定が見つかりません');
        return false;
      }
      
      // 該当漫画の通知レコードを検索
      let targetRowIndex = -1;
      let targetNotification = null;
      
      for (let i = 1; i < notificationData.length; i++) {
        const row = notificationData[i];
        const type = row[1]; // B列: Type
        const relatedId = row[2]; // C列: Related_ID
        const status = row[5]; // F列: Status
        
        if (type === 'manga_update' && parseInt(relatedId) === parseInt(mangaId)) {
          targetRowIndex = i + 1; // Google Sheetsの行番号（1ベース + ヘッダー）
          targetNotification = {
            id: row[0],
            title: row[3],
            scheduleData: JSON.parse(row[4] || '{}'),
            currentStatus: status
          };
          break;
        }
      }
      
      if (targetRowIndex === -1) {
        console.log(`漫画ID ${mangaId} の通知設定が見つかりません`);
        return false;
      }
      
      if (targetNotification.currentStatus === 'active') {
        console.log('通知は既に有効化されています');
        return true;
      }
      
      // statusをinactiveからactiveに変更
      const now = new Date().toISOString();
      const nextNotification = this.calculateNextNotification(targetNotification.scheduleData);
      
      // F列(Status)、H列(Updated_At)、I列(Next_Notification)を更新
      const updateRange = `notification_schedules!F${targetRowIndex}:I${targetRowIndex}`;
      const updateValues = ['active', now, nextNotification];
      
      const success = await googleSheets.updateData(updateRange, updateValues);
      
      if (success) {
        console.log(`✅ 通知有効化完了: ${targetNotification.title}`);
        console.log(`📅 次回通知予定: ${nextNotification}`);
        return true;
      } else {
        console.log('❌ 通知有効化に失敗しました');
        return false;
      }
      
    } catch (error) {
      console.error('通知有効化エラー:', error);
      return false;
    }
  },


  // 🆕 選択式 - 読書中漫画から完走選択
  async handleFinish(interaction) {
    try {
      const readingMangas = await googleSheets.getMangasByStatus('reading');
      
      if (readingMangas.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🎉 漫画完走記録')
          .setColor('#FF5722')
          .setDescription('現在読書中の漫画がありません。')
          .addFields(
            { name: '💡 ヒント', value: '読書中の漫画がある場合のみ完走記録ができます', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (readingMangas.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('manga_finish_select')
          .setPlaceholder('完走した漫画を選択してください')
          .addOptions(
            readingMangas.map(manga => ({
              label: `${manga.title}`.slice(0, 100),
              description: `${this.getProgressText(manga.read_count, manga.total_count, manga.format)} ${this.getProgressBar(manga.read_count, manga.total_count)}`.slice(0, 100),
              value: manga.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('🎉 漫画完走記録')
          .setColor('#4CAF50')
          .setDescription(`読書中の漫画が ${readingMangas.length} 本あります。完走した漫画を選択してください。`)
          .addFields(
            { 
              name: '📖 読書中の漫画', 
              value: readingMangas.map(manga => 
                `📖 ${manga.title} (${this.getProgressText(manga.read_count, manga.total_count, manga.format)})`
              ).join('\n').slice(0, 1024), 
              inline: false 
            }
          );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleFinishWithPagination(interaction, readingMangas);
      }
    } catch (error) {
      console.error('漫画完走選択エラー:', error);
      await interaction.editReply('❌ 漫画完走選択中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 読書中漫画から中断選択
  async handleDrop(interaction) {
    try {
      const readingMangas = await googleSheets.getMangasByStatus('reading');
      
      if (readingMangas.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('💔 漫画読書中断')
          .setColor('#FF5722')
          .setDescription('現在読書中の漫画がありません。')
          .addFields(
            { name: '💡 ヒント', value: '読書中の漫画がある場合のみ中断記録ができます', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (readingMangas.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('manga_drop_select')
          .setPlaceholder('読書を中断する漫画を選択してください')
          .addOptions(
            readingMangas.map(manga => ({
              label: `${manga.title}`.slice(0, 100),
              description: `${this.getProgressText(manga.read_count, manga.total_count, manga.format)} ${this.getProgressBar(manga.read_count, manga.total_count)}`.slice(0, 100),
              value: manga.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('💔 漫画読書中断')
          .setColor('#FF9800')
          .setDescription(`読書中の漫画が ${readingMangas.length} 本あります。読書を中断する漫画を選択してください。`)
          .addFields(
            { 
              name: '📖 読書中の漫画', 
              value: readingMangas.map(manga => 
                `📖 ${manga.title} (${this.getProgressText(manga.read_count, manga.total_count, manga.format)})`
              ).join('\n').slice(0, 1024), 
              inline: false 
            }
          );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleDropWithPagination(interaction, readingMangas);
      }
    } catch (error) {
      console.error('漫画中断選択エラー:', error);
      await interaction.editReply('❌ 漫画中断選択中にエラーが発生しました。');
    }
  },

  async handleList(interaction) {
    try {
      const mangas = await googleSheets.getMangas();
      
      if (mangas.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📚 漫画一覧')
          .setColor('#9C27B0')
          .setDescription('まだ漫画が登録されていません。')
          .addFields(
            { name: '📚 漫画を追加', value: '`/manga add [タイトル] [作者]` で漫画を追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const statusOrder = ['want_to_read', 'reading', 'finished', 'dropped'];
      const groupedMangas = mangas.reduce((acc, manga) => {
        const statusMatch = manga.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : 'want_to_read';
        
        if (!acc[status]) acc[status] = [];
        acc[status].push(manga);
        return acc;
      }, {});
      
      const embed = new EmbedBuilder()
        .setTitle('📚 漫画一覧')
        .setColor('#9C27B0')
        .setDescription(`全 ${mangas.length} 本の漫画が登録されています`)
        .setTimestamp();
      
      statusOrder.forEach(status => {
        if (groupedMangas[status] && groupedMangas[status].length > 0) {
          const statusName = {
            'want_to_read': '📖 読みたい',
            'reading': '📚 読書中',
            'finished': '✅ 読了済み',
            'dropped': '💔 中断'
          }[status] || status;
          
          const displayMangas = groupedMangas[status].slice(0, 8);
          const moreCount = groupedMangas[status].length - 8;
          
          let fieldValue = displayMangas.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}本`;
          }
          
          embed.addFields({
            name: `${statusName} (${groupedMangas[status].length}本)`,
            value: fieldValue,
            inline: false
          });
        }
      });
      
      embed.setFooter({ text: '操作: /manga read, /manga start, /manga finish (選択式で実行可能)' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('漫画一覧取得エラー:', error);
      await interaction.editReply('❌ 漫画一覧の取得中にエラーが発生しました。');
    }
  },

  async handleReading(interaction) {
    try {
      const allMangas = await googleSheets.getMangas();
      
      const readingMangas = allMangas.filter(manga => {
        const statusMatch = manga.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : '';
        return status === 'reading';
      });
      
      if (readingMangas.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📚 読書中漫画')
          .setColor('#2196F3')
          .setDescription('現在読書中の漫画はありません。')
          .addFields(
            { name: '🚀 読書を開始', value: '`/manga start` で読書を開始できます（選択式）', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('📚 読書中漫画')
        .setColor('#2196F3')
        .setDescription(`現在 ${readingMangas.length} 本の漫画を読書中です`)
        .setTimestamp();
      
      const displayMangas = readingMangas.slice(0, 10);
      const moreCount = readingMangas.length - 10;
      
      let fieldValue = displayMangas.join('\n');
      if (moreCount > 0) {
        fieldValue += `\n... 他${moreCount}本`;
      }
      
      embed.addFields({
        name: `📚 読書中 (${readingMangas.length}本)`,
        value: fieldValue,
        inline: false
      });
      
      embed.setFooter({ text: '読了記録: /manga read | 完走記録: /manga finish（選択式）' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('読書中漫画一覧取得エラー:', error);
      await interaction.editReply('❌ 読書中漫画一覧の取得中にエラーが発生しました。');
    }
  },

  async handleCompleted(interaction) {
    try {
      const allMangas = await googleSheets.getMangas();
      
      const completedMangas = allMangas.filter(manga => {
        const statusMatch = manga.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : '';
        return status === 'finished';
      });
      
      if (completedMangas.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('✅ 読了済み漫画')
          .setColor('#4CAF50')
          .setDescription('まだ読了した漫画はありません。')
          .addFields(
            { name: '🎉 漫画を完走', value: '`/manga finish` で漫画の完走を記録できます（選択式）', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('✅ 読了済み漫画')
        .setColor('#4CAF50')
        .setDescription(`これまでに ${completedMangas.length} 本の漫画を読了しました！`)
        .setTimestamp();
      
      const displayMangas = completedMangas.slice(0, 10);
      const moreCount = completedMangas.length - 10;
      
      let fieldValue = displayMangas.join('\n');
      if (moreCount > 0) {
        fieldValue += `\n... 他${moreCount}本`;
      }
      
      embed.addFields({
        name: `🎉 読了済み (${completedMangas.length}本)`,
        value: fieldValue,
        inline: false
      });
      
      embed.setFooter({ text: '感想は /report manga で記録できます' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('読了済み漫画一覧取得エラー:', error);
      await interaction.editReply('❌ 読了済み漫画一覧の取得中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 全ての漫画から進捗選択
  async handleProgress(interaction) {
    try {
      const allMangas = await googleSheets.getAllMangas();
      
      if (allMangas.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📊 漫画読書進捗')
          .setColor('#FF5722')
          .setDescription('登録されている漫画がありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/manga add [タイトル] [作者]` で漫画を追加してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (allMangas.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('manga_progress_select')
          .setPlaceholder('進捗を確認する漫画を選択してください')
          .addOptions(
            allMangas.map(manga => ({
              label: `${manga.title}`.slice(0, 100),
              description: `${this.getProgressText(manga.read_count, manga.total_count, manga.format)} | ${this.getReadingStatusText(manga.reading_status)}`.slice(0, 100),
              value: manga.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('📊 漫画読書進捗')
          .setColor('#3F51B5')
          .setDescription(`登録されている漫画が ${allMangas.length} 本あります。進捗を確認する漫画を選択してください。`)
          .addFields(
            { 
              name: '📚 登録済みの漫画', 
              value: allMangas.slice(0, 10).map(manga => 
                `${this.getReadingStatusEmoji(manga.reading_status)} ${manga.title} (${this.getProgressText(manga.read_count, manga.total_count, manga.format)})`
              ).join('\n').slice(0, 1024), 
              inline: false 
            }
          );
        
        if (allMangas.length > 10) {
          embed.addFields({ name: '📝 その他', value: `... 他${allMangas.length - 10}本`, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleProgressWithPagination(interaction, allMangas);
      }
    } catch (error) {
      console.error('漫画進捗選択エラー:', error);
      await interaction.editReply('❌ 漫画進捗選択中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 全ての漫画から詳細選択
  async handleInfo(interaction) {
    try {
      const allMangas = await googleSheets.getAllMangas();
      
      if (allMangas.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📄 漫画の詳細情報')
          .setColor('#FF5722')
          .setDescription('登録されている漫画がありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/manga add [タイトル] [作者]` で漫画を追加してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (allMangas.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('manga_info_select')
          .setPlaceholder('詳細を確認する漫画を選択してください')
          .addOptions(
            allMangas.map(manga => ({
              label: `${manga.title}`.slice(0, 100),
              description: `${manga.author} | ${this.getReadingStatusText(manga.reading_status)} | ${this.getTypeFormatText(manga.type, manga.format)}`.slice(0, 100),
              value: manga.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('📄 漫画の詳細情報')
          .setColor('#3F51B5')
          .setDescription(`登録されている漫画が ${allMangas.length} 本あります。詳細を確認する漫画を選択してください。`)
          .addFields(
            { 
              name: '📚 登録済みの漫画', 
              value: allMangas.slice(0, 10).map(manga => 
                `${this.getReadingStatusEmoji(manga.reading_status)} ${manga.title} - ${manga.author}`
              ).join('\n').slice(0, 1024), 
              inline: false 
            }
          );
        
        if (allMangas.length > 10) {
          embed.addFields({ name: '📝 その他', value: `... 他${allMangas.length - 10}本`, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleInfoWithPagination(interaction, allMangas);
      }
    } catch (error) {
      console.error('漫画詳細選択エラー:', error);
      await interaction.editReply('❌ 漫画詳細選択中にエラーが発生しました。');
    }
  },

  // ページネーション用のヘルパーメソッド
  async handleReadWithPagination(interaction, mangas, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(mangas.length / itemsPerPage);
    const currentMangas = mangas.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`manga_read_select_page_${page}`)
      .setPlaceholder('読了した漫画を選択してください')
      .addOptions(
        currentMangas.map(manga => ({
          label: `${manga.title}`.slice(0, 100),
          description: `${this.getProgressText(manga.read_count, manga.total_count, manga.format)} ${this.getProgressBar(manga.read_count, manga.total_count)}`.slice(0, 100),
          value: manga.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`manga_read_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`manga_read_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📚 巻数/話数読了記録')
      .setColor('#2196F3')
      .setDescription(`読書中の漫画が ${mangas.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { 
          name: '📖 読書中の漫画', 
          value: currentMangas.map(manga => 
            `📖 ${manga.title} (${this.getProgressText(manga.read_count, manga.total_count, manga.format)})`
          ).join('\n').slice(0, 1024), 
          inline: false 
        }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleStartWithPagination(interaction, mangas, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(mangas.length / itemsPerPage);
    const currentMangas = mangas.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`manga_start_select_page_${page}`)
      .setPlaceholder('読書を開始する漫画を選択してください')
      .addOptions(
        currentMangas.map(manga => ({
          label: `${manga.title}`.slice(0, 100),
          description: `${manga.author} | ${this.getTypeFormatText(manga.type, manga.format)}`.slice(0, 100),
          value: manga.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`manga_start_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`manga_start_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🚀 漫画読書開始')
      .setColor('#2196F3')
      .setDescription(`読みたい漫画が ${mangas.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { 
          name: '📖 読みたい漫画', 
          value: currentMangas.map(manga => 
            `📖 ${manga.title} - ${manga.author}`
          ).join('\n').slice(0, 1024), 
          inline: false 
        }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleFinishWithPagination(interaction, mangas, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(mangas.length / itemsPerPage);
    const currentMangas = mangas.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`manga_finish_select_page_${page}`)
      .setPlaceholder('完走した漫画を選択してください')
      .addOptions(
        currentMangas.map(manga => ({
          label: `${manga.title}`.slice(0, 100),
          description: `${this.getProgressText(manga.read_count, manga.total_count, manga.format)} ${this.getProgressBar(manga.read_count, manga.total_count)}`.slice(0, 100),
          value: manga.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`manga_finish_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`manga_finish_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🎉 漫画完走記録')
      .setColor('#4CAF50')
      .setDescription(`読書中の漫画が ${mangas.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { 
          name: '📖 読書中の漫画', 
          value: currentMangas.map(manga => 
            `📖 ${manga.title} (${this.getProgressText(manga.read_count, manga.total_count, manga.format)})`
          ).join('\n').slice(0, 1024), 
          inline: false 
        }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleDropWithPagination(interaction, mangas, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(mangas.length / itemsPerPage);
    const currentMangas = mangas.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`manga_drop_select_page_${page}`)
      .setPlaceholder('読書を中断する漫画を選択してください')
      .addOptions(
        currentMangas.map(manga => ({
          label: `${manga.title}`.slice(0, 100),
          description: `${this.getProgressText(manga.read_count, manga.total_count, manga.format)} ${this.getProgressBar(manga.read_count, manga.total_count)}`.slice(0, 100),
          value: manga.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`manga_drop_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`manga_drop_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('💔 漫画読書中断')
      .setColor('#FF9800')
      .setDescription(`読書中の漫画が ${mangas.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { 
          name: '📖 読書中の漫画', 
          value: currentMangas.map(manga => 
            `📖 ${manga.title} (${this.getProgressText(manga.read_count, manga.total_count, manga.format)})`
          ).join('\n').slice(0, 1024), 
          inline: false 
        }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleProgressWithPagination(interaction, mangas, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(mangas.length / itemsPerPage);
    const currentMangas = mangas.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`manga_progress_select_page_${page}`)
      .setPlaceholder('進捗を確認する漫画を選択してください')
      .addOptions(
        currentMangas.map(manga => ({
          label: `${manga.title}`.slice(0, 100),
          description: `${this.getProgressText(manga.read_count, manga.total_count, manga.format)} | ${this.getReadingStatusText(manga.reading_status)}`.slice(0, 100),
          value: manga.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`manga_progress_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`manga_progress_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📊 漫画読書進捗')
      .setColor('#3F51B5')
      .setDescription(`登録されている漫画が ${mangas.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { 
          name: '📚 登録済みの漫画', 
          value: currentMangas.map(manga => 
            `${this.getReadingStatusEmoji(manga.reading_status)} ${manga.title} (${this.getProgressText(manga.read_count, manga.total_count, manga.format)})`
          ).join('\n').slice(0, 1024), 
          inline: false 
        }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleInfoWithPagination(interaction, mangas, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(mangas.length / itemsPerPage);
    const currentMangas = mangas.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`manga_info_select_page_${page}`)
      .setPlaceholder('詳細を確認する漫画を選択してください')
      .addOptions(
        currentMangas.map(manga => ({
          label: `${manga.title}`.slice(0, 100),
          description: `${manga.author} | ${this.getReadingStatusText(manga.reading_status)} | ${this.getTypeFormatText(manga.type, manga.format)}`.slice(0, 100),
          value: manga.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`manga_info_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`manga_info_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📄 漫画の詳細情報')
      .setColor('#3F51B5')
      .setDescription(`登録されている漫画が ${mangas.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { 
          name: '📚 登録済みの漫画', 
          value: currentMangas.map(manga => 
            `${this.getReadingStatusEmoji(manga.reading_status)} ${manga.title} - ${manga.author}`
          ).join('\n').slice(0, 1024), 
          inline: false 
        }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  // 🧪 テスト用サブコマンドを追加
async handleTest(interaction) {
  try {
    const NotificationTester = require('../services/notificationTester');
    const tester = new NotificationTester(interaction.client);
    
    const action = interaction.options.getString('action');
    const mangaId = interaction.options.getInteger('manga_id');
    
    switch (action) {
      case 'notification':
        if (!mangaId) {
          await interaction.editReply('❌ 漫画IDを指定してください。');
          return;
        }
        
        const success = await tester.testMangaNotification(mangaId, interaction.channelId);
        
        if (success) {
          await interaction.editReply('✅ テスト通知を送信しました！');
        } else {
          await interaction.editReply('❌ テスト通知の送信に失敗しました。');
        }
        break;
        
      case 'all_notifications':
        const count = await tester.testAllActiveNotifications(interaction.channelId);
        await interaction.editReply(`✅ ${count}件のアクティブ通知をテスト送信しました！`);
        break;
        
      case 'check_status':
        const statuses = await tester.checkNotificationStatus(mangaId);
        
        if (statuses.length === 0) {
          await interaction.editReply('❌ 通知設定が見つかりません。');
          return;
        }
        
        const embed = new EmbedBuilder()
          .setTitle('🔍 通知設定チェック結果')
          .setColor('#2196F3')
          .setDescription(`${statuses.length}件の通知設定が見つかりました`);
        
        statuses.forEach(status => {
          const statusEmoji = status.isActive ? '🔔' : '🔕';
          const scheduleEmoji = status.isValidSchedule ? '✅' : '❌';
          
          embed.addFields({
            name: `${statusEmoji} ${status.title} (ID:${status.mangaId})`,
            value: `状態: ${status.status}\nスケジュール: ${scheduleEmoji} ${status.schedule}\n次回: ${status.nextNotification || '未設定'}`,
            inline: true
          });
        });
        
        await interaction.editReply({ embeds: [embed] });
        break;
        
      case 'update_schedule':
        if (!mangaId) {
          await interaction.editReply('❌ 漫画IDを指定してください。');
          return;
        }
        
        const updateSuccess = await tester.updateNextNotification(mangaId);
        
        if (updateSuccess) {
          await interaction.editReply('✅ 次回通知日時を更新しました！');
        } else {
          await interaction.editReply('❌ 次回通知日時の更新に失敗しました。');
        }
        break;
        
      default:
        await interaction.editReply('❌ 不明なテストアクション。');
    }
    
  } catch (error) {
    console.error('漫画テストエラー:', error);
    await interaction.editReply('❌ テスト実行中にエラーが発生しました。');
  }
},

// 🧪 デバッグ用: 通知設定の詳細表示
async handleDebugNotifications(interaction) {
  try {
    const notificationData = await googleSheets.getData('notification_schedules!A:I');
    
    if (!notificationData || notificationData.length <= 1) {
      await interaction.editReply('❌ 通知設定が見つかりません。');
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🔧 通知設定デバッグ情報')
      .setColor('#FF9800')
      .setDescription('notification_schedulesシートの内容');
    
    // ヘッダー情報
    const headers = notificationData[0];
    embed.addFields({
      name: '📋 ヘッダー',
      value: headers.join(' | '),
      inline: false
    });
    
    // データ行（最初の5件）
    const dataRows = notificationData.slice(1, 6);
    dataRows.forEach((row, index) => {
      const scheduleData = row[4] ? JSON.parse(row[4]) : {};
      
      embed.addFields({
        name: `📝 行${index + 2}`,
        value: `ID: ${row[0]}\nType: ${row[1]}\nManga ID: ${row[2]}\nTitle: ${row[3]}\nSchedule: ${scheduleData.displayName || '不明'}\nStatus: ${row[5]}\nNext: ${row[8] || '未設定'}`,
        inline: true
      });
    });
    
    if (notificationData.length > 6) {
      embed.addFields({
        name: '📝 その他',
        value: `... 他${notificationData.length - 6}行`,
        inline: false
      });
    }
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('通知設定デバッグエラー:', error);
    await interaction.editReply('❌ デバッグ情報の取得中にエラーが発生しました。');
  }
},

  // 🆕 スケジュール通知設定メソッドを追加
async setupUpdateNotification(mangaId, title, updateSchedule) {
  try {
    console.log(`📅 通知設定開始: ${title} (${updateSchedule})`);
    
    const scheduleData = this.parseUpdateSchedule(updateSchedule);
    if (!scheduleData) {
      console.log('❌ 無効なスケジュール形式');
      return false;
    }
    
    // 通知スケジュールをデータベースに保存
    await this.saveNotificationSchedule(mangaId, title, scheduleData);
    
    console.log(`✅ 通知設定完了: ${title}`);
    return true;
  } catch (error) {
    console.error('通知設定エラー:', error);
    return false;
  }
},

// 🆕 スケジュール解析メソッドを追加
parseUpdateSchedule(updateSchedule) {
  if (!updateSchedule) return null;
  
  const schedule = updateSchedule.toLowerCase();
  
  // 週次スケジュール (weekly-monday, weekly-friday など)
  const weeklyMatch = schedule.match(/^weekly-(\w+)$/);
  if (weeklyMatch) {
    const dayNames = {
      'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
      'friday': 5, 'saturday': 6, 'sunday': 0
    };
    
    const dayOfWeek = dayNames[weeklyMatch[1]];
    if (dayOfWeek !== undefined) {
      return {
        type: 'weekly',
        dayOfWeek: dayOfWeek,
        displayName: `毎週${this.getDayName(dayOfWeek)}曜日`
      };
    }
  }
  
  // 月次スケジュール (monthly-15, monthly-1 など)
  const monthlyMatch = schedule.match(/^monthly-(\d+)$/);
  if (monthlyMatch) {
    const dayOfMonth = parseInt(monthlyMatch[1]);
    if (dayOfMonth >= 1 && dayOfMonth <= 31) {
      return {
        type: 'monthly',
        dayOfMonth: dayOfMonth,
        displayName: `毎月${dayOfMonth}日`
      };
    }
  }
  
  // 隔週スケジュール (biweekly-1,3 など)
  const biweeklyMatch = schedule.match(/^biweekly-(\d+),(\d+)$/);
  if (biweeklyMatch) {
    const week1 = parseInt(biweeklyMatch[1]);
    const week2 = parseInt(biweeklyMatch[2]);
    return {
      type: 'biweekly',
      weeks: [week1, week2],
      displayName: `隔週(第${week1}・${week2}週)`
    };
  }
  
  // その他
  if (schedule === 'irregular') {
    return { type: 'irregular', displayName: '不定期' };
  }
  
  if (schedule === 'completed') {
    return { type: 'completed', displayName: '完結済み' };
  }
  
  return null;
},

// 🆕 通知スケジュール保存メソッドを追加
async saveNotificationSchedule(mangaId, title, scheduleData) {
  try {
    // notification_schedules シートに保存
    const notificationId = await googleSheets.getNextId('notification_schedules');
    const now = new Date().toISOString();
    
    const values = [
      notificationId,           // A列: ID
      'manga_update',          // B列: Type
      mangaId,                 // C列: Related_ID (manga_id)
      title,                   // D列: Title
      JSON.stringify(scheduleData), // E列: Schedule_Data
      'inactive',              // F列: Status (読書開始まで無効)
      now,                     // G列: Created_At
      now,                     // H列: Updated_At
      this.calculateNextNotification(scheduleData) // I列: Next_Notification
    ];
    
    await googleSheets.appendData('notification_schedules!A:I', values);
    console.log(`✅ 通知スケジュール保存完了: ${title}`);
    
  } catch (error) {
    console.error('通知スケジュール保存エラー:', error);
    throw error;
  }
},

// 🆕 次回通知日時計算メソッド（既存のメソッドを移動・改良）
  calculateNextNotification(scheduleData) {
    if (!scheduleData || !scheduleData.type) {
      return null;
    }
    
    const now = new Date();
    
    switch (scheduleData.type) {
      case 'weekly':
        const nextWeekly = new Date(now);
        const currentDay = now.getDay();
        const targetDay = scheduleData.dayOfWeek;
        
        let daysUntilNext = (targetDay - currentDay + 7) % 7;
        if (daysUntilNext === 0) {
          daysUntilNext = 7; // 今日が更新日なら来週
        }
        
        nextWeekly.setDate(now.getDate() + daysUntilNext);
        nextWeekly.setHours(9, 0, 0, 0); // 朝9時に通知
        return nextWeekly.toISOString();
        
      case 'monthly':
        const nextMonthly = new Date(now.getFullYear(), now.getMonth(), scheduleData.dayOfMonth, 9, 0, 0, 0);
        
        if (nextMonthly <= now) {
          nextMonthly.setMonth(nextMonthly.getMonth() + 1);
        }
        
        return nextMonthly.toISOString();
        
      case 'biweekly':
        // 隔週の場合は週次として計算し、後で調整
        const nextBiweekly = new Date(now);
        nextBiweekly.setDate(now.getDate() + 14); // 2週間後
        nextBiweekly.setHours(9, 0, 0, 0);
        return nextBiweekly.toISOString();
        
      case 'irregular':
      case 'completed':
        return null; // 通知なし
        
      default:
        console.log(`未知のスケジュールタイプ: ${scheduleData.type}`);
        return null;
    }
  },

// 🆕 ヘルパーメソッドを追加
getDayName(dayOfWeek) {
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  return dayNames[dayOfWeek] || '不明';
},

formatUpdateSchedule(updateSchedule) {
  if (!updateSchedule) return '未設定';
  
  const scheduleData = this.parseUpdateSchedule(updateSchedule);
  return scheduleData ? scheduleData.displayName : updateSchedule;
},

// 🆕 新しいサブコマンド処理を追加
async handleSchedule(interaction) {
  try {
    const data = await googleSheets.getData('notification_schedules!A:I');
    if (!data || data.length <= 1) {
      const embed = new EmbedBuilder()
        .setTitle('📅 更新通知設定')
        .setColor('#FF9800')
        .setDescription('設定されている通知はありません。')
        .addFields(
          { name: '💡 通知設定方法', value: '漫画追加時に `update_schedule` オプションを指定してください', inline: false },
          { name: '📝 設定例', value: '`weekly-monday` (毎週月曜日)\n`monthly-15` (毎月15日)\n`irregular` (不定期)', inline: false }
        );
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    const notifications = data.slice(1).map(row => ({
      id: row[0],
      mangaId: row[2],
      title: row[3],
      scheduleData: JSON.parse(row[4] || '{}'),
      status: row[5],
      nextNotification: row[8]
    }));
    
    const embed = new EmbedBuilder()
      .setTitle('📅 更新通知設定一覧')
      .setColor('#2196F3')
      .setDescription(`${notifications.length}件の通知が設定されています`);
    
    notifications.slice(0, 10).forEach(notification => {
      const nextTime = notification.nextNotification ? 
        new Date(notification.nextNotification).toLocaleDateString('ja-JP') : '未設定';
      
      const statusEmoji = notification.status === 'active' ? '🔔' : '🔕';
      const statusText = notification.status === 'active' ? '有効' : '無効';
      
      embed.addFields({
        name: `${statusEmoji} ${notification.title}`,
        value: `${notification.scheduleData.displayName || '不明'} | ${statusText} | 次回: ${nextTime}`,
        inline: false
      });
    });
    
    if (notifications.length > 10) {
      embed.addFields({ name: '📝 その他', value: `... 他${notifications.length - 10}件`, inline: false });
    }
    
    embed.setFooter({ text: '通知は読書中の漫画のみ送信されます' });
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('通知一覧取得エラー:', error);
    await interaction.editReply('❌ 通知一覧の取得中にエラーが発生しました。');
  }
},

async handleNotifications(interaction) {
  // handleSchedule と同じ処理（エイリアス）
  await this.handleSchedule(interaction);
},

  // ヘルパーメソッド
  getReadingStatusEmoji(status) {
    const emojis = {
      'want_to_read': '📖',
      'reading': '📚',
      'finished': '✅',
      'dropped': '💔'
    };
    return emojis[status] || '❓';
  },

  getReadingStatusText(status) {
    const texts = {
      'want_to_read': '読みたい',
      'reading': '読書中',
      'finished': '読了済み',
      'dropped': '中断'
    };
    return texts[status] || status;
  },

  getCurrentStatusText(status) {
    const texts = {
      'ongoing': '連載中/未完結',
      'completed': '完結済み'
    };
    return texts[status] || status;
  },

  getTypeFormatText(type, format) {
    const typeText = type === 'series' ? 'シリーズ' : '読切';
    const formatText = format === 'volume' ? '単行本' : '話数';
    return `${typeText}・${formatText}`;
  },

  getProgressText(readCount, totalCount, format) {
    const unit = format === 'volume' ? '巻' : '話';
    if (totalCount && totalCount > 0) {
      return `${readCount}/${totalCount}${unit}`;
    } else {
      return `${readCount}${unit}`;
    }
  },

  getProgressBar(readCount, totalCount) {
    if (!totalCount || totalCount === 0) {
      return `🔄 ${readCount}巻/話 読了中`;
    }
    
    const percentage = Math.round((readCount / totalCount) * 100);
    const filledBars = Math.round((readCount / totalCount) * 10);
    const emptyBars = 10 - filledBars;
    
    return '█'.repeat(filledBars) + '░'.repeat(emptyBars) + ` ${percentage}%`;
  }
};
