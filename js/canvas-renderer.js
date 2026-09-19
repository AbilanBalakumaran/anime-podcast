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

  /**
   * Analyse une image pour extraire :
   * 1. La boîte englobante réelle (bounding box) des pixels non-transparents
   * 2. Le profil colorimétrique (luminance moyenne, min/max, moyennes R, G, B)
   */
  analyzeImage(img) {
    const w = img.naturalWidth || img.width || 500;
    const h = img.naturalHeight || img.height || 500;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    try {
      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      let minX = w, minY = h, maxX = 0, maxY = 0;
      let nonTransparentCount = 0;
      let sumR = 0, sumG = 0, sumB = 0;
      const lumSamples = [];

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const alpha = data[idx + 3];

          // Considérer comme pixel de contenu si alpha > 25
          if (alpha > 25) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;

            nonTransparentCount++;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            sumR += r;
            sumG += g;
            sumB += b;

            // Échantillonnage de la luminance pour calcul min/max/percentile
            if (nonTransparentCount % 5 === 0) {
              lumSamples.push(0.299 * r + 0.587 * g + 0.114 * b);
            }
          }
        }
      }

      // Si l'image n'a pas de transparence ou est vide, prendre les dimensions pleines
      if (nonTransparentCount < 100 || minX > maxX || minY > maxY) {
        minX = 0;
        minY = 0;
        maxX = w - 1;
        maxY = h - 1;
        nonTransparentCount = Math.max(1, w * h);
      }

      const contentW = Math.max(1, maxX - minX + 1);
      const contentH = Math.max(1, maxY - minY + 1);

      const meanR = sumR / nonTransparentCount;
      const meanG = sumG / nonTransparentCount;
      const meanB = sumB / nonTransparentCount;
      const meanLum = 0.299 * meanR + 0.587 * meanG + 0.114 * meanB;

      // Calcul des percentiles 2% et 98% pour éviter le bruit
      lumSamples.sort((a, b) => a - b);
      const p2Idx = Math.floor(lumSamples.length * 0.02);
      const p98Idx = Math.floor(lumSamples.length * 0.98);
      const minLum = lumSamples.length > 0 ? lumSamples[p2Idx] : 0;
      const maxLum = lumSamples.length > 0 ? lumSamples[p98Idx] : 255;

      return {
        bbox: { minX, minY, maxX, maxY, contentW, contentH },
        stats: { minLum, maxLum, meanLum, meanR, meanG, meanB }
      };
    } catch (e) {
      console.warn('[CanvasRenderer] Analyse d\'image impossible (CORS ou SVG complexe) :', e);
      return {
        bbox: { minX: 0, minY: 0, maxX: w - 1, maxY: h - 1, contentW: w, contentH: h },
        stats: { minLum: 0, maxLum: 255, meanLum: 128, meanR: 128, meanG: 128, meanB: 128 }
      };
    }
  }

  /**
   * Normalise une image de mascotte :
   * 1. Recadrage et calage sur une ligne de base commune (même échelle & ancrage bas)
   * 2. Égalisation de la colorimétrie et de l'exposition par rapport à la pose de référence
   */
  normalizeImage(img, profile, refStats) {
    const NORM_W = 1200;
    const NORM_H = 1600;

    const normCanvas = document.createElement('canvas');
    normCanvas.width = NORM_W;
    normCanvas.height = NORM_H;
    const normCtx = normCanvas.getContext('2d', { willReadFrequently: true });

    const { minX, minY, contentW, contentH } = profile.bbox;

    // Échelle normalisée pour que le personnage occupe ~90% de la hauteur du canevas normalisé
    const targetContentH = NORM_H * 0.90;
    const scale = targetContentH / contentH;
    const destW = contentW * scale;
    const destH = contentH * scale;

    // Centrage horizontal et ancrage au bas (97% de la hauteur)
    const destX = (NORM_W - destW) / 2;
    const destY = (NORM_H * 0.97) - destH;

    normCtx.drawImage(img, minX, minY, contentW, contentH, destX, destY, destW, destH);

    // Si on a des statistiques de référence (ex: pose neutre_0), corriger la colorimétrie / exposition
    if (refStats && profile.stats) {
      try {
        const curStats = profile.stats;
        const imgData = normCtx.getImageData(0, 0, NORM_W, NORM_H);
        const data = imgData.data;

        // 1. Correction du voile blanc / noirs laiteux (Shadow de-haze)
        const blackOffset = (curStats.minLum > 12 && curStats.minLum > refStats.minLum + 5)
          ? (curStats.minLum - refStats.minLum)
          : 0;

        // 2. Correction de l'exposition globale (Gamma / Mean Luminance)
        let gamma = 1.0;
        if (curStats.meanLum > 10 && refStats.meanLum > 10) {
          // Si l'image courante est nettement plus blanche / surexposée
          const ratio = refStats.meanLum / curStats.meanLum;
          gamma = Math.max(0.75, Math.min(1.35, Math.pow(ratio, 0.6)));
        }

        // 3. Correction de la balance des teintes (White Balance / Tint)
        const curRefR = refStats.meanR / (refStats.meanLum || 1);
        const curRefG = refStats.meanG / (refStats.meanLum || 1);
        const curRefB = refStats.meanB / (refStats.meanLum || 1);

        const curPoseR = curStats.meanR / (curStats.meanLum || 1);
        const curPoseG = curStats.meanG / (curStats.meanLum || 1);
        const curPoseB = curStats.meanB / (curStats.meanLum || 1);

        const tintCorrR = Math.max(0.85, Math.min(1.18, curRefR / (curPoseR || 1)));
        const tintCorrG = Math.max(0.85, Math.min(1.18, curRefG / (curPoseG || 1)));
        const tintCorrB = Math.max(0.85, Math.min(1.18, curRefB / (curPoseB || 1)));

        // Appliquer la correction seulement si des différences notables existent
        const needsCorrection = blackOffset > 0 || Math.abs(gamma - 1.0) > 0.03 ||
          Math.abs(tintCorrR - 1.0) > 0.03 || Math.abs(tintCorrG - 1.0) > 0.03 || Math.abs(tintCorrB - 1.0) > 0.03;

        if (needsCorrection) {
          for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha === 0) continue;

            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // A. Dé-voilage des noirs
            if (blackOffset > 0) {
              r = Math.max(0, (r - blackOffset) * (255 / (255 - blackOffset)));
              g = Math.max(0, (g - blackOffset) * (255 / (255 - blackOffset)));
              b = Math.max(0, (b - blackOffset) * (255 / (255 - blackOffset)));
            }

            // B. Ajustement Gamma d'exposition
            if (gamma !== 1.0) {
              r = 255 * Math.pow(r / 255, 1 / gamma);
              g = 255 * Math.pow(g / 255, 1 / gamma);
              b = 255 * Math.pow(b / 255, 1 / gamma);
            }

            // C. Ajustement de la teinte
            r = Math.min(255, Math.max(0, r * tintCorrR));
            g = Math.min(255, Math.max(0, g * tintCorrG));
            b = Math.min(255, Math.max(0, b * tintCorrB));

            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
          }

          normCtx.putImageData(imgData, 0, 0);
        }
      } catch (err) {
        console.warn('[CanvasRenderer] Échec de la normalisation colorimétrique:', err);
      }
    }

    return normCanvas;
  }

  async preloadAllMascotPoses(mascot) {
    if (!mascot || !mascot.emotions) return;

    // 1. Trouver et charger la pose de référence (neutre_0 en priorité)
    let refPoseData = null;
    let refKey = null;

    if (mascot.emotions['neutre'] && Array.isArray(mascot.emotions['neutre']) && mascot.emotions['neutre'][0]) {
      refPoseData = mascot.emotions['neutre'][0];
      refKey = `${mascot.id}_neutre_0`;
    } else {
      // Première pose disponible dans les émotions
      for (const [emoKey, poses] of Object.entries(mascot.emotions)) {
        if (Array.isArray(poses) && poses.length > 0 && poses[0]) {
          refPoseData = poses[0];
          refKey = `${mascot.id}_${emoKey}_0`;
          break;
        }
      }
    }

    let refProfile = null;
    if (refPoseData) {
      const refRawImg = await this.createImageFromData(refPoseData);
      if (refRawImg) {
        refProfile = this.analyzeImage(refRawImg);
        const refCanvas = this.normalizeImage(refRawImg, refProfile, null);
        this.imageCache.set(refKey, refCanvas);
      }
    }

    const refStats = refProfile ? refProfile.stats : null;

    // 2. Normaliser et mettre en cache toutes les autres poses
    for (const [emoKey, poses] of Object.entries(mascot.emotions)) {
      if (Array.isArray(poses)) {
        for (let idx = 0; idx < poses.length; idx++) {
          const cacheKey = `${mascot.id}_${emoKey}_${idx}`;
          if (cacheKey === refKey && this.imageCache.has(cacheKey)) {
            continue;
          }

          const poseData = poses[idx];
          if (poseData) {
            const rawImg = await this.createImageFromData(poseData);
            if (rawImg) {
              const curProfile = this.analyzeImage(rawImg);
              const normCanvas = this.normalizeImage(rawImg, curProfile, refStats);
              this.imageCache.set(cacheKey, normCanvas);
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

    // 1. Fond transparent absolu (Canal Alpha RGBA 0,0,0,0)
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

    // 3. Récupération instantanée de l'image ("brut", coupure anime sans aucun fondu)
    const currentKey = `${this.currentMascot.id}_${this.currentEmotion}_${this.currentVariantIndex}`;
    let imgToDraw = this.imageCache.get(currentKey);

    if (!imgToDraw) {
      const fallbackKey1 = `${this.currentMascot.id}_${this.currentEmotion}_0`;
      const fallbackKey2 = `${this.currentMascot.id}_neutre_0`;
      imgToDraw = this.imageCache.get(fallbackKey1) || this.imageCache.get(fallbackKey2);
    }

    if (!imgToDraw) return;

    // 4. Proportions et dimensionnement géant dans le cadre
    const nw = imgToDraw.width || imgToDraw.naturalWidth || 1200;
    const nh = imgToDraw.height || imgToDraw.naturalHeight || 1600;
    const imgRatio = nw / nh;

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

    // Ancrage stable au bas du canevas
    const posX = (width - targetWidth) / 2;
    const posY = height - targetHeight;

    // 5. Rendu brut instantané (Anime Cut direct)
    ctx.drawImage(imgToDraw, posX, posY, targetWidth, targetHeight);
  }
}
