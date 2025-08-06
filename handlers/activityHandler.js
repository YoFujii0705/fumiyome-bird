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
        .setFooter({ text: '完了したら /activity done で記録しましょう！' })
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

  async handleDone(interaction) {
    const doneId = interaction.options.getInteger('id');
    
    try {
      const doneActivity = await googleSheets.doneActivity(doneId);
      
      if (doneActivity) {
        const embed = new EmbedBuilder()
          .setTitle('🎉 活動完了！')
          .setColor('#4CAF50')
          .setDescription('素晴らしい！目標を達成しましたね！🎉✨')
          .addFields(
            { name: 'ID', value: doneActivity.id.toString(), inline: true },
            { name: '活動内容', value: doneActivity.content, inline: true },
            { name: 'ステータス変更', value: '🎯 予定 → ✅ 完了', inline: true }
          )
          .setFooter({ text: '感想を /report activity で記録してみませんか？' })
          .setTimestamp();
        
        if (doneActivity.memo) {
          embed.addFields({ name: '備考', value: doneActivity.memo, inline: false });
        }
        
        // 達成を祝うメッセージを追加
        const congratsMessages = [
          '継続は力なり！次の活動も頑張りましょう！',
          'お疲れ様でした！着実に前進していますね！',
          '素晴らしい成果です！この調子で行きましょう！',
          '目標達成おめでとうございます！次はどんな挑戦をしますか？',
          '努力が実を結びましたね！次のステップも楽しみです！'
        ];
        
        const randomMessage = congratsMessages[Math.floor(Math.random() * congratsMessages.length)];
        embed.setDescription(randomMessage + ' 🎉✨');
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❓ 活動が見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${doneId} の活動が見つからないか、既に完了済みです。`)
          .addFields(
            { name: '💡 確認方法', value: '`/activity list` で活動一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('活動完了記録エラー:', error);
      await interaction.editReply('❌ 活動完了記録中にエラーが発生しました。');
    }
  },

  async handleSkip(interaction) {
    const skipId = interaction.options.getInteger('id');
    
    try {
      const skippedActivity = await googleSheets.skipActivity(skipId);
      
      if (skippedActivity) {
        const embed = new EmbedBuilder()
          .setTitle('😅 活動をスキップしました')
          .setColor('#FF9800')
          .setDescription('大丈夫です！時には見送ることも必要ですね。また機会があればチャレンジしてみてください！')
          .addFields(
            { name: 'ID', value: skippedActivity.id.toString(), inline: true },
            { name: '活動内容', value: skippedActivity.content, inline: true },
            { name: 'ステータス変更', value: '🎯 予定 → 😅 スキップ', inline: true }
          )
          .setFooter({ text: '新しい活動を追加して再チャレンジしてみましょう！' })
          .setTimestamp();
        
        if (skippedActivity.memo) {
          embed.addFields({ name: '備考', value: skippedActivity.memo, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❓ 活動が見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${skipId} の活動が見つからないか、既に処理済みです。`)
          .addFields(
            { name: '💡 確認方法', value: '`/activity list` で活動一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('活動スキップ記録エラー:', error);
      await interaction.editReply('❌ 活動スキップ記録中にエラーが発生しました。');
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
      
      // 活動をステータス別に分類
      const statusOrder = ['planned', 'done', 'skipped'];
      const groupedActivities = activities.reduce((acc, activity) => {
        // 活動文字列からステータスを抽出
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
      
      // ステータス別に表示
      statusOrder.forEach(status => {
        if (groupedActivities[status] && groupedActivities[status].length > 0) {
          const statusName = {
            'planned': '🎯 予定中',
            'done': '✅ 完了済み',
            'skipped': '😅 スキップ'
          }[status] || status;
          
          // 最大10件まで表示
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
      
      // 統計情報を追加
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
      
      embed.setFooter({ text: '操作: /activity done [ID] または /activity skip [ID]' });
      
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
      
      // 最大15件まで表示
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
      
      embed.setFooter({ text: '完了したら /activity done [ID] で記録しましょう！' });
      
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
            { name: '🎯 活動を完了', value: '予定中の活動を `/activity done [ID]` で完了できます', inline: false }
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
      
      // 最大15件まで表示
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
      
      embed.setFooter({ text: '振り返りは /report activity [ID] で記録できます' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('完了済み活動取得エラー:', error);
      await interaction.editReply('❌ 完了済み活動の取得中にエラーが発生しました。');
    }
  },

  async handleInfo(interaction) {
    try {
      const id = interaction.options.getInteger('id');
      const itemInfo = await googleSheets.getItemInfo('activity', id);
      
      if (!itemInfo) {
        const embed = new EmbedBuilder()
          .setTitle('❓ 活動が見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${id} の活動が見つかりませんでした。`)
          .addFields(
            { name: '💡 確認方法', value: '`/activity list` で活動一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // 活動の詳細情報を取得
      const activities = await googleSheets.getActivities();
      const activityData = activities.find(activity => activity.includes(`[${id}]`));
      
      let status = 'planned';
      if (activityData) {
        if (activityData.includes('(done)')) status = 'done';
        else if (activityData.includes('(skipped)')) status = 'skipped';
        else if (activityData.includes('(planned)')) status = 'planned';
      }
      
      const statusEmoji = {
        'planned': '🎯',
        'done': '✅',
        'skipped': '😅'
      };
      
      const statusText = {
        'planned': '予定中',
        'done': '完了',
        'skipped': 'スキップ'
      };
      
      const embed = new EmbedBuilder()
        .setTitle(`🎯 ${itemInfo.content}`)
        .setColor('#00BCD4')
        .addFields(
          { name: 'ID', value: id.toString(), inline: true },
          { name: 'ステータス', value: `${statusEmoji[status]} ${statusText[status]}`, inline: true },
          { name: '活動内容', value: itemInfo.content, inline: false }
        )
        .setTimestamp();
      
      // レポート履歴を取得
      const reports = await googleSheets.getReportsByItem('activity', id);
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
      if (status === 'planned') {
        actions.push('`/activity done` で完了に');
        actions.push('`/activity skip` でスキップに');
      }
      actions.push('`/report activity` で進捗を記録');
      
      if (actions.length > 0) {
        embed.addFields({
          name: '💡 できること',
          value: actions.join('\n'),
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('活動詳細取得エラー:', error);
      await interaction.editReply('❌ 活動詳細の取得中にエラーが発生しました。');
    }
  },

  // 活動の優先度を設定するヘルパー（将来の拡張用）
  async setPriority(activityId, priority) {
    // 優先度: high, medium, low
    try {
      // 将来的にGoogle Sheetsで優先度カラムを追加した場合の実装
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
    
    // 内容に基づいた推奨期限
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
