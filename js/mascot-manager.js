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

    // Liste des fichiers importés en vrac pour revue
    // Array<{ id, name, dataUrl, assignedEmotion }>
    this.bulkUploadedFiles = [];
    this.customEmotionsList = [];

    this.init();
  }

  async init() {
    await this.loadMascotsFromDB();
    this.renderPicker();
    this.renderEmotionPills();
    this.setupModalEvents();
  }

  async loadMascotsFromDB() {
    try {
      const customMascots = await dbManager.getAllMascots();
      this.mascots = [...DEFAULT_MASCOTS, ...customMascots];
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
      this.renderPicker();
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

    this.mascots.forEach(mascot => {
      const card = document.createElement('div');
      card.className = `mascot-card ${mascot.id === this.activeMascot.id ? 'selected' : ''}`;
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

      if (mascot.id === this.activeMascot.id) {
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

  renderEmotionPills() {
    if (!this.emotionsContainer) return;
    this.emotionsContainer.innerHTML = '';

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
      if (this.activeMascot.id === id) {
        this.setActiveMascot(this.mascots[0].id);
      } else {
        this.renderPicker();
      }
    } catch (err) {
      console.error('[MascotManager] Erreur de suppression:', err);
    }
  }
}
