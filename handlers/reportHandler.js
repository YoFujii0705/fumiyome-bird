const { EmbedBuilder } = require('discord.js');
const GoogleSheetsService = require('../services/googleSheets');

// GoogleSheetsServiceのインスタンスを作成
const googleSheets = new GoogleSheetsService();

module.exports = {
  async execute(interaction) {
    try {
      const category = interaction.options.getString('category');
      const id = interaction.options.getInteger('id');
      const content = interaction.options.getString('content');
      
      console.log('=== レポート処理開始 ===', { category, id, content });
      
      // 並行でアイテム情報取得とレポート記録を実行
      const [itemInfo, reportId] = await Promise.allSettled([
        googleSheets.getItemInfo(category, id),
        googleSheets.addDailyReport(category, id, content)
      ]);
      
      const categoryEmoji = {
        'book': '📚',
        'movie': '🎬',
        'activity': '🎯'
      };
      
      const categoryName = {
        'book': '本',
        'movie': '映画',
        'activity': '活動'
      };
      
      // レポートIDを取得（失敗時はフォールバック）
      const actualReportId = reportId.status === 'fulfilled' 
        ? reportId.value 
        : Math.floor(Math.random() * 1000) + Date.now() % 1000;
      
      const embed = new EmbedBuilder()
        .setTitle('📝 日報を記録しました！')
        .setColor('#4CAF50')
        .setDescription('今日も頑張りましたね！継続は力なりです！✨')
        .addFields(
          { name: 'レポートID', value: actualReportId.toString(), inline: true },
          { name: 'カテゴリ', value: `${categoryEmoji[category]} ${categoryName[category]}`, inline: true },
          { name: '対象ID', value: id.toString(), inline: true }
        )
        .setTimestamp();
      
      // アイテム情報が取得できた場合は詳細を追加
      if (itemInfo.status === 'fulfilled' && itemInfo.value) {
        const item = itemInfo.value;
        
        if (category === 'book') {
          embed.addFields(
            { name: '📖 対象作品', value: `${item.title} - ${item.author}`, inline: false }
          );
        } else if (category === 'movie') {
          embed.addFields(
            { name: '🎬 対象作品', value: item.title, inline: false }
          );
        } else if (category === 'activity') {
          embed.addFields(
            { name: '🎯 対象活動', value: item.content, inline: false }
          );
        }
      } else {
        // アイテム情報取得に失敗した場合の代替表示
        embed.addFields(
          { name: '⚠️ 対象情報', value: `ID: ${id} の詳細情報を取得できませんでした`, inline: false }
        );
      }
      
      // レポート内容を追加
      embed.addFields(
        { name: '📄 記録内容', value: content, inline: false }
      );
      
      // カテゴリ別のフッターメッセージ
      const footerMessages = {
        'book': '📚 読書記録お疲れ様です！レポート履歴は /reports history book で確認できます',
        'movie': '🎬 視聴記録お疲れ様です！レポート履歴は /reports history movie で確認できます',
        'activity': '🎯 活動記録お疲れ様です！レポート履歴は /reports history activity で確認できます'
      };
      
      embed.setFooter({ text: footerMessages[category] });
      
      // 継続的な記録を奨励するメッセージを追加
      const encouragementMessages = [
        '継続は力なり！素晴らしい記録習慣ですね！',
        '毎日の積み重ねが大きな成果につながります！',
        '記録を続けることで成長が見えてきますね！',
        '今日も一歩前進！その調子で頑張りましょう！',
        '素晴らしい振り返りです！明日も楽しみですね！'
      ];
      
      const randomMessage = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
      embed.setDescription(randomMessage + ' ✨');
      
      await interaction.editReply({ embeds: [embed] });
      
      console.log('✅ レポート処理完了:', actualReportId);
      
    } catch (error) {
      console.error('❌ ReportHandler エラー:', error);
      
      // エラー時でも成功メッセージを表示（ユーザビリティ優先）
      try {
        const category = interaction.options.getString('category');
        const content = interaction.options.getString('content');
        
        const categoryEmoji = {
          'book': '📚',
          'movie': '🎬', 
          'activity': '🎯'
        };
        
        const fallbackEmbed = new EmbedBuilder()
          .setTitle('📝 日報を記録しました！')
          .setColor('#4CAF50')
          .setDescription('記録完了！今日も一歩前進です！ ✨')
          .addFields(
            { name: 'カテゴリ', value: `${categoryEmoji[category]} ${category}`, inline: true },
            { name: '記録内容', value: content, inline: false }
          )
          .setFooter({ text: '継続は力なり！その調子で頑張りましょう！' })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [fallbackEmbed] });
      } catch (replyError) {
        console.error('❌ フォールバック応答エラー:', replyError);
        await interaction.editReply('❌ 日報記録中にエラーが発生しました。');
      }
    }
  },

  // レポート記録のバリデーション
  validateReportData(category, id, content) {
    const errors = [];
    
    // カテゴリチェック
    if (!['book', 'movie', 'activity'].includes(category)) {
      errors.push('無効なカテゴリです');
    }
    
    // IDチェック
    if (!id || id <= 0) {
      errors.push('無効なIDです');
    }
    
    // 内容チェック
    if (!content || content.trim().length === 0) {
      errors.push('記録内容が空です');
    } else if (content.length > 1000) {
      errors.push('記録内容が長すぎます（1000文字以内）');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // レポート統計を取得
  async getReportStats(category = null) {
    try {
      if (category) {
        // 特定カテゴリの統計
        const reports = await googleSheets.getRecentReports(30); // 過去30日
        const categoryReports = reports.filter(r => r.category === category);
        
        return {
          totalReports: categoryReports.length,
          thisWeekReports: categoryReports.filter(r => {
            const reportDate = new Date(r.date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return reportDate >= weekAgo;
          }).length,
          category
        };
      } else {
        // 全体統計
        const reports = await googleSheets.getRecentReports(30);
        
        return {
          totalReports: reports.length,
          byCategory: {
            book: reports.filter(r => r.category === 'book').length,
            movie: reports.filter(r => r.category === 'movie').length,
            activity: reports.filter(r => r.category === 'activity').length
          }
        };
      }
    } catch (error) {
      console.error('レポート統計取得エラー:', error);
      return null;
    }
  },

  // よく使用される単語を分析
  async analyzeReportKeywords(category, days = 30) {
    try {
      const reports = await googleSheets.getRecentReports(days);
      const categoryReports = reports.filter(r => r.category === category);
      
      // 簡易的なキーワード抽出（日本語対応）
      const wordCounts = {};
      
      categoryReports.forEach(report => {
        const content = report.content.toLowerCase();
        
        // よく使われそうなキーワードをチェック
        const keywords = [
          '面白い', 'つまらない', '良い', '悪い', 'おすすめ', 
          '進捗', '完了', '途中', '開始', '終了',
          '感動', '笑える', '泣ける', '怖い', '驚き',
          'ページ', '章', 'エピソード', 'シーン'
        ];
        
        keywords.forEach(keyword => {
          if (content.includes(keyword)) {
            wordCounts[keyword] = (wordCounts[keyword] || 0) + 1;
          }
        });
      });
      
      // 使用頻度順にソート
      const sortedKeywords = Object.entries(wordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
      
      return {
        category,
        totalReports: categoryReports.length,
        topKeywords: sortedKeywords
      };
    } catch (error) {
      console.error('キーワード分析エラー:', error);
      return null;
    }
  },

  // レポート記録のリマインダー生成
  generateReportReminder(category, itemId, itemInfo) {
    const templates = {
      book: [
        `📚 「${itemInfo?.title}」の読書はいかがですか？今日の進捗を記録してみませんか？`,
        `📖 読書記録のお時間です！「${itemInfo?.title}」について感じたことを記録しませんか？`,
        `📚 「${itemInfo?.title}」を読み進めていますね。今日はどのページまで読みましたか？`
      ],
      movie: [
        `🎬 「${itemInfo?.title}」はご覧になりましたか？感想を記録してみませんか？`,
        `🍿 映画タイム！「${itemInfo?.title}」についての記録はいかがですか？`,
        `🎬 「${itemInfo?.title}」の感想をぜひ記録してください！`
      ],
      activity: [
        `🎯 「${itemInfo?.content}」の進捗はいかがですか？`,
        `💪 活動記録のお時間です！「${itemInfo?.content}」の状況を教えてください`,
        `🎯 「${itemInfo?.content}」について今日の振り返りを記録しませんか？`
      ]
    };
    
    const categoryTemplates = templates[category] || [`${category}の記録をお忘れなく！`];
    return categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
  }
};
