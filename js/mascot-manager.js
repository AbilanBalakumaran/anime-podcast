/**
 * MASCOT MANAGER - ANIME PODCAST STUDIO
 * Gère la sélection des mascottes, la prévisualisation des 5 poses,
 * l'ajout de mascottes personnalisées avec upload d'images et stockage IndexedDB.
 */

import { DEFAULT_MASCOTS } from './default-mascots.js';
import { dbManager } from './db.js';

export class MascotManager {
  constructor(onMascotChangeCallback, onPoseChangeCallback) {
    this.mascots = [...DEFAULT_MASCOTS];
    this.activeMascot = this.mascots[0];
    this.activePose = 'neutre';
    this.onMascotChange = onMascotChangeCallback;
    this.onPoseChange = onPoseChangeCallback;

    // Éléments du DOM
    this.pickerContainer = document.getElementById('mascot-picker');
    this.posesContainer = document.getElementById('poses-preview-bar');
    this.btnNewMascot = document.getElementById('btn-new-mascot');
    this.modal = document.getElementById('modal-new-mascot');
    this.modalClose = document.getElementById('modal-close-btn');
    this.formNewMascot = document.getElementById('form-new-mascot');
    this.inputMascotName = document.getElementById('input-mascot-name');

    // Stockage temporaire des 5 poses pour la création
    this.tempUploadedPoses = {
      neutre: null,
      enthousiaste: null,
      explicative: null,
      pensive: null,
      surprise: null
    };

    this.init();
  }

