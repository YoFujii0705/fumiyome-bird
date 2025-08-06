const { EmbedBuilder } = require('discord.js');
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
        case 'watch':
          await this.handleWatch(interaction);
          break;
        case 'skip':
          await this.handleSkip(interaction);
          break;
        case 'list':
          await this.handleList(interaction);
          break;
        case 'watchlist':
          await this.handleWatchlist(interaction);
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
        .setColor('#E91E63')
        .addFields(
          { name: 'ID', value: movieId.toString(), inline: true },
          { name: 'タイトル', value: title, inline: true },
          { name: 'ステータス', value: '観たい', inline: true }
        )
        .setDescription('映画リストに追加されました！🍿✨')
        .setTimestamp();
      
      if (memo) {
        embed.addFields({ name: '備考', value: memo, inline: false });
      }
      
      embed.setFooter({ text: '視聴したら /movie watch で記録しましょう！' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('映画追加エラー:', error);
      await interaction.editReply('❌ 映画の追加中にエラーが発生しました。');
    }
  },

  async handleWatch(interaction) {
    const watchId = interaction.options.getInteger('id');
    
    try {
      const watchedMovie = await googleSheets.watchMovie(watchId);
      
      if (watchedMovie) {
        const embed = new EmbedBuilder()
          .setTitle('🎉 視聴完了！')
          .setColor('#4CAF50')
          .setDescription('素晴らしい！また一つ作品を完走しましたね！🎬✨')
          .addFields(
            { name: 'ID', value: watchedMovie.id.toString(), inline: true },
            { name: 'タイトル', value: watchedMovie.title, inline: true },
            { name: 'ステータス変更', value: '観たい → 視聴済み', inline: true }
          )
          .setFooter({ text: '感想を /report movie で記録してみませんか？' })
          .setTimestamp();
        
        if (watchedMovie.memo) {
          embed.addFields({ name: '備考', value: watchedMovie.memo, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❓ 映画が見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${watchId} の映画が見つからないか、既に視聴済みです。`)
          .addFields(
            { name: '💡 確認方法', value: '`/movie list` で映画一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('視聴記録エラー:', error);
      await interaction.editReply('❌ 視聴記録中にエラーが発生しました。');
    }
  },

  async handleSkip(interaction) {
    const skipId = interaction.options.getInteger('id');
    
    try {
      const skippedMovie = await googleSheets.skipMovie(skipId);
      
      if (skippedMovie) {
        const embed = new EmbedBuilder()
          .setTitle('😅 見逃してしまいました')
          .setColor('#FF9800')
          .setDescription('大丈夫です！また機会があったら挑戦してみてください！')
          .addFields(
            { name: 'ID', value: skippedMovie.id.toString(), inline: true },
            { name: 'タイトル', value: skippedMovie.title, inline: true },
            { name: 'ステータス変更', value: '観たい → 見逃し', inline: true }
          )
          .setFooter({ text: '時間ができたら再挑戦してみましょう！' })
          .setTimestamp();
        
        if (skippedMovie.memo) {
          embed.addFields({ name: '備考', value: skippedMovie.memo, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❓ 映画が見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${skipId} の映画が見つからないか、既に処理済みです。`)
          .addFields(
            { name: '💡 確認方法', value: '`/movie list` で映画一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('見逃し記録エラー:', error);
      await interaction.editReply('❌ 見逃し記録中にエラーが発生しました。');
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
            { name: '🍿 映画を追加', value: '`/movie add [タイトル]` で映画を追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // 映画をステータス別に分類
      const statusOrder = ['want_to_watch', 'watched', 'missed'];
      const groupedMovies = movies.reduce((acc, movie) => {
        // 映画文字列からステータスを抽出 (例: "🎬 [1] Title (want_to_watch)")
        const statusMatch = movie.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : 'want_to_watch';
        
        if (!acc[status]) acc[status] = [];
        acc[status].push(movie);
        return acc;
      }, {});
      
      const embed = new EmbedBuilder()
        .setTitle('🎬 映画一覧')
        .setColor('#9C27B0')
        .setDescription(`全 ${movies.length} 作品`)
        .setTimestamp();
      
      // ステータス別に表示
      statusOrder.forEach(status => {
        if (groupedMovies[status] && groupedMovies[status].length > 0) {
          const statusName = {
            'want_to_watch': '🍿 観たい映画',
            'watched': '✅ 視聴済み',
            'missed': '😅 見逃し'
          }[status] || status;
          
          // 最大10件まで表示
          const displayMovies = groupedMovies[status].slice(0, 10);
          const moreCount = groupedMovies[status].length - 10;
          
          let fieldValue = displayMovies.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}件`;
          }
          
          embed.addFields({
            name: `${statusName} (${groupedMovies[status].length}件)`,
            value: fieldValue,
            inline: false
          });
        }
      });
      
      embed.setFooter({ text: '操作: /movie watch [ID] または /movie skip [ID]' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('映画一覧取得エラー:', error);
      await interaction.editReply('❌ 映画一覧の取得中にエラーが発生しました。');
    }
  },

  async handleWatchlist(interaction) {
    try {
      const movies = await googleSheets.getMovies();
      const wantToWatchMovies = movies.filter(movie => movie.includes('(want_to_watch)'));
      
      if (wantToWatchMovies.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🍿 観たい映画一覧')
          .setColor('#FF9800')
          .setDescription('観たい映画がまだ登録されていません。')
          .addFields(
            { name: '🎬 映画を追加', value: '`/movie add [タイトル]` で観たい映画を追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🍿 観たい映画一覧')
        .setColor('#FF9800')
        .setDescription(`${wantToWatchMovies.length} 本の映画が観たいリストにあります`)
        .setTimestamp();
      
      // 最大15件まで表示
      const displayMovies = wantToWatchMovies.slice(0, 15);
      const moreCount = wantToWatchMovies.length - 15;
      
      let movieList = displayMovies.join('\n');
      if (moreCount > 0) {
        movieList += `\n... 他${moreCount}件`;
      }
      
      embed.addFields({
        name: '🎬 映画リスト',
        value: movieList,
        inline: false
      });
      
      embed.setFooter({ text: '視聴したら /movie watch [ID] で記録しましょう！' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('観たい映画一覧取得エラー:', error);
      await interaction.editReply('❌ 観たい映画一覧の取得中にエラーが発生しました。');
    }
  },

  async handleWatched(interaction) {
    try {
      const movies = await googleSheets.getMovies();
      const watchedMovies = movies.filter(movie => movie.includes('(watched)'));
      
      if (watchedMovies.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('✅ 視聴済み映画一覧')
          .setColor('#4CAF50')
          .setDescription('まだ視聴済みの映画がありません。')
          .addFields(
            { name: '🎬 映画を観る', value: '観たい映画を `/movie watch [ID]` で視聴済みにできます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('✅ 視聴済み映画一覧')
        .setColor('#4CAF50')
        .setDescription(`${watchedMovies.length} 本の映画を視聴済みです`)
        .setTimestamp();
      
      // 最大15件まで表示
      const displayMovies = watchedMovies.slice(0, 15);
      const moreCount = watchedMovies.length - 15;
      
      let movieList = displayMovies.join('\n');
      if (moreCount > 0) {
        movieList += `\n... 他${moreCount}件`;
      }
      
      embed.addFields({
        name: '🎬 視聴済み映画',
        value: movieList,
        inline: false
      });
      
      embed.setFooter({ text: '感想は /report movie [ID] で記録できます' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('視聴済み映画一覧取得エラー:', error);
      await interaction.editReply('❌ 視聴済み映画一覧の取得中にエラーが発生しました。');
    }
  },

  async handleInfo(interaction) {
    try {
      const id = interaction.options.getInteger('id');
      const itemInfo = await googleSheets.getItemInfo('movie', id);
      
      if (!itemInfo) {
        const embed = new EmbedBuilder()
          .setTitle('❓ 映画が見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${id} の映画が見つかりませんでした。`)
          .addFields(
            { name: '💡 確認方法', value: '`/movie list` で映画一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // 映画の詳細情報を取得
      const movies = await googleSheets.getMovies();
      const movieData = movies.find(movie => movie.includes(`[${id}]`));
      
      let status = 'want_to_watch';
      if (movieData) {
        if (movieData.includes('(watched)')) status = 'watched';
        else if (movieData.includes('(missed)')) status = 'missed';
      }
      
      const statusEmoji = {
        'want_to_watch': '🍿',
        'watched': '✅',
        'missed': '😅'
      };
      
      const statusText = {
        'want_to_watch': '観たい',
        'watched': '視聴済み',
        'missed': '見逃し'
      };
      
      const embed = new EmbedBuilder()
        .setTitle(`🎬 ${itemInfo.title}`)
        .setColor('#E91E63')
        .addFields(
          { name: 'ID', value: id.toString(), inline: true },
          { name: 'ステータス', value: `${statusEmoji[status]} ${statusText[status]}`, inline: true },
          { name: 'タイトル', value: itemInfo.title, inline: false }
        )
        .setTimestamp();
      
      // レポート履歴を取得
      const reports = await googleSheets.getReportsByItem('movie', id);
      if (reports.length > 0) {
        const recentReports = reports.slice(0, 3);
        const reportList = recentReports.map(report => {
          const date = new Date(report.date).toLocaleDateString('ja-JP');
          return `📅 ${date}: ${report.content.substring(0, 50)}...`;
        }).join('\n');
        
        embed.addFields({
          name: `📝 最近のレポート (${reports.length}件)`,
          value: reportList,
          inline: false
        });
      }
      
      // アクション提案
      const actions = [];
      if (status === 'want_to_watch') {
        actions.push('`/movie watch` で視聴済みに');
        actions.push('`/movie skip` で見逃しに');
      }
      actions.push('`/report movie` で感想を記録');
      
      if (actions.length > 0) {
        embed.addFields({
          name: '💡 できること',
          value: actions.join('\n'),
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('映画詳細取得エラー:', error);
      await interaction.editReply('❌ 映画詳細の取得中にエラーが発生しました。');
    }
  }
};
