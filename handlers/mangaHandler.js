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
    const type = interaction.options.getString('type');
    const format = interaction.options.getString('format');
    const totalCount = interaction.options.getInteger('total_count') || null;
    const currentStatus = interaction.options.getString('status') || 'ongoing';
    const memo = interaction.options.getString('memo') || '';
    
    try {
      const mangaId = await googleSheets.addManga(title, author, type, format, totalCount, currentStatus, memo);
      
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
      
      if (memo) {
        embed.addFields({ name: '備考', value: memo, inline: false });
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
