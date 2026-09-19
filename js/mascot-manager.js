/**
 * MASCOT MANAGER - ANIME PODCAST STUDIO
 * Gère les mascottes multi-émotions et multi-poses :
 * - Import en vrac (Bulk Upload) de toutes les images en un seul clic
 * - Détection automatique intelligente de l'émotion par analyse du nom de fichier
 * - Grille de revue et correction manuelle en 1 clic avant enregistrement
 * - Persistance IndexedDB et synchronisation dynamique avec le canevas
 */

import { DEFAULT_MASCOTS, BASE_EMOTIONS } from './default-mascots.js';
import { dbManager } from './db.js';

export class MascotManager {
  constructor(onMascotChangeCallback, onEmotionChangeCallback) {
    this.mascots = [...DEFAULT_MASCOTS];
    this.activeMascot = this.mascots[0];
    this.activeEmotion = 'neutre';
    this.activeVariantIndex = 0;

    this.onMascotChange = onMascotChangeCallback;
    this.onEmotionChange = onEmotionChangeCallback;

    // Éléments du DOM principal
    this.pickerContainer = document.getElementById('mascot-picker');
    this.fullGridContainer = document.getElementById('mascots-full-grid');
    this.emotionsContainer = document.getElementById('poses-preview-bar');
    this.btnNewMascot = document.getElementById('btn-new-mascot');
    this.modal = document.getElementById('modal-new-mascot');
    this.modalClose = document.getElementById('modal-close-btn');
    this.formNewMascot = document.getElementById('form-new-mascot');
    this.inputMascotName = document.getElementById('input-mascot-name');

    // Éléments de l'import en vrac
    this.bulkDropzone = document.getElementById('bulk-upload-dropzone');
    this.inputBulkFiles = document.getElementById('input-bulk-files');
    this.bulkReviewContainer = document.getElementById('bulk-review-container');
    this.bulkReviewGrid = document.getElementById('bulk-review-grid');
    this.bulkCountBadge = document.getElementById('bulk-count-badge');

    // Émotion personnalisée
    this.btnAddCustomEmotion = document.getElementById('btn-add-custom-emotion');
    this.inputCustomEmotionName = document.getElementById('input-custom-emotion-name');

    // Éléments de la modale de réglage (Position & Teinte)
    this.modalTune = document.getElementById('modal-mascot-tune');
    this.modalTuneClose = document.getElementById('modal-tune-close-btn');
    this.btnTuneCancel = document.getElementById('btn-tune-cancel');
    this.btnTuneSave = document.getElementById('btn-tune-save');
    this.btnTuneReset = document.getElementById('btn-tune-reset');
    this.tuneMascotName = document.getElementById('tune-mascot-name');
    this.tunePreviewImg = document.getElementById('tune-preview-img');

    // Gestion des poses (existantes) dans la modale de réglage
    this.tunePosesList = document.getElementById('tune-poses-list');
    this.btnTuneAddPose = document.getElementById('btn-tune-add-pose');
    this.inputTuneAddPose = document.getElementById('input-tune-add-pose');

    // Sliders de réglage
    this.tuneScale = document.getElementById('tune-scale');
    this.tuneOffsetX = document.getElementById('tune-offset-x');
    this.tuneOffsetY = document.getElementById('tune-offset-y');
    this.tuneBrightness = document.getElementById('tune-brightness');
    this.tuneContrast = document.getElementById('tune-contrast');
    this.tuneHue = document.getElementById('tune-hue');
    this.tuneSaturation = document.getElementById('tune-saturation');

    // Badges de valeur
    this.valTuneScale = document.getElementById('val-tune-scale');
    this.valTuneOffsetX = document.getElementById('val-tune-offset-x');
    this.valTuneOffsetY = document.getElementById('val-tune-offset-y');
    this.valTuneBrightness = document.getElementById('val-tune-brightness');
    this.valTuneContrast = document.getElementById('val-tune-contrast');
    this.valTuneHue = document.getElementById('val-tune-hue');
    this.valTuneSaturation = document.getElementById('val-tune-saturation');

    // Liste des fichiers importés en vrac pour revue
    // Array<{ id, name, dataUrl, assignedEmotion }>
    this.bulkUploadedFiles = [];
    this.customEmotionsList = [];
  }

  async init() {
    await this.loadMascotsFromDB();
    this.renderPicker();
    this.renderFullGrid();
    this.renderEmotionPills();
    this.setupModalEvents();
    this.setupTuneModalEvents();
    this.setupPosesListEvents();

    if (this.activeMascot && this.onMascotChange) {
      this.onMascotChange(this.activeMascot, this.activeEmotion, this.activeVariantIndex);
    }
  }

  async loadMascotsFromDB() {
    try {
      const customMascots = await dbManager.getAllMascots();
      // Fusionne par id : une mascotte par défaut sauvegardée (transform, poses
      // retouchées...) remplace la version d'origine au lieu de la dupliquer.
      const merged = [...DEFAULT_MASCOTS];
      customMascots.forEach(custom => {
        const idx = merged.findIndex(m => m.id === custom.id);
        if (idx >= 0) {
          merged[idx] = custom;
        } else {
          merged.push(custom);
        }
      });
      this.mascots = merged;

      // Récupérer la dernière mascotte ouverte enregistrée dans localStorage
      const lastMascotId = localStorage.getItem('last_active_mascot_id');
      let targetMascot = null;

      if (lastMascotId) {
        targetMascot = this.mascots.find(m => m.id === lastMascotId);
      }

      // S'il n'y a pas de dernière mascotte mémorisée mais qu'il y a des mascottes, ouvrir la seule/première
      if (!targetMascot && this.mascots.length > 0) {
        targetMascot = this.mascots[0];
      }

      this.activeMascot = targetMascot || null;
      if (this.activeMascot) {
        localStorage.setItem('last_active_mascot_id', this.activeMascot.id);
      }
    } catch (err) {
      console.warn('[MascotManager] Impossible de charger les mascottes depuis IndexedDB:', err);
    }
  }

