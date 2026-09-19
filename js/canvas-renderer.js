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

    // Format vidéo fixe : 1920x1080 FHD (16:9 paysage permanent)
    this.currentFormat = '16:9';
    this.baseWidth = 1920;
    this.baseHeight = 1080;
    this.showSubtitles = true;
    this.updateCanvasDimensions();

    this.currentMascot = null;
    this.currentEmotion = 'neutre';
    this.currentVariantIndex = 0;

    // Cache d'images préchargées : key = mascotId_emotion_variantIndex
    this.imageCache = new Map();

    this.isRunning = false;
    this.animationFrameId = null;

    this.init();
  }

  updateCanvasDimensions() {
    this.baseWidth = 1920;
    this.baseHeight = 1080;

    if (this.canvas) {
      this.canvas.width = this.baseWidth;
      this.canvas.height = this.baseHeight;
    }

    if (this.canvasWrapper) {
      this.canvasWrapper.classList.add('format-16-9');
      this.canvasWrapper.classList.remove('format-9-16');
    }

    const headerFormatLabel = document.getElementById('header-format-label');
    if (headerFormatLabel) {
      headerFormatLabel.textContent = '1920×1080 (16:9 FHD)';
    }
  }

  setFormat(format) {
    // Toujours forcer 1920x1080 16:9
    this.currentFormat = '16:9';
    this.updateCanvasDimensions();
  }

  toggleSubtitles() {
    this.showSubtitles = !this.showSubtitles;
    return this.showSubtitles;
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
    this.imageCache.clear();
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
            if (img) {
              this.imageCache.set(cacheKey, img);
            }
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
        img.onerror = () => resolve(null);
        img.src = url;
      } else {
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
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

    // 1. Fond transparent absolu (ou illustration animée si présente)
    ctx.clearRect(0, 0, width, height);

    const currentTime = this.audioManager ? this.audioManager.getCurrentTime() : 0;
    const activeSegment = this.speechAnalyzer ? this.speechAnalyzer.getSegmentAtTime(currentTime) : null;

    // 2. Rendu de l'illustration animée (Montage automatique avec effet Ken Burns)
    if (activeSegment && activeSegment.image && activeSegment.image.complete && activeSegment.image.naturalWidth > 0) {
      const img = activeSegment.image;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      // Progression temporelle dans le segment (0 -> 1)
      const segDuration = Math.max(0.1, activeSegment.duration || (activeSegment.end - activeSegment.start) || 1);
      const segElapsed = Math.max(0, currentTime - activeSegment.start);
      const progress = Math.min(1, Math.max(0, segElapsed / segDuration));

      // Style d'animation (Ken Burns)
      const animStyle = activeSegment.animationStyle || 'zoom-in';
      let animScale = 1.0;
      let panX = 0;
      let panY = 0;

      if (animStyle === 'zoom-in') {
        animScale = 1.0 + (progress * 0.12); // Zoom avant fluide
      } else if (animStyle === 'zoom-out') {
        animScale = 1.12 - (progress * 0.12); // Zoom arrière fluide
      } else if (animStyle === 'pan') {
        animScale = 1.08;
        panX = (progress - 0.5) * 50; // Balayage panoramique horizontal
      } else {
        animScale = 1.0; // Statique
      }

      // Cadrage 'cover' 16:9 en 1920x1080
      const scaleCover = Math.max(width / iw, height / ih) * animScale;
      const dw = iw * scaleCover;
      const dh = ih * scaleCover;
      const dx = (width - dw) / 2 + panX;
      const dy = (height - dh) / 2 + panY;

      ctx.save();
      ctx.drawImage(img, dx, dy, dw, dh);

      // Dégradé cinématique en bas pour contraster la mascotte et les sous-titres
      const grad = ctx.createLinearGradient(0, height * 0.55, 0, height);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, height * 0.55, width, height * 0.45);
      ctx.restore();
    }

    if (!this.currentMascot) return;

    // 3. Synchronisation de l'attitude avec la lecture audio en cours
    if (this.audioManager && this.speechAnalyzer && this.audioManager.isPlaying) {
      const attitude = this.speechAnalyzer.getPoseAtTime(currentTime);
      if (attitude) {
        this.currentEmotion = attitude.emotion;
        this.currentVariantIndex = attitude.variantIndex;
      }
    }

    // 4. Rendu de la mascotte selon sa position (sauf si masquée pour cette scène)
    const posMode = (activeSegment && activeSegment.position) || 'center';
    if (posMode !== 'hidden') {
      const currentKey = `${this.currentMascot.id}_${this.currentEmotion}_${this.currentVariantIndex}`;
      let imgToDraw = this.imageCache.get(currentKey);

      if (!imgToDraw) {
        const fallbackKey1 = `${this.currentMascot.id}_${this.currentEmotion}_0`;
        const fallbackKey2 = `${this.currentMascot.id}_neutre_0`;
        imgToDraw = this.imageCache.get(fallbackKey1) || this.imageCache.get(fallbackKey2);
      }

      if (!imgToDraw) {
        for (const [key, val] of this.imageCache.entries()) {
          if (key.startsWith(`${this.currentMascot.id}_`) && val) {
            imgToDraw = val;
            break;
          }
        }
      }

      if (imgToDraw) {
        // Proportions 16:9 paysage (hauteur ~95%)
        const nw = imgToDraw.width || imgToDraw.naturalWidth || 1200;
        const nh = imgToDraw.height || imgToDraw.naturalHeight || 1600;
        const imgRatio = nw / nh;

        let targetHeight = height * 0.95;
        let targetWidth = targetHeight * imgRatio;
        if (targetWidth > width * 0.75) {
          targetWidth = width * 0.75;
          targetHeight = targetWidth / imgRatio;
        }

        const transform = this.currentMascot.transform || {};
        const scale = (transform.scale !== undefined ? transform.scale : 100) / 100;
        const offsetX = (transform.offsetX !== undefined ? transform.offsetX : 0);
        const offsetY = (transform.offsetY !== undefined ? transform.offsetY : 0);

        const finalWidth = targetWidth * scale;
        const finalHeight = targetHeight * scale;

        // Positionnement horizontal selon le mode choisi (gauche, centre, droite)
        let posX;
        if (posMode === 'left') {
          posX = (width * 0.22) - (targetWidth / 2);
        } else if (posMode === 'right') {
          posX = (width * 0.78) - (targetWidth / 2);
        } else {
          posX = (width - targetWidth) / 2; // centre
        }

        const posY = height - targetHeight;
        const finalPosX = posX + (targetWidth - finalWidth) / 2 + offsetX;
        const finalPosY = posY + (targetHeight - finalHeight) + offsetY;

        const b = transform.brightness !== undefined ? transform.brightness : 100;
        const c = transform.contrast !== undefined ? transform.contrast : 100;
        const h = transform.hue !== undefined ? transform.hue : 0;
        const s = transform.saturation !== undefined ? transform.saturation : 100;

        ctx.save();
        if (b !== 100 || c !== 100 || h !== 0 || s !== 100) {
          ctx.filter = `brightness(${b}%) contrast(${c}%) hue-rotate(${h}deg) saturate(${s}%)`;
        }
        ctx.drawImage(imgToDraw, finalPosX, finalPosY, finalWidth, finalHeight);
        ctx.restore();
      }
    }

    // 5. Rendu des sous-titres incrustés (si activés)
    if (this.showSubtitles && activeSegment && activeSegment.text) {
      this.drawSubtitles(ctx, activeSegment.text, width, height);
    }
  }

  drawSubtitles(ctx, text, width, height) {
    if (!text) return;
    const cleanText = text.replace(/\s*\(Partie \d+\)$/, '').trim();
    if (!cleanText) return;

    ctx.save();
    ctx.font = 'bold 32px "Inter", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textMetrics = ctx.measureText(cleanText);
    const textWidth = textMetrics.width;
    const paddingX = 26;
    const paddingY = 12;
    const boxWidth = Math.min(width * 0.88, textWidth + paddingX * 2);
    const boxHeight = 56;
    const boxX = (width - boxWidth) / 2;
    const boxY = height - 85;

    // Boîte sombre translucide avec liseré doré
    ctx.fillStyle = 'rgba(11, 15, 25, 0.82)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 14);
    ctx.fill();
    ctx.stroke();

    // Texte blanc haute netteté avec ombre douce
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.fillText(cleanText, width / 2, boxY + boxHeight / 2);

    ctx.restore();
  }
}
