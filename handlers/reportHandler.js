// reportHandler.js の修正版 - 漫画対応完全版

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

  // カテゴリ選択画面（漫画対応）
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
          label: '📺 アニメ・視聴', 
          description: 'アニメの感想や視聴記録', 
          value: 'anime' 
        },
        {
          label: '📖 漫画・読書',
          description: '漫画の感想や読書記録',
          value: 'manga'
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
        { name: '📺 アニメ・視聴', value: 'アニメの感想、評価、印象など', inline: true },
        { name: '📖 漫画・読書', value: '漫画の感想、進捗、印象など', inline: true },
        { name: '🎯 活動・目標', value: '活動の振り返り、進捗、学びなど', inline: true }
      )
      .setFooter({ text: 'カテゴリを選択してください' });

    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  // アイテム選択画面（漫画対応版）
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
        case 'anime':
          items = await googleSheets.getAllAnimes();
          categoryName = 'アニメ・視聴';
          emoji = '📺';
          break;
        case 'manga':
          items = await googleSheets.getAllMangas();
          categoryName = '漫画・読書';
          emoji = '📖';
          break;
        case 'activity':
          items = await googleSheets.getAllActivities();
          categoryName = '活動・目標';
          emoji = '🎯';
          break;
        default:
          console.error('❌ 不明なカテゴリ:', category);
          await interaction.editReply({ 
            content: '❌ 不明なカテゴリです。', 
            components: [] 
          });
          return;
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
          let description = '';
          
          switch (category) {
            case 'book':
              description = `作者: ${item.author || '不明'}`;
              break;
            case 'movie':
              description = `ステータス: ${this.getStatusText(item.status)}`;
              break;
            case 'anime':
              description = `${item.watched_episodes || 0}/${item.total_episodes || 0}話 | ${this.getStatusText(item.status)}`;
              break;
            case 'manga':
              description = `${item.read_count || 0}/${item.total_count || 0}${item.format === 'volume' ? '巻' : '話'} | ${this.getMangaStatusText(item.reading_status)}`;
              break;
            case 'activity':
              description = `ステータス: ${this.getStatusText(item.status)}`;
              break;
            default:
              description = 'ステータス: 不明';
          }

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
            { 
              name: `${emoji} 登録済み${categoryName}`, 
              value: items.slice(0, 10).map(item => {
                const title = item.title || item.content || '不明';
                if (category === 'anime') {
                  return `• ${title} (${item.watched_episodes || 0}/${item.total_episodes || 0}話)`;
                } else if (category === 'manga') {
                  return `• ${title} (${item.read_count || 0}/${item.total_count || 0}${item.format === 'volume' ? '巻' : '話'})`;
                }
                return `• ${title}`;
              }).join('\n').slice(0, 1024), 
              inline: false 
            }
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

  // レポート入力画面（漫画対応版）
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
        case 'anime':
          item = await googleSheets.getAnimeById(itemId);
          break;
        case 'manga':
          item = await googleSheets.getMangaById(itemId);
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
        'anime': '📺',
        'manga': '📖',
        'activity': '🎯'
      }[category];

      // アニメ・漫画の場合は進捗情報も表示
      let itemDescription = `${categoryEmoji} ${itemTitle}`;
      if (category === 'anime') {
        itemDescription += ` (${item.watched_episodes || 0}/${item.total_episodes || 0}話)`;
      } else if (category === 'manga') {
        const unit = item.format === 'volume' ? '巻' : '話';
        itemDescription += ` (${item.read_count || 0}/${item.total_count || 0}${unit})`;
      }

      // カテゴリ別の記録例を取得
      const categoryInfo = this.getCategoryInfo(category);

      // レポート入力待機画面を表示
      const embed = new EmbedBuilder()
        .setTitle('📝 レポート記録')
        .setColor(categoryInfo.color)
        .setDescription('**次のメッセージでレポート内容を入力してください**\n\n⚠️ スラッシュコマンドではなく、通常のメッセージで送信してください')
        .addFields(
          { name: '📌 対象アイテム', value: itemDescription, inline: false },
          { name: '📝 記録内容の例', value: '```\n' + categoryInfo.examples.join('\n') + '\n```', inline: false },
          { name: '⚡ 重要な注意事項', value: '• **このチャンネルに普通のメッセージとして入力**\n• スラッシュコマンド（/）は使わない\n• 5分以内に送信してください', inline: false }
        )
        .setFooter({ text: '⏰ 5分でタイムアウトします | 記録は /reports history で確認可能' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], components: [] });

      // チャンネル権限をチェック
      console.log('🔍 チャンネル権限チェック開始');
      console.log('📍 チャンネルタイプ:', interaction.channel.type);
      console.log('📍 チャンネルID:', interaction.channel.id);
      console.log('📍 ユーザーID:', interaction.user.id);

      // ボットの権限確認
      const botMember = interaction.guild?.members?.me;
      if (botMember) {
        const permissions = interaction.channel.permissionsFor(botMember);
        console.log('🤖 ボット権限:');
        console.log('  - メッセージ読み取り:', permissions.has('ViewChannel'));
        console.log('  - メッセージ履歴読み取り:', permissions.has('ReadMessageHistory'));
        console.log('  - メッセージ送信:', permissions.has('SendMessages'));
        
        if (!permissions.has('ViewChannel') || !permissions.has('ReadMessageHistory')) {
          await interaction.followUp({
            content: '❌ ボットにメッセージ読み取り権限がありません。サーバー管理者にお問い合わせください。',
            ephemeral: true
          });
          return;
        }
      }

      // 改良されたメッセージコレクター
      const filter = (message) => {
        console.log(`🔍 メッセージフィルターチェック:`);
        console.log(`  - メッセージ作者: ${message.author.username} (${message.author.id})`);
        console.log(`  - 期待するユーザー: ${interaction.user.username} (${interaction.user.id})`);
        console.log(`  - ボットかどうか: ${message.author.bot}`);
        console.log(`  - チャンネルID: ${message.channel.id}`);
        console.log(`  - メッセージ内容: "${message.content}"`);
        
        const isCorrectUser = message.author.id === interaction.user.id;
        const isNotBot = !message.author.bot;
        const hasContent = message.content && message.content.trim().length > 0;
        
        console.log(`  - ユーザー一致: ${isCorrectUser}`);
        console.log(`  - ボットでない: ${isNotBot}`);
        console.log(`  - 内容あり: ${hasContent}`);
        
        return isCorrectUser && isNotBot && hasContent;
      };

      console.log('📬 メッセージコレクター設定開始');
      
      const collector = interaction.channel.createMessageCollector({
        filter,
        max: 1,
        time: 300000, // 5分間
        dispose: true
      });

      console.log('✅ メッセージコレクター開始成功');

      // デバッグ用：全メッセージをログ出力
      const debugCollector = interaction.channel.createMessageCollector({
        filter: () => true, // 全メッセージ
        time: 300000
      });

      debugCollector.on('collect', (message) => {
        console.log(`🔎 [デバッグ] 全メッセージ検出:`);
        console.log(`  - 作者: ${message.author.username} (ID: ${message.author.id}, Bot: ${message.author.bot})`);
        console.log(`  - 内容: "${message.content}"`);
        console.log(`  - チャンネル: ${message.channel.id}`);
        console.log(`  - 時刻: ${new Date().toLocaleString('ja-JP')}`);
      });

      collector.on('collect', async (message) => {
        console.log('🎉 メッセージコレクター：メッセージ受信成功！');
        console.log(`📨 受信内容: "${message.content}"`);
        console.log(`👤 送信者: ${message.author.username}`);

        try {
          const reportContent = message.content.trim();
          
          // バリデーション
          const validation = this.validateReportContent(reportContent);
          if (!validation.isValid) {
            console.log('❌ バリデーション失敗:', validation.errors);
            await message.reply({
              content: `❌ ${validation.errors.join('\n')}\n\nもう一度正しい形式で入力してください。`,
              allowedMentions: { repliedUser: false }
            });
            return;
          }

          // レポートをデータベースに保存
          console.log('💾 レポート保存開始...');
          const reportId = await this.saveReport(category, itemId, itemTitle, reportContent);

          if (reportId) {
            console.log('✅ レポート保存成功:', reportId);
            
            // 成功メッセージを表示
            const successEmbed = new EmbedBuilder()
              .setTitle('🎉 レポート記録完了！')
              .setColor('#4CAF50')
              .setDescription('レポートが正常に記録されました！お疲れ様でした！✨')
              .addFields(
                { name: '📝 レポートID', value: `#${reportId}`, inline: true },
                { name: '📌 対象アイテム', value: itemDescription, inline: true },
                { name: '📅 記録日時', value: new Date().toLocaleString('ja-JP'), inline: true },
                { name: '📄 記録内容', value: this.generateReportSummary(reportContent, 500), inline: false }
              )
              .setFooter({ text: '履歴確認: /reports history | 新しいレポート: /report' })
              .setTimestamp();

            await message.reply({ 
              embeds: [successEmbed],
              allowedMentions: { repliedUser: false }
            });
            
            // 元のメッセージを削除（権限がある場合のみ）
            setTimeout(async () => {
              try {
                if (message.deletable) {
                  await message.delete();
                  console.log('🗑️ 元のメッセージを削除しました');
                }
              } catch (deleteError) {
                console.log('⚠️ メッセージ削除スキップ（権限不足または削除済み）');
              }
            }, 1000);

          } else {
            console.log('❌ レポート保存失敗');
            await message.reply({
              content: '❌ レポートの保存に失敗しました。しばらく待ってから再試行してください。',
              allowedMentions: { repliedUser: false }
            });
          }

        } catch (error) {
          console.error('❌ レポート処理エラー:', error);
          await message.reply({
            content: '❌ レポート処理中にエラーが発生しました。管理者にお問い合わせください。',
            allowedMentions: { repliedUser: false }
          }).catch(console.error);
        }

        // デバッグコレクターも停止
        debugCollector.stop();
      });

      collector.on('end', (collected, reason) => {
        console.log(`📬 メッセージコレクター終了:`);
        console.log(`  - 理由: ${reason}`);
        console.log(`  - 収集数: ${collected.size}`);
        console.log(`  - 時刻: ${new Date().toLocaleString('ja-JP')}`);
        
        debugCollector.stop();
        
        if (reason === 'time' && collected.size === 0) {
          console.log('⏰ タイムアウト：フォローアップメッセージ送信');
          // タイムアウトした場合
          interaction.followUp({
            content: '⏰ **レポート入力がタイムアウトしました**\n\n再度レポートを記録する場合は `/report` コマンドを実行してください。',
            ephemeral: true
          }).catch(error => {
            console.error('❌ フォローアップ送信エラー:', error);
          });
        }
      });

      // 追加のデバッグ情報
      setTimeout(() => {
        console.log('🕐 30秒経過 - コレクター状態チェック');
        console.log(`  - コレクター終了済み: ${collector.ended}`);
        console.log(`  - 収集済みメッセージ数: ${collector.collected.size}`);
      }, 30000);

    } catch (error) {
      console.error('❌ レポート入力画面エラー:', error);
      console.error('❌ エラースタック:', error.stack);
      await interaction.editReply({ 
        content: '❌ レポート入力画面の表示中にエラーが発生しました。\n\n**エラー詳細:** ' + error.message, 
        components: [] 
      });
    }
  },

  // レポート保存メソッド
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

  // ページネーション処理（漫画対応版）
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
        'anime': '📺',
        'manga': '📖',
        'activity': '🎯'
      }[category];

      const categoryName = {
        'book': '本・読書',
        'movie': '映画・視聴',
        'anime': 'アニメ・視聴',
        'manga': '漫画・読書',
        'activity': '活動・目標'
      }[category];

      const options = currentItems.map(item => {
        const title = item.title || item.content || '不明';
        let description = '';
        
        switch (category) {
          case 'book':
            description = `作者: ${item.author || '不明'}`;
            break;
          case 'movie':
            description = `ステータス: ${this.getStatusText(item.status)}`;
            break;
          case 'anime':
            description = `${item.watched_episodes || 0}/${item.total_episodes || 0}話 | ${this.getStatusText(item.status)}`;
            break;
          case 'manga':
            description = `${item.read_count || 0}/${item.total_count || 0}${item.format === 'volume' ? '巻' : '話'} | ${this.getMangaStatusText(item.reading_status)}`;
            break;
          case 'activity':
            description = `ステータス: ${this.getStatusText(item.status)}`;
            break;
          default:
            description = 'ステータス: 不明';
        }

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
          { 
            name: `${categoryEmoji} 登録済み${categoryName}`, 
            value: currentItems.map(item => {
              const title = item.title || item.content || '不明';
              if (category === 'anime') {
                return `• ${title} (${item.watched_episodes || 0}/${item.total_episodes || 0}話)`;
              } else if (category === 'manga') {
                const unit = item.format === 'volume' ? '巻' : '話';
                return `• ${title} (${item.read_count || 0}/${item.total_count || 0}${unit})`;
              }
              return `• ${title}`;
            }).join('\n').slice(0, 1024), 
            inline: false 
          }
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

  // ヘルパーメソッド（漫画対応）
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
      'skipped': 'スキップ',
      'watching': '視聴中',
      'completed': '完走済み',
      'dropped': '中断'
    };
    return texts[status] || status;
  },

  getMangaStatusText(status) {
    const texts = {
      'want_to_read': '読みたい',
      'reading': '読書中',
      'finished': '読了済み',
      'dropped': '中断'
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
      'skipped': '😅',
      'watching': '📺',
      'completed': '✅',
      'dropped': '💔'
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

  // レポートのカテゴリ情報を取得（漫画対応）
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
      'anime': {
        name: 'アニメ・視聴',
        emoji: '📺',
        color: '#E91E63',
        examples: [
          '• 今日は第5話まで視聴',
          '• 作画とBGMが最高だった',
          '• キャラクターの成長が感動的',
          '• 次回が気になる展開',
          '• 一気に3話見てしまった'
        ]
      },
      'manga': {
        name: '漫画・読書',
        emoji: '📖',
        color: '#9C27B0',
        examples: [
          '• 今日は3巻まで読了',
          '• バトルシーンの迫力がすごい',
          '• キャラクターの掛け合いが面白い',
          '• 続きが気になる展開',
          '• 作者の表現力に感動',
          '• 一気に5話読んでしまった'
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
