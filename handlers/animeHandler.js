// handlers/animeHandler.js - アニメ管理ハンドラー

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
        case 'watch':
          await this.handleWatch(interaction);
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
        case 'watchlist':
          await this.handleWatchlist(interaction);
          break;
        case 'watching':
          await this.handleWatching(interaction);
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
        case 'log':
          await this.handleLog(interaction);
          break;
        default:
          await interaction.editReply(`❌ 不明なサブコマンド: ${subcommand}`);
      }
    } catch (error) {
      console.error('AnimeHandler エラー:', error);
      await interaction.editReply('❌ 処理中にエラーが発生しました。');
    }
  },

  async handleAdd(interaction) {
    const title = interaction.options.getString('title');
    const episodes = interaction.options.getInteger('episodes');
    const genre = interaction.options.getString('genre') || 'other';
    const memo = interaction.options.getString('memo') || '';
    
    try {
      const animeId = await googleSheets.addAnime(title, episodes, genre, memo);
      
      const genreText = this.getGenreText(genre);
      
      const embed = new EmbedBuilder()
        .setTitle('📺 アニメを追加しました！')
        .setColor('#4CAF50')
        .setDescription('📺 アニメリストに新しいアニメが追加されました！')
        .addFields(
          { name: 'ID', value: animeId.toString(), inline: true },
          { name: 'タイトル', value: title, inline: true },
          { name: '総話数', value: `${episodes}話`, inline: true },
          { name: 'ジャンル', value: genreText, inline: true },
          { name: 'ステータス', value: '🍿 観たい', inline: true },
          { name: '進捗', value: '0話 / ' + episodes + '話 (0%)', inline: true }
        )
        .setTimestamp();
      
      if (memo) {
        embed.addFields({ name: '備考', value: memo, inline: false });
      }
      
      embed.setFooter({ text: '視聴開始は /anime start で記録できます（選択式）' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('アニメ追加エラー:', error);
      await interaction.editReply('❌ アニメの追加中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 視聴中アニメから話数を選択
  async handleWatch(interaction) {
    try {
      const watchingAnimes = await googleSheets.getAnimesByStatus('watching');
      
      if (watchingAnimes.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📺 話数視聴記録')
          .setColor('#FF5722')
          .setDescription('現在視聴中のアニメがありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/anime start` で視聴を開始してから話数を記録してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (watchingAnimes.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('anime_watch_select')
          .setPlaceholder('視聴したアニメを選択してください')
          .addOptions(
            watchingAnimes.map(anime => ({
              label: `${anime.title}`.slice(0, 100),
              description: `${anime.watched_episodes}/${anime.total_episodes}話 ${this.getProgressBar(anime.watched_episodes, anime.total_episodes)}`.slice(0, 100),
              value: anime.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('📺 話数視聴記録')
          .setColor('#2196F3')
          .setDescription(`視聴中のアニメが ${watchingAnimes.length} 本あります。次の話数を視聴したアニメを選択してください。`)
          .addFields(
            { 
              name: '📺 視聴中のアニメ', 
              value: watchingAnimes.map(anime => 
                `📺 ${anime.title} (${anime.watched_episodes}/${anime.total_episodes}話)`
              ).join('\n').slice(0, 1024), 
              inline: false 
            }
          );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleWatchWithPagination(interaction, watchingAnimes);
      }
    } catch (error) {
      console.error('アニメ話数視聴選択エラー:', error);
      await interaction.editReply('❌ アニメ話数視聴選択中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 観たいアニメから視聴開始選択
  async handleStart(interaction) {
    try {
      const wantToWatchAnimes = await googleSheets.getAnimesByStatus('want_to_watch');
      
      if (wantToWatchAnimes.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🚀 アニメ視聴開始')
          .setColor('#FF5722')
          .setDescription('観たいアニメがありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/anime add [タイトル] [話数]` で観たいアニメを追加してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (wantToWatchAnimes.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('anime_start_select')
          .setPlaceholder('視聴を開始するアニメを選択してください')
          .addOptions(
            wantToWatchAnimes.map(anime => ({
              label: `${anime.title}`.slice(0, 100),
              description: `${anime.total_episodes}話 | ${this.getGenreText(anime.genre)}`.slice(0, 100),
              value: anime.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('🚀 アニメ視聴開始')
          .setColor('#2196F3')
          .setDescription(`観たいアニメが ${wantToWatchAnimes.length} 本あります。視聴を開始するアニメを選択してください。`)
          .addFields(
            { 
              name: '🍿 観たいアニメ', 
              value: wantToWatchAnimes.map(anime => 
                `🍿 ${anime.title} (${anime.total_episodes}話)`
              ).join('\n').slice(0, 1024), 
              inline: false 
            }
          );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleStartWithPagination(interaction, wantToWatchAnimes);
      }
    } catch (error) {
      console.error('アニメ視聴開始選択エラー:', error);
      await interaction.editReply('❌ アニメ視聴開始選択中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 視聴中アニメから完走選択
  async handleFinish(interaction) {
    try {
      const watchingAnimes = await googleSheets.getAnimesByStatus('watching');
      
      if (watchingAnimes.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🎉 アニメ完走記録')
          .setColor('#FF5722')
          .setDescription('現在視聴中のアニメがありません。')
          .addFields(
            { name: '💡 ヒント', value: '視聴中のアニメがある場合のみ完走記録ができます', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (watchingAnimes.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('anime_finish_select')
          .setPlaceholder('完走したアニメを選択してください')
          .addOptions(
            watchingAnimes.map(anime => ({
              label: `${anime.title}`.slice(0, 100),
              description: `${anime.watched_episodes}/${anime.total_episodes}話 ${this.getProgressBar(anime.watched_episodes, anime.total_episodes)}`.slice(0, 100),
              value: anime.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('🎉 アニメ完走記録')
          .setColor('#4CAF50')
          .setDescription(`視聴中のアニメが ${watchingAnimes.length} 本あります。完走したアニメを選択してください。`)
          .addFields(
            { 
              name: '📺 視聴中のアニメ', 
              value: watchingAnimes.map(anime => 
                `📺 ${anime.title} (${anime.watched_episodes}/${anime.total_episodes}話)`
              ).join('\n').slice(0, 1024), 
              inline: false 
            }
          );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleFinishWithPagination(interaction, watchingAnimes);
      }
    } catch (error) {
      console.error('アニメ完走選択エラー:', error);
      await interaction.editReply('❌ アニメ完走選択中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 視聴中アニメから中断選択
  async handleDrop(interaction) {
    try {
      const watchingAnimes = await googleSheets.getAnimesByStatus('watching');
      
      if (watchingAnimes.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('💔 アニメ視聴中断')
          .setColor('#FF5722')
          .setDescription('現在視聴中のアニメがありません。')
          .addFields(
            { name: '💡 ヒント', value: '視聴中のアニメがある場合のみ中断記録ができます', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (watchingAnimes.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('anime_drop_select')
          .setPlaceholder('視聴を中断するアニメを選択してください')
          .addOptions(
            watchingAnimes.map(anime => ({
              label: `${anime.title}`.slice(0, 100),
              description: `${anime.watched_episodes}/${anime.total_episodes}話 ${this.getProgressBar(anime.watched_episodes, anime.total_episodes)}`.slice(0, 100),
              value: anime.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('💔 アニメ視聴中断')
          .setColor('#FF9800')
          .setDescription(`視聴中のアニメが ${watchingAnimes.length} 本あります。視聴を中断するアニメを選択してください。`)
          .addFields(
            { 
              name: '📺 視聴中のアニメ', 
              value: watchingAnimes.map(anime => 
                `📺 ${anime.title} (${anime.watched_episodes}/${anime.total_episodes}話)`
              ).join('\n').slice(0, 1024), 
              inline: false 
            }
          );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleDropWithPagination(interaction, watchingAnimes);
      }
    } catch (error) {
      console.error('アニメ中断選択エラー:', error);
      await interaction.editReply('❌ アニメ中断選択中にエラーが発生しました。');
    }
  },

  async handleList(interaction) {
    try {
      const animes = await googleSheets.getAnimes();
      
      if (animes.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📺 アニメ一覧')
          .setColor('#9C27B0')
          .setDescription('まだアニメが登録されていません。')
          .addFields(
            { name: '📺 アニメを追加', value: '`/anime add [タイトル] [話数]` でアニメを追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const statusOrder = ['want_to_watch', 'watching', 'completed', 'dropped'];
      const groupedAnimes = animes.reduce((acc, anime) => {
        const statusMatch = anime.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : 'want_to_watch';
        
        if (!acc[status]) acc[status] = [];
        acc[status].push(anime);
        return acc;
      }, {});
      
      const embed = new EmbedBuilder()
        .setTitle('📺 アニメ一覧')
        .setColor('#9C27B0')
        .setDescription(`全 ${animes.length} 本のアニメが登録されています`)
        .setTimestamp();
      
      statusOrder.forEach(status => {
        if (groupedAnimes[status] && groupedAnimes[status].length > 0) {
          const statusName = {
            'want_to_watch': '🍿 観たいアニメ',
            'watching': '📺 視聴中',
            'completed': '✅ 完走済み',
            'dropped': '💔 中断'
          }[status] || status;
          
          const displayAnimes = groupedAnimes[status].slice(0, 8);
          const moreCount = groupedAnimes[status].length - 8;
          
          let fieldValue = displayAnimes.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}本`;
          }
          
          embed.addFields({
            name: `${statusName} (${groupedAnimes[status].length}本)`,
            value: fieldValue,
            inline: false
          });
        }
      });
      
      embed.setFooter({ text: '操作: /anime watch, /anime start, /anime finish (選択式で実行可能)' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('アニメ一覧取得エラー:', error);
      await interaction.editReply('❌ アニメ一覧の取得中にエラーが発生しました。');
    }
  },

  async handleWatchlist(interaction) {
    try {
      const allAnimes = await googleSheets.getAnimes();
      
      const wantToWatchAnimes = allAnimes.filter(anime => {
        const statusMatch = anime.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : '';
        return status === 'want_to_watch';
      });
      
      if (wantToWatchAnimes.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🍿 観たいアニメ一覧')
          .setColor('#E91E63')
          .setDescription('観たいアニメはまだ登録されていません。')
          .addFields(
            { name: '📺 アニメを追加', value: '`/anime add [タイトル] [話数]` で観たいアニメを追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🍿 観たいアニメ一覧')
        .setColor('#E91E63')
        .setDescription(`観たいアニメが ${wantToWatchAnimes.length} 本あります`)
        .setTimestamp();
      
      const sortedAnimes = wantToWatchAnimes.sort((a, b) => {
        const idA = parseInt(a.match(/\[(\d+)\]/)?.[1] || 0);
        const idB = parseInt(b.match(/\[(\d+)\]/)?.[1] || 0);
        return idB - idA;
      });
      
      const maxDisplay = 15;
      const displayAnimes = sortedAnimes.slice(0, maxDisplay);
      const moreCount = sortedAnimes.length - maxDisplay;
      
      let fieldValue = displayAnimes.join('\n');
      if (moreCount > 0) {
        fieldValue += `\n... 他${moreCount}本`;
      }
      
      embed.addFields({
        name: `🍿 観たいアニメ (${wantToWatchAnimes.length}本)`,
        value: fieldValue,
        inline: false
      });
      
      embed.setFooter({ text: '視聴開始は /anime start で記録できます（選択式）' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ 観たいアニメ一覧取得エラー:', error);
      await interaction.editReply('❌ 観たいアニメ一覧の取得中にエラーが発生しました。');
    }
  },

  async handleWatching(interaction) {
    try {
      const allAnimes = await googleSheets.getAnimes();
      
      const watchingAnimes = allAnimes.filter(anime => {
        const statusMatch = anime.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : '';
        return status === 'watching';
      });
      
      if (watchingAnimes.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📺 視聴中アニメ')
          .setColor('#2196F3')
          .setDescription('現在視聴中のアニメはありません。')
          .addFields(
            { name: '🚀 視聴を開始', value: '`/anime start` で視聴を開始できます（選択式）', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('📺 視聴中アニメ')
        .setColor('#2196F3')
        .setDescription(`現在 ${watchingAnimes.length} 本のアニメを視聴中です`)
        .setTimestamp();
      
      const displayAnimes = watchingAnimes.slice(0, 10);
      const moreCount = watchingAnimes.length - 10;
      
      let fieldValue = displayAnimes.join('\n');
      if (moreCount > 0) {
        fieldValue += `\n... 他${moreCount}本`;
      }
      
      embed.addFields({
        name: `📺 視聴中 (${watchingAnimes.length}本)`,
        value: fieldValue,
        inline: false
      });
      
      embed.setFooter({ text: '話数記録: /anime watch | 完走記録: /anime finish（選択式）' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('視聴中アニメ一覧取得エラー:', error);
      await interaction.editReply('❌ 視聴中アニメ一覧の取得中にエラーが発生しました。');
    }
  },

  async handleCompleted(interaction) {
    try {
      const allAnimes = await googleSheets.getAnimes();
      
      const completedAnimes = allAnimes.filter(anime => {
        const statusMatch = anime.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : '';
        return status === 'completed';
      });
      
      if (completedAnimes.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('✅ 完走済みアニメ')
          .setColor('#4CAF50')
          .setDescription('まだ完走したアニメはありません。')
          .addFields(
            { name: '🎉 アニメを完走', value: '`/anime finish` でアニメの完走を記録できます（選択式）', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('✅ 完走済みアニメ')
        .setColor('#4CAF50')
        .setDescription(`これまでに ${completedAnimes.length} 本のアニメを完走しました！`)
        .setTimestamp();
      
      const displayAnimes = completedAnimes.slice(0, 10);
      const moreCount = completedAnimes.length - 10;
      
      let fieldValue = displayAnimes.join('\n');
      if (moreCount > 0) {
        fieldValue += `\n... 他${moreCount}本`;
      }
      
      embed.addFields({
        name: `🎉 完走済み (${completedAnimes.length}本)`,
        value: fieldValue,
        inline: false
      });
      
      embed.setFooter({ text: '感想は /report anime で記録できます' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('完走済みアニメ一覧取得エラー:', error);
      await interaction.editReply('❌ 完走済みアニメ一覧の取得中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 全てのアニメから進捗選択
  async handleProgress(interaction) {
    try {
      const allAnimes = await googleSheets.getAllAnimes();
      
      if (allAnimes.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📊 アニメ視聴進捗')
          .setColor('#FF5722')
          .setDescription('登録されているアニメがありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/anime add [タイトル] [話数]` でアニメを追加してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (allAnimes.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('anime_progress_select')
          .setPlaceholder('進捗を確認するアニメを選択してください')
          .addOptions(
            allAnimes.map(anime => ({
              label: `${anime.title}`.slice(0, 100),
              description: `${anime.watched_episodes}/${anime.total_episodes}話 | ${this.getStatusText(anime.status)}`.slice(0, 100),
              value: anime.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('📊 アニメ視聴進捗')
          .setColor('#3F51B5')
          .setDescription(`登録されているアニメが ${allAnimes.length} 本あります。進捗を確認するアニメを選択してください。`)
          .addFields(
            { 
              name: '📺 登録済みのアニメ', 
              value: allAnimes.slice(0, 10).map(anime => 
                `${this.getStatusEmoji(anime.status)} ${anime.title} (${anime.watched_episodes}/${anime.total_episodes}話)`
              ).join('\n').slice(0, 1024), 
              inline: false 
            }
          );
        
        if (allAnimes.length > 10) {
          embed.addFields({ name: '📝 その他', value: `... 他${allAnimes.length - 10}本`, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleProgressWithPagination(interaction, allAnimes);
      }
    } catch (error) {
      console.error('アニメ進捗選択エラー:', error);
      await interaction.editReply('❌ アニメ進捗選択中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 全てのアニメから詳細選択
  async handleInfo(interaction) {
    try {
      const allAnimes = await googleSheets.getAllAnimes();
      
      if (allAnimes.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📄 アニメの詳細情報')
          .setColor('#FF5722')
          .setDescription('登録されているアニメがありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/anime add [タイトル] [話数]` でアニメを追加してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (allAnimes.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('anime_info_select')
          .setPlaceholder('詳細を確認するアニメを選択してください')
          .addOptions(
            allAnimes.map(anime => ({
              label: `${anime.title}`.slice(0, 100),
              description: `${this.getStatusText(anime.status)} | ${this.getGenreText(anime.genre)} | ${anime.memo || 'メモなし'}`.slice(0, 100),
              value: anime.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('📄 アニメの詳細情報')
          .setColor('#3F51B5')
          .setDescription(`登録されているアニメが ${allAnimes.length} 本あります。詳細を確認するアニメを選択してください。`)
          .addFields(
            { 
              name: '📺 登録済みのアニメ', 
              value: allAnimes.slice(0, 10).map(anime => 
                `${this.getStatusEmoji(anime.status)} ${anime.title}`
              ).join('\n').slice(0, 1024), 
              inline: false 
            }
          );
        
        if (allAnimes.length > 10) {
          embed.addFields({ name: '📝 その他', value: `... 他${allAnimes.length - 10}本`, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleInfoWithPagination(interaction, allAnimes);
      }
    } catch (error) {
      console.error('アニメ詳細選択エラー:', error);
      await interaction.editReply('❌ アニメ詳細選択中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 全てのアニメからログ選択
  async handleLog(interaction) {
    try {
      const allAnimes = await googleSheets.getAllAnimes();
      
      if (allAnimes.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📝 アニメ視聴ログ')
          .setColor('#FF5722')
          .setDescription('登録されているアニメがありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/anime add [タイトル] [話数]` でアニメを追加してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (allAnimes.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('anime_log_select')
          .setPlaceholder('視聴ログを確認するアニメを選択してください')
          .addOptions(
            allAnimes.map(anime => ({
              label: `${anime.title}`.slice(0, 100),
              description: `${anime.watched_episodes}/${anime.total_episodes}話 | ${this.getStatusText(anime.status)}`.slice(0, 100),
              value: anime.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('📝 アニメ視聴ログ')
          .setColor('#795548')
          .setDescription(`登録されているアニメが ${allAnimes.length} 本あります。視聴ログを確認するアニメを選択してください。`)
          .addFields(
            { 
              name: '📺 登録済みのアニメ', 
              value: allAnimes.slice(0, 10).map(anime => 
                `${this.getStatusEmoji(anime.status)} ${anime.title} (${anime.watched_episodes}/${anime.total_episodes}話)`
              ).join('\n').slice(0, 1024), 
              inline: false 
            }
          );
        
        if (allAnimes.length > 10) {
          embed.addFields({ name: '📝 その他', value: `... 他${allAnimes.length - 10}本`, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleLogWithPagination(interaction, allAnimes);
      }
    } catch (error) {
      console.error('アニメログ選択エラー:', error);
      await interaction.editReply('❌ アニメログ選択中にエラーが発生しました。');
    }
  },

  // ページネーション用のヘルパーメソッド
  async handleWatchWithPagination(interaction, animes, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(animes.length / itemsPerPage);
    const currentAnimes = animes.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`anime_watch_select_page_${page}`)
      .setPlaceholder('視聴したアニメを選択してください')
      .addOptions(
        currentAnimes.map(anime => ({
          label: `${anime.title}`.slice(0, 100),
          description: `${anime.watched_episodes}/${anime.total_episodes}話 ${this.getProgressBar(anime.watched_episodes, anime.total_episodes)}`.slice(0, 100),
          value: anime.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`anime_watch_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`anime_watch_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📺 話数視聴記録')
      .setColor('#2196F3')
      .setDescription(`視聴中のアニメが ${animes.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { 
          name: '📺 視聴中のアニメ', 
          value: currentAnimes.map(anime => 
            `📺 ${anime.title} (${anime.watched_episodes}/${anime.total_episodes}話)`
          ).join('\n').slice(0, 1024), 
          inline: false 
        }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleStartWithPagination(interaction, animes, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(animes.length / itemsPerPage);
    const currentAnimes = animes.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`anime_start_select_page_${page}`)
      .setPlaceholder('視聴を開始するアニメを選択してください')
      .addOptions(
        currentAnimes.map(anime => ({
          label: `${anime.title}`.slice(0, 100),
          description: `${anime.total_episodes}話 | ${this.getGenreText(anime.genre)}`.slice(0, 100),
          value: anime.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`anime_start_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`anime_start_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🚀 アニメ視聴開始')
      .setColor('#2196F3')
      .setDescription(`観たいアニメが ${animes.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { 
          name: '🍿 観たいアニメ', 
          value: currentAnimes.map(anime => 
            `🍿 ${anime.title} (${anime.total_episodes}話)`
          ).join('\n').slice(0, 1024), 
          inline: false 
        }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleFinishWithPagination(interaction, animes, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(animes.length / itemsPerPage);
    const currentAnimes = animes.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`anime_finish_select_page_${page}`)
      .setPlaceholder('完走したアニメを選択してください')
      .addOptions(
        currentAnimes.map(anime => ({
          label: `${anime.title}`.slice(0, 100),
          description: `${anime.watched_episodes}/${anime.total_episodes}話 ${this.getProgressBar(anime.watched_episodes, anime.total_episodes)}`.slice(0, 100),
          value: anime.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`anime_finish_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`anime_finish_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🎉 アニメ完走記録')
      .setColor('#4CAF50')
      .setDescription(`視聴中のアニメが ${animes.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { 
          name: '📺 視聴中のアニメ', 
          value: currentAnimes.map(anime => 
            `📺 ${anime.title} (${anime.watched_episodes}/${anime.total_episodes}話)`
          ).join('\n').slice(0, 1024), 
          inline: false 
        }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleDropWithPagination(interaction, animes, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(animes.length / itemsPerPage);
    const currentAnimes = animes.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`anime_drop_select_page_${page}`)
      .setPlaceholder('視聴を中断するアニメを選択してください')
      .addOptions(
        currentAnimes.map(anime => ({
          label: `${anime.title}`.slice(0, 100),
          description: `${anime.watched_episodes}/${anime.total_episodes}話 ${this.getProgressBar(anime.watched_episodes, anime.total_episodes)}`.slice(0, 100),
          value: anime.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`anime_drop_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`anime_drop_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('💔 アニメ視聴中断')
      .setColor('#FF9800')
      .setDescription(`視聴中のアニメが ${animes.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { 
          name: '📺 視聴中のアニメ', 
          value: currentAnimes.map(anime => 
            `📺 ${anime.title} (${anime.watched_episodes}/${anime.total_episodes}話)`
          ).join('\n').slice(0, 1024), 
          inline: false 
        }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleProgressWithPagination(interaction, animes, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(animes.length / itemsPerPage);
    const currentAnimes = animes.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`anime_progress_select_page_${page}`)
      .setPlaceholder('進捗を確認するアニメを選択してください')
      .addOptions(
        currentAnimes.map(anime => ({
          label: `${anime.title}`.slice(0, 100),
          description: `${anime.watched_episodes}/${anime.total_episodes}話 | ${this.getStatusText(anime.status)}`.slice(0, 100),
          value: anime.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`anime_progress_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`anime_progress_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📊 アニメ視聴進捗')
      .setColor('#3F51B5')
      .setDescription(`登録されているアニメが ${animes.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { 
          name: '📺 登録済みのアニメ', 
          value: currentAnimes.map(anime => 
            `${this.getStatusEmoji(anime.status)} ${anime.title} (${anime.watched_episodes}/${anime.total_episodes}話)`
          ).join('\n').slice(0, 1024), 
          inline: false 
        }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleInfoWithPagination(interaction, animes, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(animes.length / itemsPerPage);
    const currentAnimes = animes.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`anime_info_select_page_${page}`)
      .setPlaceholder('詳細を確認するアニメを選択してください')
      .addOptions(
        currentAnimes.map(anime => ({
          label: `${anime.title}`.slice(0, 100),
          description: `${this.getStatusText(anime.status)} | ${this.getGenreText(anime.genre)} | ${anime.memo || 'メモなし'}`.slice(0, 100),
          value: anime.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`anime_info_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`anime_info_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📄 アニメの詳細情報')
      .setColor('#3F51B5')
      .setDescription(`登録されているアニメが ${animes.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { 
          name: '📺 登録済みのアニメ', 
          value: currentAnimes.map(anime => 
            `${this.getStatusEmoji(anime.status)} ${anime.title}`
          ).join('\n').slice(0, 1024), 
          inline: false 
        }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleLogWithPagination(interaction, animes, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(animes.length / itemsPerPage);
    const currentAnimes = animes.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`anime_log_select_page_${page}`)
      .setPlaceholder('視聴ログを確認するアニメを選択してください')
      .addOptions(
        currentAnimes.map(anime => ({
          label: `${anime.title}`.slice(0, 100),
          description: `${anime.watched_episodes}/${anime.total_episodes}話 | ${this.getStatusText(anime.status)}`.slice(0, 100),
          value: anime.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`anime_log_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`anime_log_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📝 アニメ視聴ログ')
      .setColor('#795548')
      .setDescription(`登録されているアニメが ${animes.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { 
          name: '📺 登録済みのアニメ', 
          value: currentAnimes.map(anime => 
            `${this.getStatusEmoji(anime.status)} ${anime.title} (${anime.watched_episodes}/${anime.total_episodes}話)`
          ).join('\n').slice(0, 1024), 
          inline: false 
        }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  // ヘルパーメソッド
  getStatusEmoji(status) {
    const emojis = {
      'want_to_watch': '🍿',
      'watching': '📺',
      'completed': '✅',
      'dropped': '💔'
    };
    return emojis[status] || '❓';
  },

  getStatusText(status) {
    const texts = {
      'want_to_watch': '観たい',
      'watching': '視聴中',
      'completed': '完走済み',
      'dropped': '中断'
    };
    return texts[status] || status;
  },

  getGenreText(genre) {
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
  },

  getProgressBar(watched, total) {
    if (total === 0) return '━━━━━━━━━━ 0%';
    
    const percentage = Math.round((watched / total) * 100);
    const filledBars = Math.round((watched / total) * 10);
    const emptyBars = 10 - filledBars;
    
    return '█'.repeat(filledBars) + '░'.repeat(emptyBars) + ` ${percentage}%`;
  }
};
