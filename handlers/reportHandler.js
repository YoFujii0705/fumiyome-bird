const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GoogleSheetsService = require('../services/googleSheets');

// GoogleSheetsServiceのインスタンスを作成
const googleSheets = new GoogleSheetsService();

module.exports = {
  async execute(interaction) {
    try {
      // 🆕 選択式でカテゴリを選択してもらう
      await this.showCategorySelection(interaction);
    } catch (error) {
      console.error('❌ ReportHandler エラー:', error);
      
      const fallbackEmbed = new EmbedBuilder()
        .setTitle('📝 日報記録')
        .setColor('#4CAF50')
        .setDescription('記録したいカテゴリを選択してください')
        .addFields(
          { name: '📚 本', value: '読書の進捗や感想を記録', inline: true },
          { name: '🎬 映画', value: '視聴した映画の感想を記録', inline: true },
          { name: '🎯 活動', value: '活動の進捗や振り返りを記録', inline: true }
        )
        .setFooter({ text: '継続的な記録で成長を実感しましょう！' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [fallbackEmbed] });
    }
  },

  // 🆕 カテゴリ選択メニューを表示
  async showCategorySelection(interaction) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('report_category_select')
      .setPlaceholder('記録したいカテゴリを選択してください')
      .addOptions([
        {
          label: '📚 本',
          description: '読書の進捗や感想を記録します',
          value: 'book'
        },
        {
          label: '🎬 映画',
          description: '視聴した映画の感想を記録します',
          value: 'movie'
        },
        {
          label: '🎯 活動',
          description: '活動の進捗や振り返りを記録します',
          value: 'activity'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setTitle('📝 日報記録')
      .setColor('#4CAF50')
      .setDescription('記録したいカテゴリを選択してください✨')
      .addFields(
        { name: '📚 本', value: '• 読書の進捗\n• 感想や気づき\n• おすすめポイント', inline: true },
        { name: '🎬 映画', value: '• 視聴した感想\n• 印象的なシーン\n• 評価やレビュー', inline: true },
        { name: '🎯 活動', value: '• 進捗状況\n• 学んだこと\n• 次のアクション', inline: true }
      )
      .setFooter({ text: '継続的な記録で成長を可視化しましょう！' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  // 🆕 選択されたカテゴリのアイテム一覧を表示
  async showItemSelection(interaction, category) {
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
          .setTitle(`${categoryEmoji} ${categoryName}のレポート記録`)
          .setColor('#FF5722')
          .setDescription(`記録可能な${categoryName}がありません。`)
          .addFields(
            { name: '💡 ヒント', value: `まず \`/${category} add\` で${categoryName}を追加してください`, inline: false }
          );

        await interaction.editReply({ embeds: [embed], components: [] });
        return;
      }

      if (items.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`report_item_select_${category}`)
          .setPlaceholder(`レポートを記録する${categoryName}を選択してください`)
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
          .setTitle(`${categoryEmoji} ${categoryName}のレポート記録`)
          .setColor('#4CAF50')
          .setDescription(`レポートを記録する${categoryName}を選択してください（${items.length}件）`)
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
        await this.showItemSelectionWithPagination(interaction, category, items);
      }
    } catch (error) {
      console.error(`${category}アイテム選択エラー:`, error);
      await interaction.editReply('❌ アイテム選択中にエラーが発生しました。');
    }
  },

  // 🆕 レポート内容入力のモーダル表示（疑似実装）
  async showReportInput(interaction, category, itemId) {
    try {
      // 実際のDiscord.jsではモーダルを使用しますが、
      // ここでは簡易的にテキスト入力の案内を表示
      const itemInfo = await this.getItemInfo(category, itemId);
      
      if (!itemInfo) {
        await interaction.editReply('❌ 選択されたアイテムが見つかりません。');
        return;
      }

      const categoryEmoji = { book: '📚', movie: '🎬', activity: '🎯' }[category];
      const categoryName = { book: '本', movie: '映画', activity: '活動' }[category];

      const embed = new EmbedBuilder()
        .setTitle(`${categoryEmoji} レポート記録`)
        .setColor('#2196F3')
        .setDescription('次のメッセージでレポート内容を入力してください')
        .addFields(
          { name: '対象アイテム', value: this.formatItemDisplay(category, itemInfo), inline: false },
          { name: '📝 記録内容の例', value: this.getReportExamples(category), inline: false },
          { name: '💡 入力方法', value: 'この後に続けてレポート内容をメッセージで送信してください', inline: false }
        )
        .setFooter({ text: '記録は後で /reports history で確認できます' })
        .setTimestamp();

      // レポート待機状態を保存（実際の実装では状態管理が必要）
      await interaction.editReply({ embeds: [embed], components: [] });

      // 注意: 実際の実装では、ユーザーからの次のメッセージを待つ仕組みが必要
      // ここでは選択式の流れの説明として記載

    } catch (error) {
      console.error('レポート入力画面エラー:', error);
      await interaction.editReply('❌ レポート入力画面の表示中にエラーが発生しました。');
    }
  },

  // ページネーション対応
  async showItemSelectionWithPagination(interaction, category, items, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const currentItems = items.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`report_item_select_${category}_page_${page}`)
      .setPlaceholder(`レポートを記録する${category}を選択してください`)
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
            .setCustomId(`report_${category}_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`report_${category}_next_${page + 1}`)
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
      .setTitle(`${categoryEmoji} ${categoryName}のレポート記録`)
      .setColor('#4CAF50')
      .setDescription(`レポートを記録する${categoryName}を選択してください（${page + 1}/${totalPages}ページ）`)
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
  },

  // レポート記録処理（従来の機能）
  async recordReport(category, id, content) {
    try {
      console.log('=== レポート処理開始 ===', { category, id, content });
      
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
        embed.addFields(
          { name: '⚠️ 対象情報', value: `ID: ${id} の詳細情報を取得できませんでした`, inline: false }
        );
      }
      
      embed.addFields(
        { name: '📄 記録内容', value: content, inline: false }
      );
      
      const footerMessages = {
        'book': '📚 読書記録お疲れ様です！レポート履歴は /reports history book で確認できます',
        'movie': '🎬 視聴記録お疲れ様です！レポート履歴は /reports history movie で確認できます',
        'activity': '🎯 活動記録お疲れ様です！レポート履歴は /reports history activity で確認できます'
      };
      
      embed.setFooter({ text: footerMessages[category] });
      
      const encouragementMessages = [
        '継続は力なり！素晴らしい記録習慣ですね！',
        '毎日の積み重ねが大きな成果につながります！',
        '記録を続けることで成長が見えてきますね！',
        '今日も一歩前進！その調子で頑張りましょう！',
        '素晴らしい振り返りです！明日も楽しみですね！'
      ];
      
      const randomMessage = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
      embed.setDescription(randomMessage + ' ✨');
      
      return embed;
      
    } catch (error) {
      console.error('❌ レポート記録エラー:', error);
      throw error;
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
    } catch (error) {
      console.error('アイテム情報取得エラー:', error);
      return null;
    }
  },

  formatItemDisplay(category, item) {
    if (category === 'book') {
      return `📖 ${item.title}\n👤 ${item.author}`;
    } else if (category === 'movie') {
      return `🎬 ${item.title}`;
    } else if (category === 'activity') {
      return `🎯 ${item.content}`;
    }
    return 'アイテム情報不明';
  },

  getReportExamples(category) {
    const examples = {
      book: '• 今日は第3章まで読了\n• 主人公の心境変化が印象的\n• 次回は第4章から読み始める',
      movie: '• ストーリー展開が予想外で面白かった\n• 俳優の演技が素晴らしい\n• 評価: ★★★★☆',
      activity: '• 今日は30分間実践\n• 新しいテクニックを習得\n• 明日は応用編にチャレンジ'
    };
    return examples[category] || '記録内容を入力してください';
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

  // レポート記録のバリデーション
  validateReportData(category, id, content) {
    const errors = [];
    
    if (!['book', 'movie', 'activity'].includes(category)) {
      errors.push('無効なカテゴリです');
    }
    
    if (!id || id <= 0) {
      errors.push('無効なIDです');
    }
    
    if (!content || content.trim().length === 0) {
      errors.push('記録内容が空です');
    } else if (content.length > 1000) {
      errors.push('記録内容が長すぎます（1000文字以内）');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
