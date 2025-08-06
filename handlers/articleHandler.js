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
        case 'read':
          await this.handleRead(interaction);
          break;
        case 'list':
          await this.handleList(interaction);
          break;
        case 'pending':
          await this.handlePending(interaction);
          break;
        case 'read_list':
          await this.handleReadList(interaction);
          break;
        case 'info':
          await this.handleInfo(interaction);
          break;
        case 'remove':
          await this.handleRemove(interaction);
          break;
        default:
          await interaction.editReply(`❌ 不明なサブコマンド: ${subcommand}`);
      }
    } catch (error) {
      console.error('ArticleHandler エラー:', error);
      await interaction.editReply('❌ 処理中にエラーが発生しました。');
    }
  },

  async handleAdd(interaction) {
    const title = interaction.options.getString('title');
    const url = interaction.options.getString('url');
    const priority = interaction.options.getString('priority') || 'medium';
    const category = interaction.options.getString('category') || 'general';
    const memo = interaction.options.getString('memo') || '';
    
    try {
      const articleId = await googleSheets.addArticle(title, url, priority, category, memo);
      
      const priorityText = {
        'high': '高',
        'medium': '中',
        'low': '低'
      };
      
      const priorityEmoji = {
        'high': '🔴',
        'medium': '🟡',
        'low': '🟢'
      };
      
      const categoryEmoji = {
        'tech': '💻',
        'business': '💼',
        'lifestyle': '🌟',
        'news': '📰',
        'academic': '🎓',
        'general': '📄'
      };
      
      const embed = new EmbedBuilder()
        .setTitle('📝 読みたい記事を追加しました！')
        .setColor('#2196F3')
        .setDescription(`${priorityEmoji[priority]} 読書リストに新しい記事が追加されました！`)
        .addFields(
          { name: 'ID', value: articleId.toString(), inline: true },
          { name: 'タイトル', value: title, inline: true },
          { name: '優先度', value: `${priorityEmoji[priority]} ${priorityText[priority]}`, inline: true },
          { name: 'カテゴリ', value: `${categoryEmoji[category]} ${category}`, inline: true }
        )
        .setTimestamp();
      
      if (url) {
        embed.addFields({ name: 'URL', value: `[記事を開く](${url})`, inline: false });
      }
      
      if (memo) {
        embed.addFields({ name: '備考', value: memo, inline: false });
      }
      
      embed.setFooter({ text: '読了したら /article read で完了記録を！' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('記事追加エラー:', error);
      await interaction.editReply('❌ 記事の追加中にエラーが発生しました。');
    }
  },

  async handleRead(interaction) {
    const readId = interaction.options.getInteger('id');
    const rating = interaction.options.getInteger('rating');
    const review = interaction.options.getString('review') || '';
    
    try {
      const readArticle = await googleSheets.markArticleAsRead(readId, rating, review);
      
      if (readArticle) {
        const ratingStars = rating ? '⭐'.repeat(rating) : '';
        
        const embed = new EmbedBuilder()
          .setTitle('🎉 記事を読了しました！')
          .setColor('#4CAF50')
          .setDescription('素晴らしい！新しい知識を獲得しましたね！📚✨')
          .addFields(
            { name: 'ID', value: readArticle.id.toString(), inline: true },
            { name: 'タイトル', value: readArticle.title, inline: true },
            { name: 'ステータス変更', value: '📝 未読 → ✅ 読了', inline: false }
          )
          .setTimestamp();
        
        if (rating) {
          embed.addFields({ name: '評価', value: `${ratingStars} (${rating}/5)`, inline: true });
        }
        
        if (review) {
          embed.addFields({ name: 'レビュー', value: review, inline: false });
        }
        
        if (readArticle.url) {
          embed.addFields({ name: 'URL', value: `[記事リンク](${readArticle.url})`, inline: false });
        }
        
        if (readArticle.memo) {
          embed.addFields({ name: '備考', value: readArticle.memo, inline: false });
        }
        
        embed.setFooter({ text: '感想を /report article で記録してみませんか？' });
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❓ 記事が見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${readId} の記事が見つからないか、既に読了済みです。`)
          .addFields(
            { name: '💡 確認方法', value: '`/article pending` で未読記事一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('記事読了記録エラー:', error);
      await interaction.editReply('❌ 記事読了記録中にエラーが発生しました。');
    }
  },

  async handleList(interaction) {
    try {
      const articles = await googleSheets.getArticles();
      
      if (articles.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📝 読みたい記事リスト')
          .setColor('#2196F3')
          .setDescription('まだ記事が登録されていません。')
          .addFields(
            { name: '📰 記事を追加', value: '`/article add [タイトル] [URL]` で記事を追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // 記事をステータス別に分類
      const statusOrder = ['want_to_read', 'read'];
      const groupedArticles = articles.reduce((acc, article) => {
        // 記事の文字列からステータスを抽出
        const statusMatch = article.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : 'want_to_read';
        
        if (!acc[status]) acc[status] = [];
        acc[status].push(article);
        return acc;
      }, {});
      
      const embed = new EmbedBuilder()
        .setTitle('📝 読みたい記事リスト')
        .setColor('#2196F3')
        .setDescription(`全 ${articles.length} 記事が登録されています`)
        .setTimestamp();
      
      // ステータス別に表示
      statusOrder.forEach(status => {
        if (groupedArticles[status] && groupedArticles[status].length > 0) {
          const statusName = {
            'want_to_read': '📝 未読',
            'read': '✅ 読了済み'
          }[status] || status;
          
          // 最大8件まで表示
          const displayArticles = groupedArticles[status].slice(0, 8);
          const moreCount = groupedArticles[status].length - 8;
          
          let fieldValue = displayArticles.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}記事`;
          }
          
          embed.addFields({
            name: `${statusName} (${groupedArticles[status].length}記事)`,
            value: fieldValue,
            inline: false
          });
        }
      });
      
      embed.setFooter({ text: '操作: /article read [ID], /article info [ID]' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('記事一覧取得エラー:', error);
      await interaction.editReply('❌ 記事一覧の取得中にエラーが発生しました。');
    }
  },

  async handlePending(interaction) {
    try {
      const pendingArticles = await googleSheets.getPendingArticles();
      
      if (pendingArticles.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📝 未読記事')
          .setColor('#FF9800')
          .setDescription('未読の記事はありません。')
          .addFields(
            { name: '📰 記事を追加', value: '`/article add` で新しい記事を追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // 優先度・カテゴリ別に分類
      const categories = {
        '🔴 高優先度': [],
        '💻 技術記事': [],
        '💼 ビジネス': [],
        '📰 ニュース': [],
        '📄 その他': []
      };
      
      // 簡易的なカテゴリ分類（実際の実装では適切な情報を使用）
      pendingArticles.forEach(article => {
        if (article.includes('高') || article.includes('urgent')) {
          categories['🔴 高優先度'].push(article);
        } else if (article.includes('tech') || article.includes('技術') || article.includes('プログラミング')) {
          categories['💻 技術記事'].push(article);
        } else if (article.includes('business') || article.includes('ビジネス') || article.includes('経営')) {
          categories['💼 ビジネス'].push(article);
        } else if (article.includes('news') || article.includes('ニュース')) {
          categories['📰 ニュース'].push(article);
        } else {
          categories['📄 その他'].push(article);
        }
      });
      
      const embed = new EmbedBuilder()
        .setTitle('📝 未読記事')
        .setColor('#FF9800')
        .setDescription(`読み待ちの記事が ${pendingArticles.length} 記事あります`)
        .setTimestamp();
      
      // カテゴリ別に表示
      Object.entries(categories).forEach(([categoryName, articles]) => {
        if (articles.length > 0) {
          // 最大5件まで表示
          const displayArticles = articles.slice(0, 5);
          const moreCount = articles.length - 5;
          
          let fieldValue = displayArticles.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}記事`;
          }
          
          embed.addFields({
            name: `${categoryName} (${articles.length}記事)`,
            value: fieldValue,
            inline: false
          });
        }
      });
      
      embed.setFooter({ text: '読了したら /article read [ID] で完了記録を！' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('未読記事一覧取得エラー:', error);
      await interaction.editReply('❌ 未読記事一覧の取得中にエラーが発生しました。');
    }
  },

  async handleReadList(interaction) {
    try {
      const readArticles = await googleSheets.getReadArticles();
      
      if (readArticles.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('✅ 読了済み記事')
          .setColor('#4CAF50')
          .setDescription('読了済みの記事はまだありません。')
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // 最近読んだものを上位に表示
      const recentArticles = readArticles.slice(0, 10);
      const totalArticles = readArticles.length;
      
      const embed = new EmbedBuilder()
        .setTitle('✅ 読了済み記事')
        .setColor('#4CAF50')
        .setDescription(`これまでに ${totalArticles} 記事を読了しました`)
        .setTimestamp();
      
      if (recentArticles.length > 0) {
        embed.addFields({
          name: '📚 最近読了した記事',
          value: recentArticles.join('\n'),
          inline: false
        });
      }
      
      // 簡易統計情報
      embed.addFields(
        { name: '📊 統計', value: `読了完了: ${totalArticles}記事`, inline: true },
        { name: '🎯 知識レベル', value: '向上中！', inline: true }
      );
      
      embed.setFooter({ text: '読書統計は /stats で詳しく確認できます' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('読了済み記事一覧取得エラー:', error);
      await interaction.editReply('❌ 読了済み記事一覧の取得中にエラーが発生しました。');
    }
  },

  async handleInfo(interaction) {
    const articleId = interaction.options.getInteger('id');
    
    try {
      const article = await googleSheets.getArticleInfo(articleId);
      
      if (!article) {
        const embed = new EmbedBuilder()
          .setTitle('❓ 記事が見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${articleId} の記事が見つかりません。`)
          .addFields(
            { name: '💡 確認方法', value: '`/article list` で記事一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const statusEmoji = {
        'want_to_read': '📝',
        'read': '✅'
      };
      
      const statusText = {
        'want_to_read': '未読',
        'read': '読了済み'
      };
      
      const priorityEmoji = {
        'high': '🔴',
        'medium': '🟡',
        'low': '🟢'
      };
      
      const categoryEmoji = {
        'tech': '💻',
        'business': '💼',
        'lifestyle': '🌟',
        'news': '📰',
        'academic': '🎓',
        'general': '📄'
      };
      
      const embed = new EmbedBuilder()
        .setTitle(`${statusEmoji[article.status]} ${article.title}`)
        .setColor(article.status === 'read' ? '#4CAF50' : '#2196F3')
        .setDescription('記事詳細情報')
        .addFields(
          { name: 'ID', value: article.id.toString(), inline: true },
          { name: 'ステータス', value: `${statusEmoji[article.status]} ${statusText[article.status]}`, inline: true },
          { name: '優先度', value: `${priorityEmoji[article.priority]} ${article.priority === 'high' ? '高' : article.priority === 'medium' ? '中' : '低'}`, inline: true },
          { name: 'カテゴリ', value: `${categoryEmoji[article.category]} ${article.category}`, inline: true }
        )
        .setTimestamp();
      
      if (article.url) {
        embed.addFields({ name: 'URL', value: `[記事を開く](${article.url})`, inline: false });
      }
      
      if (article.status === 'read') {
        if (article.rating) {
          const ratingStars = '⭐'.repeat(article.rating);
          embed.addFields({ name: '評価', value: `${ratingStars} (${article.rating}/5)`, inline: true });
        }
        
        if (article.review) {
          embed.addFields({ name: 'レビュー', value: article.review, inline: false });
        }
      }
      
      if (article.memo) {
        embed.addFields({ name: '備考', value: article.memo, inline: false });
      }
      
      embed.addFields(
        { name: '登録日', value: article.createdAt || '不明', inline: true },
        { name: '更新日', value: article.updatedAt || '不明', inline: true }
      );
      
      if (article.status === 'want_to_read') {
        embed.setFooter({ text: '読了したら /article read で完了記録を！' });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('記事詳細取得エラー:', error);
      await interaction.editReply('❌ 記事詳細の取得中にエラーが発生しました。');
    }
  },

  async handleRemove(interaction) {
    const removeId = interaction.options.getInteger('id');
    
    try {
      const removedArticle = await googleSheets.removeArticle(removeId);
      
      if (removedArticle) {
        const embed = new EmbedBuilder()
          .setTitle('🗑️ 記事を削除しました')
          .setColor('#FF5722')
          .setDescription('読みたい記事リストから記事が削除されました。')
          .addFields(
            { name: 'ID', value: removedArticle.id.toString(), inline: true },
            { name: 'タイトル', value: removedArticle.title, inline: true }
          )
          .setTimestamp();
        
        if (removedArticle.memo) {
          embed.addFields({ name: '備考', value: removedArticle.memo, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❓ 記事が見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${removeId} の記事が見つかりません。`)
          .addFields(
            { name: '💡 確認方法', value: '`/article list` で記事一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('記事削除エラー:', error);
      await interaction.editReply('❌ 記事の削除中にエラーが発生しました。');
    }
  }
};
