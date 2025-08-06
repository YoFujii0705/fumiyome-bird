const { EmbedBuilder } = require('discord.js');

/**
 * Embed作成ユーティリティ
 */

/**
 * 成功メッセージのEmbed作成
 */
function createSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#2ecc71')
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

/**
 * エラーメッセージのEmbed作成
 */
function createErrorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#e74c3c')
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

/**
 * 情報メッセージのEmbed作成
 */
function createInfoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#3498db')
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

/**
 * 警告メッセージのEmbed作成
 */
function createWarningEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#f39c12')
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

/**
 * カスタムカラーのEmbed作成
 */
function createCustomEmbed(title, description, color = '#95a5a6') {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

module.exports = {
  createSuccessEmbed,
  createErrorEmbed,
  createInfoEmbed,
  createWarningEmbed,
  createCustomEmbed
};
