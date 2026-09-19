/**
 * MAIN APP - ANIME PODCAST STUDIO
 * Orchestrateur principal :
 * - Gestion de l'écran de chargement dynamique (Splash Screen)
 * - Initialisation de la PWA et du Service Worker
 * - Interconnexion des modules (Mascottes, Audio, VAD, Canvas et Export)
 */

import { PWAManager } from './pwa.js';
import { MascotManager } from './mascot-manager.js';
import { AudioManager } from './audio-manager.js';
import { SpeechAnalyzer } from './speech-analyzer.js';
import { CanvasRenderer } from './canvas-renderer.js';
import { VideoExporter } from './video-exporter.js';

class AnimePodcastApp {
  constructor() {
    this.pwaManager = null;
    this.mascotManager = null;
    this.audioManager = null;
    this.speechAnalyzer = null;
    this.canvasRenderer = null;
    this.videoExporter = null;

    // Éléments du Splash Screen
    this.splashScreen = document.getElementById('app-splash-screen');
    this.splashProgressBar = document.getElementById('splash-progress-bar');
    this.splashStatusText = document.getElementById('splash-status-text');

    // Éléments UI Audio
    this.tabImport = document.getElementById('tab-audio-import');
    this.tabTts = document.getElementById('tab-audio-tts');
    this.viewImport = document.getElementById('view-audio-import');
    this.viewTts = document.getElementById('view-audio-tts');

    this.audioFileInput = document.getElementById('audio-file-input');
    this.audioDropzone = document.getElementById('audio-dropzone');
    this.btnGenerateTts = document.getElementById('btn-generate-tts');
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

    this.init();
  }

  async init() {
    // 1. Démarrage de l'animation du Splash Screen
    this.updateSplashProgress(20, 'Initialisation du Service Worker...');
    this.pwaManager = new PWAManager();

    this.updateSplashProgress(40, 'Connexion à la base de données IndexedDB...');
    
    // 2. Initialisation du gestionnaire audio
    this.audioManager = new AudioManager(
      (currentTime, duration) => this.handleAudioTimeUpdate(currentTime, duration),
      (state) => this.handleAudioStateChange(state)
    );

    // 3. Initialisation de l'analyseur temporel (VAD)
    this.speechAnalyzer = new SpeechAnalyzer(this.audioManager, (seg) => {
      this.canvasRenderer.setPose(seg.pose);
      this.mascotManager.setActivePose(seg.pose);
    });

    this.updateSplashProgress(65, 'Chargement des mascottes haute définition...');

    // 4. Initialisation du moteur de rendu Canvas
    this.canvasRenderer = new CanvasRenderer(this.audioManager, this.speechAnalyzer);

    // 5. Initialisation du gestionnaire de mascottes
    this.mascotManager = new MascotManager(
      (mascot, pose) => {
        this.canvasRenderer.setMascot(mascot);
        this.canvasRenderer.setPose(pose);
      },
      (pose) => {
        this.canvasRenderer.setPose(pose);
      }
    );

    // Définir la mascotte initiale sur le canevas
    await this.canvasRenderer.setMascot(this.mascotManager.getActiveMascot());

    this.updateSplashProgress(85, 'Configuration du moteur d\'export transparent...');

    // 6. Initialisation de l'exporteur vidéo
    this.videoExporter = new VideoExporter(this.canvasRenderer, this.audioManager);

    // 7. Configuration des écouteurs d'événements UI
    this.setupUIEvents();
    this.populateTtsVoices();

    this.updateSplashProgress(100, 'Studio prêt !');

    // 8. Fondu de sortie du Splash Screen
    setTimeout(() => {
      this.dismissSplashScreen();
    }, 800);
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

  setupUIEvents() {
    // Bascule des onglets Audio (Import vs TTS)
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

    // Gestion du Drag & Drop pour l'import audio
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

    // Bouton de génération de synthèse vocale (TTS)
    if (this.btnGenerateTts) {
      this.btnGenerateTts.addEventListener('click', async () => {
        await this.processTtsGeneration();
      });
    }

    // Contrôles de lecture Canvas (Play / Pause)
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

  async processAudioFile(file) {
    try {
      this.audioDropzone.querySelector('.dropzone-text').textContent = 'Décodage audio en cours...';
      const audioBuffer = await this.audioManager.loadAudioFile(file);

      // Analyse VAD et segmentation en phrases
      this.speechAnalyzer.analyzeAudioBuffer(audioBuffer);

      this.audioDropzone.querySelector('.dropzone-text').textContent = file.name;
    } catch (err) {
      console.error('[App] Erreur lors du chargement du fichier audio:', err);
      alert('Impossible de décoder ce fichier audio. Formats recommandés : MP3, WAV, OGG, WebM.');
      this.audioDropzone.querySelector('.dropzone-text').textContent = 'Glissez-déposez un fichier audio ici';
    }
  }

  async processTtsGeneration() {
    const text = this.textareaTts.value.trim();
    if (!text) {
      alert('Veuillez saisir un texte à synthétiser pour votre podcast.');
      return;
    }

    this.btnGenerateTts.disabled = true;
    this.btnGenerateTts.textContent = 'Génération vocale...';

    try {
      const voiceIdx = parseInt(this.selectVoice.value, 10) || 0;
      const rate = parseFloat(this.sliderRate.value) || 1.0;
      const pitch = parseFloat(this.sliderPitch.value) || 1.0;

      const result = await this.audioManager.synthesizeSpeech(text, voiceIdx, rate, pitch);

      // Analyse VAD avec enrichissement par les phrases textuelles
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
        Générer la Voix & Segmenter les Phrases
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

// Initialisation au chargement du DOM
window.addEventListener('DOMContentLoaded', () => {
  window.animePodcastApp = new AnimePodcastApp();
});
