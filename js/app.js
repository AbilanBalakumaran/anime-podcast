/**
 * MAIN APP - ANIME PODCAST STUDIO
 * Orchestrateur principal :
 * - Navigation SPA multi-pages (Production, Mascottes, Historique, Paramètres)
 * - Gestion du Splash Screen & PWA
 * - Interconnexion des modules avec support multi-émotions et anti-ennui
 * - Logger temps réel & Historique des exports
 */

import { appLogger } from './logger.js';
import { PWAManager } from './pwa.js';
import { MascotManager } from './mascot-manager.js';
import { AudioManager } from './audio-manager.js';
import { SpeechAnalyzer } from './speech-analyzer.js';
import { CanvasRenderer } from './canvas-renderer.js';
import { VideoExporter } from './video-exporter.js';
import { dbManager } from './db.js';

class AnimePodcastApp {
  constructor() {
    this.pwaManager = null;
    this.mascotManager = null;
    this.audioManager = null;
    this.speechAnalyzer = null;
    this.canvasRenderer = null;
    this.videoExporter = null;

    // Splash Screen
    this.splashScreen = document.getElementById('app-splash-screen');
    this.splashProgressBar = document.getElementById('splash-progress-bar');
    this.splashStatusText = document.getElementById('splash-status-text');

    // UI Audio
    this.tabImport = document.getElementById('tab-audio-import');
    this.tabTts = document.getElementById('tab-audio-tts');
    this.viewImport = document.getElementById('view-audio-import');
    this.viewTts = document.getElementById('view-audio-tts');

    this.audioFileInput = document.getElementById('audio-file-input');
    this.audioDropzone = document.getElementById('audio-dropzone');
    this.btnGenerateTts = document.getElementById('btn-generate-tts');
    this.btnLoadTestScript = document.getElementById('btn-load-test-script');
    this.textareaTts = document.getElementById('textarea-tts');
    this.selectVoice = document.getElementById('select-tts-voice');
    this.sliderRate = document.getElementById('slider-tts-rate');
    this.sliderPitch = document.getElementById('slider-tts-pitch');

    // Contrôles de lecture
    this.btnPlay = document.getElementById('btn-play');
    this.timeCurrentEl = document.getElementById('time-current');
    this.timeTotalEl = document.getElementById('time-total');
    this.audioStatusBar = document.getElementById('audio-status-bar');
    this.audioFileNameEl = document.getElementById('audio-file-name');
    this.audioIconPulse = document.getElementById('audio-icon-pulse');

    // Navigation SPA
    this.currentPage = 'page-production';

    this.init();
  }

  async init() {
    this.updateSplashProgress(20, 'Initialisation du Service Worker PWA...');
    this.pwaManager = new PWAManager();

    this.updateSplashProgress(40, 'Connexion IndexedDB...');
    
    // Audio Manager
    this.audioManager = new AudioManager(
      (currentTime, duration) => this.handleAudioTimeUpdate(currentTime, duration),
      (state) => this.handleAudioStateChange(state)
    );

    // Mascot Manager
    this.mascotManager = new MascotManager(
      async (mascot, emotion, variantIndex) => {
        if (this.canvasRenderer) {
          await this.canvasRenderer.setMascot(mascot);
          this.canvasRenderer.setEmotion(emotion, variantIndex);
        }
        if (this.speechAnalyzer) {
          this.speechAnalyzer.renderSegmentsList();
        }
      },
      (emotion, variantIndex) => {
        if (this.canvasRenderer) {
          this.canvasRenderer.setEmotion(emotion, variantIndex);
        }
      }
    );

    this.updateSplashProgress(60, 'Initialisation du moteur d\'alternance anti-ennui...');

    // Speech Analyzer (VAD)
    this.speechAnalyzer = new SpeechAnalyzer(
      this.audioManager,
      this.mascotManager,
      (seg) => {
        this.canvasRenderer.setEmotion(seg.emotion, seg.variantIndex);
        this.mascotManager.setActiveEmotion(seg.emotion);
      }
    );

    this.updateSplashProgress(75, 'Chargement des mascottes et variantes multi-poses...');

    // Canvas Renderer
    this.canvasRenderer = new CanvasRenderer(this.audioManager, this.speechAnalyzer);

    // Initialiser les mascottes depuis IndexedDB maintenant que le canevas est prêt
    await this.mascotManager.init();

    const activeMascot = this.mascotManager.getActiveMascot();
    if (activeMascot) {
      await this.canvasRenderer.setMascot(activeMascot);
      this.canvasRenderer.setEmotion(this.mascotManager.getActiveEmotion(), this.mascotManager.getActiveVariantIndex());
    }

    this.updateSplashProgress(85, 'Préparation de la piste audio par défaut...');
    this.populateTtsVoices();
    await this.prepareDefaultAudio();

    this.updateSplashProgress(95, 'Configuration du moteur d\'export vidéo transparent...');

    // Video Exporter
    this.videoExporter = new VideoExporter(this.canvasRenderer, this.audioManager);

    this.setupUIEvents();
    this.setupNavigation();
    this.setupSettingsPage();
    this.setupHistoryPage();

    // Bind Logger
    const logsConsole = document.getElementById('logs-console');
    if (logsConsole) {
      appLogger.bindConsoleElement(logsConsole);
    }

    this.updateSplashProgress(100, 'Studio Prêt !');

    setTimeout(() => {
      this.dismissSplashScreen();
    }, 800);

    console.log('[App] Anime Podcast Studio initialisé avec succès.');
  }

