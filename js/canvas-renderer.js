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

    this.baseWidth = 1920;
    this.baseHeight = 1080;

    if (this.canvas) {
      this.canvas.width = this.baseWidth;
      this.canvas.height = this.baseHeight;
    }

    this.currentMascot = null;
    this.currentEmotion = 'neutre';
    this.currentVariantIndex = 0;

    // Cache d'images préchargées : key = mascotId_emotion_variantIndex
    this.imageCache = new Map();

    this.isRunning = false;
    this.animationFrameId = null;

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

    // 3. Mesure de l'énergie vocale pour le flap buccal et micro-mouvements
    const mouthAperture = this.audioManager ? this.audioManager.getMouthAperture() : 0;
    const isSpeaking = mouthAperture > 0.05;

    // 4. Animation Idle (respiration & balancement doux)
    const timeSec = timestamp * 0.001;
    const idleY = Math.sin(timeSec * 2.2) * 8;
    const idleTilt = Math.sin(timeSec * 1.5) * 0.008;
    const speakingBounce = isSpeaking ? (Math.sin(timestamp * 0.02) * 6 * mouthAperture) : 0;

    // 5. Positionnement
    const targetHeight = height * 0.88;
    const targetWidth = targetHeight * (400 / 500);
    const posX = (width - targetWidth) / 2;
    const posY = height - targetHeight + idleY + speakingBounce;

    ctx.save();

    const pivotX = width / 2;
    const pivotY = height;
    ctx.translate(pivotX, pivotY);
    ctx.rotate(idleTilt);
    ctx.translate(-pivotX, -pivotY);

    // 6. Rendu de l'attitude courante
    const cacheKey = `${this.currentMascot.id}_${this.currentEmotion}_${this.currentVariantIndex}`;
    let imgToDraw = this.imageCache.get(cacheKey);

    // Si mascotte par défaut avec flap buccal dynamique SVG
    if (this.currentMascot.getSvgWithMouth && isSpeaking) {
      const dynamicSvg = this.currentMascot.getSvgWithMouth(this.currentEmotion, this.currentVariantIndex, mouthAperture);
      const dynamicImg = new Image();
      const blob = new Blob([dynamicSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      dynamicImg.src = url;
      imgToDraw = dynamicImg;
    }

    if (imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth > 0) {
      ctx.drawImage(imgToDraw, posX, posY, targetWidth, targetHeight);
    } else {
      // Fallbacks gracieux
      const fallbackKey1 = `${this.currentMascot.id}_${this.currentEmotion}_0`;
      const fallbackKey2 = `${this.currentMascot.id}_neutre_0`;
      const fallbackImg = this.imageCache.get(fallbackKey1) || this.imageCache.get(fallbackKey2);
      if (fallbackImg && fallbackImg.complete) {
        ctx.drawImage(fallbackImg, posX, posY, targetWidth, targetHeight);
      }
    }

    ctx.restore();
  }
}
