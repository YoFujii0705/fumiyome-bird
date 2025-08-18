const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
        case 'done':
          await this.handleDone(interaction);
          break;
        case 'skip':
          await this.handleSkip(interaction);
          break;
        case 'list':
          await this.handleList(interaction);
          break;
        case 'planned':
          await this.handlePlanned(interaction);
          break;
        case 'completed':
          await this.handleCompleted(interaction);
          break;
        case 'info':
          await this.handleInfo(interaction);
          break;
        default:
          await interaction.editReply(`❌ 不明なサブコマンド: ${subcommand}`);
      }
    } catch (error) {
      console.error('ActivityHandler エラー:', error);
      await interaction.editReply('❌ 処理中にエラーが発生しました。');
    }
  },

  async handleAdd(interaction) {
    const content = interaction.options.getString('content');
    const memo = interaction.options.getString('memo') || '';
    
    try {
      const activityId = await googleSheets.addActivity(content, memo);
      
      const embed = new EmbedBuilder()
        .setTitle('🎯 活動を追加しました！')
        .setColor('#00BCD4')
        .setDescription('新しい目標が設定されました！頑張りましょう！✨')
        .addFields(
          { name: 'ID', value: activityId.toString(), inline: true },
          { name: '活動内容', value: content, inline: true },
          { name: 'ステータス', value: '🎯 予定', inline: true }
        )
        .setFooter({ text: '完了したら /activity done で記録しましょう！（選択式）' })
        .setTimestamp();
      
      if (memo) {
        embed.addFields({ name: '備考', value: memo, inline: false });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('活動追加エラー:', error);
      await interaction.editReply('❌ 活動の追加中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 予定中の活動から選択
  async handleDone(interaction) {
    try {
      const plannedActivities = await googleSheets.getActivitiesByStatus('planned');
      
      if (plannedActivities.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🎯 活動完了記録')
          .setColor('#FF5722')
          .setDescription('現在予定中の活動がありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/activity add [内容]` で新しい活動を追加してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (plannedActivities.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('activity_done_select')
          .setPlaceholder('完了した活動を選択してください')
          .addOptions(
            plannedActivities.map(activity => ({
              label: `${activity.content}`.slice(0, 100),
              description: `備考: ${activity.memo || 'なし'}`.slice(0, 100),
              value: activity.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('🎯 活動完了記録')
          .setColor('#4CAF50')
          .setDescription(`予定中の活動が ${plannedActivities.length} 件あります。完了した活動を選択してください。`)
          .addFields(
            { name: '🎯 予定中の活動', value: plannedActivities.map(activity => `🎯 ${activity.content}`).join('\n').slice(0, 1024), inline: false }
          );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleDoneWithPagination(interaction, plannedActivities);
      }
    } catch (error) {
      console.error('活動完了選択エラー:', error);
      await interaction.editReply('❌ 活動完了選択中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 予定中の活動からスキップ選択
  async handleSkip(interaction) {
    try {
      const plannedActivities = await googleSheets.getActivitiesByStatus('planned');
      
      if (plannedActivities.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('😅 活動スキップ記録')
          .setColor('#FF5722')
          .setDescription('現在予定中の活動がありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/activity add [内容]` で新しい活動を追加してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (plannedActivities.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('activity_skip_select')
          .setPlaceholder('スキップする活動を選択してください')
          .addOptions(
            plannedActivities.map(activity => ({
              label: `${activity.content}`.slice(0, 100),
              description: `備考: ${activity.memo || 'なし'}`.slice(0, 100),
              value: activity.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('😅 活動スキップ記録')
          .setColor('#FF9800')
          .setDescription(`予定中の活動が ${plannedActivities.length} 件あります。スキップする活動を選択してください。`)
          .addFields(
            { name: '🎯 予定中の活動', value: plannedActivities.map(activity => `🎯 ${activity.content}`).join('\n').slice(0, 1024), inline: false }
          );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleSkipWithPagination(interaction, plannedActivities);
      }
    } catch (error) {
      console.error('活動スキップ選択エラー:', error);
      await interaction.editReply('❌ 活動スキップ選択中にエラーが発生しました。');
    }
  },

  // 🆕 選択式 - 全ての活動から選択
  async handleInfo(interaction) {
    try {
      const allActivities = await googleSheets.getAllActivities();
      
      if (allActivities.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📄 活動の詳細情報')
          .setColor('#FF5722')
          .setDescription('登録されている活動がありません。')
          .addFields(
            { name: '💡 ヒント', value: '`/activity add [内容]` で活動を追加してください', inline: false }
          );
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      if (allActivities.length <= 25) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('activity_info_select')
          .setPlaceholder('詳細を確認する活動を選択してください')
          .addOptions(
            allActivities.map(activity => ({
              label: `${activity.content}`.slice(0, 100),
              description: `${this.getStatusText(activity.status)} | ${activity.memo || 'メモなし'}`.slice(0, 100),
              value: activity.id.toString()
            }))
          );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
          .setTitle('📄 活動の詳細情報')
          .setColor('#3F51B5')
          .setDescription(`登録されている活動が ${allActivities.length} 件あります。詳細を確認する活動を選択してください。`)
          .addFields(
            { name: '🎯 登録済みの活動', value: allActivities.slice(0, 10).map(activity => `${this.getStatusEmoji(activity.status)} ${activity.content}`).join('\n').slice(0, 1024), inline: false }
          );
        
        if (allActivities.length > 10) {
          embed.addFields({ name: '📝 その他', value: `... 他${allActivities.length - 10}件`, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        await this.handleInfoWithPagination(interaction, allActivities);
      }
    } catch (error) {
      console.error('活動詳細選択エラー:', error);
      await interaction.editReply('❌ 活動詳細選択中にエラーが発生しました。');
    }
  },

  async handleList(interaction) {
    try {
      const activities = await googleSheets.getActivities();
      
      if (activities.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🎯 活動一覧')
          .setColor('#607D8B')
          .setDescription('まだ活動が登録されていません。')
          .addFields(
            { name: '🚀 活動を追加', value: '`/activity add [内容]` で新しい活動を追加できます', inline: false },
            { name: '💡 活動例', value: '• 新しいスキルを学ぶ\n• 運動を始める\n• 読書習慣をつける\n• プロジェクトを完成させる', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const statusOrder = ['planned', 'done', 'skipped'];
      const groupedActivities = activities.reduce((acc, activity) => {
        const statusMatch = activity.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : 'planned';
        
        if (!acc[status]) acc[status] = [];
        acc[status].push(activity);
        return acc;
      }, {});
      
      const embed = new EmbedBuilder()
        .setTitle('🎯 活動一覧')
        .setColor('#607D8B')
        .setDescription(`全 ${activities.length} 件の活動が登録されています`)
        .setTimestamp();
      
      statusOrder.forEach(status => {
        if (groupedActivities[status] && groupedActivities[status].length > 0) {
          const statusName = {
            'planned': '🎯 予定中',
            'done': '✅ 完了済み',
            'skipped': '😅 スキップ'
          }[status] || status;
          
          const displayActivities = groupedActivities[status].slice(0, 10);
          const moreCount = groupedActivities[status].length - 10;
          
          let fieldValue = displayActivities.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}件`;
          }
          
          embed.addFields({
            name: `${statusName} (${groupedActivities[status].length}件)`,
            value: fieldValue,
            inline: false
          });
        }
      });
      
      const totalPlanned = groupedActivities['planned']?.length || 0;
      const totalCompleted = groupedActivities['done']?.length || 0;
      const completionRate = totalCompleted + totalPlanned > 0 
        ? Math.round((totalCompleted / (totalCompleted + totalPlanned)) * 100) 
        : 0;
      
      if (totalCompleted > 0) {
        embed.addFields({
          name: '📊 達成状況',
          value: `完了率: ${completionRate}% (${totalCompleted}/${totalCompleted + totalPlanned})`,
          inline: false
        });
      }
      
      embed.setFooter({ text: '操作: /activity done, /activity skip (選択式で実行可能)' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('活動一覧取得エラー:', error);
      await interaction.editReply('❌ 活動一覧の取得中にエラーが発生しました。');
    }
  },

  async handlePlanned(interaction) {
    try {
      const activities = await googleSheets.getActivities();
      const plannedActivities = activities.filter(activity => activity.includes('(planned)'));
      
      if (plannedActivities.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🎯 予定中の活動')
          .setColor('#00BCD4')
          .setDescription('現在予定中の活動はありません。')
          .addFields(
            { name: '🚀 活動を追加', value: '`/activity add [内容]` で新しい活動を追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🎯 予定中の活動')
        .setColor('#00BCD4')
        .setDescription(`${plannedActivities.length} 件の活動が予定中です`)
        .setTimestamp();
      
      const displayActivities = plannedActivities.slice(0, 15);
      const moreCount = plannedActivities.length - 15;
      
      let activityList = displayActivities.join('\n');
      if (moreCount > 0) {
        activityList += `\n... 他${moreCount}件`;
      }
      
      embed.addFields({
        name: '📋 予定中の活動一覧',
        value: activityList,
        inline: false
      });
      
      embed.setFooter({ text: '完了したら /activity done で記録しましょう！（選択式）' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('予定中活動取得エラー:', error);
      await interaction.editReply('❌ 予定中活動の取得中にエラーが発生しました。');
    }
  },

  async handleCompleted(interaction) {
    try {
      const activities = await googleSheets.getActivities();
      const completedActivities = activities.filter(activity => activity.includes('(done)'));
      
      if (completedActivities.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('✅ 完了済み活動')
          .setColor('#4CAF50')
          .setDescription('まだ完了した活動がありません。')
          .addFields(
            { name: '🎯 活動を完了', value: '予定中の活動を `/activity done` で完了できます（選択式）', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('✅ 完了済み活動')
        .setColor('#4CAF50')
        .setDescription(`${completedActivities.length} 件の活動を完了済みです`)
        .setTimestamp();
      
      const displayActivities = completedActivities.slice(0, 15);
      const moreCount = completedActivities.length - 15;
      
      let activityList = displayActivities.join('\n');
      if (moreCount > 0) {
        activityList += `\n... 他${moreCount}件`;
      }
      
      embed.addFields({
        name: '🏆 完了済み活動一覧',
        value: activityList,
        inline: false
      });
      
      embed.setFooter({ text: '振り返りは /report activity で記録できます（選択式）' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('完了済み活動取得エラー:', error);
      await interaction.editReply('❌ 完了済み活動の取得中にエラーが発生しました。');
    }
  },

  // ページネーション用のヘルパーメソッド
  async handleDoneWithPagination(interaction, activities, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(activities.length / itemsPerPage);
    const currentActivities = activities.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`activity_done_select_page_${page}`)
      .setPlaceholder('完了した活動を選択してください')
      .addOptions(
        currentActivities.map(activity => ({
          label: `${activity.content}`.slice(0, 100),
          description: `備考: ${activity.memo || 'なし'}`.slice(0, 100),
          value: activity.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`activity_done_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`activity_done_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🎯 活動完了記録')
      .setColor('#4CAF50')
      .setDescription(`予定中の活動が ${activities.length} 件あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { name: '🎯 予定中の活動', value: currentActivities.map(activity => `🎯 ${activity.content}`).join('\n').slice(0, 1024), inline: false }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleSkipWithPagination(interaction, activities, page = 0) {
    // handleDoneWithPaginationと同様の実装
    const itemsPerPage = 25;
    const totalPages = Math.ceil(activities.length / itemsPerPage);
    const currentActivities = activities.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`activity_skip_select_page_${page}`)
      .setPlaceholder('スキップする活動を選択してください')
      .addOptions(
        currentActivities.map(activity => ({
          label: `${activity.content}`.slice(0, 100),
          description: `備考: ${activity.memo || 'なし'}`.slice(0, 100),
          value: activity.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`activity_skip_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`activity_skip_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('😅 活動スキップ記録')
      .setColor('#FF9800')
      .setDescription(`予定中の活動が ${activities.length} 件あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { name: '🎯 予定中の活動', value: currentActivities.map(activity => `🎯 ${activity.content}`).join('\n').slice(0, 1024), inline: false }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  async handleInfoWithPagination(interaction, activities, page = 0) {
    const itemsPerPage = 25;
    const totalPages = Math.ceil(activities.length / itemsPerPage);
    const currentActivities = activities.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`activity_info_select_page_${page}`)
      .setPlaceholder('詳細を確認する活動を選択してください')
      .addOptions(
        currentActivities.map(activity => ({
          label: `${activity.content}`.slice(0, 100),
          description: `${this.getStatusText(activity.status)} | ${activity.memo || 'メモなし'}`.slice(0, 100),
          value: activity.id.toString()
        }))
      );
    
    const components = [new ActionRowBuilder().addComponents(selectMenu)];
    
    if (totalPages > 1) {
      const buttons = [];
      
      if (page > 0) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`activity_info_prev_${page - 1}`)
            .setLabel('◀ 前のページ')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (page < totalPages - 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`activity_info_next_${page + 1}`)
            .setLabel('次のページ ▶')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      
      if (buttons.length > 0) {
        components.push(new ActionRowBuilder().addComponents(buttons));
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📄 活動の詳細情報')
      .setColor('#3F51B5')
      .setDescription(`登録されている活動が ${activities.length} 件あります（${page + 1}/${totalPages}ページ）`)
      .addFields(
        { name: '🎯 登録済みの活動', value: currentActivities.map(activity => `${this.getStatusEmoji(activity.status)} ${activity.content}`).join('\n').slice(0, 1024), inline: false }
      );
    
    await interaction.editReply({ embeds: [embed], components });
  },

  // ヘルパーメソッド
  getStatusEmoji(status) {
    const emojis = {
      'planned': '🎯',
      'done': '✅',
      'skipped': '😅'
    };
    return emojis[status] || '❓';
  },

  getStatusText(status) {
    const texts = {
      'planned': '予定中',
      'done': '完了',
      'skipped': 'スキップ'
    };
    return texts[status] || status;
  },

  // 活動の優先度を設定するヘルパー（将来の拡張用）
  async setPriority(activityId, priority) {
    try {
      console.log(`活動ID ${activityId} の優先度を ${priority} に設定`);
      return true;
    } catch (error) {
      console.error('優先度設定エラー:', error);
      return false;
    }
  },

  // 活動の進捗率を計算
  calculateProgress(activities) {
    const total = activities.length;
    const completed = activities.filter(activity => 
      activity.includes('(done)') || activity.includes('完了')
    ).length;
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  },

  // 活動のカテゴリ分析（内容からカテゴリを推測）
  categorizeActivity(content) {
    const categories = {
      '📚 学習・スキルアップ': ['学習', '勉強', 'スキル', '資格', '習得', '覚える'],
      '💪 健康・運動': ['運動', '筋トレ', 'ジョギング', 'ウォーキング', '健康', 'ダイエット'],
      '🏠 生活・家事': ['掃除', '整理', '家事', '買い物', '料理', '洗濯'],
      '💼 仕事・キャリア': ['仕事', 'プロジェクト', '会議', '資料', '企画', 'タスク'],
      '🎨 趣味・創作': ['趣味', '創作', '絵', '音楽', '写真', '制作'],
      '👥 人間関係・社交': ['連絡', '会う', '電話', '友人', '家族', '付き合い']
    };
    
    const lowerContent = content.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        return category;
      }
    }
    
    return '🎯 その他';
  },

  // 活動の推奨期限を提案
  suggestDeadline(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('習慣') || lowerContent.includes('継続')) {
      return '継続的な活動のため期限なし';
    } else if (lowerContent.includes('緊急') || lowerContent.includes('急ぎ')) {
      return '3日以内推奨';
    } else if (lowerContent.includes('プロジェクト') || lowerContent.includes('計画')) {
      return '1-2週間程度';
    } else {
      return '1週間程度';
    }
  }
};
