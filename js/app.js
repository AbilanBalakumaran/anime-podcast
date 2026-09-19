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
    // Empêcher tout saut de scroll automatique du navigateur au rechargement
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // Watchdog de sécurité : garantit la disparition du splash screen sous 1.2s max quoi qu'il arrive
    const splashWatchdog = setTimeout(() => {
      this.dismissSplashScreen();
    }, 1200);

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

    this.updateSplashProgress(90, 'Configuration du studio...');
    this.populateTtsVoices();

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

    // Fermeture immédiate du splash screen dès que le studio est monté
    clearTimeout(splashWatchdog);
    setTimeout(() => {
      this.dismissSplashScreen();
    }, 200);

    console.log('[App] AUTOPOD Studio initialisé avec succès.');

    // Préparation audio par défaut en arrière-plan sans bloquer l'ouverture de l'application
    this.prepareDefaultAudio().catch((err) => {
      console.warn('[App] Préparation automatique de l\'audio différée:', err);
    });
  }

  /**
   * Préparation automatique de l'audio par défaut au lancement en tâche de fond
   * L'application s'ouvre immédiatement pendant que l'audio se prépare
   */
  async prepareDefaultAudio() {
    const defaultText = "Welcome everyone to this new episode of Autopod! Today, we explore the secret of anime animation and expressive mascots. Have you noticed how smooth pose transitions make a story come alive? It is absolutely incredible and immersive! Thank you for joining us today, and see you very soon in our next episode!";

    if (this.textareaTts) {
      this.textareaTts.value = defaultText;
    }

    try {
      const voiceId = this.selectVoice?.value || localStorage.getItem('autopod_default_voice') || 'gemini-Orbit';
      const rate = parseFloat(this.sliderRate ? this.sliderRate.value : 1.0) || 1.0;
      const pitch = parseFloat(this.sliderPitch ? this.sliderPitch.value : 1.0) || 1.0;

      if (this.audioFileNameEl && (!this.audioManager.audioBuffer)) {
        this.audioFileNameEl.textContent = 'Génération audio Orbit en arrière-plan...';
      }

      const result = await this.audioManager.synthesizeSpeech(defaultText, voiceId, rate, pitch);
      this.speechAnalyzer.analyzeAudioBuffer(result.buffer, result.sentences);
      if (this.audioFileNameEl) {
        this.audioFileNameEl.textContent = this.audioManager.audioFileName || 'Gemini_Orbit_Speech.wav';
      }
      console.log(`[App] Audio par défaut prêt et disponible (${voiceId}).`);
    } catch (err) {
      console.warn('[App] Préparation automatique de l\'audio différée:', err);
      if (this.audioFileNameEl && !this.audioManager.audioBuffer) {
        this.audioFileNameEl.textContent = 'Aucun fichier chargé';
      }
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
    if (this.splashScreen && !this.splashScreen.classList.contains('hidden')) {
      this.splashScreen.classList.add('hidden');
      setTimeout(() => {
        if (this.splashScreen) {
          this.splashScreen.style.display = 'none';
        }
      }, 320);
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
        this.textareaTts.value = "Welcome everyone to this new episode of Autopod! Today, we explore the secret of anime animation and expressive mascots. Have you noticed how smooth pose transitions make a story come alive? It is absolutely incredible and immersive! Thank you for joining us today, and see you very soon in our next episode!";
      });
    }

    // Gestion des modèles de sujets de vidéos anime
    const selectTopic = document.getElementById('select-topic-template');
    if (selectTopic && this.textareaTts) {
      const TOPIC_SCRIPTS = {
        'one-piece': "Welcome to our anime breakdown! Today, we dive deep into the ultimate mystery of One Piece: the Void Century and Joy Boy. What if the treasure was not gold, but a story that united the world? Let us uncover every hidden clue left behind by Gol D. Roger! Subscribe and share your theories in the comments below!",
        'jjk': "Welcome back Jujutsu sorcerers! Satoru Gojo's Domain Expansion, Unlimited Void, is considered the peak of sorcery. But what really happens inside an opponent's brain when infinite information floods their senses? Today, we break down the physics and cursed energy mechanics of Gojo versus Sukuna! Stay tuned for more cursed revelations!",
        'snk': "Was Eren Jaeger truly a villain, or the tragic victim of a predetermined fate? In Attack on Titan, freedom comes at the heaviest cost imaginable. From the basement reveal to the Rumbling, every decision led to one inevitable conclusion. Let us analyze the psychological depth of Eren's final choice!",
        'solo-leveling': "From the weakest E-rank hunter to the almighty Shadow Monarch! Sung Jinwoo's evolution redefined modern action manhwa and anime. But what makes his journey so deeply satisfying to watch? Arise, and let us dissect the secrets behind Jinwoo's unstoppable rise to power!",
        'demon-slayer': "Demon Slayer shattered every animation benchmark in anime history! Studio Ufotable merged 3D environments with traditional hand-drawn action like never before. From Hinokami Kagura to the Entertainment District, here is how they achieved visual perfection!",
        'death-note': "Light Yagami thought he was a god, but his hubris was his ultimate downfall. From the Lind L. Tailor broadcast to the final warehouse showdown, what was Light's single most fatal error? Let us examine the psychological chess match between Kira and L!"
      };

      selectTopic.addEventListener('change', () => {
        const script = TOPIC_SCRIPTS[selectTopic.value];
        if (script) {
          this.textareaTts.value = script;
          console.log(`[App] Sujet de vidéo chargé: ${selectTopic.value}`);
        }
      });
    }

    // Boutons de positionnement global de la mascotte
    const btnPosLeft = document.getElementById('btn-pos-all-left');
    const btnPosCenter = document.getElementById('btn-pos-all-center');
    const btnPosRight = document.getElementById('btn-pos-all-right');

    if (btnPosLeft) {
      btnPosLeft.addEventListener('click', () => {
        this.speechAnalyzer.setAllMascotPositions('left');
      });
    }
    if (btnPosCenter) {
      btnPosCenter.addEventListener('click', () => {
        this.speechAnalyzer.setAllMascotPositions('center');
      });
    }
    if (btnPosRight) {
      btnPosRight.addEventListener('click', () => {
        this.speechAnalyzer.setAllMascotPositions('right');
      });
    }

    // Bouton de toggle des sous-titres incrustés
    const btnToggleSubs = document.getElementById('btn-toggle-subtitles');
    if (btnToggleSubs) {
      btnToggleSubs.addEventListener('click', () => {
        const isShown = this.canvasRenderer.toggleSubtitles();
        btnToggleSubs.classList.toggle('active', isShown);
        btnToggleSubs.textContent = isShown ? '💬 Sous-titres ON' : '💬 Sous-titres OFF';
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

    // Gestion des clés API (Gemini & ElevenLabs)
    const inputGemini = document.getElementById('settings-gemini-key');
    const inputEleven = document.getElementById('settings-elevenlabs-key');
    const btnSaveKeys = document.getElementById('btn-save-keys');
    const saveStatus = document.getElementById('save-keys-status');

    if (inputGemini) inputGemini.value = this.audioManager.getGeminiKey();
    if (inputEleven) inputEleven.value = this.audioManager.getElevenLabsKey();

    if (btnSaveKeys) {
      btnSaveKeys.addEventListener('click', () => {
        if (inputGemini) this.audioManager.setGeminiKey(inputGemini.value);
        if (inputEleven) this.audioManager.setElevenLabsKey(inputEleven.value);
        if (saveStatus) {
          saveStatus.style.display = 'inline';
          setTimeout(() => { saveStatus.style.display = 'none'; }, 3000);
        }
        console.log('[Settings] Clés API enregistrées dans le navigateur.');
      });
    }

    const selectVoice = document.getElementById('settings-voice-select');
    if (selectVoice) {
      selectVoice.addEventListener('change', () => {
        localStorage.setItem('autopod_default_voice', selectVoice.value);
        if (this.selectVoice) this.selectVoice.value = selectVoice.value;
        console.log('[Settings] Voix par défaut mise à jour:', selectVoice.value);
      });
    }

    // Test de voix
    const btnTestVoice = document.getElementById('btn-test-voice');
    if (btnTestVoice) {
      btnTestVoice.addEventListener('click', async () => {
        const voiceId = selectVoice ? selectVoice.value : (localStorage.getItem('autopod_default_voice') || 'gemini-Orbit');
        const rate = document.getElementById('settings-voice-rate');
        const pitch = document.getElementById('settings-voice-pitch');

        const rateVal = rate ? parseFloat(rate.value) : 1.0;
        const pitchVal = pitch ? parseFloat(pitch.value) : 1.0;

        btnTestVoice.disabled = true;
        btnTestVoice.textContent = '🔊 Génération du test...';

        try {
          const testText = "Hello! This is a test of your selected English voice for Autopod.";
          await this.audioManager.synthesizeSpeech(testText, voiceId, rateVal, pitchVal);
          this.audioManager.play();
          console.log(`[Settings] Test voix réussi: id=${voiceId}, rate=${rateVal}, pitch=${pitchVal}`);
        } catch (err) {
          alert('Erreur lors du test de voix : ' + err.message);
        } finally {
          btnTestVoice.disabled = false;
          btnTestVoice.textContent = '🔊 Tester la voix sélectionnée';
        }
      });
    }
  }

  populateSettingsVoices() {
    const select = document.getElementById('settings-voice-select');
    if (!select) return;

    const voices = this.audioManager.getVoices();
    select.innerHTML = '';

    const geminiGroup = document.createElement('optgroup');
    geminiGroup.label = '🌟 Gemini AI (Haute Définition)';

    const elevenGroup = document.createElement('optgroup');
    elevenGroup.label = '🎙️ ElevenLabs AI';

    const systemGroup = document.createElement('optgroup');
    systemGroup.label = '💻 Voix Système Anglaises';

    const savedVoice = localStorage.getItem('autopod_default_voice') || 'gemini-Orbit';

    voices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.id;
      option.textContent = `${voice.name} — ${voice.desc}`;
      if (voice.id === savedVoice) {
        option.selected = true;
      }

      if (voice.id.startsWith('gemini-')) {
        geminiGroup.appendChild(option);
      } else if (voice.id.startsWith('elevenlabs-')) {
        elevenGroup.appendChild(option);
      } else {
        systemGroup.appendChild(option);
      }
    });

    if (geminiGroup.children.length > 0) select.appendChild(geminiGroup);
    if (elevenGroup.children.length > 0) select.appendChild(elevenGroup);
    if (systemGroup.children.length > 0) select.appendChild(systemGroup);

    select.value = savedVoice;
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
      const voiceId = this.selectVoice?.value || localStorage.getItem('autopod_default_voice') || 'gemini-Orbit';
      const rate = parseFloat(this.sliderRate.value) || 1.0;
      const pitch = parseFloat(this.sliderPitch.value) || 1.0;

      const result = await this.audioManager.synthesizeSpeech(text, voiceId, rate, pitch);
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

    const geminiGroup = document.createElement('optgroup');
    geminiGroup.label = '🌟 Gemini AI (Haute Définition)';

    const elevenGroup = document.createElement('optgroup');
    elevenGroup.label = '🎙️ ElevenLabs AI';

    const systemGroup = document.createElement('optgroup');
    systemGroup.label = '💻 Voix Système Anglaises';

    const savedVoice = localStorage.getItem('autopod_default_voice') || 'gemini-Orbit';

    voices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.id;
      option.textContent = `${voice.name} — ${voice.desc}`;
      if (voice.id === savedVoice) {
        option.selected = true;
      }

      if (voice.id.startsWith('gemini-')) {
        geminiGroup.appendChild(option);
      } else if (voice.id.startsWith('elevenlabs-')) {
        elevenGroup.appendChild(option);
      } else {
        systemGroup.appendChild(option);
      }
    });

    if (geminiGroup.children.length > 0) this.selectVoice.appendChild(geminiGroup);
    if (elevenGroup.children.length > 0) this.selectVoice.appendChild(elevenGroup);
    if (systemGroup.children.length > 0) this.selectVoice.appendChild(systemGroup);

    this.selectVoice.value = savedVoice;
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
