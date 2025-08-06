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
        case 'buy':
          await this.handleBuy(interaction);
          break;
        case 'list':
          await this.handleList(interaction);
          break;
        case 'pending':
          await this.handlePending(interaction);
          break;
        case 'bought':
          await this.handleBought(interaction);
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
      console.error('WishlistHandler エラー:', error);
      await interaction.editReply('❌ 処理中にエラーが発生しました。');
    }
  },

  async handleAdd(interaction) {
    const itemName = interaction.options.getString('name');
    const price = interaction.options.getInteger('price');
    const url = interaction.options.getString('url') || '';
    const priority = interaction.options.getString('priority') || 'medium';
    const memo = interaction.options.getString('memo') || '';
    
    try {
      const wishlistId = await googleSheets.addWishlistItem(itemName, price, url, priority, memo);
      
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
      
      const embed = new EmbedBuilder()
        .setTitle('🛒 買いたいものを追加しました！')
        .setColor('#E91E63')
        .setDescription(`${priorityEmoji[priority]} ウィッシュリストに新しいアイテムが追加されました！`)
        .addFields(
          { name: 'ID', value: wishlistId.toString(), inline: true },
          { name: 'アイテム名', value: itemName, inline: true },
          { name: '価格', value: price ? `¥${price.toLocaleString()}` : '未設定', inline: true },
          { name: '優先度', value: `${priorityEmoji[priority]} ${priorityText[priority]}`, inline: true }
        )
        .setTimestamp();
      
      if (url) {
        embed.addFields({ name: 'URL', value: `[リンクを開く](${url})`, inline: false });
      }
      
      if (memo) {
        embed.addFields({ name: '備考', value: memo, inline: false });
      }
      
      embed.setFooter({ text: '購入したら /wishlist buy で購入済みに移動できます' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('ウィッシュリスト追加エラー:', error);
      await interaction.editReply('❌ アイテムの追加中にエラーが発生しました。');
    }
  },

  async handleBuy(interaction) {
    const buyId = interaction.options.getInteger('id');
    const actualPrice = interaction.options.getInteger('actual_price');
    
    try {
      const boughtItem = await googleSheets.buyWishlistItem(buyId, actualPrice);
      
      if (boughtItem) {
        const embed = new EmbedBuilder()
          .setTitle('🎉 購入完了！')
          .setColor('#4CAF50')
          .setDescription('おめでとうございます！購入記録に移動されました！💳✨')
          .addFields(
            { name: 'ID', value: boughtItem.id.toString(), inline: true },
            { name: 'アイテム名', value: boughtItem.name, inline: true },
            { name: '予定価格', value: boughtItem.price ? `¥${boughtItem.price.toLocaleString()}` : '未設定', inline: true }
          )
          .setTimestamp();

        if (actualPrice) {
          embed.addFields({ name: '実際の価格', value: `¥${actualPrice.toLocaleString()}`, inline: true });
          
          if (boughtItem.price && actualPrice !== boughtItem.price) {
            const diff = actualPrice - boughtItem.price;
            const diffText = diff > 0 ? `+¥${diff.toLocaleString()}` : `-¥${Math.abs(diff).toLocaleString()}`;
            const diffEmoji = diff > 0 ? '📈' : '📉';
            embed.addFields({ name: '価格差', value: `${diffEmoji} ${diffText}`, inline: true });
          }
        }

        if (boughtItem.url) {
          embed.addFields({ name: 'URL', value: `[購入先](${boughtItem.url})`, inline: false });
        }
        
        if (boughtItem.memo) {
          embed.addFields({ name: '備考', value: boughtItem.memo, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❓ アイテムが見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${buyId} のアイテムが見つからないか、既に購入済みです。`)
          .addFields(
            { name: '💡 確認方法', value: '`/wishlist pending` で未購入アイテム一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('アイテム購入エラー:', error);
      await interaction.editReply('❌ 購入記録中にエラーが発生しました。');
    }
  },

  async handleList(interaction) {
    try {
      const wishlistItems = await googleSheets.getWishlistItems();
      
      if (wishlistItems.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🛒 買いたいものリスト')
          .setColor('#E91E63')
          .setDescription('まだアイテムが登録されていません。')
          .addFields(
            { name: '🛍️ アイテムを追加', value: '`/wishlist add [アイテム名] [価格]` でアイテムを追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // アイテムをステータス別に分類
      const statusOrder = ['want_to_buy', 'bought'];
      const groupedItems = wishlistItems.reduce((acc, item) => {
        // アイテムの文字列からステータスを抽出
        const statusMatch = item.match(/\(([^)]+)\)$/);
        const status = statusMatch ? statusMatch[1] : 'want_to_buy';
        
        if (!acc[status]) acc[status] = [];
        acc[status].push(item);
        return acc;
      }, {});
      
      const embed = new EmbedBuilder()
        .setTitle('🛒 買いたいものリスト')
        .setColor('#E91E63')
        .setDescription(`全 ${wishlistItems.length} 個のアイテムが登録されています`)
        .setTimestamp();
      
      // ステータス別に表示
      statusOrder.forEach(status => {
        if (groupedItems[status] && groupedItems[status].length > 0) {
          const statusName = {
            'want_to_buy': '🛒 未購入',
            'bought': '✅ 購入済み'
          }[status] || status;
          
          // 最大8件まで表示
          const displayItems = groupedItems[status].slice(0, 8);
          const moreCount = groupedItems[status].length - 8;
          
          let fieldValue = displayItems.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}個`;
          }
          
          embed.addFields({
            name: `${statusName} (${groupedItems[status].length}個)`,
            value: fieldValue,
            inline: false
          });
        }
      });
      
      embed.setFooter({ text: '操作: /wishlist buy [ID], /wishlist info [ID]' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('ウィッシュリスト一覧取得エラー:', error);
      await interaction.editReply('❌ ウィッシュリストの取得中にエラーが発生しました。');
    }
  },

  async handlePending(interaction) {
    try {
      const pendingItems = await googleSheets.getPendingWishlistItems();
      
      if (pendingItems.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🛒 未購入アイテム')
          .setColor('#FF9800')
          .setDescription('未購入のアイテムはありません。')
          .addFields(
            { name: '🛍️ アイテムを追加', value: '`/wishlist add` で新しいアイテムを追加できます', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // 優先度別に分類
      const priorities = {
        '🔴 高優先度': [],
        '🟡 中優先度': [],
        '🟢 低優先度': []
      };
      
      // 簡易的な優先度分類（実際の実装では適切な情報を使用）
      pendingItems.forEach(item => {
        if (item.includes('高') || item.includes('急')) {
          priorities['🔴 高優先度'].push(item);
        } else if (item.includes('低') || item.includes('いつか')) {
          priorities['🟢 低優先度'].push(item);
        } else {
          priorities['🟡 中優先度'].push(item);
        }
      });
      
      const embed = new EmbedBuilder()
        .setTitle('🛒 未購入アイテム')
        .setColor('#FF9800')
        .setDescription(`購入待ちのアイテムが ${pendingItems.length} 個あります`)
        .setTimestamp();
      
      // 優先度別に表示
      Object.entries(priorities).forEach(([priorityName, items]) => {
        if (items.length > 0) {
          // 最大5件まで表示
          const displayItems = items.slice(0, 5);
          const moreCount = items.length - 5;
          
          let fieldValue = displayItems.join('\n');
          if (moreCount > 0) {
            fieldValue += `\n... 他${moreCount}個`;
          }
          
          embed.addFields({
            name: `${priorityName} (${items.length}個)`,
            value: fieldValue,
            inline: false
          });
        }
      });
      
      embed.setFooter({ text: '購入したら /wishlist buy [ID] で購入済みに移動できます' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('未購入アイテム一覧取得エラー:', error);
      await interaction.editReply('❌ 未購入アイテム一覧の取得中にエラーが発生しました。');
    }
  },

  async handleBought(interaction) {
    try {
      const boughtItems = await googleSheets.getBoughtItems();
      
      if (boughtItems.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('✅ 購入済みアイテム')
          .setColor('#4CAF50')
          .setDescription('購入済みのアイテムはまだありません。')
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // 最近購入したものを上位に表示
      const recentItems = boughtItems.slice(0, 10);
      const totalItems = boughtItems.length;
      
      const embed = new EmbedBuilder()
        .setTitle('✅ 購入済みアイテム')
        .setColor('#4CAF50')
        .setDescription(`これまでに ${totalItems} 個のアイテムを購入しました`)
        .setTimestamp();
      
      if (recentItems.length > 0) {
        embed.addFields({
          name: '📦 最近購入したアイテム',
          value: recentItems.join('\n'),
          inline: false
        });
      }
      
      // 簡易統計情報
      embed.addFields(
        { name: '📊 統計', value: `購入完了: ${totalItems}個`, inline: true },
        { name: '🎯 達成感', value: '素晴らしい！', inline: true }
      );
      
      embed.setFooter({ text: '購入履歴は /stats で詳しく確認できます' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('購入済みアイテム一覧取得エラー:', error);
      await interaction.editReply('❌ 購入済みアイテム一覧の取得中にエラーが発生しました。');
    }
  },

  async handleInfo(interaction) {
    const itemId = interaction.options.getInteger('id');
    
    try {
      const item = await googleSheets.getWishlistItemInfo(itemId);
      
      if (!item) {
        const embed = new EmbedBuilder()
          .setTitle('❓ アイテムが見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${itemId} のアイテムが見つかりません。`)
          .addFields(
            { name: '💡 確認方法', value: '`/wishlist list` でアイテム一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      const statusEmoji = {
        'want_to_buy': '🛒',
        'bought': '✅'
      };
      
      const statusText = {
        'want_to_buy': '未購入',
        'bought': '購入済み'
      };
      
      const priorityEmoji = {
        'high': '🔴',
        'medium': '🟡',
        'low': '🟢'
      };
      
      const embed = new EmbedBuilder()
        .setTitle(`${statusEmoji[item.status]} ${item.name}`)
        .setColor(item.status === 'bought' ? '#4CAF50' : '#E91E63')
        .setDescription('アイテム詳細情報')
        .addFields(
          { name: 'ID', value: item.id.toString(), inline: true },
          { name: 'ステータス', value: `${statusEmoji[item.status]} ${statusText[item.status]}`, inline: true },
          { name: '優先度', value: `${priorityEmoji[item.priority]} ${item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}`, inline: true }
        )
        .setTimestamp();
      
      if (item.price) {
        embed.addFields({ name: '価格', value: `¥${item.price.toLocaleString()}`, inline: true });
      }
      
      if (item.actualPrice && item.status === 'bought') {
        embed.addFields({ name: '実際の価格', value: `¥${item.actualPrice.toLocaleString()}`, inline: true });
      }
      
      if (item.url) {
        embed.addFields({ name: 'URL', value: `[リンクを開く](${item.url})`, inline: false });
      }
      
      if (item.memo) {
        embed.addFields({ name: '備考', value: item.memo, inline: false });
      }
      
      embed.addFields(
        { name: '登録日', value: item.createdAt || '不明', inline: true },
        { name: '更新日', value: item.updatedAt || '不明', inline: true }
      );
      
      if (item.status === 'want_to_buy') {
        embed.setFooter({ text: '購入したら /wishlist buy で購入済みに移動できます' });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('アイテム詳細取得エラー:', error);
      await interaction.editReply('❌ アイテム詳細の取得中にエラーが発生しました。');
    }
  },

  async handleRemove(interaction) {
    const removeId = interaction.options.getInteger('id');
    
    try {
      const removedItem = await googleSheets.removeWishlistItem(removeId);
      
      if (removedItem) {
        const embed = new EmbedBuilder()
          .setTitle('🗑️ アイテムを削除しました')
          .setColor('#FF5722')
          .setDescription('ウィッシュリストからアイテムが削除されました。')
          .addFields(
            { name: 'ID', value: removedItem.id.toString(), inline: true },
            { name: 'アイテム名', value: removedItem.name, inline: true }
          )
          .setTimestamp();
        
        if (removedItem.memo) {
          embed.addFields({ name: '備考', value: removedItem.memo, inline: false });
        }
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❓ アイテムが見つかりません')
          .setColor('#FF5722')
          .setDescription(`ID: ${removeId} のアイテムが見つかりません。`)
          .addFields(
            { name: '💡 確認方法', value: '`/wishlist list` でアイテム一覧を確認してください', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('アイテム削除エラー:', error);
      await interaction.editReply('❌ アイテムの削除中にエラーが発生しました。');
    }
  }
};
