/**
 * LOGGER MODULE - ANIME PODCAST STUDIO
 * Intercepte console.log/warn/error pour afficher les logs en temps réel
 * dans la page Paramètres et faciliter le debug de l'application.
 */

class AppLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 200;
    this.consoleEl = null;

    // Sauvegarder les fonctions originales
    this._originalLog = console.log.bind(console);
    this._originalWarn = console.warn.bind(console);
    this._originalError = console.error.bind(console);

    this.intercept();
  }

  intercept() {
    console.log = (...args) => {
      this._originalLog(...args);
      this.addEntry('info', args);
    };

    console.warn = (...args) => {
      this._originalWarn(...args);
      this.addEntry('warn', args);
    };

    console.error = (...args) => {
      this._originalError(...args);
      this.addEntry('error', args);
    };

    // Capturer les erreurs non gérées
    window.addEventListener('error', (e) => {
      this.addEntry('error', [`[UNCAUGHT] ${e.message} at ${e.filename}:${e.lineno}`]);
    });

    window.addEventListener('unhandledrejection', (e) => {
      this.addEntry('error', [`[PROMISE REJECTED] ${e.reason}`]);
    });
  }

  addEntry(level, args) {
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    const message = args.map(a => {
      if (typeof a === 'object') {
        try { return JSON.stringify(a, null, 0); }
        catch { return String(a); }
      }
      return String(a);
    }).join(' ');

    const entry = { timestamp, level, message };
    this.logs.push(entry);

    // Limiter la taille
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.renderLatest(entry);
  }

  bindConsoleElement(el) {
    this.consoleEl = el;
    this.renderAll();
  }

  renderLatest(entry) {
    if (!this.consoleEl) return;

    const div = document.createElement('div');
    div.className = `log-entry log-${entry.level}`;
    div.textContent = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
    this.consoleEl.appendChild(div);

    // Auto-scroll vers le bas
    this.consoleEl.scrollTop = this.consoleEl.scrollHeight;

    // Limiter le DOM aussi
    while (this.consoleEl.children.length > this.maxLogs) {
      this.consoleEl.removeChild(this.consoleEl.firstChild);
    }
  }

  renderAll() {
    if (!this.consoleEl) return;
    this.consoleEl.innerHTML = '';

    if (this.logs.length === 0) {
      const div = document.createElement('div');
      div.className = 'log-entry log-info';
      div.textContent = '[INFO] Console de logs prête. Les messages apparaîtront ici.';
      this.consoleEl.appendChild(div);
      return;
    }

    this.logs.forEach(entry => {
      const div = document.createElement('div');
      div.className = `log-entry log-${entry.level}`;
      div.textContent = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
      this.consoleEl.appendChild(div);
    });

    this.consoleEl.scrollTop = this.consoleEl.scrollHeight;
  }

  getLogs() {
    return this.logs;
  }

  getLogsAsText() {
    return this.logs.map(e =>
      `[${e.timestamp}] [${e.level.toUpperCase()}] ${e.message}`
    ).join('\n');
  }

  async copyToClipboard() {
    const text = this.getLogsAsText();
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  }

  clearLogs() {
    this.logs = [];
    if (this.consoleEl) {
      this.consoleEl.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'log-entry log-info';
      div.textContent = '[INFO] Logs effacés.';
      this.consoleEl.appendChild(div);
    }
  }
}

// Instance globale créée immédiatement pour capturer les logs dès le chargement
export const appLogger = new AppLogger();
