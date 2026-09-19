/**
 * CANVAS RENDERER - ANIME PODCAST STUDIO
 * Rendu vidéo dynamique sur canevas HTML5 transparent :
 * - Mascotte détourée sur fond transparent natif (canal alpha RGBA 0,0,0,0)
 * - Animation de respiration idle (breathing / floating)
 * - Synchronisation buccale temps réel (lip-sync / mouth flap) selon l'énergie audio
 * - Transitions douces entre les 5 poses synchronisées aux phrases (façon NotebookLM)
 */

export class CanvasRenderer {
  constructor(audioManager, speechAnalyzer) {
    this.audioManager = audioManager;
    this.speechAnalyzer = speechAnalyzer;

    this.canvas = document.getElementById('preview-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d', { alpha: true }) : null;
    this.canvasWrapper = document.querySelector('.canvas-wrapper');

    // Résolution de travail Full HD pour export vidéo haute qualité
    this.baseWidth = 1920;
    this.baseHeight = 1080;

    if (this.canvas) {
      this.canvas.width = this.baseWidth;
      this.canvas.height = this.baseHeight;
    }

    this.currentMascot = null;
    this.currentPose = 'neutre';
    this.targetPose = 'neutre';
    this.poseTransitionAlpha = 1.0;

    // Cache d'images préchargées pour rendu fluide à 60 FPS
    this.imageCache = new Map(); // key: mascotId_poseName, value: HTMLImageElement

    this.isRunning = false;
    this.animationFrameId = null;
    this.lastTimestamp = 0;

    this.init();
  }

  init() {
    this.setupTransparencyToggle();
    this.start();
  }

  setupTransparencyToggle() {
    const btnToggleBg = document.getElementById('btn-toggle-bg');
    if (btnToggleBg && this.canvasWrapper) {
      btnToggleBg.addEventListener('click', () => {
        const isChecker = this.canvasWrapper.classList.toggle('checkerboard');
        btnToggleBg.textContent = isChecker ? 'Fond : Damier (Alpha)' : 'Fond : Studio Sombre';
      });
    }
  }

  getCanvas() {
    return this.canvas;
  }

  async setMascot(mascot) {
    this.currentMascot = mascot;
    // Précharger toutes les 5 poses de la mascotte
    await this.preloadMascotPoses(mascot);
  }

  setPose(poseName) {
    if (this.currentPose !== poseName) {
      this.targetPose = poseName;
      this.currentPose = poseName;
    }
  }

  async preloadMascotPoses(mascot) {
    if (!mascot || !mascot.poses) return;

    const poses = ['neutre', 'enthousiaste', 'explicative', 'pensive', 'surprise'];
    for (const p of poses) {
      const poseData = mascot.poses[p];
      if (poseData) {
        const key = `${mascot.id}_${p}`;
        if (!this.imageCache.has(key)) {
          const img = await this.createImageFromData(poseData);
          this.imageCache.set(key, img);
        }
      }
    }
  }

  createImageFromData(data) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      if (data.trim().startsWith('<svg')) {
        // Conversion de la chaîne SVG en Data URI
        const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          resolve(img);
          URL.revokeObjectURL(url);
        };
        img.src = url;
      } else {
        // Data URL existante (image uploadée)
        img.onload = () => resolve(img);
        img.src = data;
      }
    });
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const loop = (timestamp) => {
      if (this.isRunning) {
        this.renderFrame(timestamp);
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Rendu d'une frame individuelle
   * Utilisé à la fois pour la prévisualisation en temps réel et pour l'export vidéo
   */
  renderFrame(timestamp = performance.now()) {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // 1. Nettoyage complet : GARANTIE DE FOND TRANSPARENT (ALPHA PUR)
    ctx.clearRect(0, 0, width, height);

    if (!this.currentMascot) return;

    // 2. Détermination de la pose selon le temps audio en cours (synchronisation NotebookLM)
    if (this.audioManager && this.speechAnalyzer && this.audioManager.isPlaying) {
      const currentTime = this.audioManager.getCurrentTime();
      const detectedPose = this.speechAnalyzer.getPoseAtTime(currentTime);
      if (detectedPose) {
        this.currentPose = detectedPose;
      }
    }

    // 3. Mesure de l'énergie vocale pour le flap buccal et les micro-mouvements
    const mouthAperture = this.audioManager ? this.audioManager.getMouthAperture() : 0;
    const isSpeaking = mouthAperture > 0.05;

    // 4. Calcul de l'animation Idle (respiration & balancement subtil)
    const timeSec = timestamp * 0.001;
    const idleY = Math.sin(timeSec * 2.2) * 8; // Flottement vertical doux de 8px
    const idleTilt = Math.sin(timeSec * 1.5) * 0.008; // Léger balancement angulaire
    const speakingBounce = isSpeaking ? (Math.sin(timestamp * 0.02) * 6 * mouthAperture) : 0;

    // 5. Positionnement centré de la mascotte
    const targetHeight = height * 0.88;
    const targetWidth = targetHeight * (400 / 500); // Ratio du personnage
    const posX = (width - targetWidth) / 2;
    const posY = height - targetHeight + idleY + speakingBounce;

    ctx.save();

    // Pivot pour le balancement au bas du personnage
    const pivotX = width / 2;
    const pivotY = height;
    ctx.translate(pivotX, pivotY);
    ctx.rotate(idleTilt);
    ctx.translate(-pivotX, -pivotY);

    // 6. Rendu de l'image de la mascotte
    const cacheKey = `${this.currentMascot.id}_${this.currentPose}`;
    let imgToDraw = this.imageCache.get(cacheKey);

    // Si mascotte par défaut avec support de flap buccal SVG dynamique
    if (this.currentMascot.getSvgWithMouth && isSpeaking) {
      // Générer dynamiquement la pose avec ouverture buccale proportionnelle
      const dynamicSvg = this.currentMascot.getSvgWithMouth(this.currentPose, mouthAperture);
      const dynamicImg = new Image();
      const blob = new Blob([dynamicSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      dynamicImg.src = url;
      imgToDraw = dynamicImg;
    }

    if (imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth > 0) {
      ctx.drawImage(imgToDraw, posX, posY, targetWidth, targetHeight);
    } else {
      // Fallback sur la pose neutre si l'image ciblée n'est pas encore prête
      const fallbackKey = `${this.currentMascot.id}_neutre`;
      const fallbackImg = this.imageCache.get(fallbackKey);
      if (fallbackImg && fallbackImg.complete) {
        ctx.drawImage(fallbackImg, posX, posY, targetWidth, targetHeight);
      }
    }

    ctx.restore();
  }
}