  getActiveMascot() {
    return this.activeMascot;
  }

  getActiveEmotion() {
    return this.activeEmotion;
  }

  getActiveVariantIndex() {
    return this.activeVariantIndex;
  }

  setActiveMascot(id) {
    const found = this.mascots.find(m => m.id === id);
    if (found) {
      this.activeMascot = found;
      this.activeEmotion = 'neutre';
      this.activeVariantIndex = 0;
      localStorage.setItem('last_active_mascot_id', found.id);
      this.renderPicker();
      this.renderFullGrid();
      this.renderEmotionPills();
      if (this.onMascotChange) {
        this.onMascotChange(this.activeMascot, this.activeEmotion, this.activeVariantIndex);
      }
    }
  }

  setActiveEmotion(emotionName) {
    const availablePoses = this.getPosesForEmotion(this.activeMascot, emotionName);
    if (availablePoses && availablePoses.length > 0) {
      if (this.activeEmotion === emotionName) {
        // Cycler entre les variantes
        this.activeVariantIndex = (this.activeVariantIndex + 1) % availablePoses.length;
      } else {
        this.activeEmotion = emotionName;
        this.activeVariantIndex = 0;
      }

      this.renderEmotionPills();
      if (this.onEmotionChange) {
        this.onEmotionChange(this.activeEmotion, this.activeVariantIndex);
      }
    }
  }

  getPosesForEmotion(mascot, emotion) {
    if (!mascot || !mascot.emotions) return [];
    return mascot.emotions[emotion] || [];
  }

  getAllEmotionsForMascot(mascot) {
    if (!mascot || !mascot.emotions) return [];
    return Object.keys(mascot.emotions);
  }

  getAllAvailableEmotions() {
    return [...BASE_EMOTIONS, ...this.customEmotionsList];
  }

  /**
   * Moteur de Détection Automatique d'Émotion
   * Analyse le nom du fichier (insensible à la casse, sans accents)
   */
  detectEmotionFromFileName(fileName, index = 0) {
    const clean = fileName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ');

    const rules = [
      { id: 'bonjour', keywords: ['bonjour', 'salut', 'hello', 'coucou', 'wave', 'hi', 'welcome', 'intro', 'accueil', 'salutation'] },
      { id: 'au_revoir', keywords: ['aurevoir', 'au revoir', 'bye', 'outro', 'farewell', 'cya', 'peace', 'fin', 'conclusion', 'merci'] },
      { id: 'enthousiaste', keywords: ['enthousiaste', 'enthusiastic', 'excited', 'sparkle', 'hype', 'victory', 'cheer', 'energy', 'dynamique', 'super'] },
      { id: 'explicative', keywords: ['explicative', 'explaining', 'explain', 'point', 'teach', 'present', 'hand', 'demo', 'tuto', 'index'] },
      { id: 'pensive', keywords: ['pensive', 'thinking', 'thoughtful', 'think', 'wonder', 'question', 'curious', 'doubt', 'ponder', 'songeur'] },
      { id: 'surprise', keywords: ['surprise', 'surprised', 'shock', 'gasp', 'astonished', 'what', 'omg', 'choc', 'ebahi', 'sursaut'] },
      { id: 'confiante', keywords: ['confiante', 'confident', 'cool', 'smug', 'arms crossed', 'proud', 'fiert', 'brave', 'classe'] },
      { id: 'joyeuse', keywords: ['joyeuse', 'happy', 'smile', 'joy', 'laugh', 'cheerful', 'fun', 'content', 'rire', 'sourire'] },
      { id: 'serieuse', keywords: ['serieuse', 'serious', 'focus', 'stern', 'steady', 'concentr', 'grave', 'calme'] },
      { id: 'ironique', keywords: ['ironique', 'ironic', 'smirk', 'sarcastic', 'tease', 'wry', 'moqueur', 'malicieux'] },
      { id: 'enervee', keywords: ['enervee', 'angry', 'mad', 'rage', 'passion', 'furious', 'annoyed', 'colere', 'enrage'] },
      { id: 'determinee', keywords: ['determinee', 'determined', 'action', 'ready', 'fight', 'engage', 'volont'] },
      { id: 'embarrassee', keywords: ['embarrassee', 'embarrassed', 'shy', 'blush', 'sweat', 'awkward', 'timide', 'gene'] },
      { id: 'neutre', keywords: ['neutre', 'neutral', 'idle', 'default', 'base', 'normal', 'stand', 'pose', 'repos'] }
    ];

    // Vérifier les correspondances de mots-clés
    for (const rule of rules) {
      for (const kw of rule.keywords) {
        if (clean.includes(kw)) {
          return rule.id;
        }
      }
    }

    // Si aucune correspondance explicite, distribuer de façon équilibrée
    const fallbackList = ['neutre', 'enthousiaste', 'explicative', 'pensive', 'surprise', 'joyeuse'];
    return fallbackList[index % fallbackList.length];
  }

