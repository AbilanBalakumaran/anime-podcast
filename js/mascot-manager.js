/**
 * MASCOT MANAGER - ANIME PODCAST STUDIO
 * Gère les mascottes multi-émotions et multi-poses :
 * - Catalogue étendu d'émotions
 * - Ajout d'émotions personnalisées illimitées
 * - Upload multi-poses par émotion (galerie de variantes avec drag & drop)
 * - Persistance IndexedDB et synchronisation avec le canevas
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

    // Éléments du DOM
    this.pickerContainer = document.getElementById('mascot-picker');
    this.emotionsContainer = document.getElementById('poses-preview-bar');
    this.btnNewMascot = document.getElementById('btn-new-mascot');
    this.modal = document.getElementById('modal-new-mascot');
    this.modalClose = document.getElementById('modal-close-btn');
    this.formNewMascot = document.getElementById('form-new-mascot');
    this.inputMascotName = document.getElementById('input-mascot-name');

    // Conteneur de configuration des émotions dans la modale
    this.emotionsConfigContainer = document.getElementById('modal-emotions-container');
    this.btnAddCustomEmotion = document.getElementById('btn-add-custom-emotion');
    this.inputCustomEmotionName = document.getElementById('input-custom-emotion-name');

    // Structure de travail temporaire pour la création de mascotte
    // { [emotionId]: [dataUrl1, dataUrl2, ...] }
    this.tempMascotEmotions = {};
    this.customEmotionsList = []; // Array<{ id, label, icon, hint }>

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
        // Si on clique à nouveau sur la même émotion, cycler entre ses variantes !
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

  renderPicker() {
    if (!this.pickerContainer) return;
    this.pickerContainer.innerHTML = '';

    this.mascots.forEach(mascot => {
      const card = document.createElement('div');
      card.className = `mascot-card ${mascot.id === this.activeMascot.id ? 'selected' : ''}`;
      card.dataset.id = mascot.id;

      const thumbnailBox = document.createElement('div');
      thumbnailBox.className = 'mascot-thumbnail';

      // Première pose disponible pour la miniature
      const neutralPoses = this.getPosesForEmotion(mascot, 'neutre');
      const firstPose = neutralPoses[0] || (Object.values(mascot.emotions)[0] || [])[0] || '';

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

      // Badge du nombre d'émotions et poses
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

      // Bouton de suppression pour les mascottes créées
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

    // Ajout d'une émotion personnalisée
    if (this.btnAddCustomEmotion && this.inputCustomEmotionName) {
      this.btnAddCustomEmotion.addEventListener('click', () => {
        const customName = this.inputCustomEmotionName.value.trim();
        if (!customName) return;

        const customId = customName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (this.tempMascotEmotions[customId] !== undefined) {
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
        this.tempMascotEmotions[customId] = [];
        this.inputCustomEmotionName.value = '';

        this.renderModalEmotionSection(newEmotionMeta);
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

    this.tempMascotEmotions = {};
    this.customEmotionsList = [];
    if (this.inputMascotName) this.inputMascotName.value = '';

    // Initialiser les 12 émotions de base
    BASE_EMOTIONS.forEach(emo => {
      this.tempMascotEmotions[emo.id] = [];
    });

    this.renderModalEmotionsList();
    this.modal.classList.add('open');
  }

  closeModal() {
    if (this.modal) this.modal.classList.remove('open');
  }

  renderModalEmotionsList() {
    if (!this.emotionsConfigContainer) return;
    this.emotionsConfigContainer.innerHTML = '';

    const allEmotionsToRender = [...BASE_EMOTIONS, ...this.customEmotionsList];
    allEmotionsToRender.forEach(emo => {
      this.renderModalEmotionSection(emo);
    });
  }

  renderModalEmotionSection(emo) {
    if (!this.emotionsConfigContainer) return;

    let section = document.getElementById(`modal-emo-section-${emo.id}`);
    if (!section) {
      section = document.createElement('div');
      section.id = `modal-emo-section-${emo.id}`;
      section.className = 'emotion-config-card';
      this.emotionsConfigContainer.appendChild(section);
    }

    const currentPoses = this.tempMascotEmotions[emo.id] || [];
    const isRequired = emo.id === 'neutre';

    section.innerHTML = `
      <div class="emotion-config-header">
        <div class="emotion-config-title">
          <span class="emotion-icon">${emo.icon}</span>
          <strong>${emo.label}</strong>
          ${isRequired ? '<span class="badge-required">Obligatoire</span>' : ''}
          <span class="badge-count">${currentPoses.length} pose${currentPoses.length > 1 ? 's' : ''}</span>
        </div>
        <div class="emotion-config-hint">${emo.hint || ''}</div>
      </div>

      <!-- Galerie des poses actuelles pour cette émotion -->
      <div class="emotion-poses-gallery" id="gallery-${emo.id}"></div>

      <!-- Dropzone d'upload multi-fichiers pour cette émotion -->
      <div class="emotion-dropzone" id="dropzone-${emo.id}">
        <input type="file" id="input-files-${emo.id}" accept="image/*" multiple style="display: none;">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>Ajouter une ou plusieurs poses pour cette émotion (Glisser-déposer ou cliquer)</span>
      </div>
    `;

    // Remplir la galerie de poses
    const galleryEl = section.querySelector(`#gallery-${emo.id}`);
    currentPoses.forEach((poseUrl, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'pose-thumb-item';
      thumb.innerHTML = `
        <img src="${poseUrl}" alt="${emo.label} pose ${idx + 1}" />
        <button type="button" class="btn-remove-pose" title="Supprimer cette variante">&times;</button>
        <span class="thumb-index">#${idx + 1}</span>
      `;

      thumb.querySelector('.btn-remove-pose').addEventListener('click', (e) => {
        e.stopPropagation();
        this.tempMascotEmotions[emo.id].splice(idx, 1);
        this.renderModalEmotionSection(emo);
      });

      galleryEl.appendChild(thumb);
    });

    // Configuration des événements d'upload multi-fichiers
    const dropzone = section.querySelector(`#dropzone-${emo.id}`);
    const fileInput = section.querySelector(`#input-files-${emo.id}`);

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleMultiFilesUpload(Array.from(e.target.files), emo);
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleMultiFilesUpload(Array.from(e.dataTransfer.files), emo);
        }
      });
    }
  }

  async handleMultiFilesUpload(files, emo) {
    const validImageFiles = files.filter(f => f.type.startsWith('image/'));
    if (validImageFiles.length === 0) {
      alert('Veuillez déposer des fichiers image valides (PNG, SVG, WebP).');
      return;
    }

    for (const file of validImageFiles) {
      const dataUrl = await this.readFileAsDataURL(file);
      if (!this.tempMascotEmotions[emo.id]) {
        this.tempMascotEmotions[emo.id] = [];
      }
      this.tempMascotEmotions[emo.id].push(dataUrl);
    }

    this.renderModalEmotionSection(emo);
  }

  readFileAsDataURL(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  async handleCreateMascotSubmit() {
    const name = this.inputMascotName.value.trim();
    if (!name) {
      alert('Veuillez entrer un nom pour la mascotte.');
      return;
    }

    const neutralPoses = this.tempMascotEmotions.neutre || [];
    if (neutralPoses.length === 0) {
      alert('Veuillez fournir au moins une pose pour l\'émotion "Neutre" (obligatoire).');
      return;
    }

    // Filtrer les émotions qui ont au moins une pose
    const finalEmotions = {};
    for (const [emoId, poses] of Object.entries(this.tempMascotEmotions)) {
      if (poses && poses.length > 0) {
        finalEmotions[emoId] = poses;
      }
    }

    // Si certaines émotions de base n'ont pas de pose, utiliser la pose neutre comme fallback
    BASE_EMOTIONS.forEach(emo => {
      if (!finalEmotions[emo.id]) {
        finalEmotions[emo.id] = [...neutralPoses];
      }
    });

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
