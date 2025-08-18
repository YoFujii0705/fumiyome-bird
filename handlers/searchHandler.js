const { EmbedBuilder } = require('discord.js');
const GoogleSheetsService = require('../services/googleSheets');

// GoogleSheetsServiceのインスタンスを作成
const googleSheets = new GoogleSheetsService();

module.exports = {
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const keyword = interaction.options.getString('keyword');
    
    try {
      // キーワードの前処理（空白の除去など）
      const cleanKeyword = keyword.trim();
      
      if (cleanKeyword.length === 0) {
        await interaction.editReply('❌ 検索キーワードを入力してください。');
        return;
      }
      
      if (cleanKeyword.length < 2) {
        await interaction.editReply('❌ 検索キーワードは2文字以上で入力してください。');
        return;
      }
      
      switch (subcommand) {
        case 'book':
          await this.searchBooks(interaction, cleanKeyword);
          break;
        case 'movie':
          await this.searchMovies(interaction, cleanKeyword);
          break;
        case 'activity':
          await this.searchActivities(interaction, cleanKeyword);
          break;
        case 'anime':
          await this.searchAnimes(interaction, cleanKeyword);
          break;
        case 'all':
          await this.searchAll(interaction, cleanKeyword);
          break;
        default:
          await interaction.editReply(`❌ 不明なサブコマンド: ${subcommand}`);
      }
    } catch (error) {
      console.error('SearchHandler エラー:', error);
      await interaction.editReply('❌ 検索中にエラーが発生しました。');
    }
  },

  async searchBooks(interaction, keyword) {
    try {
      const results = await googleSheets.searchBooks(keyword);
      
      if (results.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle(`🔍 本の検索結果: "${keyword}"`)
          .setColor('#9C27B0')
          .setDescription('該当する本が見つかりませんでした。')
          .addFields(
            { name: '💡 検索のコツ', value: '• タイトルの一部や作者名で検索してみてください\n• ひらがな・カタカナでも試してみてください\n• スペースで区切って複数のキーワードで検索', inline: false },
            { name: '📚 本を追加', value: '`/book add [タイトル] [作者]` で新しい本を追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // 結果をステータス別に分類
      const groupedResults = this.groupResultsByStatus(results, 'book');
      
      const embed = new EmbedBuilder()
        .setTitle(`📚 本の検索結果: "${keyword}"`)
        .setColor('#9C27B0')
        .setDescription(`${results.length}件の本が見つかりました`)
        .setTimestamp();
      
      // ステータス別に表示（最大20件）
      let totalDisplayed = 0;
      const maxDisplay = 20;
      
      Object.entries(groupedResults).forEach(([status, items]) => {
        if (items.length > 0 && totalDisplayed < maxDisplay) {
          const statusName = this.getStatusDisplayName('book', status);
          const displayItems = items.slice(0, Math.min(8, maxDisplay - totalDisplayed));
          const moreCount = items.length - displayItems.length;
          
          let fieldValue = displayItems.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}件`;
          }
          
          embed.addFields({
            name: `${statusName} (${items.length}件)`,
            value: fieldValue,
            inline: false
          });
          
          totalDisplayed += displayItems.length;
        }
      });
      
      if (results.length > maxDisplay) {
        embed.setFooter({ text: `${maxDisplay}件まで表示 (全${results.length}件中)` });
      } else {
        embed.setFooter({ text: `全${results.length}件を表示` });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('本検索エラー:', error);
      await interaction.editReply('❌ 本の検索中にエラーが発生しました。');
    }
  },

  async searchMovies(interaction, keyword) {
    try {
      const results = await googleSheets.searchMovies(keyword);
      
      if (results.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle(`🔍 映画の検索結果: "${keyword}"`)
          .setColor('#E91E63')
          .setDescription('該当する映画が見つかりませんでした。')
          .addFields(
            { name: '💡 検索のコツ', value: '• タイトルの一部で検索してみてください\n• 英語・日本語どちらでも試してみてください\n• ジャンルや年代でも検索可能', inline: false },
            { name: '🎬 映画を追加', value: '`/movie add [タイトル]` で新しい映画を追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const groupedResults = this.groupResultsByStatus(results, 'movie');
      
      const embed = new EmbedBuilder()
        .setTitle(`🎬 映画の検索結果: "${keyword}"`)
        .setColor('#E91E63')
        .setDescription(`${results.length}本の映画が見つかりました`)
        .setTimestamp();
      
      let totalDisplayed = 0;
      const maxDisplay = 20;
      
      Object.entries(groupedResults).forEach(([status, items]) => {
        if (items.length > 0 && totalDisplayed < maxDisplay) {
          const statusName = this.getStatusDisplayName('movie', status);
          const displayItems = items.slice(0, Math.min(8, maxDisplay - totalDisplayed));
          const moreCount = items.length - displayItems.length;
          
          let fieldValue = displayItems.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}件`;
          }
          
          embed.addFields({
            name: `${statusName} (${items.length}件)`,
            value: fieldValue,
            inline: false
          });
          
          totalDisplayed += displayItems.length;
        }
      });
      
      if (results.length > maxDisplay) {
        embed.setFooter({ text: `${maxDisplay}件まで表示 (全${results.length}件中)` });
      } else {
        embed.setFooter({ text: `全${results.length}件を表示` });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('映画検索エラー:', error);
      await interaction.editReply('❌ 映画の検索中にエラーが発生しました。');
    }
  },

  async searchActivities(interaction, keyword) {
    try {
      const results = await googleSheets.searchActivities(keyword);
      
      if (results.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle(`🔍 活動の検索結果: "${keyword}"`)
          .setColor('#00BCD4')
          .setDescription('該当する活動が見つかりませんでした。')
          .addFields(
            { name: '💡 検索のコツ', value: '• 活動内容の一部で検索してみてください\n• 関連キーワードでも試してみてください\n• カテゴリ名（学習、運動など）でも検索可能', inline: false },
            { name: '🎯 活動を追加', value: '`/activity add [内容]` で新しい活動を追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const groupedResults = this.groupResultsByStatus(results, 'activity');
      
      const embed = new EmbedBuilder()
        .setTitle(`🎯 活動の検索結果: "${keyword}"`)
        .setColor('#00BCD4')
        .setDescription(`${results.length}件の活動が見つかりました`)
        .setTimestamp();
      
      let totalDisplayed = 0;
      const maxDisplay = 20;
      
      Object.entries(groupedResults).forEach(([status, items]) => {
        if (items.length > 0 && totalDisplayed < maxDisplay) {
          const statusName = this.getStatusDisplayName('activity', status);
          const displayItems = items.slice(0, Math.min(8, maxDisplay - totalDisplayed));
          const moreCount = items.length - displayItems.length;
          
          let fieldValue = displayItems.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}件`;
          }
          
          embed.addFields({
            name: `${statusName} (${items.length}件)`,
            value: fieldValue,
            inline: false
          });
          
          totalDisplayed += displayItems.length;
        }
      });
      
      if (results.length > maxDisplay) {
        embed.setFooter({ text: `${maxDisplay}件まで表示 (全${results.length}件中)` });
      } else {
        embed.setFooter({ text: `全${results.length}件を表示` });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('活動検索エラー:', error);
      await interaction.editReply('❌ 活動の検索中にエラーが発生しました。');
    }
  },

  async searchAnimes(interaction, keyword) {
    try {
      const results = await googleSheets.searchAnimes(keyword);
      
      if (results.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle(`🔍 アニメの検索結果: "${keyword}"`)
          .setColor('#d9aacd')
          .setDescription('該当する活動が見つかりませんでした。')
          .addFields(
            { name: '💡 検索のコツ', value: '• 活動内容の一部で検索してみてください\n• 関連キーワードでも試してみてください\n• カテゴリ名（学習、運動など）でも検索可能', inline: false },
            { name: '📺 アニメを追加', value: '`/anime add [内容]` で新しいアニメを追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const groupedResults = this.groupResultsByStatus(results, 'anime');
      
      const embed = new EmbedBuilder()
        .setTitle(`📺 アニメの検索結果: "${keyword}"`)
        .setColor('#d9aacd')
        .setDescription(`${results.length}件の活動が見つかりました`)
        .setTimestamp();
      
      let totalDisplayed = 0;
      const maxDisplay = 20;
      
      Object.entries(groupedResults).forEach(([status, items]) => {
        if (items.length > 0 && totalDisplayed < maxDisplay) {
          const statusName = this.getStatusDisplayName('anime', status);
          const displayItems = items.slice(0, Math.min(8, maxDisplay - totalDisplayed));
          const moreCount = items.length - displayItems.length;
          
          let fieldValue = displayItems.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}件`;
          }
          
          embed.addFields({
            name: `${statusName} (${items.length}件)`,
            value: fieldValue,
            inline: false
          });
          
          totalDisplayed += displayItems.length;
        }
      });
      
      if (results.length > maxDisplay) {
        embed.setFooter({ text: `${maxDisplay}件まで表示 (全${results.length}件中)` });
      } else {
        embed.setFooter({ text: `全${results.length}件を表示` });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('アニメ検索エラー:', error);
      await interaction.editReply('❌ アニメの検索中にエラーが発生しました。');
    }
  },

  async searchAll(interaction, keyword) {
    try {
      const [books, movies, activities] = await Promise.all([
        googleSheets.searchBooks(keyword),
        googleSheets.searchMovies(keyword),
        googleSheets.searchActivities(keyword)
      ]);
      
      const totalResults = books.length + movies.length + activities.length;
      
      if (totalResults === 0) {
        const embed = new EmbedBuilder()
          .setTitle(`🔍 全体検索結果: "${keyword}"`)
          .setColor('#FF9800')
          .setDescription('該当するアイテムが見つかりませんでした。')
          .addFields(
            { name: '💡 検索のコツ', value: '• より一般的なキーワードで試してみてください\n• 部分一致で検索されるので、短めのキーワードも効果的\n• カテゴリを限定して検索してみてください', inline: false },
            { name: '📋 新規追加', value: '• `/book add` - 本を追加\n• `/movie add` - 映画を追加\n• `/activity add` - 活動を追加', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`🔍 全体検索結果: "${keyword}"`)
        .setColor('#FF9800')
        .setDescription(`全${totalResults}件のアイテムが見つかりました`)
        .setTimestamp();
      
      // カテゴリ別に結果を表示
      const categories = [
        { name: '📚 本', items: books, maxDisplay: 5 },
        { name: '🎬 映画', items: movies, maxDisplay: 5 },
        { name: '🎯 活動', items: activities, maxDisplay: 5 }
      ];
      
      categories.forEach(category => {
        if (category.items.length > 0) {
          const displayItems = category.items.slice(0, category.maxDisplay);
          const moreCount = category.items.length - displayItems.length;
          
          let fieldValue = displayItems.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}件`;
          }
          
          embed.addFields({
            name: `${category.name} (${category.items.length}件)`,
            value: fieldValue,
            inline: false
          });
        }
      });
      
      // 詳細検索の提案
      embed.addFields({
        name: '🔍 詳細検索',
        value: '• `/search book` - 本のみ検索\n• `/search movie` - 映画のみ検索\n• `/search activity` - 活動のみ検索',
        inline: false
      });
      
      embed.setFooter({ text: `全体で${totalResults}件見つかりました` });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('全体検索エラー:', error);
      await interaction.editReply('❌ 検索中にエラーが発生しました。');
    }
  },

  // 結果をステータス別にグループ化
  groupResultsByStatus(results, category) {
    const grouped = {};
    
    results.forEach(result => {
      // 結果文字列からステータスを抽出
      const statusMatch = result.match(/\(([^)]+)\)$/);
      const status = statusMatch ? statusMatch[1] : 'unknown';
      
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(result);
    });
    
    return grouped;
  },

  // ステータスの表示名を取得
  getStatusDisplayName(category, status) {
    const statusNames = {
      book: {
        'want_to_buy': '🛒 買いたい本',
        'want_to_read': '📋 積読本',
        'reading': '📖 読書中',
        'finished': '✅ 読了済み',
        'abandoned': '❌ 中断'
      },
      movie: {
        'want_to_watch': '🍿 観たい映画',
        'watched': '✅ 視聴済み',
        'missed': '😅 見逃し'
      },
      activity: {
        'planned': '🎯 予定中',
        'done': '✅ 完了済み',
        'skipped': '😅 スキップ'
      }
    };
    
    return statusNames[category]?.[status] || `${status}`;
  },

  // 高度な検索機能（将来の拡張用）
  async advancedSearch(category, filters) {
    try {
      // フィルタ例：
      // - status: ステータスで絞り込み
      // - dateRange: 日付範囲で絞り込み
      // - priority: 優先度で絞り込み（将来実装）
      
      let results = [];
      
      switch (category) {
        case 'book':
          results = await googleSheets.searchBooks(filters.keyword || '');
          break;
        case 'movie':
          results = await googleSheets.searchMovies(filters.keyword || '');
          break;
        case 'activity':
          results = await googleSheets.searchActivities(filters.keyword || '');
          break;
      }
      
      // ステータスフィルタを適用
      if (filters.status) {
        results = results.filter(result => result.includes(`(${filters.status})`));
      }
      
      return results;
    } catch (error) {
      console.error('高度な検索エラー:', error);
      return [];
    }
  },

  // 検索結果の統計情報を生成
  generateSearchStats(books, movies, activities) {
    return {
      total: books.length + movies.length + activities.length,
      byCategory: {
        books: books.length,
        movies: movies.length,
        activities: activities.length
      },
      mostPopularCategory: books.length >= movies.length && books.length >= activities.length ? 'books' :
                          movies.length >= activities.length ? 'movies' : 'activities'
    };
  },

  // 検索履歴の管理（将来の拡張用）
  async logSearch(userId, keyword, category, resultCount) {
    try {
      // 検索履歴をログに記録
      console.log(`検索ログ: ユーザー=${userId}, キーワード="${keyword}", カテゴリ=${category}, 結果数=${resultCount}`);
      
      // 将来的にはデータベースやGoogle Sheetsに保存
      return true;
    } catch (error) {
      console.error('検索ログエラー:', error);
      return false;
    }
  },

  // 関連キーワードの提案
  suggestRelatedKeywords(keyword, category) {
    const suggestions = {
      book: {
        '小説': ['文学', 'ノベル', '物語', 'ストーリー'],
        '技術': ['プログラミング', 'IT', 'エンジニア', '開発'],
        '自己啓発': ['ビジネス', '成功', '成長', 'スキル']
      },
      movie: {
        'アクション': ['冒険', 'バトル', '戦闘', 'スリル'],
        'ドラマ': ['人間ドラマ', '感動', '家族', '恋愛'],
        'コメディ': ['笑い', 'ユーモア', '面白い', 'ギャグ']
      },
      activity: {
        '学習': ['勉強', 'スキル', '資格', '習得'],
        '運動': ['筋トレ', 'ジョギング', 'ヨガ', 'ストレッチ'],
        '創作': ['制作', 'アート', 'デザイン', '表現']
      }
    };
    
    const categoryList = suggestions[category] || {};
    
    for (const [key, relatedWords] of Object.entries(categoryList)) {
      if (keyword.includes(key)) {
        return relatedWords.slice(0, 3); // 最大3つまで提案
      }
    }
    
    return [];
  }
};