  renderPicker() {
    if (!this.pickerContainer) return;
    this.pickerContainer.innerHTML = '';

    if (this.mascots.length === 0) {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'mascot-card';
      emptyCard.style.cursor = 'pointer';
      emptyCard.style.border = '1px dashed var(--border-gold)';
      emptyCard.style.textAlign = 'center';
      emptyCard.style.padding = '18px 10px';
      emptyCard.innerHTML = `
        <div style="font-size: 1.8rem; margin-bottom: 6px;">➕</div>
        <div style="font-weight: 700; font-size: 0.85rem; color: var(--gold-primary);">Ajouter une Mascotte</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">Importer des poses</div>
      `;
      emptyCard.addEventListener('click', () => this.openModal());
      this.pickerContainer.appendChild(emptyCard);
      return;
    }

    this.mascots.forEach(mascot => {
      const card = document.createElement('div');
      card.className = `mascot-card ${this.activeMascot && mascot.id === this.activeMascot.id ? 'selected' : ''}`;
      card.dataset.id = mascot.id;

      const thumbnailBox = document.createElement('div');
      thumbnailBox.className = 'mascot-thumbnail';

      const neutralPoses = this.getPosesForEmotion(mascot, 'neutre');
      const firstPose = neutralPoses[0] || (Object.values(mascot.emotions || {})[0] || [])[0] || '';

      if (firstPose.trim().startsWith('<svg')) {
        thumbnailBox.innerHTML = firstPose;
      } else if (firstPose) {
        const img = document.createElement('img');
        img.src = firstPose;
        img.alt = mascot.name;
        thumbnailBox.appendChild(img);
      } else {
        thumbnailBox.innerHTML = '<span style="font-size:1.5rem;">🎭</span>';
      }

      const nameEl = document.createElement('div');
      nameEl.className = 'mascot-name';
      nameEl.textContent = mascot.name;

      const statsEl = document.createElement('div');
      statsEl.className = 'mascot-stats-badge';
      const numEmotions = Object.keys(mascot.emotions || {}).length;
      let totalPoses = 0;
      Object.values(mascot.emotions || {}).forEach(arr => totalPoses += (arr ? arr.length : 0));
      statsEl.textContent = `${numEmotions} émotions • ${totalPoses} poses`;

      card.appendChild(thumbnailBox);
      card.appendChild(nameEl);
      card.appendChild(statsEl);

      if (this.activeMascot && mascot.id === this.activeMascot.id) {
        const badge = document.createElement('div');
        badge.className = 'mascot-badge';
        card.appendChild(badge);
      }

      if (!mascot.isDefault) {
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-delete-mascot';
        delBtn.innerHTML = '&times;';
        delBtn.title = 'Supprimer cette mascotte';
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm(`Supprimer définitivement la mascotte "${mascot.name}" ?`)) {
            await this.deleteCustomMascot(mascot.id);
          }
        });
        card.appendChild(delBtn);
      }

      card.addEventListener('click', () => {
        this.setActiveMascot(mascot.id);
      });

