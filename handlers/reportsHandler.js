const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GoogleSheetsService = require('../services/googleSheets');

// GoogleSheetsServiceのインスタンスを作成
const googleSheets = new GoogleSheetsService();

module.exports = {
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case 'history':
          await this.showHistorySelection(interaction);
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

  // 🆕 履歴表示用のカテゴリ選択
  async showHistorySelection(interaction) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('reports_history_category_select')
      .setPlaceholder('履歴を確認したいカテゴリを選択してください')
      .addOptions([
        {
          label: '📚 本',
          description: '読書レポートの履歴を表示します',
          value: 'book'
        },
        {
          label: '🎬 映画',
          description: '映画視聴レポートの履歴を表示します',
          value: 'movie'
        },
        {
          label: '🎯 活動',
          description: '活動レポートの履歴を表示します',
          value: 'activity'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setTitle('📝 レポート履歴')
      .setColor('#9C27B0')
      .setDescription('履歴を確認したいカテゴリを選択してください')
      .addFields(
        { name: '📚 本の履歴', value: '読書の進捗や感想の記録を確認', inline: true },
        { name: '🎬 映画の履歴', value: '視聴した映画の感想記録を確認', inline: true },
        { name: '🎯 活動の履歴', value: '活動の進捗や振り返り記録を確認', inline: true }
      )
      .setFooter({ text: '特定のアイテムの詳細履歴を確認できます' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  // 🆕 選択されたカテゴリのアイテム一覧を表示（履歴用）
  async showHistoryItemSelection(interaction, category) {
    try {
      let items = [];
      let categoryName = '';
      let categoryEmoji = '';

      switch (category) {
        case 'book':
          items = await googleSheets.getAllBooks();
          categoryName = '本';
          categoryEmoji = '📚';
          break;
        case 'movie':
          items = await googleSheets.getAllMovies();
          categoryName = '映画';
          categoryEmoji = '🎬';
          break;
        case 'activity':
          items = await googleSheets.getAllActivities();
          categoryName = '活動';
          categoryEmoji = '🎯';
          break;
      }

      if (items.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle(`${categoryEmoji} ${categoryName}のレポート履歴`)
          .setColor('#FF5722')
          .setDescription(`履歴を確認できる${categoryName}がありません。`)
          .addFields(
            { name: '💡 ヒント', value: `まず \`/${category} add\` で${categoryName}を追加してください`, inline: false }
          );

        await interaction.editReply({ embeds: [embed], components: [] });
        return;
      }

      if (items.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`reports_history_item_select_${category}`)
          .setPlaceholder(`履歴を確認する${categoryName}を選択してください`)
          .addOptions(
            items.map(item => {
              let label, description;
              
              if (category === 'book') {
                label = `${item.title}`.slice(0, 100);
                description = `作者: ${item.author} | ${this.getBookStatusText(item.status)}`.slice(0, 100);
              } else if (category === 'movie') {
                label = `${item.title}`.slice(0, 100);
                description = `${this.getMovieStatusText(item.status)} | ${item.memo || 'メモなし'}`.slice(0, 100);
              } else if (category === 'activity') {
                label = `${item.content}`.slice(0, 100);
                description = `${this.getActivityStatusText(item.status)} | ${item.memo || 'メモなし'}`.slice(0, 100);
              }

              return {
                label,
                description,
                value: item.id.toString()
              };
            })
          );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
          .setTitle(`${categoryEmoji} ${categoryName}のレポート履歴`)
          .setColor('#9C27B0')
          .setDescription(`履歴を確認する${categoryName}を選択してください（${items.length}件）`)
          .addFields(
            { name: `${categoryEmoji} 登録済み${categoryName}`, value: items.slice(0, 10).map(item => {
              if (category === 'book') {
                return `📖 ${item.title} - ${item.author}`;
              } else if (category === 'movie') {
                return `🎬 ${item.title}`;
              } else if (category === 'activity') {
                return `🎯 ${item.content}`;
              }
            }).join('\n').slice(0, 1024), inline: false }
          );

        if (items.length > 10) {
          embed.addFields({ name: '📝 その他', value: `... 他${items.length - 10}件`, inline: false });
        }

        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.showHistoryItemSelectionWithPagination(interaction, category, items);
      }
    } catch (error) {
      console.error(`${category}履歴アイテム選択エラー:`, error);
      await interaction.editReply('❌ 履歴アイテム選択中にエラーが発生しました。');
    }
  },

  // 🆕 特定アイテムの履歴を表示（選択式から呼び出し）
  async showItemHistory(interaction, category, itemId) {
    try {
      console.log('=== レポート履歴検索開始 ===', { category, itemId });
      
      const [itemInfo, reports] = await Promise.all([
        this.getItemInfo(category, itemId),
        googleSheets.getReportsByItem(category, itemId)
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
          .setDescription(`指定された${categoryName[category]}（ID: ${itemId}）が見つかりませんでした。`)
          .addFields(
            { name: '💡 確認方法', value: `\`/${category} list\` で${categoryName[category]}一覧を確認してください`, inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed], components: [] });
        return;
      }
      
      if (reports.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle(`📝 ${this.getItemTitle(category, itemInfo)}のレポート履歴`)
          .setColor('#FFC107')
          .setDescription('まだレポートが記録されていません。')
          .addFields(
            { name: '📚 対象アイテム', value: this.formatItemInfo(category, itemInfo), inline: false },
            { name: '📝 レポートを記録', value: `/report でレポートを記録してみましょう！`, inline: false },
            { name: '💡 レポートのコツ', value: '• 今日の進捗や感想を記録\n• 短くても継続が大切\n• 振り返りで成長を実感', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed], components: [] });
        return;
      }
      
      reports.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const embed = new EmbedBuilder()
        .setTitle(`${categoryEmoji[category]} ${this.getItemTitle(category, itemInfo)}のレポート履歴`)
        .setColor(this.getCategoryColor(category))
        .setDescription(`📊 総レポート数: **${reports.length}** 件`)
        .setTimestamp();
      
      embed.addFields({ 
        name: '📚 対象アイテム', 
        value: this.formatItemInfo(category, itemInfo), 
        inline: false 
      });
      
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
      
      const analysisInfo = this.analyzeReports(reports);
      embed.addFields({
        name: '📊 レポート分析',
        value: `平均文字数: ${analysisInfo.avgLength}文字\n最新記録: ${analysisInfo.daysSinceLastReport}日前\n記録頻度: ${analysisInfo.frequency}`,
        inline: true
      });
      
      embed.setFooter({ text: '継続的な記録、素晴らしいですね！' });
      
      await interaction.editReply({ embeds: [embed], components: [] });
      
    } catch (error) {
      console.error('レポート履歴取得エラー:', error);
      await interaction.editReply('❌ レポート履歴の取得中にエラーが発生しました。');
    }
  },

  // 既存のメソッドを継承（showRecent, searchReports, showCalendar, showAnalytics, exportReports）
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
            { name: '📝 レポートを記録', value: '/report でレポートを記録しましょう（選択式）', inline: false },
            { name: '💡 記録のメリット', value: '• 進捗の可視化\n• 継続のモチベーション\n• 後での振り返り', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
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
        
        if (summaryFields.length % 3 !== 0) {
          const emptyFields = 3 - (summaryFields.length % 3);
          for (let i = 0; i < emptyFields; i++) {
            embed.addFields({ name: '\u200b', value: '\u200b', inline: true });
          }
        }
      }
      
      Object.entries(groupedReports).forEach(([category, categoryReports]) => {
        if (categoryReports.length > 0) {
          const recentReports = categoryReports.slice(0, 5);
          const reportList = recentReports.map(report => {
            const date = new Date(report.date).toLocaleDateString('ja-JP', { 
              month: 'short', 
              day: 'numeric' 
            });
            const shortContent = this.truncateText(report.content, 60);
            return `📅 ${date} - ID:${report.itemId || report.item_id}\n${shortContent}`;
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
      
      const frequency = this.calculateReportFrequency(reports, days);
      embed.addFields({
        name: '📊 記録状況',
        value: `1日平均: ${frequency.daily}件\n記録日数: ${frequency.activeDays}/${days}日\n継続率: ${frequency.consistencyRate}%`,
        inline: true
      });
      
      embed.setFooter({ text: '詳細履歴は /reports history で確認できます（選択式）' });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('最近のレポート取得エラー:', error);
      await interaction.editReply('❌ 最近のレポート取得中にエラーが発生しました。');
    }
  },

  // 検索機能（既存のコードを継承）
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
        
        if (countFields.length % 3 !== 0) {
          const emptyFields = 3 - (countFields.length % 3);
          for (let i = 0; i < emptyFields; i++) {
            embed.addFields({ name: '\u200b', value: '\u200b', inline: true });
          }
        }
      }
      
      const displayReports = reports.slice(0, 6);
      
      displayReports.forEach((report, index) => {
        const date = new Date(report.date).toLocaleDateString('ja-JP');
        const emoji = categoryEmoji[report.category];
        
        const highlightedContent = report.content.replace(
          new RegExp(keyword, 'gi'), 
          `**${keyword}**`
        );
        
        const truncatedContent = this.truncateText(highlightedContent, 150);
        
        embed.addFields({
          name: `${emoji} 検索結果 ${index + 1} - ID:${report.itemId || report.item_id}`,
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
      
      const dateRange = this.getDateRange(reports);
      embed.addFields({
        name: '📊 検索統計',
        value: `期間: ${dateRange.start} ～ ${dateRange.end}\n平均文字数: ${this.calculateAverageLength(reports)}文字`,
        inline: true
      });
      
      embed.setFooter({ text: '特定のアイテムの履歴は /reports history で確認できます（選択式）' });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('レポートキーワード検索エラー:', error);
      await interaction.editReply('❌ レポート検索中にエラーが発生しました。');
    }
  },

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
      
      const reports = await googleSheets.getRecentReports(365);
      const monthReports = reports.filter(report => {
        const reportDate = new Date(report.date);
        return reportDate.getFullYear() === year && reportDate.getMonth() === month;
      });
      
      const dailyReports = monthReports.reduce((acc, report) => {
        const day = new Date(report.date).getDate();
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {});
      
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      let calendar = '```\n';
      calendar += `     ${monthName} のレポートカレンダー\n`;
      calendar += '─'.repeat(35) + '\n';
      calendar += ' 日 月 火 水 木 金 土\n';
      
      let currentPos = 0;
      for (let i = 0; i < firstDay; i++) {
        calendar += '   ';
        currentPos++;
      }
      
      for (let day = 1; day <= daysInMonth; day++) {
        const reportCount = dailyReports[day] || 0;
        let dayStr;
        
        if (reportCount === 0) {
          dayStr = day.toString().padStart(2, ' ');
        } else if (reportCount <= 3) {
          dayStr = `${day}●`;
        } else if (reportCount <= 6) {
          dayStr = `${day}◆`;
        } else {
          dayStr = `${day}★`;
        }
        
        calendar += dayStr.padEnd(3, ' ');
        currentPos++;
        
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

  async showAnalytics(interaction) {
    try {
      const reports = await googleSheets.getRecentReports(30);
      
      if (reports.length === 0) {
        await interaction.editReply('📊 分析するレポートデータがありません。まずは /report でレポートを記録してみましょう！（選択式）');
        return;
      }
      
      const totalReports = reports.length;
      const averageLength = reports.reduce((sum, r) => sum + r.content.length, 0) / totalReports;
      const uniqueDays = new Set(reports.map(r => r.date)).size;
      const consistencyRate = Math.round((uniqueDays / 30) * 100);
      
      const embed = new EmbedBuilder()
        .setTitle('📊 レポート分析レポート（過去30日）')
        .setColor('#673AB7')
        .setDescription('あなたの記録習慣を詳しく分析しました！')
        .addFields(
          { 
            name: '📈 基本統計', 
            value: `総レポート数: **${totalReports}**件\n平均文字数: **${Math.round(averageLength)}**文字\n記録日数: **${uniqueDays}**/30日\n継続率: **${consistencyRate}%**`, 
            inline: true 
          }
        )
        .setFooter({ text: '継続的な記録で更に詳細な分析が可能になります！' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('分析表示エラー:', error);
      await interaction.editReply('❌ 分析表示中にエラーが発生しました。');
    }
  },

  async exportReports(interaction) {
    try {
      const format = interaction.options.getString('format') || 'text';
      const period = interaction.options.getString('period') || 'month';
      
      let days = period === 'week' ? 7 : period === 'all' ? 365 : 30;
      const reports = await googleSheets.getRecentReports(days);
      
      if (reports.length === 0) {
        await interaction.editReply('📤 エクスポートするレポートがありません。');
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('📤 レポートエクスポート')
        .setColor('#FF9800')
        .setDescription('エクスポート機能は開発中です。詳細履歴は /reports history で確認できます（選択式）')
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('エクスポートエラー:', error);
      await interaction.editReply('❌ エクスポート中にエラーが発生しました。');
    }
  },

  // ヘルパーメソッド
  async getItemInfo(category, id) {
    try {
      switch (category) {
        case 'book':
          return await googleSheets.getBookById(id);
        case 'movie':
          return await googleSheets.getMovieById(id);
        case 'activity':
          return await googleSheets.getActivityById(id);
        default:
          return null;
      }
    }
    catch (error) {
      console.error('アイテム情報取得エラー:', error);
      return null;
    }
  },

  getItemTitle(category, item) {
    if (category === 'book') {
      return item.title;
    } else if (category === 'movie') {
      return item.title;
    } else if (category === 'activity') {
      return item.content;
    }
    return 'アイテム不明';
  },

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

  getBookStatusText(status) {
    const texts = {
      'want_to_buy': '買いたい',
      'want_to_read': '積読',
      'reading': '読書中',
      'finished': '読了',
      'abandoned': '中断'
    };
    return texts[status] || status;
  },

  getMovieStatusText(status) {
    const texts = {
      'want_to_watch': '観たい',
      'watched': '視聴済み',
      'missed': '見逃し'
    };
    return texts[status] || status;
  },

  getActivityStatusText(status) {
    const texts = {
      'planned': '予定中',
      'done': '完了',
      'skipped': 'スキップ'
    };
    return texts[status] || status;
  },

  // ページネーション対応
  async showHistoryItemSelectionWithPagination(interaction, category, items, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const currentItems = items.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`reports_history_item_select_${category}_page_${page}`)
      .setPlaceholder(`履歴を確認する${category}を選択してください`)
      .addOptions(
        currentItems.map(item => {
          let label, description;
          
          if (category === 'book') {
            label = `${item.title}`.slice(0, 100);
            description = `作者: ${item.author} | ${this.getBookStatusText(item.status)}`.slice(0, 100);
          } else if (category === 'movie') {
            label = `${item.title}`.slice(0, 100);
            description = `${this.getMovieStatusText(item.status)} | ${item.memo || 'メモなし'}`.slice(0, 100);
          } else if (category === 'activity') {
            label = `${item.content}`.slice(0, 100);
            description = `${this.getActivityStatusText(item.status)} | ${item.memo || 'メモなし'}`.slice(0, 100);
          }

          return {
            label,
            description,
            value: item.id.toString()
          };
        })
      );

    const components = [new ActionRowBuilder().addComponents(selectMenu)];

    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`reports_history_${category}_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`reports_history_${category}_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }

    const categoryEmoji = { book: '📚', movie: '🎬', activity: '🎯' }[category];
    const categoryName = { book: '本', movie: '映画', activity: '活動' }[category];

    const embed = new EmbedBuilder()
      .setTitle(`${categoryEmoji} ${categoryName}のレポート履歴`)
      .setColor('#9C27B0')
      .setDescription(`履歴を確認する${categoryName}を選択してください（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { name: `${categoryEmoji} 登録済み${categoryName}`, value: currentItems.map(item => {
          if (category === 'book') {
            return `📖 ${item.title} - ${item.author}`;
          } else if (category === 'movie') {
            return `🎬 ${item.title}`;
          } else if (category === 'activity') {
            return `🎯 ${item.content}`;
          }
        }).join('\n').slice(0, 1024), inline: false }
      );

    await interaction.editReply({ embeds: [embed], components });
  }
};
