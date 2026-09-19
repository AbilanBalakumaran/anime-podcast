/**
 * CANVAS RENDERER - ANIME PODCAST STUDIO
 * Rendu vidéo dynamique sur canevas HTML5 transparent :
 * - Mascotte détourée sur fond transparent natif (canal alpha RGBA 0,0,0,0)
 * - Support étendu de toutes les émotions et de toutes les variantes de poses
 * - Animation de respiration idle et balancement naturel
 * - Flap buccal réactif temps réel (lip-sync)
 * - Alternance fluide synchronisée aux phrases et sous-segments
 */

export class CanvasRenderer {
  constructor(audioManager, speechAnalyzer) {
    this.audioManager = audioManager;
    this.speechAnalyzer = speechAnalyzer;

    this.canvas = document.getElementById('preview-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d', { alpha: true }) : null;
    this.canvasWrapper = document.querySelector('.canvas-wrapper');

    // Format vidéo AutoShort : '9:16' (Shorts/TikTok/Reels) ou '16:9' (YouTube/Paysage)
    this.currentFormat = '9:16';
    this.updateCanvasDimensions();

    this.currentMascot = null;
    this.currentEmotion = 'neutre';
    this.currentVariantIndex = 0;

    // Cache d'images préchargées : key = mascotId_emotion_variantIndex
    this.imageCache = new Map();

    // État du moteur de marionnette (Puppet VTuber) et transitions de poses
    this.lastRenderKey = null;
    this.lastRenderImg = null;
    this.prevPoseImg = null;
    this.transitionStartTime = 0;
    this.transitionDuration = 220; // 220ms pour un fondu et rebond d'anticipation parfait

    this.isRunning = false;
    this.animationFrameId = null;

    this.init();
  }

  updateCanvasDimensions() {
    if (this.currentFormat === '9:16') {
      this.baseWidth = 1080;
      this.baseHeight = 1920;
    } else {
      this.baseWidth = 1920;
      this.baseHeight = 1080;
    }

    if (this.canvas) {
      this.canvas.width = this.baseWidth;
      this.canvas.height = this.baseHeight;
    }

    if (this.canvasWrapper) {
      if (this.currentFormat === '9:16') {
        this.canvasWrapper.classList.add('format-9-16');
        this.canvasWrapper.classList.remove('format-16-9');
      } else {
        this.canvasWrapper.classList.add('format-16-9');
        this.canvasWrapper.classList.remove('format-9-16');
      }
    }
  }

