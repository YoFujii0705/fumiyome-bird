const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = this.formatTimestamp();
    const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  writeToFile(filename, message) {
    const filePath = path.join(this.logDir, filename);
    const logEntry = message + '\n';
    
    try {
      fs.appendFileSync(filePath, logEntry);
    } catch (error) {
      console.error('ログファイル書き込みエラー:', error);
    }
  }

  info(message, meta = {}) {
    const formattedMessage = this.formatMessage('info', message, meta);
    console.log(`ℹ️  ${formattedMessage}`);
    this.writeToFile('info.log', formattedMessage);
  }

  warn(message, meta = {}) {
    const formattedMessage = this.formatMessage('warn', message, meta);
    console.warn(`⚠️  ${formattedMessage}`);
    this.writeToFile('warn.log', formattedMessage);
  }

  error(message, error = null, meta = {}) {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...meta
    } : meta;
    
    const formattedMessage = this.formatMessage('error', message, errorInfo);
    console.error(`❌ ${formattedMessage}`);
    this.writeToFile('error.log', formattedMessage);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const formattedMessage = this.formatMessage('debug', message, meta);
      console.debug(`🐛 ${formattedMessage}`);
      this.writeToFile('debug.log', formattedMessage);
    }
  }

  command(commandName, userId, guildId, success = true, executionTime = null) {
    const meta = {
      command: commandName,
      user: userId,
      guild: guildId,
      success,
      executionTime: executionTime ? `${executionTime}ms` : null
    };
    
    const message = `Command ${commandName} ${success ? 'completed' : 'failed'}`;
    
    if (success) {
      this.info(message, meta);
    } else {
      this.warn(message, meta);
    }
    
    this.writeToFile('commands.log', this.formatMessage('command', message, meta));
  }

  sheets(operation, success = true, error = null) {
    const meta = {
      operation,
      success,
      error: error ? error.message : null
    };
    
    const message = `Google Sheets ${operation} ${success ? 'succeeded' : 'failed'}`;
    
    if (success) {
      this.info(message, meta);
    } else {
      this.error(message, error, meta);
    }
  }

  notification(type, recipient, success = true) {
    const meta = {
      type,
      recipient,
      success
    };
    
    const message = `Notification ${type} ${success ? 'sent' : 'failed'}`;
    this.info(message, meta);
    this.writeToFile('notifications.log', this.formatMessage('notification', message, meta));
  }

  // ログファイルの管理
  cleanOldLogs(daysToKeep = 30) {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          this.info(`古いログファイルを削除: ${file}`);
        }
      }
    } catch (error) {
      this.error('ログファイル整理エラー', error);
    }
  }
}

// シングルトンインスタンス
const logger = new Logger();

module.exports = logger;
