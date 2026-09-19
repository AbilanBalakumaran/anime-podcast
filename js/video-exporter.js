/**
 * VIDEO EXPORTER - ANIME PODCAST STUDIO
 * Moteur d'exportation vidéo transparent :
 * - Capture le canevas transparent et la piste audio synchronisée
 * - Encode en WebM avec canal alpha (VP9/VP8 + Opus) pour intégration transparente en post-production
 * - Affiche la progression en temps réel et génère le fichier téléchargeable
 */

import { dbManager } from './db.js';

export class VideoExporter {
  constructor(canvasRenderer, audioManager) {
    this.canvasRenderer = canvasRenderer;
    this.audioManager = audioManager;

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isExporting = false;

    // Éléments du DOM
    this.btnExport = document.getElementById('btn-export-video');
    this.modalExport = document.getElementById('modal-export');
    this.progressValueEl = document.getElementById('export-progress-value');
    this.statusTextEl = document.getElementById('export-status-text');
    this.btnCancelExport = document.getElementById('btn-cancel-export');

    this.init();
  }

  init() {
    if (this.btnExport) {
      this.btnExport.addEventListener('click', () => this.startExport());
    }
    if (this.btnCancelExport) {
      this.btnCancelExport.addEventListener('click', () => this.cancelExport());
    }
  }

  getOptimalMimeType() {
    // Liste des codecs supportant la transparence (canal alpha)
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];

    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return 'video/webm';
  }

  async startExport() {
    if (this.isExporting) return;

    const duration = this.audioManager.getDuration();
    if (!duration || duration <= 0) {
      alert('Veuillez d\'abord charger ou générer une piste audio à exporter.');
      return;
    }

    this.isExporting = true;
    this.recordedChunks = [];
    this.openModal();

    // 1. Préparation du flux combiné Canevas + Audio
    const canvas = this.canvasRenderer.getCanvas();
    const canvasStream = canvas.captureStream(30); // 30 FPS pour un export stable

    const audioDestination = this.audioManager.getMediaStreamDestination();
    const audioTrack = audioDestination.stream.getAudioTracks()[0];

    const combinedStream = new MediaStream();
    canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
    if (audioTrack) {
      combinedStream.addTrack(audioTrack);
    }

    // 2. Initialisation du MediaRecorder avec canal alpha
    const mimeType = this.getOptimalMimeType();
    console.log(`[VideoExporter] Début de l'enregistrement avec le codec: ${mimeType}`);

    try {
      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType,
        videoBitsPerSecond: 6000000 // 6 Mbps pour Full HD haute netteté
      });
    } catch (err) {
      console.warn('[VideoExporter] Échec d\'initialisation avec bitrate élevé, fallback standard:', err);
      this.mediaRecorder = new MediaRecorder(combinedStream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      if (this.isExporting) {
        this.finalizeExport();
      }
    };

    // 3. Lancement de la lecture audio et de l'enregistrement synchronisé
    this.audioManager.seek(0);
    this.mediaRecorder.start(100); // Tranches de 100ms
    this.audioManager.play();

    // 4. Suivi de la progression
    const progressInterval = setInterval(() => {
      if (!this.isExporting) {
        clearInterval(progressInterval);
        return;
      }

      const currentTime = this.audioManager.getCurrentTime();
      const progress = Math.min(100, Math.floor((currentTime / duration) * 100));

      if (this.progressValueEl) {
        this.progressValueEl.textContent = `${progress}%`;
      }
      if (this.statusTextEl) {
        this.statusTextEl.textContent = `Rendu en cours : ${currentTime.toFixed(1)}s / ${duration.toFixed(1)}s`;
      }

      if (currentTime >= duration || !this.audioManager.isPlaying) {
        clearInterval(progressInterval);
        setTimeout(() => {
          if (this.isExporting && this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
          }
        }, 300);
      }
    }, 100);
  }

  finalizeExport() {
    this.statusTextEl.textContent = 'Génération du fichier vidéo transparent...';
    this.progressValueEl.textContent = '100%';

    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);

    const activeMascot = this.canvasRenderer.currentMascot;
    const mascotName = activeMascot ? activeMascot.name.toLowerCase() : 'mascotte';
    const filename = `anime-podcast_${mascotName}_${Date.now()}.webm`;

    // Déclenchement automatique du téléchargement
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Enregistrement dans l'historique IndexedDB
    const duration = this.audioManager.getDuration() || 0;
    const format = '16:9 (1920×1080)';
    dbManager.saveHistoryEntry({
      filename: filename,
      mascotName: activeMascot ? activeMascot.name : 'Mascotte',
      duration: duration.toFixed(1),
      format: format
    }).then(() => {
      console.log(`[VideoExporter] Export enregistré dans l'historique: ${filename}`);
    }).catch(err => {
      console.warn('[VideoExporter] Erreur sauvegarde historique:', err);
    });

    setTimeout(() => {
      URL.revokeObjectURL(url);
      this.closeModal();
      this.isExporting = false;
      alert(`Vidéo 1920×1080 FHD exportée avec succès : ${filename}\nLe fichier WebM inclut vos scènes, votre voix off, vos illustrations animées et votre mascotte synchronisée.`);
    }, 800);
  }

  cancelExport() {
    this.isExporting = false;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.audioManager.stop();
    this.closeModal();
  }

  openModal() {
    if (this.modalExport) {
      if (this.progressValueEl) this.progressValueEl.textContent = '0%';
      if (this.statusTextEl) this.statusTextEl.textContent = 'Initialisation du rendu...';
      this.modalExport.classList.add('open');
    }
  }

  closeModal() {
    if (this.modalExport) {
      this.modalExport.classList.remove('open');
    }
  }
}