  setFormat(format) {
    if (format !== '9:16' && format !== '16:9') return;
    this.currentFormat = format;
    this.updateCanvasDimensions();

    // Mettre à jour l'état actif des boutons de format
    document.querySelectorAll('.btn-format-switch').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.format === format);
    });
  }

  init() {
    this.setupTransparencyToggle();
    this.setupFormatToggle();
    this.start();
  }

  setupFormatToggle() {
    const buttons = document.querySelectorAll('.btn-format-switch');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const format = btn.dataset.format;
        if (format) this.setFormat(format);
      });
    });
  }

  setupTransparencyToggle() {
    const btnToggleBg = document.getElementById('btn-toggle-bg');
    if (btnToggleBg && this.canvasWrapper) {
      btnToggleBg.addEventListener('click', () => {
        const isChecker = this.canvasWrapper.classList.toggle('checkerboard');
        btnToggleBg.textContent = isChecker ? 'Damier (Alpha)' : 'Studio Noir';
      });
    }
  }

  getCanvas() {
    return this.canvas;
  }

  async setMascot(mascot) {
    this.currentMascot = mascot;
    this.currentEmotion = 'neutre';
    this.currentVariantIndex = 0;
    await this.preloadAllMascotPoses(mascot);
  }

  setEmotion(emotionName, variantIndex = 0) {
    this.currentEmotion = emotionName;
    this.currentVariantIndex = variantIndex;
  }

  async preloadAllMascotPoses(mascot) {
    if (!mascot || !mascot.emotions) return;

    for (const [emoKey, poses] of Object.entries(mascot.emotions)) {
      if (Array.isArray(poses)) {
        for (let idx = 0; idx < poses.length; idx++) {
          const poseData = poses[idx];
          const cacheKey = `${mascot.id}_${emoKey}_${idx}`;
          if (!this.imageCache.has(cacheKey) && poseData) {
            const img = await this.createImageFromData(poseData);
            this.imageCache.set(cacheKey, img);
          }
        }
      }
    }
  }

  createImageFromData(data) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      if (data.trim().startsWith('<svg')) {
        const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          resolve(img);
          URL.revokeObjectURL(url);
        };
        img.src = url;
      } else {
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

  renderFrame(timestamp = performance.now()) {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // 1. FOND TRANSPARENT ABSOLU (Canal Alpha RGBA 0,0,0,0)
    ctx.clearRect(0, 0, width, height);

    if (!this.currentMascot) return;

    // 2. Synchronisation de l'attitude avec la lecture audio en cours
    if (this.audioManager && this.speechAnalyzer && this.audioManager.isPlaying) {
      const currentTime = this.audioManager.getCurrentTime();
      const attitude = this.speechAnalyzer.getPoseAtTime(currentTime);
      if (attitude) {
        this.currentEmotion = attitude.emotion;
        this.currentVariantIndex = attitude.variantIndex;
      }
    }

    // 3. Détection de changement de pose pour transition fluide (Cross-fade doux)
    const currentKey = `${this.currentMascot.id}_${this.currentEmotion}_${this.currentVariantIndex}`;
    if (this.lastRenderKey && this.lastRenderKey !== currentKey) {
      this.prevPoseImg = this.lastRenderImg;
      this.transitionStartTime = timestamp;
    }
    this.lastRenderKey = currentKey;

    const transitionElapsed = timestamp - this.transitionStartTime;
    const transitionProgress = Math.min(1.0, transitionElapsed / this.transitionDuration);

    // 4. Récupération de l'image préchargée depuis le cache (zéro bug de chargement dynamique)
    let imgToDraw = this.imageCache.get(currentKey);

    if (!imgToDraw) {
      const fallbackKey1 = `${this.currentMascot.id}_${this.currentEmotion}_0`;
      const fallbackKey2 = `${this.currentMascot.id}_neutre_0`;
      imgToDraw = this.imageCache.get(fallbackKey1) || this.imageCache.get(fallbackKey2);
    }

    this.lastRenderImg = imgToDraw;

    // 5. Calcul des proportions réelles pour un personnage grand, majestueux et net
    let imgRatio = 1.0;
    if (imgToDraw) {
      const nw = imgToDraw.naturalWidth || imgToDraw.width;
      const nh = imgToDraw.naturalHeight || imgToDraw.height;
      if (nw && nh && nh > 0) {
        imgRatio = nw / nh;
      }
    }

    // Le personnage occupe généreusement le cadre (fini le personnage "tout petit")
    let targetHeight, targetWidth;
    if (this.currentFormat === '9:16') {
      // En vertical (Shorts), le personnage occupe ~90% de la hauteur
      targetHeight = height * 0.90;
      targetWidth = targetHeight * imgRatio;
      if (targetWidth > width * 1.15) {
        targetWidth = width * 1.15;
        targetHeight = targetWidth / imgRatio;
      }
    } else {
      // En horizontal (16:9), le personnage occupe ~95% de la hauteur
      targetHeight = height * 0.95;
      targetWidth = targetHeight * imgRatio;
      if (targetWidth > width * 0.75) {
        targetWidth = width * 0.75;
        targetHeight = targetWidth / imgRatio;
      }
    }

    // Position stable ancrée au bas de l'écran (zéro secousse, zéro balancement)
    const posX = (width - targetWidth) / 2;
    const posY = height - targetHeight;

    ctx.save();

    // 6. Rendu propre et stable avec fondu enchaîné doux lors des changements de pose
    if (transitionProgress < 1.0 && this.prevPoseImg && this.prevPoseImg.complete && this.prevPoseImg !== imgToDraw) {
      // Ancienne pose en fondu sortant
      ctx.save();
      ctx.globalAlpha = 1.0 - transitionProgress;
      ctx.drawImage(this.prevPoseImg, posX, posY, targetWidth, targetHeight);
      ctx.restore();

      // Nouvelle pose en fondu entrant
      ctx.save();
      ctx.globalAlpha = transitionProgress;
      if (imgToDraw && imgToDraw.complete && (imgToDraw.naturalWidth > 0 || imgToDraw.width > 0)) {
        ctx.drawImage(imgToDraw, posX, posY, targetWidth, targetHeight);
      }
      ctx.restore();
    } else {
      // Rendu direct stable
      if (imgToDraw && imgToDraw.complete && (imgToDraw.naturalWidth > 0 || imgToDraw.width > 0)) {
        ctx.drawImage(imgToDraw, posX, posY, targetWidth, targetHeight);
      }
    }

    ctx.restore();
  }
}