  async init() {
    await this.loadMascotsFromDB();
    this.renderPicker();
    this.renderPosePills();
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

  getActivePose() {
    return this.activePose;
  }

  setActiveMascot(id) {
    const found = this.mascots.find(m => m.id === id);
    if (found) {
      this.activeMascot = found;
      this.renderPicker();
      this.renderPosePills();
      if (this.onMascotChange) {
        this.onMascotChange(this.activeMascot, this.activePose);
      }
    }
  }

  setActivePose(poseName) {
    if (['neutre', 'enthousiaste', 'explicative', 'pensive', 'surprise'].includes(poseName)) {
      this.activePose = poseName;
      this.renderPosePills();
      if (this.onPoseChange) {
        this.onPoseChange(this.activePose);
      }
    }
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

      // Vérifier si le contenu de la pose neutre est un SVG brut ou une URL d'image
      const neutralPose = mascot.poses.neutre || '';
      if (neutralPose.trim().startsWith('<svg')) {
        thumbnailBox.innerHTML = neutralPose;
      } else {
        const img = document.createElement('img');
        img.src = neutralPose;
        img.alt = mascot.name;
        thumbnailBox.appendChild(img);
      }

      const nameEl = document.createElement('div');
      nameEl.className = 'mascot-name';
      nameEl.textContent = mascot.name;

      card.appendChild(thumbnailBox);
      card.appendChild(nameEl);

      if (mascot.id === this.activeMascot.id) {
        const badge = document.createElement('div');
        badge.className = 'mascot-badge';
        card.appendChild(badge);
      }

      // Bouton de suppression pour les mascottes personnalisées
      if (!mascot.isDefault) {
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-delete-mascot';
        delBtn.innerHTML = '&times;';
        delBtn.title = 'Supprimer cette mascotte';
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm(`Supprimer la mascotte "${mascot.name}" ?`)) {
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

  renderPosePills() {
    if (!this.posesContainer) return;
    this.posesContainer.innerHTML = '';

    const poses = [
      { id: 'neutre', label: 'Neutre', icon: '🙂' },
      { id: 'enthousiaste', label: 'Enthousiaste', icon: '✨' },
      { id: 'explicative', label: 'Explicative', icon: '💡' },
      { id: 'pensive', label: 'Pensive', icon: '🤔' },
      { id: 'surprise', label: 'Surprise', icon: '⚡' }
    ];

    poses.forEach(p => {
      const pill = document.createElement('button');
      pill.className = `pose-pill ${this.activePose === p.id ? 'active' : ''}`;
      pill.innerHTML = `<span>${p.icon}</span> <span>${p.label}</span>`;
      pill.dataset.pose = p.id;

      pill.addEventListener('click', () => {
        this.setActivePose(p.id);
      });

      this.posesContainer.appendChild(pill);
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

    // Gestion des 5 slots d'upload
    const poses = ['neutre', 'enthousiaste', 'explicative', 'pensive', 'surprise'];
    poses.forEach(poseKey => {
      const slot = document.getElementById(`slot-pose-${poseKey}`);
      const fileInput = document.getElementById(`input-pose-${poseKey}`);

      if (slot && fileInput) {
        slot.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) this.handleImageUpload(file, poseKey, slot);
        });

        // Drag & Drop sur le slot
        slot.addEventListener('dragover', (e) => {
          e.preventDefault();
          slot.classList.add('dragover');
        });
        slot.addEventListener('dragleave', () => slot.classList.remove('dragover'));
        slot.addEventListener('drop', (e) => {
          e.preventDefault();
          slot.classList.remove('dragover');
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            this.handleImageUpload(e.dataTransfer.files[0], poseKey, slot);
          }
        });
      }
    });

    // Soumission du formulaire
    if (this.formNewMascot) {
      this.formNewMascot.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleCreateMascotSubmit();
      });
    }
  }

  handleImageUpload(file, poseKey, slotElement) {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (PNG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      this.tempUploadedPoses[poseKey] = result;

      // Mise à jour de l'affichage du slot
      slotElement.classList.add('has-image');
      const previewBox = slotElement.querySelector('.pose-preview-box');
      if (previewBox) {
        previewBox.innerHTML = `<img src="${result}" alt="${poseKey}" style="width:100%;height:100%;object-fit:contain;" />`;
      }
    };
    reader.readAsDataURL(file);
  }

  async handleCreateMascotSubmit() {
    const name = this.inputMascotName.value.trim();
    if (!name) {
      alert('Veuillez entrer un nom pour la mascotte.');
      return;
    }

    if (!this.tempUploadedPoses.neutre) {
      alert('La pose "neutre" est obligatoire pour créer une mascotte.');
      return;
    }

    // Remplir les poses non fournies avec la pose neutre comme fallback
    const poses = {
      neutre: this.tempUploadedPoses.neutre,
      enthousiaste: this.tempUploadedPoses.enthousiaste || this.tempUploadedPoses.neutre,
      explicative: this.tempUploadedPoses.explicative || this.tempUploadedPoses.neutre,
      pensive: this.tempUploadedPoses.pensive || this.tempUploadedPoses.neutre,
      surprise: this.tempUploadedPoses.surprise || this.tempUploadedPoses.neutre
    };

    const newMascot = {
      id: `custom-${Date.now()}`,
      name: name,
      tagline: 'Mascotte personnalisée',
      isDefault: false,
      poses: poses
    };

    try {
      await dbManager.saveMascot(newMascot);
      this.mascots.push(newMascot);
      this.setActiveMascot(newMascot.id);
      this.closeModal();
    } catch (err) {
      console.error('[MascotManager] Erreur lors de l\'enregistrement:', err);
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

  openModal() {
    if (!this.modal) return;
    this.tempUploadedPoses = {
      neutre: null,
      enthousiaste: null,
      explicative: null,
      pensive: null,
      surprise: null
    };
    if (this.inputMascotName) this.inputMascotName.value = '';

    // Réinitialiser les slots
    ['neutre', 'enthousiaste', 'explicative', 'pensive', 'surprise'].forEach(poseKey => {
      const slot = document.getElementById(`slot-pose-${poseKey}`);
      if (slot) {
        slot.classList.remove('has-image');
        const preview = slot.querySelector('.pose-preview-box');
        if (preview) preview.innerHTML = '<span style="font-size:1.4rem;color:#94a3b8;">+</span>';
      }
    });

    this.modal.classList.add('open');
  }

  closeModal() {
    if (this.modal) this.modal.classList.remove('open');
  }
}
