// handlers/movieHandler.js - 選択式実装

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
        case 'skip':
          await this.handleSkip(interaction);
          break;
        case 'list':
          await this.handleList(interaction);
          break;
        case 'wishlist':
          await this.handleWishlist(interaction);
          break;
        case 'watched':
          await this.handleWatched(interaction);
          break;
        case 'info':
          await this.handleInfo(interaction);
          break;
        default:
          await interaction.editReply(`❌ 不明なサブコマンド: ${subcommand}`);
      }
    } catch (error) {
      console.error('MovieHandler エラー:', error);
      await interaction.editReply('❌ 処理中にエラーが発生しました。');
    }
  },

  async handleAdd(interaction) {
    const title = interaction.options.getString('title');
    const memo = interaction.options.getString('memo') || '';
    
    try {
      const movieId = await googleSheets.addMovie(title, memo);
      
      const embed = new EmbedBuilder()
        .setTitle('🎬 映画を追加しました！')
        .setColor('#4CAF50')
        .setDescription('🎬 映画リストに新しい映画が追加されました！')
        .addFields(
          { name: 'ID', value: movieId.toString(), inline: true },
          { name: 'タイトル', value: title, inline: true },
          { name: 'ステータス', value: '🎬 観たい', inline: true }
        )
        .setTimestamp();
      
      if (memo) {
        embed.addFields({ name: '備考', value: memo, inline: false });
      }
      
      embed.setFooter({ text: '視聴したら /movie watch で記録できます（選択式）' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('映画追加エラー:', error);
      await interaction.editReply('❌ 映画の追加中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 観たい映画から選択
  async handleWatch(interaction) {
    try {
      const wantToWatchMovies = await googleSheets.getMoviesByStatus('want_to_watch');
      
      if (wantToWatchMovies.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🎬 映画視聴記録')
          .setColor('#FF5722')
          .setDescription('観たい映画がありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/movie add [タイトル]` で観たい映画を追加してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (wantToWatchMovies.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('movie_watch_select')
          .setPlaceholder('視聴した映画を選択してください')
          .addOptions(
            wantToWatchMovies.map(movie => ({
              label: `${movie.title}`.slice(0, 100),
              description: `備考: ${movie.memo || 'なし'}`.slice(0, 100),
              value: movie.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('🎬 映画視聴記録')
          .setColor('#2196F3')
          .setDescription(`観たい映画が ${wantToWatchMovies.length} 本あります。視聴した映画を選択してください。`)
          .addFields(
            { name: '🎬 観たい映画', value: wantToWatchMovies.map(movie => `🎬 ${movie.title}`).join('\n').slice(0, 1024), inline: false }
          );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleWatchWithPagination(interaction, wantToWatchMovies);
      }
    } catch (error) {
      console.error('映画視聴選択エラー:', error);
      await interaction.editReply('❌ 映画視聴選択中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 観たい映画からスキップ選択
  async handleSkip(interaction) {
    try {
      const wantToWatchMovies = await googleSheets.getMoviesByStatus('want_to_watch');
      
      if (wantToWatchMovies.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('😅 映画スキップ記録')
          .setColor('#FF5722')
          .setDescription('観たい映画がありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/movie add [タイトル]` で観たい映画を追加してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (wantToWatchMovies.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('movie_skip_select')
          .setPlaceholder('スキップする映画を選択してください')
          .addOptions(
            wantToWatchMovies.map(movie => ({
              label: `${movie.title}`.slice(0, 100),
              description: `備考: ${movie.memo || 'なし'}`.slice(0, 100),
              value: movie.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('😅 映画スキップ記録')
          .setColor('#FF9800')
          .setDescription(`観たい映画が ${wantToWatchMovies.length} 本あります。スキップする映画を選択してください。`)
          .addFields(
            { name: '🎬 観たい映画', value: wantToWatchMovies.map(movie => `🎬 ${movie.title}`).join('\n').slice(0, 1024), inline: false }
          );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleSkipWithPagination(interaction, wantToWatchMovies);
      }
    } catch (error) {
      console.error('映画スキップ選択エラー:', error);
      await interaction.editReply('❌ 映画スキップ選択中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 全ての映画から選択
  async handleInfo(interaction) {
    try {
      const allMovies = await googleSheets.getAllMovies();
      
      if (allMovies.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📄 映画の詳細情報')
          .setColor('#FF5722')
          .setDescription('登録されている映画がありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/movie add [タイトル]` で映画を追加してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (allMovies.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('movie_info_select')
          .setPlaceholder('詳細を確認する映画を選択してください')
          .addOptions(
            allMovies.map(movie => ({
              label: `${movie.title}`.slice(0, 100),
              description: `${this.getStatusText(movie.status)} | ${movie.memo || 'メモなし'}`.slice(0, 100),
              value: movie.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('📄 映画の詳細情報')
          .setColor('#3F51B5')
          .setDescription(`登録されている映画が ${allMovies.length} 本あります。詳細を確認する映画を選択してください。`)
          .addFields(
            { name: '🎬 登録済みの映画', value: allMovies.slice(0, 10).map(movie => `${this.getStatusEmoji(movie.status)} ${movie.title}`).join('\n').slice(0, 1024), inline: false }
          );
        
        if (allMovies.length > 10) {
          embed.addFields({ name: '📝 その他', value: `... 他${allMovies.length - 10}本`, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleInfoWithPagination(interaction, allMovies);
      }
    } catch (error) {
      console.error('映画詳細選択エラー:', error);
      await interaction.editReply('❌ 映画詳細選択中にエラーが発生しました。');
    }
  },

  async handleList(interaction) {
    try {
      const movies = await googleSheets.getMovies();
      
      if (movies.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🎬 映画一覧')
          .setColor('#9C27B0')
          .setDescription('まだ映画が登録されていません。')
          .addFields(
            { name: '🎬 映画を追加', value: '`/movie add [タイトル]` で映画を追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const statusOrder = ['want_to_watch', 'watched', 'missed'];
      const groupedMovies = movies.reduce((acc, movie) => {
        const statusMatch = movie.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : 'want_to_watch';
        
        if (!acc[status]) acc[status] = [];
        acc[status].push(movie);
        return acc;
      }, {});
      
      const embed = new EmbedBuilder()
        .setTitle('🎬 映画一覧')
        .setColor('#9C27B0')
        .setDescription(`全 ${movies.length} 本の映画が登録されています`)
        .setTimestamp();
      
      statusOrder.forEach(status => {
        if (groupedMovies[status] && groupedMovies[status].length > 0) {
          const statusName = {
            'want_to_watch': '🎬 観たい映画',
            'watched': '✅ 視聴済み',
            'missed': '😅 見逃し'
          }[status] || status;
          
          const displayMovies = groupedMovies[status].slice(0, 8);
          const moreCount = groupedMovies[status].length - 8;
          
          let fieldValue = displayMovies.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}本`;
          }
          
          embed.addFields({
            name: `${statusName} (${groupedMovies[status].length}本)`,
            value: fieldValue,
            inline: false
          });
        }
      });
      
      embed.setFooter({ text: '操作: /movie watch, /movie skip (選択式で実行可能)' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('映画一覧取得エラー:', error);
      await interaction.editReply('❌ 映画一覧の取得中にエラーが発生しました。');
    }
  },

  async handleWishlist(interaction) {
    try {
      const allMovies = await googleSheets.getMovies();
      
      const wantToWatchMovies = allMovies.filter(movie => {
        const statusMatch = movie.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : '';
        return status === 'want_to_watch';
      });
      
      if (wantToWatchMovies.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🎬 観たい映画一覧')
          .setColor('#E91E63')
          .setDescription('観たい映画はまだ登録されていません。')
          .addFields(
            { name: '🎬 映画を追加', value: '`/movie add [タイトル]` で観たい映画を追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🎬 観たい映画一覧')
        .setColor('#E91E63')
        .setDescription(`観たい映画が ${wantToWatchMovies.length} 本あります`)
        .setTimestamp();
      
      const sortedMovies = wantToWatchMovies.sort((a, b) => {
        const idA = parseInt(a.match(/\[(\d+)\]/)?.[1] || 0);
        const idB = parseInt(b.match(/\[(\d+)\]/)?.[1] || 0);
        return idB - idA;
      });
      
      const maxDisplay = 15;
      const displayMovies = sortedMovies.slice(0, maxDisplay);
      const moreCount = sortedMovies.length - maxDisplay;
      
      let fieldValue = displayMovies.join('\n');
      if (moreCount > 0) {
        fieldValue += `\n... 他${moreCount}本`;
      }
      
      embed.addFields({
        name: `🎬 観たい映画 (${wantToWatchMovies.length}本)`,
        value: fieldValue,
        inline: false
      });
      
      embed.setFooter({ text: '視聴したら /movie watch で記録できます（選択式）' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ 観たい映画一覧取得エラー:', error);
      await interaction.editReply('❌ 観たい映画一覧の取得中にエラーが発生しました。');
    }
  },

  async handleWatched(interaction) {
    try {
      const allMovies = await googleSheets.getMovies();
      
      const watchedMovies = allMovies.filter(movie => {
        const statusMatch = movie.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : '';
        return status === 'watched';
      });
      
      if (watchedMovies.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('✅ 視聴済み映画')
          .setColor('#4CAF50')
          .setDescription('まだ視聴した映画はありません。')
          .addFields(
            { name: '🎬 映画を視聴', value: '`/movie watch` で映画の視聴を記録できます（選択式）', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('✅ 視聴済み映画')
        .setColor('#4CAF50')
        .setDescription(`これまでに ${watchedMovies.length} 本視聴しました！`)
        .setTimestamp();
      
      const displayMovies = watchedMovies.slice(0, 10);
      const moreCount = watchedMovies.length - 10;
      
      let fieldValue = displayMovies.join('\n');
      if (moreCount > 0) {
        fieldValue += `\n... 他${moreCount}本`;
      }
      
      embed.addFields({
        name: `🎬 視聴済み (${watchedMovies.length}本)`,
        value: fieldValue,
        inline: false
      });
      
      embed.setFooter({ text: '感想は /report movie で記録できます' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('視聴済み映画一覧取得エラー:', error);
      await interaction.editReply('❌ 視聴済み映画一覧の取得中にエラーが発生しました。');
    }
  },

  // ページネーション用のヘルパーメソッド
  async handleWatchWithPagination(interaction, movies, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(movies.length / itemsPerPage);
    const currentMovies = movies.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`movie_watch_select_page_${page}`)
      .setPlaceholder('視聴した映画を選択してください')
      .addOptions(
        currentMovies.map(movie => ({
          label: `${movie.title}`.slice(0, 100),
          description: `備考: ${movie.memo || 'なし'}`.slice(0, 100),
          value: movie.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`movie_watch_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`movie_watch_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🎬 映画視聴記録')
      .setColor('#2196F3')
      .setDescription(`観たい映画が ${movies.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { name: '🎬 観たい映画', value: currentMovies.map(movie => `🎬 ${movie.title}`).join('\n').slice(0, 1024), inline: false }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleSkipWithPagination(interaction, movies, page = 0) {
    // handleWatchWithPaginationと同様の実装
    const itemsPerPage = 25;
    const totalPages = Math.ceil(movies.length / itemsPerPage);
    const currentMovies = movies.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`movie_skip_select_page_${page}`)
      .setPlaceholder('スキップする映画を選択してください')
      .addOptions(
        currentMovies.map(movie => ({
          label: `${movie.title}`.slice(0, 100),
          description: `備考: ${movie.memo || 'なし'}`.slice(0, 100),
          value: movie.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`movie_skip_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`movie_skip_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('😅 映画スキップ記録')
      .setColor('#FF9800')
      .setDescription(`観たい映画が ${movies.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { name: '🎬 観たい映画', value: currentMovies.map(movie => `🎬 ${movie.title}`).join('\n').slice(0, 1024), inline: false }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleInfoWithPagination(interaction, movies, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(movies.length / itemsPerPage);
    const currentMovies = movies.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`movie_info_select_page_${page}`)
      .setPlaceholder('詳細を確認する映画を選択してください')
      .addOptions(
        currentMovies.map(movie => ({
          label: `${movie.title}`.slice(0, 100),
          description: `${this.getStatusText(movie.status)} | ${movie.memo || 'メモなし'}`.slice(0, 100),
          value: movie.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`movie_info_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`movie_info_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📄 映画の詳細情報')
      .setColor('#3F51B5')
      .setDescription(`登録されている映画が ${movies.length} 本あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { name: '🎬 登録済みの映画', value: currentMovies.map(movie => `${this.getStatusEmoji(movie.status)} ${movie.title}`).join('\n').slice(0, 1024), inline: false }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  // ヘルパーメソッド
  getStatusEmoji(status) {
    const emojis = {
      'want_to_watch': '🎬',
      'watched': '✅',
      'missed': '😅'
    };
    return emojis[status] || '❓';
  },

  getStatusText(status) {
    const texts = {
      'want_to_watch': '観たい',
      'watched': '視聴済み',
      'missed': '見逃し'
    };
    return texts[status] || status;
  }
};
