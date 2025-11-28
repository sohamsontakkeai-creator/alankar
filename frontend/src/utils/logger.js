// Frontend Logger Utility
// Captures console.log outputs and stores them for UI display

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Keep only the last 1000 logs
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    this.originalConsoleInfo = console.info;

    // Override console methods to capture logs
    this.overrideConsole();
  }

  overrideConsole() {
    const self = this;

    console.log = function(...args) {
      self.addLog('log', args);
      self.originalConsoleLog.apply(console, args);
    };

    console.error = function(...args) {
      self.addLog('error', args);
      self.originalConsoleError.apply(console, args);
    };

    console.warn = function(...args) {
      self.addLog('warn', args);
      self.originalConsoleWarn.apply(console, args);
    };

    console.info = function(...args) {
      self.addLog('info', args);
      self.originalConsoleInfo.apply(console, args);
    };
  }

  addLog(level, args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');

    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      level,
      message,
      source: 'console'
    };

    this.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Trigger any listeners
    if (this.onLogAdded) {
      this.onLogAdded(logEntry);
    }
  }

  // Add custom log entry
  log(level, message, source = 'app') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      level,
      message,
      source
    };

    this.logs.push(logEntry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    if (this.onLogAdded) {
      this.onLogAdded(logEntry);
    }
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  // Set callback for when new logs are added
  setLogListener(callback) {
    this.onLogAdded = callback;
  }

  // Get logs filtered by level
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  // Get logs filtered by source
  getLogsBySource(source) {
    return this.logs.filter(log => log.source === source);
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