      this.pickerContainer.appendChild(card);
    });
  }

  renderFullGrid() {
    if (!this.fullGridContainer) {
      this.fullGridContainer = document.getElementById('mascots-full-grid');
    }
    if (!this.fullGridContainer) return;
    this.fullGridContainer.innerHTML = '';

    if (this.mascots.length === 0) {
      this.fullGridContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px; text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 12px;">🎭</div>
          <h3 style="color: var(--text-white); margin-bottom: 8px;">Aucune mascotte enregistrée</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 420px; margin: 0 auto 18px;">
            Importez vos images de personnage (PNG transparents ou SVG) en vrac pour commencer.
          </p>
          <button type="button" class="btn btn-gold" id="btn-grid-new-mascot">
            + Nouvelle Mascotte
          </button>
        </div>
      `;
      const btnNew = document.getElementById('btn-grid-new-mascot');
      if (btnNew) btnNew.addEventListener('click', () => this.openModal());
      return;
    }

    this.mascots.forEach(mascot => {
      const card = document.createElement('div');
      card.className = `mascot-full-card ${this.activeMascot && mascot.id === this.activeMascot.id ? 'selected' : ''}`;
      card.dataset.id = mascot.id;
      card.style.cursor = 'pointer';

      const thumb = document.createElement('div');
      thumb.className = 'mascot-full-thumb';

      const neutralPoses = this.getPosesForEmotion(mascot, 'neutre');
      const firstPose = neutralPoses[0] || (Object.values(mascot.emotions || {})[0] || [])[0] || '';

      if (firstPose.trim().startsWith('<svg')) {
        thumb.innerHTML = firstPose;
      } else if (firstPose) {
        const img = document.createElement('img');
        img.src = firstPose;
        img.alt = mascot.name;
        thumb.appendChild(img);
      } else {
        thumb.innerHTML = '<span style="font-size:2rem;">🎭</span>';
      }

      const nameEl = document.createElement('div');
      nameEl.className = 'mascot-full-name';
      nameEl.textContent = mascot.name;

      const statsEl = document.createElement('div');
      statsEl.className = 'mascot-full-stats';
      const numEmotions = Object.keys(mascot.emotions || {}).length;
      let totalPoses = 0;
      Object.values(mascot.emotions || {}).forEach(arr => totalPoses += (arr ? arr.length : 0));

      const emoBadge = document.createElement('span');
      emoBadge.className = 'mascot-stat-badge';
      emoBadge.textContent = `${numEmotions} émotions`;

      const posesBadge = document.createElement('span');
      posesBadge.className = 'mascot-stat-badge';
      posesBadge.textContent = `${totalPoses} poses`;

      statsEl.appendChild(emoBadge);
      statsEl.appendChild(posesBadge);

      const btnTune = document.createElement('button');
      btnTune.type = 'button';
      btnTune.className = 'btn btn-outline-gold btn-sm';
      btnTune.style.marginTop = '10px';
      btnTune.style.width = '100%';
      btnTune.innerHTML = '⚙️ Régler Position &amp; Teinte';
      btnTune.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setActiveMascot(mascot.id);
        this.openTuneModal(mascot);
      });

      card.appendChild(thumb);
      card.appendChild(nameEl);
      card.appendChild(statsEl);
      card.appendChild(btnTune);

      if (mascot.isDefault) {
        const defaultBadge = document.createElement('span');
        defaultBadge.className = 'mascot-default-badge';
        defaultBadge.textContent = 'Mascotte par défaut';
        card.appendChild(defaultBadge);
      } else {
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-delete-mascot';
        delBtn.innerHTML = '&times;';
        delBtn.title = 'Supprimer cette mascotte';
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm(`Supprimer définitivement la mascotte "${mascot.name}" ?`)) {
            await this.deleteCustomMascot(mascot.id);
          }
        });
        card.appendChild(delBtn);
      }

      card.addEventListener('click', () => {
        this.setActiveMascot(mascot.id);
        this.openTuneModal(mascot);
      });

      this.fullGridContainer.appendChild(card);
    });
  }

  renderEmotionPills() {
    if (!this.emotionsContainer) return;
    this.emotionsContainer.innerHTML = '';

    if (!this.activeMascot) return;

    const availableEmotions = this.getAllEmotionsForMascot(this.activeMascot);

    availableEmotions.forEach(emoKey => {
      const poses = this.getPosesForEmotion(this.activeMascot, emoKey);
      if (poses.length === 0) return;

      const baseInfo = BASE_EMOTIONS.find(b => b.id === emoKey) || {
        id: emoKey,
        label: emoKey.charAt(0).toUpperCase() + emoKey.slice(1),
        icon: '🎭'
      };

      const pill = document.createElement('button');
      const isActive = this.activeEmotion === emoKey;
      pill.className = `pose-pill ${isActive ? 'active' : ''}`;
      
      const variantText = poses.length > 1 
        ? `<span class="pose-count-badge">${isActive ? `${this.activeVariantIndex + 1}/${poses.length}` : `${poses.length} poses`}</span>` 
        : '';

      pill.innerHTML = `<span>${baseInfo.icon}</span> <span>${baseInfo.label}</span> ${variantText}`;
      pill.title = `${baseInfo.label} (${poses.length} variante${poses.length > 1 ? 's' : ''}) - Cliquez pour tester et alterner`;

      pill.addEventListener('click', () => {
        this.setActiveEmotion(emoKey);
      });

      this.emotionsContainer.appendChild(pill);
    });
  }

  setupTuneModalEvents() {
    if (this.modalTuneClose) {
      this.modalTuneClose.addEventListener('click', () => this.closeTuneModal());
    }
    if (this.btnTuneCancel) {
      this.btnTuneCancel.addEventListener('click', () => this.closeTuneModal());
    }
    if (this.modalTune) {
      this.modalTune.addEventListener('click', (e) => {
        if (e.target === this.modalTune) this.closeTuneModal();
      });
    }

    const sliders = [
      { input: this.tuneScale, badge: this.valTuneScale, unit: '%', key: 'scale' },
      { input: this.tuneOffsetX, badge: this.valTuneOffsetX, unit: ' px', key: 'offsetX' },
      { input: this.tuneOffsetY, badge: this.valTuneOffsetY, unit: ' px', key: 'offsetY' },
      { input: this.tuneBrightness, badge: this.valTuneBrightness, unit: '%', key: 'brightness' },
      { input: this.tuneContrast, badge: this.valTuneContrast, unit: '%', key: 'contrast' },
      { input: this.tuneHue, badge: this.valTuneHue, unit: '°', key: 'hue' },
      { input: this.tuneSaturation, badge: this.valTuneSaturation, unit: '%', key: 'saturation' }
    ];

    const applyLiveTune = () => {
      if (!this.activeMascot) return;

      const scale = parseFloat(this.tuneScale ? this.tuneScale.value : 100);
      const offsetX = parseFloat(this.tuneOffsetX ? this.tuneOffsetX.value : 0);
      const offsetY = parseFloat(this.tuneOffsetY ? this.tuneOffsetY.value : 0);
      const brightness = parseFloat(this.tuneBrightness ? this.tuneBrightness.value : 100);
      const contrast = parseFloat(this.tuneContrast ? this.tuneContrast.value : 100);
      const hue = parseFloat(this.tuneHue ? this.tuneHue.value : 0);
      const saturation = parseFloat(this.tuneSaturation ? this.tuneSaturation.value : 100);

      this.activeMascot.transform = {
        scale,
        offsetX,
        offsetY,
        brightness,
        contrast,
        hue,
        saturation
      };

      // Mettre à jour l'aperçu dans la modale
      if (this.tunePreviewImg) {
        this.tunePreviewImg.style.transform = `scale(${scale / 100}) translate(${offsetX / 2}px, ${offsetY / 2}px)`;
        this.tunePreviewImg.style.filter = `brightness(${brightness}%) contrast(${contrast}%) hue-rotate(${hue}deg) saturate(${saturation}%)`;
      }

      // Mettre à jour en direct le canevas principal
      if (this.onMascotChange) {
        this.onMascotChange(this.activeMascot, this.activeEmotion, this.activeVariantIndex);
      }
    };

    sliders.forEach(s => {
      if (s.input) {
        s.input.addEventListener('input', () => {
          if (s.badge) s.badge.textContent = `${s.input.value}${s.unit}`;
          applyLiveTune();
        });
      }
    });

    // Bouton Réinitialiser
    if (this.btnTuneReset) {
      this.btnTuneReset.addEventListener('click', () => {
        if (this.tuneScale) this.tuneScale.value = 100;
        if (this.tuneOffsetX) this.tuneOffsetX.value = 0;
        if (this.tuneOffsetY) this.tuneOffsetY.value = 0;
        if (this.tuneBrightness) this.tuneBrightness.value = 100;
        if (this.tuneContrast) this.tuneContrast.value = 100;
        if (this.tuneHue) this.tuneHue.value = 0;
        if (this.tuneSaturation) this.tuneSaturation.value = 100;

        if (this.valTuneScale) this.valTuneScale.textContent = '100%';
        if (this.valTuneOffsetX) this.valTuneOffsetX.textContent = '0 px';
        if (this.valTuneOffsetY) this.valTuneOffsetY.textContent = '0 px';
        if (this.valTuneBrightness) this.valTuneBrightness.textContent = '100%';
        if (this.valTuneContrast) this.valTuneContrast.textContent = '100%';
        if (this.valTuneHue) this.valTuneHue.textContent = '0°';
        if (this.valTuneSaturation) this.valTuneSaturation.textContent = '100%';

        applyLiveTune();
      });
    }

    // Bouton Enregistrer
    if (this.btnTuneSave) {
      this.btnTuneSave.addEventListener('click', async () => {
        if (!this.activeMascot) return;
        try {
          await dbManager.saveMascot(this.activeMascot);
          this.closeTuneModal();
          alert(`Réglages de position et de teinte enregistrés pour "${this.activeMascot.name}" !`);
        } catch (err) {
          console.error('[MascotManager] Erreur sauvegarde réglages:', err);
          alert('Erreur lors de l\'enregistrement des réglages.');
        }
      });
    }
  }

  openTuneModal(mascot) {
    if (!this.modalTune || !mascot) return;
    this.setActiveMascot(mascot.id);

    if (this.tuneMascotName) {
      this.tuneMascotName.textContent = mascot.name;
    }

    const t = mascot.transform || {};
    const scale = t.scale !== undefined ? t.scale : 100;
    const offsetX = t.offsetX !== undefined ? t.offsetX : 0;
    const offsetY = t.offsetY !== undefined ? t.offsetY : 0;
    const brightness = t.brightness !== undefined ? t.brightness : 100;
    const contrast = t.contrast !== undefined ? t.contrast : 100;
    const hue = t.hue !== undefined ? t.hue : 0;
    const saturation = t.saturation !== undefined ? t.saturation : 100;

    if (this.tuneScale) this.tuneScale.value = scale;
    if (this.tuneOffsetX) this.tuneOffsetX.value = offsetX;
    if (this.tuneOffsetY) this.tuneOffsetY.value = offsetY;
    if (this.tuneBrightness) this.tuneBrightness.value = brightness;
    if (this.tuneContrast) this.tuneContrast.value = contrast;
    if (this.tuneHue) this.tuneHue.value = hue;
    if (this.tuneSaturation) this.tuneSaturation.value = saturation;

    if (this.valTuneScale) this.valTuneScale.textContent = `${scale}%`;
    if (this.valTuneOffsetX) this.valTuneOffsetX.textContent = `${offsetX} px`;
    if (this.valTuneOffsetY) this.valTuneOffsetY.textContent = `${offsetY} px`;
    if (this.valTuneBrightness) this.valTuneBrightness.textContent = `${brightness}%`;
    if (this.valTuneContrast) this.valTuneContrast.textContent = `${contrast}%`;
    if (this.valTuneHue) this.valTuneHue.textContent = `${hue}°`;
    if (this.valTuneSaturation) this.valTuneSaturation.textContent = `${saturation}%`;

    // Image de prévisualisation
    const neutralPoses = this.getPosesForEmotion(mascot, 'neutre');
    const firstPose = neutralPoses[0] || (Object.values(mascot.emotions || {})[0] || [])[0] || '';
    if (this.tunePreviewImg) {
      this.tunePreviewImg.src = firstPose;
      this.tunePreviewImg.style.transform = `scale(${scale / 100}) translate(${offsetX / 2}px, ${offsetY / 2}px)`;
      this.tunePreviewImg.style.filter = `brightness(${brightness}%) contrast(${contrast}%) hue-rotate(${hue}deg) saturate(${saturation}%)`;
    }

    this.renderPosesList();
    this.modalTune.classList.add('open');
  }

  /**
   * Construit la liste éditable de toutes les poses de la mascotte active :
   * réassignation d'émotion, remplacement par une nouvelle image ou par une
   * autre pose déjà importée (référence), et suppression.
   */
  renderPosesList() {
    if (!this.tunePosesList || !this.activeMascot) return;
    const mascot = this.activeMascot;
    this.tunePosesList.innerHTML = '';

    const allEmotions = this.getAllAvailableEmotions();
    const allEmotionIds = new Set(allEmotions.map(e => e.id));

    // Liste à plat de toutes les poses existantes, pour le sélecteur "référence".
    const flatPoses = [];
    Object.entries(mascot.emotions || {}).forEach(([emoId, urls]) => {
      (urls || []).forEach((url, i) => {
        const emoMeta = allEmotions.find(e => e.id === emoId);
        flatPoses.push({ emoId, index: i, url, label: `${emoMeta ? emoMeta.label : emoId} #${i + 1}` });
      });
    });

    if (flatPoses.length === 0) {
      this.tunePosesList.innerHTML = '<p style="font-size:0.78rem; color: var(--text-muted); padding: 8px 0;">Aucune pose pour cette mascotte. Ajoutez-en une ci-dessous.</p>';
      return;
    }

    flatPoses.forEach(pose => {
      const row = document.createElement('div');
      row.className = 'tune-pose-row';

      const thumb = document.createElement('img');
      thumb.className = 'tune-pose-thumb';
      thumb.src = pose.url;
      thumb.alt = pose.label;

      const selectsWrap = document.createElement('div');
      selectsWrap.className = 'tune-pose-selects';

      // Sélecteur 1 : émotion associée à cette pose (corrigeable pour CHAQUE pose,
      // pas seulement au moment de l'import).
      const emoSelect = document.createElement('select');
      emoSelect.title = 'Émotion associée à cette pose';
      allEmotions.forEach(emo => {
        const opt = document.createElement('option');
        opt.value = emo.id;
        opt.textContent = `${emo.icon} ${emo.label}`;
        if (emo.id === pose.emoId) opt.selected = true;
        emoSelect.appendChild(opt);
      });
      emoSelect.addEventListener('change', () => {
        this.reassignPoseEmotion(pose.emoId, pose.index, emoSelect.value);
      });

      // Sélecteur 2 : remplacer par un nouveau fichier, ou réutiliser une autre
      // pose déjà importée comme référence pour cette même image.
      const refSelect = document.createElement('select');
      refSelect.title = 'Remplacer cette pose';
      const keepOpt = document.createElement('option');
      keepOpt.value = '';
      keepOpt.textContent = '— Garder cette image —';
      refSelect.appendChild(keepOpt);

      const uploadOpt = document.createElement('option');
      uploadOpt.value = '__upload__';
      uploadOpt.textContent = '📤 Importer une nouvelle image...';
      refSelect.appendChild(uploadOpt);

      flatPoses
        .filter(p => !(p.emoId === pose.emoId && p.index === pose.index))
        .forEach(p => {
          const opt = document.createElement('option');
          opt.value = `${p.emoId}::${p.index}`;
          opt.textContent = `🔁 Utiliser : ${p.label}`;
          refSelect.appendChild(opt);
        });

      refSelect.addEventListener('change', () => {
        const value = refSelect.value;
        if (value === '__upload__') {
          this.pendingReplaceTarget = { emoId: pose.emoId, index: pose.index };
          this.inputTuneAddPose.dataset.mode = 'replace';
          this.inputTuneAddPose.click();
        } else if (value) {
          const [srcEmo, srcIdx] = value.split('::');
          this.replacePoseImage(pose.emoId, pose.index, mascot.emotions[srcEmo][parseInt(srcIdx, 10)]);
        }
        refSelect.value = '';
      });

      selectsWrap.appendChild(emoSelect);
      selectsWrap.appendChild(refSelect);

      const btnRemove = document.createElement('button');
      btnRemove.type = 'button';
      btnRemove.className = 'tune-pose-remove';
      btnRemove.innerHTML = '&times;';
      btnRemove.title = 'Supprimer cette pose';
      btnRemove.addEventListener('click', () => this.removePose(pose.emoId, pose.index));

      row.appendChild(thumb);
      row.appendChild(selectsWrap);
      row.appendChild(btnRemove);

      this.tunePosesList.appendChild(row);
    });
  }

  reassignPoseEmotion(fromEmoId, index, toEmoId) {
    if (!this.activeMascot || fromEmoId === toEmoId) { this.renderPosesList(); return; }
    const mascot = this.activeMascot;
    const url = mascot.emotions[fromEmoId][index];
    mascot.emotions[fromEmoId].splice(index, 1);
    if (mascot.emotions[fromEmoId].length === 0) delete mascot.emotions[fromEmoId];
    if (!mascot.emotions[toEmoId]) mascot.emotions[toEmoId] = [];
    mascot.emotions[toEmoId].push(url);
    this.renderPosesList();
    this.renderFullGrid();
    this.renderEmotionPills();
  }

  replacePoseImage(emoId, index, newUrl) {
    if (!this.activeMascot) return;
    this.activeMascot.emotions[emoId][index] = newUrl;
    this.renderPosesList();
    if (this.onMascotChange) {
      this.onMascotChange(this.activeMascot, this.activeEmotion, this.activeVariantIndex);
    }
  }

  removePose(emoId, index) {
    if (!this.activeMascot) return;
    const total = Object.values(this.activeMascot.emotions).reduce((sum, arr) => sum + arr.length, 0);
    if (total <= 1) {
      alert('Impossible de supprimer la dernière pose de la mascotte.');
      return;
    }
    if (!confirm('Supprimer définitivement cette pose ?')) return;
    this.activeMascot.emotions[emoId].splice(index, 1);
    if (this.activeMascot.emotions[emoId].length === 0) delete this.activeMascot.emotions[emoId];
    this.renderPosesList();
    this.renderFullGrid();
    this.renderEmotionPills();
  }

  setupPosesListEvents() {
    if (this.btnTuneAddPose && this.inputTuneAddPose) {
      this.btnTuneAddPose.addEventListener('click', () => {
        this.pendingReplaceTarget = null;
        this.inputTuneAddPose.dataset.mode = 'add';
        this.inputTuneAddPose.click();
      });

      this.inputTuneAddPose.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file || !file.type.startsWith('image/') || !this.activeMascot) return;

        const dataUrl = await this.readFileAsDataURL(file);
        const mode = this.inputTuneAddPose.dataset.mode;

        if (mode === 'replace' && this.pendingReplaceTarget) {
          this.replacePoseImage(this.pendingReplaceTarget.emoId, this.pendingReplaceTarget.index, dataUrl);
          this.pendingReplaceTarget = null;
        } else {
          const defaultEmo = this.getAllEmotionsForMascot(this.activeMascot)[0] || 'neutre';
          if (!this.activeMascot.emotions[defaultEmo]) this.activeMascot.emotions[defaultEmo] = [];
          this.activeMascot.emotions[defaultEmo].push(dataUrl);
          this.renderPosesList();
          this.renderFullGrid();
          this.renderEmotionPills();
        }
      });
    }
  }

  closeTuneModal() {
    if (this.modalTune) {
      this.modalTune.classList.remove('open');
    }
  }

  setupModalEvents() {
    if (this.btnNewMascot) {
      this.btnNewMascot.addEventListener('click', () => this.openModal());
    }

    if (this.modalClose) {
      this.modalClose.addEventListener('click', () => this.closeModal());
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    // Événements d'importation en vrac (Bulk Upload)
    if (this.bulkDropzone && this.inputBulkFiles) {
      this.bulkDropzone.addEventListener('click', () => this.inputBulkFiles.click());

      this.inputBulkFiles.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files.length > 0) {
          await this.handleBulkFiles(Array.from(e.target.files));
        }
      });

      this.bulkDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.bulkDropzone.classList.add('dragover');
      });

      this.bulkDropzone.addEventListener('dragleave', () => {
        this.bulkDropzone.classList.remove('dragover');
      });

      this.bulkDropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        this.bulkDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          await this.handleBulkFiles(Array.from(e.dataTransfer.files));
        }
      });
    }

    // Ajout d'une émotion personnalisée
    if (this.btnAddCustomEmotion && this.inputCustomEmotionName) {
      this.btnAddCustomEmotion.addEventListener('click', () => {
        const customName = this.inputCustomEmotionName.value.trim();
        if (!customName) return;

        const customId = customName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (this.getAllAvailableEmotions().some(e => e.id === customId)) {
          alert('Cette émotion existe déjà.');
          return;
        }

        const newEmotionMeta = {
          id: customId,
          label: customName,
          icon: '✨',
          hint: 'Émotion personnalisée'
        };

        this.customEmotionsList.push(newEmotionMeta);
        this.inputCustomEmotionName.value = '';

        // Rafraîchir les sélecteurs dans la grille de revue
        this.renderBulkReviewGrid();
      });
    }

    // Soumission du formulaire
    if (this.formNewMascot) {
      this.formNewMascot.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleCreateMascotSubmit();
      });
    }
  }

  openModal() {
    if (!this.modal) return;

    this.bulkUploadedFiles = [];
    this.customEmotionsList = [];
    if (this.inputMascotName) this.inputMascotName.value = '';
    if (this.bulkReviewContainer) this.bulkReviewContainer.style.display = 'none';
    if (this.bulkReviewGrid) this.bulkReviewGrid.innerHTML = '';

    this.modal.classList.add('open');
  }

  closeModal() {
    if (this.modal) this.modal.classList.remove('open');
  }

  /**
   * Traite toutes les images importées en vrac :
   * - Lit chaque image en DataURL
   * - Détecte automatiquement l'émotion par le nom
   * - Affiche la grille de revue pour correction
   */
  async handleBulkFiles(files) {
    const validImages = files.filter(f => 
      (f.type && f.type.startsWith('image/')) || 
      /\.(png|jpe?g|webp|svg|gif|bmp|avif)$/i.test(f.name)
    );
    if (validImages.length === 0) {
      alert('Veuillez sélectionner des fichiers image valides (PNG, SVG, WebP, JPG).');
      return;
    }

    for (let i = 0; i < validImages.length; i++) {
      const file = validImages[i];
      const dataUrl = await this.readFileAsDataURL(file);
      const detectedEmotion = this.detectEmotionFromFileName(file.name, this.bulkUploadedFiles.length + i);

      this.bulkUploadedFiles.push({
        id: `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        dataUrl: dataUrl,
        assignedEmotion: detectedEmotion
      });
    }

    this.renderBulkReviewGrid();
  }

  readFileAsDataURL(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        let result = e.target.result;
        // Si Windows n'a pas détecté le type MIME pour un fichier PNG
        if (result.startsWith('data:;') || result.startsWith('data:application/octet-stream;')) {
          if (file.name.toLowerCase().endsWith('.png')) {
            result = result.replace(/^data:[^;]*;/, 'data:image/png;');
          } else if (file.name.toLowerCase().endsWith('.svg')) {
            result = result.replace(/^data:[^;]*;/, 'data:image/svg+xml;');
          } else if (file.name.toLowerCase().endsWith('.webp')) {
            result = result.replace(/^data:[^;]*;/, 'data:image/webp;');
          }
        }
        resolve(result);
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Rendu de la grille de revue & correction
   */
  renderBulkReviewGrid() {
    if (!this.bulkReviewContainer || !this.bulkReviewGrid) return;

    if (this.bulkUploadedFiles.length === 0) {
      this.bulkReviewContainer.style.display = 'none';
      return;
    }

    this.bulkReviewContainer.style.display = 'flex';
    if (this.bulkCountBadge) {
      this.bulkCountBadge.textContent = `${this.bulkUploadedFiles.length} image${this.bulkUploadedFiles.length > 1 ? 's' : ''} analysée${this.bulkUploadedFiles.length > 1 ? 's' : ''}`;
    }

    this.bulkReviewGrid.innerHTML = '';
    const allEmotions = this.getAllAvailableEmotions();

    this.bulkUploadedFiles.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'bulk-review-card';

      // Miniature
      const thumb = document.createElement('div');
      thumb.className = 'bulk-review-thumb';
      thumb.innerHTML = `<img src="${item.dataUrl}" alt="${item.name}" />`;

      // Infos & Sélecteur d'émotion
      const infoBox = document.createElement('div');
      infoBox.className = 'bulk-review-info';

      const nameEl = document.createElement('div');
      nameEl.className = 'bulk-review-name';
      nameEl.textContent = item.name;
      nameEl.title = item.name;

      const selectEl = document.createElement('select');
      selectEl.className = 'bulk-select-emotion';

      allEmotions.forEach(emo => {
        const opt = document.createElement('option');
        opt.value = emo.id;
        opt.textContent = `${emo.icon} ${emo.label}`;
        if (emo.id === item.assignedEmotion) {
          opt.selected = true;
        }
        selectEl.appendChild(opt);
      });

      // Correction manuelle immédiate par l'utilisateur
      selectEl.addEventListener('change', (e) => {
        item.assignedEmotion = e.target.value;
      });

      infoBox.appendChild(nameEl);
      infoBox.appendChild(selectEl);

      // Bouton suppression de l'image
      const btnRemove = document.createElement('button');
      btnRemove.type = 'button';
      btnRemove.className = 'bulk-btn-remove';
      btnRemove.innerHTML = '&times;';
      btnRemove.title = 'Retirer cette image';
      btnRemove.addEventListener('click', () => {
        this.bulkUploadedFiles.splice(idx, 1);
        this.renderBulkReviewGrid();
      });

      card.appendChild(thumb);
      card.appendChild(infoBox);
      card.appendChild(btnRemove);

      this.bulkReviewGrid.appendChild(card);
    });
  }

  async handleCreateMascotSubmit() {
    const name = this.inputMascotName.value.trim();
    if (!name) {
      alert('Veuillez entrer un nom pour votre mascotte.');
      return;
    }

    if (this.bulkUploadedFiles.length === 0) {
      alert('Veuillez importer au moins une image pour votre mascotte.');
      return;
    }

    // Regrouper les images par émotion
    const finalEmotions = {};

    this.bulkUploadedFiles.forEach(item => {
      const emo = item.assignedEmotion;
      if (!finalEmotions[emo]) {
        finalEmotions[emo] = [];
      }
      finalEmotions[emo].push(item.dataUrl);
    });

    // Si l'émotion neutre n'a pas été assignée, lui attribuer la première image disponible
    if (!finalEmotions.neutre || finalEmotions.neutre.length === 0) {
      const firstAvailable = this.bulkUploadedFiles[0].dataUrl;
      finalEmotions.neutre = [firstAvailable];
    }

    const newMascot = {
      id: `custom-${Date.now()}`,
      name: name,
      tagline: 'Mascotte personnalisée',
      isDefault: false,
      emotions: finalEmotions
    };

    try {
      await dbManager.saveMascot(newMascot);
      this.mascots.push(newMascot);
      this.setActiveMascot(newMascot.id);
      this.closeModal();
      alert(`Mascotte "${name}" créée avec succès avec ${this.bulkUploadedFiles.length} poses réparties sur ${Object.keys(finalEmotions).length} émotions !`);
    } catch (err) {
      console.error('[MascotManager] Erreur d\'enregistrement:', err);
      alert('Erreur lors de l\'enregistrement de la mascotte.');
    }
  }

  async deleteCustomMascot(id) {
    try {
      await dbManager.deleteMascot(id);
      this.mascots = this.mascots.filter(m => m.id !== id);
      if (this.activeMascot && this.activeMascot.id === id) {
        if (this.mascots.length > 0) {
          this.setActiveMascot(this.mascots[0].id);
        } else {
          this.activeMascot = null;
          localStorage.removeItem('last_active_mascot_id');
          this.renderPicker();
          this.renderFullGrid();
          this.renderEmotionPills();
          if (this.onMascotChange) {
            this.onMascotChange(null, 'neutre', 0);
          }
        }
      } else {
        this.renderPicker();
        this.renderFullGrid();
      }
    } catch (err) {
      console.error('[MascotManager] Erreur de suppression:', err);
    }
  }
}