  /**
   * Préparation automatique de l'audio par défaut au lancement
   * L'utilisateur n'a plus besoin de cliquer manuellement sur "Générer la Voix"
   */
  async prepareDefaultAudio() {
    const defaultText = "Bonjour à tous et bienvenue dans ce nouvel épisode d'Anime Podcast ! Aujourd'hui, nous explorons le secret de l'animation japonaise et des mascottes expressives. Avez-vous remarqué comment les transitions de poses rendent un discours captivant ? C'est absolument incroyable et immersif ! Merci d'avoir partagé ce moment avec nous, et à très bientôt pour le prochain épisode !";

    if (this.textareaTts) {
      this.textareaTts.value = defaultText;
    }

    try {
      const voiceIdx = parseInt(this.selectVoice ? this.selectVoice.value : 0, 10) || 0;
      const rate = parseFloat(this.sliderRate ? this.sliderRate.value : 1.0) || 1.0;
      const pitch = parseFloat(this.sliderPitch ? this.sliderPitch.value : 1.0) || 1.0;

      const result = await this.audioManager.synthesizeSpeech(defaultText, voiceIdx, rate, pitch);
      this.speechAnalyzer.analyzeAudioBuffer(result.buffer, result.sentences);
      console.log('[App] Audio par défaut prêt et disponible immédiatement.');
    } catch (err) {
      console.warn('[App] Préparation automatique de l\'audio différée:', err);
    }
  }

  updateSplashProgress(percent, statusText) {
    if (this.splashProgressBar) {
      this.splashProgressBar.style.width = `${percent}%`;
    }
    if (this.splashStatusText) {
      this.splashStatusText.textContent = statusText;
    }
  }

  dismissSplashScreen() {
    if (this.splashScreen) {
      this.splashScreen.classList.add('hidden');
    }
  }

  // ==================== NAVIGATION SPA ====================

