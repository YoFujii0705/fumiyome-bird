const { EmbedBuilder } = require('discord.js');
const GoogleSheetsService = require('../services/googleSheets');

// GoogleSheetsServiceのインスタンスを作成
const googleSheets = new GoogleSheetsService();

module.exports = {
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case 'history':
          await this.showHistory(interaction);
          break;
        case 'recent':
          await this.showRecent(interaction);
          break;
        case 'search':
          await this.searchReports(interaction);
          break;
        case 'calendar':
          await this.showCalendar(interaction);
          break;
        case 'analytics':
          await this.showAnalytics(interaction);
          break;
        case 'export':
          await this.exportReports(interaction);
          break;
        default:
          await interaction.editReply(`❌ 不明なサブコマンド: ${subcommand}`);
          break;
      }
    } catch (error) {
      console.error('ReportsHandler エラー:', error);
      await interaction.editReply('❌ レポート検索中にエラーが発生しました。');
    }
  },

  async showHistory(interaction) {
    try {
      const category = interaction.options.getString('category');
      const id = interaction.options.getInteger('id');
      
      console.log('=== レポート履歴検索開始 ===', { category, id });
      
      // 並行で作品情報とレポート履歴を取得
      const [itemInfo, reports] = await Promise.all([
        googleSheets.getItemInfo(category, id),
        googleSheets.getReportsByItem(category, id)
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
      
      if (!itemInfo) {
        const embed = new EmbedBuilder()
          .setTitle('❓ アイテムが見つかりません')
          .setColor('#FF5722')
          .setDescription(`指定された${categoryName[category]}（ID: ${id}）が見つかりませんでした。`)
          .addFields(
            { name: '💡 確認方法', value: `\`/${category} list\` で${categoryName[category]}一覧を確認してください`, inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (reports.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle(`📝 ${itemInfo.title || itemInfo.content}のレポート履歴`)
          .setColor('#FFC107')
          .setDescription('まだレポートが記録されていません。')
          .addFields(
            { name: '📚 対象アイテム', value: this.formatItemInfo(category, itemInfo), inline: false },
            { name: '📝 レポートを記録', value: `\`/report ${category} ${id} [内容]\` でレポートを記録してみましょう！`, inline: false },
            { name: '💡 レポートのコツ', value: '• 今日の進捗や感想を記録\n• 短くても継続が大切\n• 振り返りで成長を実感', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // レポートを日付順に並び替え（新しい順）
      reports.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const embed = new EmbedBuilder()
        .setTitle(`${categoryEmoji[category]} ${itemInfo.title || itemInfo.content}のレポート履歴`)
        .setColor(this.getCategoryColor(category))
        .setDescription(`📊 総レポート数: **${reports.length}** 件`)
        .setTimestamp();
      
      // アイテム情報を追加
      embed.addFields({ 
        name: '📚 対象アイテム', 
        value: this.formatItemInfo(category, itemInfo), 
        inline: false 
      });
      
      // レポート履歴を表示（最大8件）
      const displayReports = reports.slice(0, 8);
      const reportFields = [];
      
      for (let i = 0; i < displayReports.length; i += 2) {
        const report1 = displayReports[i];
        const report2 = displayReports[i + 1];
        
        const date1 = new Date(report1.date).toLocaleDateString('ja-JP');
        let field1Value = `📅 ${date1}\n${this.truncateText(report1.content, 100)}`;
        
        reportFields.push({
          name: `📝 レポート ${i + 1}`,
          value: field1Value,
          inline: true
        });
        
        if (report2) {
          const date2 = new Date(report2.date).toLocaleDateString('ja-JP');
          let field2Value = `📅 ${date2}\n${this.truncateText(report2.content, 100)}`;
          
          reportFields.push({
            name: `📝 レポート ${i + 2}`,
            value: field2Value,
            inline: true
          });
        }
        
        // 空のフィールドを追加して改行
        if (reportFields.length % 2 !== 0) {
          reportFields.push({ name: '\u200b', value: '\u200b', inline: true });
        }
      }
      
      embed.addFields(...reportFields);
      
      if (reports.length > 8) {
        embed.addFields({
          name: '📄 さらに表示',
          value: `他 ${reports.length - 8} 件のレポートがあります`,
          inline: false
        });
      }
      
      // 分析情報を追加
      const analysisInfo = this.analyzeReports(reports);
      embed.addFields({
        name: '📊 レポート分析',
        value: `平均文字数: ${analysisInfo.avgLength}文字\n最新記録: ${analysisInfo.daysSinceLastReport}日前\n記録頻度: ${analysisInfo.frequency}`,
        inline: true
      });
      
      embed.setFooter({ text: '継続的な記録、素晴らしいですね！' });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('レポート履歴取得エラー:', error);
      await interaction.editReply('❌ レポート履歴の取得中にエラーが発生しました。');
    }
  },

  async showRecent(interaction) {
    try {
      const days = interaction.options.getInteger('days') || 7;
      const reports = await googleSheets.getRecentReports(days);
      
      if (reports.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle(`📝 過去${days}日間のレポート`)
          .setColor('#FFC107')
          .setDescription('レポートがまだ記録されていません。')
          .addFields(
            { name: '📝 レポートを記録', value: '`/report [category] [id] [内容]` でレポートを記録しましょう', inline: false },
            { name: '💡 記録のメリット', value: '• 進捗の可視化\n• 継続のモチベーション\n• 後での振り返り', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // カテゴリごとにグループ化
      const groupedReports = {
        book: reports.filter(r => r.category === 'book'),
        movie: reports.filter(r => r.category === 'movie'),
        activity: reports.filter(r => r.category === 'activity')
      };
      
      const embed = new EmbedBuilder()
        .setTitle(`📝 過去${days}日間のレポート一覧`)
        .setColor('#4CAF50')
        .setDescription(`📊 総数: **${reports.length}** 件のレポートが記録されています`)
        .setTimestamp();
      
      const categoryEmoji = { book: '📚', movie: '🎬', activity: '🎯' };
      const categoryName = { book: '本', movie: '映画', activity: '活動' };
      
      // カテゴリ別にサマリーを表示
      const summaryFields = [];
      Object.entries(groupedReports).forEach(([category, categoryReports]) => {
        if (categoryReports.length > 0) {
          summaryFields.push({
            name: `${categoryEmoji[category]} ${categoryName[category]}`,
            value: `${categoryReports.length}件`,
            inline: true
          });
        }
      });
      
      if (summaryFields.length > 0) {
        embed.addFields(...summaryFields);
        
        // 空のフィールドで改行
        if (summaryFields.length % 3 !== 0) {
          const emptyFields = 3 - (summaryFields.length % 3);
          for (let i = 0; i < emptyFields; i++) {
            embed.addFields({ name: '\u200b', value: '\u200b', inline: true });
          }
        }
      }
      
      // カテゴリ別の詳細表示
      Object.entries(groupedReports).forEach(([category, categoryReports]) => {
        if (categoryReports.length > 0) {
          // 最新5件まで表示
          const recentReports = categoryReports.slice(0, 5);
          const reportList = recentReports.map(report => {
            const date = new Date(report.date).toLocaleDateString('ja-JP', { 
              month: 'short', 
              day: 'numeric' 
            });
            const shortContent = this.truncateText(report.content, 60);
            return `📅 ${date} - ID:${report.itemId}\n${shortContent}`;
          }).join('\n\n');
          
          let fieldValue = reportList;
          if (categoryReports.length > 5) {
            fieldValue += `\n\n📝 他 ${categoryReports.length - 5} 件`;
          }
          
          embed.addFields({
            name: `${categoryEmoji[category]} ${categoryName[category]}の詳細 (${categoryReports.length}件)`,
            value: fieldValue,
            inline: false
          });
        }
      });
      
      // 記録頻度の分析
      const frequency = this.calculateReportFrequency(reports, days);
      embed.addFields({
        name: '📊 記録状況',
        value: `1日平均: ${frequency.daily}件\n記録日数: ${frequency.activeDays}/${days}日\n継続率: ${frequency.consistencyRate}%`,
        inline: true
      });
      
      embed.setFooter({ text: '詳細履歴は /reports history で確認できます' });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('最近のレポート取得エラー:', error);
      await interaction.editReply('❌ 最近のレポート取得中にエラーが発生しました。');
    }
  },

  async searchReports(interaction) {
    try {
      const keyword = interaction.options.getString('keyword');
      
      if (keyword.length < 2) {
        await interaction.editReply('❌ 検索キーワードは2文字以上で入力してください。');
        return;
      }
      
      const reports = await googleSheets.searchReportsByKeyword(keyword);
      
      if (reports.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle(`🔍 レポート検索結果`)
          .setColor('#FF9800')
          .setDescription(`"${keyword}" に一致するレポートが見つかりませんでした。`)
          .addFields(
            { name: '💡 検索のコツ', value: '• より一般的なキーワードで試してみる\n• 部分一致で検索されます\n• ひらがな・カタカナも試してみる', inline: false },
            { name: '📝 記録の確認', value: '`/reports recent` で最近のレポートを確認できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`🔍 "${keyword}" の検索結果`)
        .setColor('#2196F3')
        .setDescription(`📊 **${reports.length}** 件のレポートが見つかりました`)
        .setTimestamp();
      
      const categoryEmoji = { book: '📚', movie: '🎬', activity: '🎯' };
      
      // カテゴリ別の件数表示
      const categoryCount = reports.reduce((acc, report) => {
        acc[report.category] = (acc[report.category] || 0) + 1;
        return acc;
      }, {});
      
      const countFields = Object.entries(categoryCount).map(([category, count]) => ({
        name: `${categoryEmoji[category]} ${category}`,
        value: `${count}件`,
        inline: true
      }));
      
      if (countFields.length > 0) {
        embed.addFields(...countFields);
        
        // 改行用の空フィールド
        if (countFields.length % 3 !== 0) {
          const emptyFields = 3 - (countFields.length % 3);
          for (let i = 0; i < emptyFields; i++) {
            embed.addFields({ name: '\u200b', value: '\u200b', inline: true });
          }
        }
      }
      
      // 検索結果を表示（最大6件）
      const displayReports = reports.slice(0, 6);
      
      displayReports.forEach((report, index) => {
        const date = new Date(report.date).toLocaleDateString('ja-JP');
        const emoji = categoryEmoji[report.category];
        
        // キーワードをハイライト（**で囲む）
        const highlightedContent = report.content.replace(
          new RegExp(keyword, 'gi'), 
          `**${keyword}**`
        );
        
        const truncatedContent = this.truncateText(highlightedContent, 150);
        
        embed.addFields({
          name: `${emoji} 検索結果 ${index + 1} - ID:${report.itemId}`,
          value: `📅 ${date}\n${truncatedContent}`,
          inline: false
        });
      });
      
      if (reports.length > 6) {
        embed.addFields({
          name: '📄 さらに表示',
          value: `他 ${reports.length - 6} 件の結果があります`,
          inline: false
        });
      }
      
      // 検索統計
      const dateRange = this.getDateRange(reports);
      embed.addFields({
        name: '📊 検索統計',
        value: `期間: ${dateRange.start} ～ ${dateRange.end}\n平均文字数: ${this.calculateAverageLength(reports)}文字`,
        inline: true
      });
      
      embed.setFooter({ text: '特定のアイテムの履歴は /reports history で確認できます' });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('レポートキーワード検索エラー:', error);
      await interaction.editReply('❌ レポート検索中にエラーが発生しました。');
    }
  },

  // カレンダー表示機能
  async showCalendar(interaction) {
    try {
      const monthParam = interaction.options.getString('month');
      const targetDate = monthParam ? new Date(monthParam + '-01') : new Date();
      
      if (isNaN(targetDate.getTime())) {
        await interaction.editReply('❌ 無効な月形式です。YYYY-MM形式で入力してください（例: 2024-03）');
        return;
      }
      
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const monthName = targetDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
      
      // その月のレポートを取得
      const reports = await googleSheets.getRecentReports(365); // 1年分取得
      const monthReports = reports.filter(report => {
        const reportDate = new Date(report.date);
        return reportDate.getFullYear() === year && reportDate.getMonth() === month;
      });
      
      // 日付別にグループ化
      const dailyReports = monthReports.reduce((acc, report) => {
        const day = new Date(report.date).getDate();
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {});
      
      // カレンダーを生成
      const firstDay = new Date(year, month, 1).getDay(); // 月の最初の日の曜日
      const daysInMonth = new Date(year, month + 1, 0).getDate(); // その月の日数
      
      let calendar = '```\n';
      calendar += `     ${monthName} のレポートカレンダー\n`;
      calendar += '─'.repeat(35) + '\n';
      calendar += ' 日 月 火 水 木 金 土\n';
      
      // 空白を追加（月の最初の日まで）
      let currentPos = 0;
      for (let i = 0; i < firstDay; i++) {
        calendar += '   ';
        currentPos++;
      }
      
      // 日付を追加
      for (let day = 1; day <= daysInMonth; day++) {
        const reportCount = dailyReports[day] || 0;
        let dayStr;
        
        if (reportCount === 0) {
          dayStr = day.toString().padStart(2, ' ');
        } else if (reportCount <= 3) {
          dayStr = `${day}●`; // 少ない
        } else if (reportCount <= 6) {
          dayStr = `${day}◆`; // 中程度
        } else {
          dayStr = `${day}★`; // 多い
        }
        
        calendar += dayStr.padEnd(3, ' ');
        currentPos++;
        
        // 週末で改行
        if (currentPos % 7 === 0) {
          calendar += '\n';
        }
      }
      
      calendar += '\n\n';
      calendar += '記号の意味:\n';
      calendar += '●: 1-3件  ◆: 4-6件  ★: 7件以上\n';
      calendar += '```';
      
      const embed = new EmbedBuilder()
        .setTitle('📅 レポート記録カレンダー')
        .setColor('#9C27B0')
        .setDescription(calendar)
        .addFields(
          { name: '📊 月次サマリー', value: `総レポート数: ${monthReports.length}件\n記録日数: ${Object.keys(dailyReports).length}日`, inline: true },
          { name: '🔥 最多記録日', value: Object.keys(dailyReports).length > 0 ? 
            `${Object.entries(dailyReports).sort(([,a], [,b]) => b - a)[0][0]}日 (${Object.entries(dailyReports).sort(([,a], [,b]) => b - a)[0][1]}件)` : 
            'なし', inline: true }
        )
        .setFooter({ text: '継続的な記録で素晴らしい習慣を作りましょう！' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('カレンダー表示エラー:', error);
      await interaction.editReply('❌ カレンダー表示中にエラーが発生しました。');
    }
  },

  // 分析機能
  async showAnalytics(interaction) {
    try {
      const reports = await googleSheets.getRecentReports(30); // 過去30日
      
      if (reports.length === 0) {
        await interaction.editReply('📊 分析するレポートデータがありません。まずはレポートを記録してみましょう！');
        return;
      }
      
      // 基本統計
      const totalReports = reports.length;
      const averageLength = reports.reduce((sum, r) => sum + r.content.length, 0) / totalReports;
      const uniqueDays = new Set(reports.map(r => r.date)).size;
      const consistencyRate = Math.round((uniqueDays / 30) * 100);
      
      // カテゴリ別分析
      const categoryStats = reports.reduce((acc, report) => {
        acc[report.category] = (acc[report.category] || 0) + 1;
        return acc;
      }, {});
      
      // 曜日別分析
      const dayOfWeekStats = reports.reduce((acc, report) => {
        const dayOfWeek = new Date(report.date).getDay();
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const dayName = dayNames[dayOfWeek];
        acc[dayName] = (acc[dayName] || 0) + 1;
        return acc;
      }, {});
      
      // よく使われる単語分析
      const allWords = reports.map(r => r.content).join(' ')
        .replace(/[！？。、]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1);
      
      const wordFreq = allWords.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});
      
      const topWords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word, freq]) => `${word} (${freq}回)`)
        .join(', ');
      
      // 時系列トレンド
      const weeklyTrend = this.calculateWeeklyTrend(reports);
      
      const embed = new EmbedBuilder()
        .setTitle('📊 レポート分析レポート（過去30日）')
        .setColor('#673AB7')
        .setDescription('あなたの記録習慣を詳しく分析しました！')
        .addFields(
          { 
            name: '📈 基本統計', 
            value: `総レポート数: **${totalReports}**件\n平均文字数: **${Math.round(averageLength)}**文字\n記録日数: **${uniqueDays}**/30日\n継続率: **${consistencyRate}%**`, 
            inline: true 
          },
          { 
            name: '📂 カテゴリ別', 
            value: Object.entries(categoryStats)
              .map(([cat, count]) => `${cat === 'book' ? '📚' : cat === 'movie' ? '🎬' : '🎯'} ${cat}: ${count}件`)
              .join('\n') || 'データなし', 
            inline: true 
          },
          { 
            name: '📅 曜日別傾向', 
            value: Object.entries(dayOfWeekStats)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3)
              .map(([day, count]) => `${day}: ${count}件`)
              .join('\n') || 'データなし', 
            inline: true 
          },
          { 
            name: '🔤 よく使う単語 TOP10', 
            value: topWords || 'データ不足', 
            inline: false 
          },
          { 
            name: '📊 週次トレンド', 
            value: weeklyTrend, 
            inline: false 
          }
        )
        .setFooter({ text: '継続的な記録で更に詳細な分析が可能になります！' })
        .setTimestamp();
      
      // レベル判定
      let level = '🌱 記録初心者';
      if (totalReports >= 50) level = '🏆 記録マスター';
      else if (totalReports >= 30) level = '⭐ 記録エキスパート';
      else if (totalReports >= 15) level = '🔥 記録熟練者';
      else if (totalReports >= 7) level = '💪 記録継続者';
      
      embed.addFields({
        name: '🏅 あなたの記録レベル',
        value: level,
        inline: true
      });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('分析表示エラー:', error);
      await interaction.editReply('❌ 分析表示中にエラーが発生しました。');
    }
  },

  // エクスポート機能
  async exportReports(interaction) {
    try {
      const format = interaction.options.getString('format') || 'text';
      const period = interaction.options.getString('period') || 'month';
      
      let days;
      switch (period) {
        case 'week': days = 7; break;
        case 'month': days = 30; break;
        case 'all': days = 365; break;
        default: days = 30;
      }
      
      const reports = await googleSheets.getRecentReports(days);
      
      if (reports.length === 0) {
        await interaction.editReply('📤 エクスポートするレポートがありません。');
        return;
      }
      
      let exportData;
      
      switch (format) {
        case 'json':
          exportData = this.exportToJSON(reports);
          break;
        case 'markdown':
          exportData = this.exportToMarkdown(reports);
          break;
        default:
          exportData = this.exportToText(reports);
      }
      
      // ファイルが長すぎる場合は分割
      if (exportData.length > 1900) {
        const chunks = this.chunkString(exportData, 1900);
        
        for (let i = 0; i < chunks.length && i < 3; i++) {
          const embed = new EmbedBuilder()
            .setTitle(`📤 レポートエクスポート (${i + 1}/${Math.min(chunks.length, 3)})`)
            .setColor('#FF9800')
            .setDescription(`\`\`\`${format === 'markdown' ? 'md' : 'txt'}\n${chunks[i]}\n\`\`\``)
            .setTimestamp();
          
          if (i === 0) {
            await interaction.editReply({ embeds: [embed] });
          } else {
            await interaction.followUp({ embeds: [embed] });
          }
          
          // 少し待機（レート制限回避）
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (chunks.length > 3) {
          await interaction.followUp(`📝 レポートが多すぎるため、最初の3部分のみ表示しました。全体で${chunks.length}部分あります。`);
        }
      } else {
        const embed = new EmbedBuilder()
          .setTitle('📤 レポートエクスポート')
          .setColor('#FF9800')
          .setDescription(`\`\`\`${format === 'markdown' ? 'md' : 'txt'}\n${exportData}\n\`\`\``)
          .addFields(
            { name: '📊 統計', value: `総件数: ${reports.length}件\n期間: ${period}\n形式: ${format}`, inline: true }
          )
          .setFooter({ text: 'エクスポート完了！このテキストをコピーして保存できます' })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
      
    } catch (error) {
      console.error('エクスポートエラー:', error);
      await interaction.editReply('❌ エクスポート中にエラーが発生しました。');
    }
  },

  // ヘルパーメソッド
  calculateWeeklyTrend(reports) {
    const weeklyData = {};
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(fourWeeksAgo);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekReports = reports.filter(report => {
        const reportDate = new Date(report.date);
        return reportDate >= weekStart && reportDate <= weekEnd;
      });
      
      weeklyData[`第${i + 1}週`] = weekReports.length;
    }
    
    return Object.entries(weeklyData)
      .map(([week, count]) => `${week}: ${count}件`)
      .join(', ');
  },

  exportToJSON(reports) {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      reportCount: reports.length,
      reports: reports.map(report => ({
        date: report.date,
        category: report.category,
        itemId: report.itemId,
        content: report.content
      }))
    }, null, 2);
  },

  exportToMarkdown(reports) {
    let md = `# Activity Tracker レポート\n\n`;
    md += `**エクスポート日時:** ${new Date().toLocaleString('ja-JP')}\n`;
    md += `**総レポート数:** ${reports.length}件\n\n`;
    
    const groupedByDate = reports.reduce((acc, report) => {
      const date = report.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(report);
      return acc;
    }, {});
    
    Object.entries(groupedByDate)
      .sort(([a], [b]) => new Date(b) - new Date(a))
      .forEach(([date, dayReports]) => {
        md += `## ${new Date(date).toLocaleDateString('ja-JP')}\n\n`;
        
        dayReports.forEach(report => {
          const emoji = { book: '📚', movie: '🎬', activity: '🎯' }[report.category];
          md += `### ${emoji} ${report.category} (ID: ${report.itemId})\n`;
          md += `${report.content}\n\n`;
        });
      });
    
    return md;
  },

  exportToText(reports) {
    let text = `Activity Tracker レポート\n`;
    text += `=${'='.repeat(30)}\n`;
    text += `エクスポート日時: ${new Date().toLocaleString('ja-JP')}\n`;
    text += `総レポート数: ${reports.length}件\n\n`;
    
    reports.sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(report => {
        const emoji = { book: '📚', movie: '🎬', activity: '🎯' }[report.category];
        text += `${new Date(report.date).toLocaleDateString('ja-JP')} | ${emoji} ${report.category} (ID: ${report.itemId})\n`;
        text += `${report.content}\n`;
        text += `${'-'.repeat(50)}\n`;
      });
    
    return text;
  },

  chunkString(str, size) {
    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.slice(i, i + size));
    }
    return chunks;
  },

  // ユーティリティメソッド

  formatItemInfo(category, itemInfo) {
    if (category === 'book') {
      return `📖 ${itemInfo.title}\n👤 ${itemInfo.author}`;
    } else if (category === 'movie') {
      return `🎬 ${itemInfo.title}`;
    } else if (category === 'activity') {
      return `🎯 ${itemInfo.content}`;
    }
    return 'アイテム情報不明';
  },

  getCategoryColor(category) {
    const colors = {
      'book': '#9C27B0',
      'movie': '#E91E63',
      'activity': '#00BCD4'
    };
    return colors[category] || '#607D8B';
  },

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  },

  analyzeReports(reports) {
    if (reports.length === 0) {
      return { avgLength: 0, daysSinceLastReport: 0, frequency: '記録なし' };
    }
    
    const totalLength = reports.reduce((sum, report) => sum + report.content.length, 0);
    const avgLength = Math.round(totalLength / reports.length);
    
    const latestDate = new Date(Math.max(...reports.map(r => new Date(r.date))));
    const now = new Date();
    const daysSinceLastReport = Math.floor((now - latestDate) / (1000 * 60 * 60 * 24));
    
    let frequency;
    if (reports.length >= 20) {
      frequency = '高頻度';
    } else if (reports.length >= 10) {
      frequency = '中頻度';
    } else if (reports.length >= 5) {
      frequency = '低頻度';
    } else {
      frequency = '開始段階';
    }
    
    return { avgLength, daysSinceLastReport, frequency };
  },

  calculateReportFrequency(reports, days) {
    const daily = (reports.length / days).toFixed(1);
    
    // 記録があった日数を計算
    const uniqueDates = new Set(reports.map(r => r.date));
    const activeDays = uniqueDates.size;
    
    const consistencyRate = Math.round((activeDays / days) * 100);
    
    return { daily, activeDays, consistencyRate };
  },

  getDateRange(reports) {
    if (reports.length === 0) {
      const today = new Date().toLocaleDateString('ja-JP');
      return { start: today, end: today };
    }
    
    const dates = reports.map(r => new Date(r.date));
    const start = new Date(Math.min(...dates)).toLocaleDateString('ja-JP');
    const end = new Date(Math.max(...dates)).toLocaleDateString('ja-JP');
    
    return { start, end };
  },

  calculateAverageLength(reports) {
    if (reports.length === 0) return 0;
    
    const totalLength = reports.reduce((sum, report) => sum + report.content.length, 0);
    return Math.round(totalLength / reports.length);
  },

  // 高度な分析機能（将来の拡張用）
  generateReportTrends(reports) {
    // 時系列でのレポート頻度分析
    const monthlyTrends = reports.reduce((acc, report) => {
      const month = new Date(report.date).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});
    
    return monthlyTrends;
  },

  extractKeywords(reports) {
    // レポートからキーワードを抽出
    const allText = reports.map(r => r.content).join(' ');
    const words = allText.split(/\s+/);
    
    const wordCount = words.reduce((acc, word) => {
      if (word.length > 2) {
        acc[word] = (acc[word] || 0) + 1;
      }
      return acc;
    }, {});
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
  }
};
