// reportHandler.js の修正版 - 完全版（Part 1）

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GoogleSheetsService = require('../services/googleSheets');

const googleSheets = new GoogleSheetsService();

module.exports = {
  async execute(interaction) {
    try {
      // カテゴリ選択画面を表示
      await this.showCategorySelection(interaction);
    } catch (error) {
      console.error('ReportHandler エラー:', error);
      await interaction.editReply('❌ レポート処理中にエラーが発生しました。');
    }
  },

  // カテゴリ選択画面
  async showCategorySelection(interaction) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('report_category_select')
      .setPlaceholder('レポートを記録するカテゴリを選択してください')
      .addOptions([
        {
          label: '📚 本・読書',
          description: '読書の進捗や感想を記録',
          value: 'book'
        },
        {
          label: '🎬 映画・視聴',
          description: '映画の感想や視聴記録',
          value: 'movie'
        },
        {
          label: '🎯 活動・目標',
          description: '活動の進捗や振り返り',
          value: 'activity'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setTitle('📝 レポート記録')
      .setColor('#9C27B0')
      .setDescription('どのカテゴリのレポートを記録しますか？')
      .addFields(
        { name: '📚 本・読書', value: '読書の感想、進捗、気づきなど', inline: true },
        { name: '🎬 映画・視聴', value: '映画の感想、評価、印象など', inline: true },
        { name: '🎯 活動・目標', value: '活動の振り返り、進捗、学びなど', inline: true }
      )
      .setFooter({ text: 'カテゴリを選択してください' });

    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  // アイテム選択画面
  async showItemSelection(interaction, category) {
    try {
      let items = [];
      let categoryName = '';
      let emoji = '';

      switch (category) {
        case 'book':
          items = await googleSheets.getAllBooks();
          categoryName = '本・読書';
          emoji = '📚';
          break;
        case 'movie':
          items = await googleSheets.getAllMovies();
          categoryName = '映画・視聴';
          emoji = '🎬';
          break;
        case 'activity':
          items = await googleSheets.getAllActivities();
          categoryName = '活動・目標';
          emoji = '🎯';
          break;
      }

      if (items.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle(`📝 ${emoji} ${categoryName}のレポート記録`)
          .setColor('#FF5722')
          .setDescription(`登録されている${categoryName}がありません。`)
          .addFields(
            { name: '💡 ヒント', value: `先に${categoryName}を追加してからレポートを記録してください`, inline: false }
          );

        await interaction.editReply({ embeds: [embed], components: [] });
        return;
      }

      if (items.length <= 25) {
        const options = items.map(item => {
          const title = item.title || item.content || '不明';
          const description = category === 'book' 
            ? `作者: ${item.author || '不明'}` 
            : category === 'movie'
            ? `ステータス: ${this.getStatusText(item.status)}`
            : `ステータス: ${this.getStatusText(item.status)}`;

          return {
            label: title.slice(0, 100),
            description: description.slice(0, 100),
            value: item.id.toString()
          };
        });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`report_item_select_${category}`)
          .setPlaceholder('レポートを記録するアイテムを選択してください')
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
          .setTitle(`📝 ${emoji} ${categoryName}のレポート記録`)
          .setColor('#9C27B0')
          .setDescription(`${categoryName}が ${items.length} 件あります。レポートを記録する対象を選択してください。`)
          .addFields(
            { name: `${emoji} 登録済み${categoryName}`, value: items.slice(0, 10).map(item => `• ${item.title || item.content}`).join('\n').slice(0, 1024), inline: false }
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
      await interaction.editReply(`❌ ${category}アイテム選択中にエラーが発生しました。`);
    }
  },

  // 🆕 レポート入力画面（メッセージコレクター使用）
  async showReportInput(interaction, category, itemId) {
    try {
      console.log(`📝 レポート入力画面表示: ${category}, ID: ${itemId}`);

      // アイテム情報を取得
      let item = null;
      switch (category) {
        case 'book':
          item = await googleSheets.getBookById(itemId);
          break;
        case 'movie':
          item = await googleSheets.getMovieById(itemId);
          break;
        case 'activity':
          item = await googleSheets.getActivityById(itemId);
          break;
      }

      if (!item) {
        await interaction.editReply({ 
          content: '❌ 選択されたアイテムが見つかりません。', 
          components: [] 
        });
        return;
      }

      const itemTitle = item.title || item.content || '不明';
      const categoryEmoji = {
        'book': '📚',
        'movie': '🎬',
        'activity': '🎯'
      }[category];

      // レポート入力待機画面を表示
      const embed = new EmbedBuilder()
        .setTitle('📝 レポート記録')
        .setColor('#9C27B0')
        .setDescription('次のメッセージでレポート内容を入力してください')
        .addFields(
          { name: '対象アイテム', value: `${categoryEmoji} ${itemTitle}`, inline: false },
          { name: '📝 記録内容の例', value: '• 今日は30分間実践\n• 新しいテクニックを習得\n• 明日は応用編にチャレンジ', inline: false },
          { name: '⚡ 入力方法', value: 'この後に続けてレポート内容をメッセージで送信してください', inline: false }
        )
        .setFooter({ text: '記録は後で /reports history で確認できます' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], components: [] });

      // 🆕 メッセージコレクターを設定
      const filter = (message) => {
        return message.author.id === interaction.user.id && !message.author.bot;
      };

      const collector = interaction.channel.createMessageCollector({
        filter,
        max: 1,
        time: 300000 // 5分間待機
      });

      console.log('📬 メッセージコレクター開始');

      collector.on('collect', async (message) => {
        console.log('📨 メッセージ受信:', message.content);

        try {
          const reportContent = message.content.trim();
          
          if (reportContent.length === 0) {
            await message.reply('❌ レポート内容が空です。もう一度入力してください。');
            return;
          }

          if (reportContent.length > 2000) {
            await message.reply('❌ レポート内容が長すぎます（2000文字以内）。短縮してください。');
            return;
          }

          // レポートをデータベースに保存
          const reportId = await this.saveReport(category, itemId, itemTitle, reportContent);

          if (reportId) {
            // 成功メッセージを表示
            const successEmbed = new EmbedBuilder()
              .setTitle('✅ レポート記録完了！')
              .setColor('#4CAF50')
              .setDescription('レポートが正常に記録されました！')
              .addFields(
                { name: 'レポートID', value: reportId.toString(), inline: true },
                { name: '対象アイテム', value: `${categoryEmoji} ${itemTitle}`, inline: true },
                { name: '記録日時', value: new Date().toLocaleString('ja-JP'), inline: true },
                { name: '📝 記録内容', value: reportContent.slice(0, 1000) + (reportContent.length > 1000 ? '...' : ''), inline: false }
              )
              .setFooter({ text: '履歴は /reports history で確認できます' })
              .setTimestamp();

            await message.reply({ embeds: [successEmbed] });
            
            // 元のメッセージを削除（任意）
            try {
              await message.delete();
            } catch (deleteError) {
              console.log('⚠️ メッセージ削除に失敗（権限不足の可能性）');
            }

          } else {
            await message.reply('❌ レポートの保存に失敗しました。もう一度お試しください。');
          }

        } catch (error) {
          console.error('❌ レポート保存エラー:', error);
          await message.reply('❌ レポート保存中にエラーが発生しました。');
        }
      });

      collector.on('end', (collected, reason) => {
        console.log(`📬 メッセージコレクター終了: ${reason}, 収集数: ${collected.size}`);
        
        if (reason === 'time' && collected.size === 0) {
          // タイムアウトした場合
          interaction.followUp({
            content: '⏰ レポート入力がタイムアウトしました。もう一度 `/report` コマンドをお試しください。',
            ephemeral: true
          }).catch(console.error);
        }
      });

    } catch (error) {
      console.error('❌ レポート入力画面エラー:', error);
      await interaction.editReply({ 
        content: '❌ レポート入力画面の表示中にエラーが発生しました。', 
        components: [] 
      });
    }
  },

  // 🆕 レポート保存メソッド
  async saveReport(category, itemId, itemTitle, content) {
    try {
      console.log('💾 レポート保存開始:', { category, itemId, itemTitle, content });

      // Google Sheetsにレポートを保存
      const reportId = await googleSheets.addReport(category, itemId, itemTitle, content);
      
      console.log('✅ レポート保存完了:', reportId);
      return reportId;

    } catch (error) {
      console.error('❌ レポート保存エラー:', error);
      return null;
    }
  },

  // ページネーション処理
  async showItemSelectionWithPagination(interaction, category, items, page = 0) {
    try {
      console.log(`📄 showItemSelectionWithPagination: ${category}, ページ ${page}, アイテム数 ${items.length}`);
      
      const itemsPerPage = 25;
      const totalPages = Math.ceil(items.length / itemsPerPage);
      const currentItems = items.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
      
      console.log(`📊 ページ情報: ${page + 1}/${totalPages}, 表示数: ${currentItems.length}`);
      
      if (currentItems.length === 0) {
        await interaction.editReply({ 
          content: '❌ 表示するアイテムがありません。', 
          components: [] 
        });
        return;
      }

      const categoryEmoji = {
        'book': '📚',
        'movie': '🎬', 
        'activity': '🎯'
      }[category];

      const categoryName = {
        'book': '本・読書',
        'movie': '映画・視聴',
        'activity': '活動・目標'
      }[category];

      const options = currentItems.map(item => {
        const title = item.title || item.content || '不明';
        const description = category === 'book' 
          ? `作者: ${item.author || '不明'}` 
          : category === 'movie'
          ? `ステータス: ${this.getStatusText(item.status)}`
          : `ステータス: ${this.getStatusText(item.status)}`;

        return {
          label: title.slice(0, 100),
          description: description.slice(0, 100),
          value: item.id.toString()
        };
      });
      
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`report_item_select_${category}_page_${page}`)
        .setPlaceholder('レポートを記録するアイテムを選択してください')
        .addOptions(options);
      
      const components = [new ActionRowBuilder().addComponents(selectMenu)];
      
      // ページネーションボタンを追加
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
      
      const embed = new EmbedBuilder()
        .setTitle(`📝 ${categoryEmoji} ${categoryName}のレポート記録`)
        .setColor('#9C27B0')
        .setDescription(`${categoryName}が ${items.length} 件あります（${page + 1}/${totalPages}ページ）`)
        .addFields(
          { name: `${categoryEmoji} 登録済み${categoryName}`, value: currentItems.map(item => `• ${item.title || item.content}`).join('\n').slice(0, 1024), inline: false }
        );
      
      console.log('📤 ページネーション付きの返信を送信');
      await interaction.editReply({ embeds: [embed], components });
      
    } catch (error) {
      console.error('❌ showItemSelectionWithPagination エラー:', error);
      await interaction.editReply({ 
        content: '❌ ページネーション処理中にエラーが発生しました。', 
        components: [] 
      });
    }
  },

  // ヘルパーメソッド
  getStatusText(status) {
    const texts = {
      'want_to_buy': '買いたい',
      'want_to_read': '積読',
      'reading': '読書中',
      'finished': '読了',
      'abandoned': '中断',
      'want_to_watch': '観たい',
      'watched': '視聴済み',
      'missed': '見逃し',
      'planned': '予定中',
      'done': '完了',
      'skipped': 'スキップ'
    };
    return texts[status] || status;
  },

  getStatusEmoji(status) {
    const emojis = {
      'want_to_buy': '🛒',
      'want_to_read': '📋',
      'reading': '📖',
      'finished': '✅',
      'abandoned': '❌',
      'want_to_watch': '🎬',
      'watched': '✅',
      'missed': '😅',
      'planned': '🎯',
      'done': '✅',
      'skipped': '😅'
    };
    return emojis[status] || '❓';
  },

  // レポートの文字数をカウント
  getReportLength(content) {
    return content ? content.length : 0;
  },

  // レポートの要約を生成
  generateReportSummary(content, maxLength = 100) {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  },

  // レポートのカテゴリ情報を取得
  getCategoryInfo(category) {
    const categoryData = {
      'book': {
        name: '本・読書',
        emoji: '📚',
        color: '#2196F3',
        examples: [
          '• 今日は第3章まで読了',
          '• 主人公の心境の変化が印象的',
          '• 明日は続きを読む予定'
        ]
      },
      'movie': {
        name: '映画・視聴',
        emoji: '🎬',
        color: '#FF9800',
        examples: [
          '• 映像美が素晴らしかった',
          '• ストーリー展開が予想外',
          '• 友人にもおすすめしたい'
        ]
      },
      'activity': {
        name: '活動・目標',
        emoji: '🎯',
        color: '#4CAF50',
        examples: [
          '• 今日は30分間実践',
          '• 新しいテクニックを習得',
          '• 明日は応用編にチャレンジ'
        ]
      }
    };

    return categoryData[category] || {
      name: 'その他',
      emoji: '📝',
      color: '#9E9E9E',
      examples: ['• 今日の振り返り']
    };
  },

  // レポート内容の検証
  validateReportContent(content) {
    const validation = {
      isValid: true,
      errors: []
    };

    if (!content || content.trim().length === 0) {
      validation.isValid = false;
      validation.errors.push('レポート内容が空です');
    }

    if (content && content.length > 2000) {
      validation.isValid = false;
      validation.errors.push('レポート内容が長すぎます（2000文字以内）');
    }

    if (content && content.length < 5) {
      validation.isValid = false;
      validation.errors.push('レポート内容が短すぎます（5文字以上）');
    }

    return validation;
  }
};