  setupNavigation() {
    const allNavItems = document.querySelectorAll('.crm-nav-link, .mobile-nav-item');
    
    allNavItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = item.dataset.page;
        if (pageId) this.navigateTo(pageId);
      });
    });
  }

  navigateTo(pageId) {
    // Masquer toutes les pages
    document.querySelectorAll('.crm-page').forEach(page => {
      page.classList.remove('active');
    });

    // Afficher la page cible
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // Mettre à jour l'état actif dans la sidebar et la bottom nav
    document.querySelectorAll('.crm-nav-link, .mobile-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageId);
    });

    this.currentPage = pageId;

    // Actions spéciales par page
    if (pageId === 'page-mascots') {
      this.mascotManager.renderFullGrid();
    } else if (pageId === 'page-history') {
      this.renderHistoryPage();
    } else if (pageId === 'page-settings') {
      this.populateSettingsVoices();
    }

    // Scroll en haut de la page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==================== UI EVENTS ====================

  setupUIEvents() {
    if (this.tabImport && this.tabTts) {
      this.tabImport.addEventListener('click', () => {
        this.tabImport.classList.add('active');
        this.tabTts.classList.remove('active');
        this.viewImport.style.display = 'block';
        this.viewTts.style.display = 'none';
      });

      this.tabTts.addEventListener('click', () => {
        this.tabTts.classList.add('active');
        this.tabImport.classList.remove('active');
        this.viewTts.style.display = 'block';
        this.viewImport.style.display = 'none';
        this.populateTtsVoices();
      });
    }

    if (this.audioDropzone && this.audioFileInput) {
      this.audioDropzone.addEventListener('click', () => {
        this.audioFileInput.click();
      });

      this.audioFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) await this.processAudioFile(file);
      });

      this.audioDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.audioDropzone.classList.add('dragover');
      });

      this.audioDropzone.addEventListener('dragleave', () => {
        this.audioDropzone.classList.remove('dragover');
      });

      this.audioDropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        this.audioDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          await this.processAudioFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (this.btnLoadTestScript && this.textareaTts) {
      this.btnLoadTestScript.addEventListener('click', () => {
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
        this.textareaTts.value = "Bonjour à tous et bienvenue dans ce nouvel épisode d'Anime Podcast ! Aujourd'hui, nous explorons le secret de l'animation japonaise et des mascottes expressives. Avez-vous remarqué comment les transitions de poses rendent un discours captivant ? C'est absolument incroyable et immersif ! Merci d'avoir partagé ce moment avec nous, et à très bientôt pour le prochain épisode !";
      });
    }

    if (this.btnGenerateTts) {
      this.btnGenerateTts.addEventListener('click', async () => {
        // Enlever le focus actif pour empêcher tout auto-zoom iOS Safari
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
        await this.processTtsGeneration();
      });
    }

    if (this.btnPlay) {
      this.btnPlay.addEventListener('click', () => {
        if (!this.audioManager.audioBuffer) {
          alert('Veuillez d\'abord charger ou générer une piste audio.');
          return;
        }

        if (this.audioManager.isPlaying) {
          this.audioManager.pause();
        } else {
          this.audioManager.play();
        }
      });
    }
  }

  // ==================== PARAMÈTRES ====================

  setupSettingsPage() {
    // Boutons Logs
    const btnCopyLogs = document.getElementById('btn-copy-logs');
    const btnClearLogs = document.getElementById('btn-clear-logs');

    if (btnCopyLogs) {
      btnCopyLogs.addEventListener('click', async () => {
        const success = await appLogger.copyToClipboard();
        if (success) {
          btnCopyLogs.textContent = '✅ Copié !';
          setTimeout(() => { btnCopyLogs.textContent = '📋 Copier'; }, 2000);
        }
      });
    }

    if (btnClearLogs) {
      btnClearLogs.addEventListener('click', () => {
        appLogger.clearLogs();
      });
    }

    // Test de voix
    const btnTestVoice = document.getElementById('btn-test-voice');
    if (btnTestVoice) {
      btnTestVoice.addEventListener('click', () => {
        const select = document.getElementById('settings-voice-select');
        const rate = document.getElementById('settings-voice-rate');
        const pitch = document.getElementById('settings-voice-pitch');

        const voiceIdx = select ? parseInt(select.value, 10) : 0;
        const rateVal = rate ? parseFloat(rate.value) : 1.0;
        const pitchVal = pitch ? parseFloat(pitch.value) : 1.0;

        const utterance = new SpeechSynthesisUtterance('Bonjour, ceci est un test de la voix sélectionnée pour votre podcast animé.');
        const voices = speechSynthesis.getVoices();
        if (voices[voiceIdx]) utterance.voice = voices[voiceIdx];
        utterance.rate = rateVal;
        utterance.pitch = pitchVal;
        utterance.lang = 'fr-FR';

        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);

        console.log(`[Settings] Test voix: index=${voiceIdx}, rate=${rateVal}, pitch=${pitchVal}`);
      });
    }
  }

  populateSettingsVoices() {
    const select = document.getElementById('settings-voice-select');
    if (!select) return;

    const voices = speechSynthesis.getVoices();
    select.innerHTML = '';

    voices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' [Défaut]' : ''}`;
      select.appendChild(option);
    });

    if (voices.length === 0) {
      const option = document.createElement('option');
      option.value = 0;
      option.textContent = 'Voix par défaut du système';
      select.appendChild(option);
    }
  }

  // ==================== HISTORIQUE ====================

  setupHistoryPage() {
    const btnClearHistory = document.getElementById('btn-clear-history');
    if (btnClearHistory) {
      btnClearHistory.addEventListener('click', async () => {
        if (confirm('Voulez-vous vraiment vider tout l\'historique des exports ?')) {
          await dbManager.clearHistory();
          this.renderHistoryPage();
          console.log('[History] Historique vidé.');
        }
      });
    }
  }

  async renderHistoryPage() {
    const container = document.getElementById('history-list');
    if (!container) return;

    try {
      const entries = await dbManager.getAllHistory();

      if (entries.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="48" height="48">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <p>Aucune vidéo exportée pour le moment.</p>
            <p style="font-size: 0.8rem; color: var(--text-dim);">Les exports apparaîtront ici automatiquement.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      entries.forEach(entry => {
        const date = new Date(entry.exportedAt);
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const div = document.createElement('div');
        div.className = 'history-entry';
        div.innerHTML = `
          <div class="history-entry-info">
            <div class="history-entry-name">${entry.filename || 'Export vidéo'}</div>
            <div class="history-entry-meta">
              <span>📅 ${dateStr} à ${timeStr}</span>
              <span>🎭 ${entry.mascotName || 'Inconnue'}</span>
              <span>⏱️ ${entry.duration || '?'}s</span>
              <span>📐 ${entry.format || '9:16'}</span>
            </div>
          </div>
          <div class="history-entry-badge">WebM Alpha</div>
        `;
        container.appendChild(div);
      });
    } catch (err) {
      console.error('[History] Erreur de chargement:', err);
      container.innerHTML = '<div class="empty-state"><p>Erreur de chargement de l\'historique.</p></div>';
    }
  }

  // ==================== AUDIO ====================

  async processAudioFile(file) {
    try {
      this.audioDropzone.querySelector('.dropzone-text').textContent = 'Décodage audio en cours...';
      const audioBuffer = await this.audioManager.loadAudioFile(file);
      this.speechAnalyzer.analyzeAudioBuffer(audioBuffer);
      this.audioDropzone.querySelector('.dropzone-text').textContent = file.name;
    } catch (err) {
      console.error('[App] Erreur chargement audio:', err);
      alert('Impossible de décoder ce fichier audio.');
      this.audioDropzone.querySelector('.dropzone-text').textContent = 'Glissez-déposez un fichier audio ici';
    }
  }

  async processTtsGeneration() {
    const text = this.textareaTts.value.trim();
    if (!text) {
      alert('Veuillez saisir un texte de podcast.');
      return;
    }

    this.btnGenerateTts.disabled = true;
    this.btnGenerateTts.textContent = 'Génération vocale...';

    try {
      const voiceIdx = parseInt(this.selectVoice.value, 10) || 0;
      const rate = parseFloat(this.sliderRate.value) || 1.0;
      const pitch = parseFloat(this.sliderPitch.value) || 1.0;

      const result = await this.audioManager.synthesizeSpeech(text, voiceIdx, rate, pitch);
      this.speechAnalyzer.analyzeAudioBuffer(result.buffer, result.sentences);
    } catch (err) {
      console.error('[App] Erreur TTS:', err);
      alert('Erreur lors de la génération vocale : ' + err.message);
    } finally {
      this.btnGenerateTts.disabled = false;
      this.btnGenerateTts.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        Générer la Voix &amp; Segmenter les Phrases
      `;
    }
  }

  populateTtsVoices() {
    if (!this.selectVoice) return;
    const voices = this.audioManager.getVoices();
    this.selectVoice.innerHTML = '';

    voices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' [Défaut]' : ''}`;
      this.selectVoice.appendChild(option);
    });

    if (voices.length === 0) {
      const option = document.createElement('option');
      option.value = 0;
      option.textContent = 'Voix par défaut du système';
      this.selectVoice.appendChild(option);
    }
  }

  handleAudioTimeUpdate(currentTime, duration) {
    if (this.timeCurrentEl) {
      this.timeCurrentEl.textContent = this.formatTime(currentTime);
    }
    if (this.timeTotalEl) {
      this.timeTotalEl.textContent = this.formatTime(duration);
    }
    if (this.speechAnalyzer) {
      this.speechAnalyzer.updatePlayhead(currentTime, duration);
    }
  }

  handleAudioStateChange(state) {
    if (this.btnPlay) {
      if (state.isPlaying) {
        this.btnPlay.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        `;
        this.btnPlay.title = 'Pause';
      } else {
        this.btnPlay.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        `;
        this.btnPlay.title = 'Lecture';
      }
    }

    if (this.audioFileNameEl) {
      this.audioFileNameEl.textContent = state.fileName;
    }
    if (this.audioIconPulse) {
      if (state.isPlaying) {
        this.audioIconPulse.classList.add('playing');
      } else {
        this.audioIconPulse.classList.remove('playing');
      }
    }
    if (this.timeTotalEl && state.duration) {
      this.timeTotalEl.textContent = this.formatTime(state.duration);
    }
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.animePodcastApp = new AnimePodcastApp();

  // 1. Empêcher les gestes de pincement (pinch-to-zoom) sur iOS Safari
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

  // 2. Empêcher le zoom multi-touch
  document.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  // 3. Empêcher le zoom par double-tap sur iOS
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
      const clickable = e.target.closest('button, a, input, select, textarea');
      if (clickable) {
        clickable.click();
      }
    }
    lastTouchEnd = now;
  }, { passive: false });

  // 4. Retirer le focus avant tout clic bouton pour éviter le zoom automatique d'iOS
  document.addEventListener('click', (e) => {
    if (e.target.closest('button, [role="button"], .btn')) {
      if (document.activeElement && document.activeElement.tagName !== 'BUTTON') {
        document.activeElement.blur();
      }
    }
  }, true);
});
