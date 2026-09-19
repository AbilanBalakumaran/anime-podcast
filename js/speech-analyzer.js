/**
 * SPEECH ANALYZER - ANIME PODCAST STUDIO
 * Moteur d'analyse temporelle (VAD) et d'alternance dynamique anti-ennui :
 * - Découpage automatique des phrases et des silences
 * - Alternance intelligente des émotions sans répétition consécutive
 * - Alternance intra-phrase pour les phrases longues (> 3.2s) afin de maintenir l'attention
 * - Sélection et personnalisation manuelle par segment
 */

import { BASE_EMOTIONS } from './default-mascots.js';

export class SpeechAnalyzer {
  constructor(audioManager, mascotManager, onSegmentSelectCallback) {
    this.audioManager = audioManager;
    this.mascotManager = mascotManager;
    this.onSegmentSelect = onSegmentSelectCallback;

    this.segments = []; // Array<{ id, start, end, duration, emotion, variantIndex, text }>
    this.waveformCanvas = document.getElementById('waveform-canvas');
    this.waveformCtx = this.waveformCanvas ? this.waveformCanvas.getContext('2d') : null;
    this.playheadEl = document.getElementById('timeline-playhead');
    this.segmentsListEl = document.getElementById('segments-scroll-list');
    this.segmentsCountEl = document.getElementById('segments-count');

    this.setupWaveformClick();
  }

  setupWaveformClick() {
    if (this.waveformCanvas) {
      this.waveformCanvas.addEventListener('click', (e) => {
        const rect = this.waveformCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const progress = Math.max(0, Math.min(1, clickX / rect.width));
        const duration = this.audioManager.getDuration();
        if (duration > 0) {
          this.audioManager.seek(progress * duration);
        }
      });
    }
  }

  /**
   * Analyse un AudioBuffer pour en extraire les phrases et assigner les émotions/poses
   */
  analyzeAudioBuffer(audioBuffer, optionalSentencesText = null) {
    if (!audioBuffer) return [];

    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const duration = audioBuffer.duration;

    // 1. Calcul d'énergie RMS par fenêtre temporelle de 40ms
    const windowSize = Math.floor(sampleRate * 0.04);
    const numWindows = Math.floor(channelData.length / windowSize);
    const rmsValues = new Float32Array(numWindows);

    let maxRms = 0;
    for (let w = 0; w < numWindows; w++) {
      let sumSquares = 0;
      const startIdx = w * windowSize;
      for (let i = 0; i < windowSize; i++) {
        const val = channelData[startIdx + i];
        sumSquares += val * val;
      }
      const rms = Math.sqrt(sumSquares / windowSize);
      rmsValues[w] = rms;
      if (rms > maxRms) maxRms = rms;
    }

    // Seuil de détection de voix adaptatif
    const threshold = Math.max(0.015, maxRms * 0.14);

    // 2. Détection d'activité vocale (VAD)
    const minSpeechDuration = 0.4; // 400ms minimum
    const minSilenceDuration = 0.28; // 280ms de silence pour fin de phrase

    const speechWindows = [];
    for (let w = 0; w < numWindows; w++) {
      speechWindows.push(rmsValues[w] >= threshold);
    }

    const rawSegments = [];
    let inSpeech = false;
    let segStart = 0;
    let silenceCount = 0;
    const silenceThresholdWindows = Math.floor(minSilenceDuration / 0.04);

    for (let w = 0; w < numWindows; w++) {
      const isVoice = speechWindows[w];
      const time = w * 0.04;

      if (isVoice) {
        if (!inSpeech) {
          inSpeech = true;
          segStart = time;
        }
        silenceCount = 0;
      } else {
        if (inSpeech) {
          silenceCount++;
          if (silenceCount >= silenceThresholdWindows || w === numWindows - 1) {
            const segEnd = (w - silenceCount) * 0.04;
            if ((segEnd - segStart) >= minSpeechDuration) {
              rawSegments.push({
                start: Math.max(0, segStart),
                end: Math.min(duration, segEnd),
                duration: segEnd - segStart
              });
            }
            inSpeech = false;
            silenceCount = 0;
          }
        }
      }
    }

    // Fallback si silence absolu ou volume trop faible
    if (rawSegments.length === 0 && duration > 0) {
      const step = Math.min(3.0, duration);
      for (let t = 0; t < duration; t += step) {
        rawSegments.push({
          start: t,
          end: Math.min(duration, t + step),
          duration: Math.min(step, duration - t)
        });
      }
    }

    // 3. Application du Moteur d'Alternance Anti-Ennui
    this.segments = this.applyAntiBoredomEngine(rawSegments, optionalSentencesText);

    // 4. Rendu de la forme d'onde et de la timeline
    this.drawWaveform(rmsValues, maxRms);
    this.renderSegmentsList();

    return this.segments;
  }

  /**
   * Moteur d'Alternance Anti-Ennui :
   * - Découpe les phrases trop longues (> 3.2s) en sous-segments dynamiques
   * - Alterne systématiquement les émotions et les variantes de poses
   * - Zéro répétition consécutive pour maintenir l'attention maximale du spectateur
   */
  applyAntiBoredomEngine(rawSegments, optionalSentencesText) {
    const mascot = this.mascotManager.getActiveMascot();
    const availableEmotions = this.mascotManager.getAllEmotionsForMascot(mascot);

    const refinedSegments = [];
    let segCounter = 0;

    rawSegments.forEach((seg, origIdx) => {
      const text = (optionalSentencesText && optionalSentencesText[origIdx]) 
        ? optionalSentencesText[origIdx].trim() 
        : `Phrase ${origIdx + 1}`;

      // Si la phrase dure plus de 3.2 secondes, découpage intra-phrase pour varier la pose au milieu !
      if (seg.duration > 3.2) {
        const midTime = seg.start + (seg.duration * 0.52);
        refinedSegments.push({
          id: `seg-${segCounter++}`,
          start: seg.start,
          end: midTime,
          duration: midTime - seg.start,
          text: text + ' (Partie 1)',
          origText: text
        });
        refinedSegments.push({
          id: `seg-${segCounter++}`,
          start: midTime,
          end: seg.end,
          duration: seg.end - midTime,
          text: text + ' (Partie 2)',
          origText: text
        });
      } else {
        refinedSegments.push({
          id: `seg-${segCounter++}`,
          start: seg.start,
          end: seg.end,
          duration: seg.duration,
          text: text,
          origText: text
        });
      }
    });

    // Attribution des émotions et variantes avec règle stricte de non-répétition
    let lastEmotion = null;
    let lastVariant = -1;

    return refinedSegments.map((seg, index) => {
      let chosenEmotion = 'neutre';
      const text = seg.origText;
      const lowerText = text.toLowerCase();

      const isGreeting = /bonjour|salut|bienvenue|hello|coucou|yo\b|bonsoir/i.test(lowerText);
      const isFarewell = /au revoir|à bientôt|a bientot|à la prochaine|a la prochaine|bye|ciao|see you|merci d'avoir|à plus|a plus/i.test(lowerText);

      // Heuristiques intelligentes basées sur le contexte
      if (isGreeting && availableEmotions.includes('bonjour')) {
        chosenEmotion = 'bonjour';
      } else if (isFarewell && availableEmotions.includes('au_revoir')) {
        chosenEmotion = 'au_revoir';
      } else if (text.includes('?')) {
        chosenEmotion = (lastEmotion === 'pensive') ? 'surprise' : 'pensive';
      } else if (text.includes('!')) {
        const excitePool = ['enthousiaste', 'joyeuse', 'determinee', 'enervee'].filter(e => availableEmotions.includes(e));
        chosenEmotion = excitePool.find(e => e !== lastEmotion) || 'enthousiaste';
      } else if (seg.duration > 2.2) {
        const explainPool = ['explicative', 'confiante', 'serieuse'].filter(e => availableEmotions.includes(e));
        chosenEmotion = explainPool.find(e => e !== lastEmotion) || 'explicative';
      } else if (index === 0) {
        chosenEmotion = availableEmotions.includes('bonjour') 
          ? 'bonjour' 
          : (availableEmotions.includes('enthousiaste') ? 'enthousiaste' : availableEmotions[0]);
      } else if (index === refinedSegments.length - 1 && availableEmotions.includes('au_revoir')) {
        chosenEmotion = 'au_revoir';
      } else {
        // Sélection dynamique parmi les émotions différentes de la précédente
        const candidatePool = availableEmotions.filter(e => e !== lastEmotion);
        chosenEmotion = candidatePool[Math.floor(Math.random() * candidatePool.length)] || availableEmotions[0];
      }

      // Si l'émotion choisie n'existe pas sur la mascotte, fallback
      if (!availableEmotions.includes(chosenEmotion)) {
        chosenEmotion = availableEmotions[0] || 'neutre';
      }

      // Choix de la variante de pose pour cette émotion
      const posesForEmo = this.mascotManager.getPosesForEmotion(mascot, chosenEmotion);
      let chosenVariant = 0;

      if (posesForEmo.length > 1) {
        // Si même émotion que la précédente ou pour varier, choisir une autre variante
        const availableVariants = posesForEmo.map((_, i) => i).filter(i => !(chosenEmotion === lastEmotion && i === lastVariant));
        chosenVariant = availableVariants[Math.floor(Math.random() * availableVariants.length)] || 0;
      }

      lastEmotion = chosenEmotion;
      lastVariant = chosenVariant;

      return {
        ...seg,
        emotion: chosenEmotion,
        variantIndex: chosenVariant,
        position: 'center', // 'left' | 'center' | 'right' | 'hidden'
        image: null,
        imageData: null,
        animationStyle: 'zoom-in' // 'zoom-in' | 'zoom-out' | 'pan' | 'static'
      };
    });
  }

  /**
   * Assigne une même illustration (data URL) à un lot de segments par id,
   * ex. pour la génération automatique d'illustrations par scène.
   * Retourne une Promise résolue une fois l'image chargée et appliquée.
   */
  assignImageToSegments(segmentIds, dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.segments
          .filter(s => segmentIds.includes(s.id))
          .forEach(s => {
            s.image = img;
            s.imageData = dataUrl;
          });
        resolve();
      };
      img.onerror = () => resolve();
      img.src = dataUrl;
    });
  }

  /**
   * Retourne le segment complet pour le timestamp en cours
   */
  getSegmentAtTime(currentTime) {
    if (!this.segments || this.segments.length === 0) return null;
    return this.segments.find(seg => currentTime >= seg.start && currentTime <= seg.end) || this.segments[0] || null;
  }

  /**
   * Retourne l'attitude active { emotion, variantIndex, position, image, animationStyle } pour le timestamp en cours
   */
  getPoseAtTime(currentTime) {
    const seg = this.getSegmentAtTime(currentTime);
    if (seg) {
      return {
        emotion: seg.emotion,
        variantIndex: seg.variantIndex,
        position: seg.position || 'center',
        image: seg.image || null,
        animationStyle: seg.animationStyle || 'zoom-in'
      };
    }

    // Pendant les silences : retour en posture neutre variante 0
    return { emotion: 'neutre', variantIndex: 0, position: 'center', image: null, animationStyle: 'zoom-in' };
  }

  /**
   * Change la position de la mascotte sur l'ensemble des scènes
   */
  setAllMascotPositions(position) {
    if (!this.segments || this.segments.length === 0) return;
    this.segments.forEach(seg => {
      seg.position = position;
    });
    this.renderSegmentsList();
  }

  drawWaveform(rmsValues, maxRms) {
    if (!this.waveformCanvas || !this.waveformCtx) return;

    const width = this.waveformCanvas.width = this.waveformCanvas.clientWidth * window.devicePixelRatio;
    const height = this.waveformCanvas.height = this.waveformCanvas.clientHeight * window.devicePixelRatio;
    const ctx = this.waveformCtx;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0b1329';
    ctx.fillRect(0, 0, width, height);

    const barWidth = 3 * window.devicePixelRatio;
    const gap = 1 * window.devicePixelRatio;
    const totalBars = Math.floor(width / (barWidth + gap));
    const step = rmsValues.length / totalBars;

    for (let i = 0; i < totalBars; i++) {
      const idx = Math.floor(i * step);
      const val = rmsValues[idx] || 0;
      const normalized = maxRms > 0 ? (val / maxRms) : 0;
      const barHeight = Math.max(4, normalized * (height * 0.85));

      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;

      const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
      grad.addColorStop(0, '#fef3c7');
      grad.addColorStop(0.5, '#fbbf24');
      grad.addColorStop(1, '#d97706');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2 * window.devicePixelRatio);
      ctx.fill();
    }
  }

  updatePlayhead(currentTime, duration) {
    if (!this.playheadEl || duration <= 0) return;
    const progress = Math.min(1, Math.max(0, currentTime / duration));
    const width = this.waveformCanvas ? this.waveformCanvas.clientWidth : 400;
    this.playheadEl.style.transform = `translateX(${progress * width}px)`;

    if (this.segmentsListEl) {
      const cards = this.segmentsListEl.querySelectorAll('.segment-card');
      this.segments.forEach((seg, idx) => {
        const card = cards[idx];
        if (card) {
          if (currentTime >= seg.start && currentTime <= seg.end) {
            card.classList.add('active');
          } else {
            card.classList.remove('active');
          }
        }
      });
    }
  }

  renderSegmentsList() {
    if (!this.segmentsListEl) return;
    this.segmentsListEl.innerHTML = '';

    if (this.segmentsCountEl) {
      this.segmentsCountEl.textContent = `${this.segments.length} scène${this.segments.length > 1 ? 's' : ''} (1080p)`;
    }

    if (this.segments.length === 0) {
      this.segmentsListEl.innerHTML = `
        <div class="timeline-empty">
          Chargez ou générez un audio pour afficher le montage automatique des scènes, illustrations et positions.
        </div>
      `;
      return;
    }

    const mascot = this.mascotManager.getActiveMascot();
    const availableEmotions = this.mascotManager.getAllEmotionsForMascot(mascot);

    this.segments.forEach((seg, idx) => {
      const card = document.createElement('div');
      card.className = 'segment-card';
      card.dataset.index = idx;

      // 1. LIGNE SUPÉRIEURE : Badge de scène, timecode et texte de la voix off
      const topRow = document.createElement('div');
      topRow.className = 'segment-top-row';

      const badge = document.createElement('div');
      badge.className = 'segment-badge';
      badge.textContent = `Scène #${idx + 1}`;

      const timeBox = document.createElement('div');
      timeBox.className = 'segment-time';
      timeBox.innerHTML = `
        <span class="time-start">${this.formatTime(seg.start)}</span>
        <span>→ ${this.formatTime(seg.end)}</span>
        <span style="opacity: 0.6; font-size: 0.7rem;">(${seg.duration.toFixed(1)}s)</span>
      `;

      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.className = 'segment-text-input';
      textInput.value = seg.text;
      textInput.placeholder = 'Texte de la voix off pour cette scène...';
      textInput.title = 'Texte de la voix off pour cette scène (éditable)';

      textInput.addEventListener('input', (e) => {
        seg.text = e.target.value;
      });

      textInput.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      topRow.appendChild(badge);
      topRow.appendChild(timeBox);
      topRow.appendChild(textInput);

      // 2. LIGNE INFÉRIEURE : Contrôles Mascotte & Illustration Animée
      const controlsRow = document.createElement('div');
      controlsRow.className = 'segment-controls-row';

      // --- GROUPE MASCOTTE ---
      const mascotGroup = document.createElement('div');
      mascotGroup.className = 'segment-mascot-controls';

      // Sélecteur d'émotion
      const selectEmo = document.createElement('select');
      selectEmo.className = 'segment-pose-select';
      selectEmo.title = 'Émotion de la mascotte';

      availableEmotions.forEach(emoKey => {
        const baseInfo = BASE_EMOTIONS.find(b => b.id === emoKey) || {
          id: emoKey,
          label: emoKey.charAt(0).toUpperCase() + emoKey.slice(1),
          icon: '🎭'
        };
        const opt = document.createElement('option');
        opt.value = emoKey;
        opt.textContent = `${baseInfo.icon} ${baseInfo.label}`;
        if (emoKey === seg.emotion) opt.selected = true;
        selectEmo.appendChild(opt);
      });

      // Sélecteur de variante de pose pour cette émotion
      const selectVariant = document.createElement('select');
      selectVariant.className = 'segment-pose-select';
      selectVariant.style.width = '70px';
      selectVariant.title = 'Variante de pose';

      const updateVariantsDropdown = () => {
        selectVariant.innerHTML = '';
        const poses = this.mascotManager.getPosesForEmotion(mascot, seg.emotion);
        if (poses.length <= 1) {
          const opt = document.createElement('option');
          opt.value = 0;
          opt.textContent = 'Pose 1';
          selectVariant.appendChild(opt);
          selectVariant.disabled = true;
        } else {
          selectVariant.disabled = false;
          poses.forEach((_, pIdx) => {
            const opt = document.createElement('option');
            opt.value = pIdx;
            opt.textContent = `Pose ${pIdx + 1}`;
            if (pIdx === seg.variantIndex) opt.selected = true;
            selectVariant.appendChild(opt);
          });
        }
      };

      updateVariantsDropdown();

      selectEmo.addEventListener('change', (e) => {
        e.stopPropagation();
        seg.emotion = e.target.value;
        seg.variantIndex = 0;
        updateVariantsDropdown();
      });

      selectVariant.addEventListener('change', (e) => {
        e.stopPropagation();
        seg.variantIndex = parseInt(e.target.value, 10) || 0;
      });

      // Sélecteur de position de la mascotte (Gauche, Centre, Droite, Masquée)
      const selectPos = document.createElement('select');
      selectPos.className = 'segment-pos-select';
      selectPos.title = 'Position de la mascotte dans le cadre 1920×1080';
      selectPos.innerHTML = `
        <option value="center" ${seg.position === 'center' ? 'selected' : ''}>⏺️ Centre</option>
        <option value="left" ${seg.position === 'left' ? 'selected' : ''}>⬅️ Gauche</option>
        <option value="right" ${seg.position === 'right' ? 'selected' : ''}>➡️ Droite</option>
        <option value="hidden" ${seg.position === 'hidden' ? 'selected' : ''}>🚫 Masquée</option>
      `;

      selectPos.addEventListener('change', (e) => {
        e.stopPropagation();
        seg.position = e.target.value;
      });

      mascotGroup.appendChild(selectEmo);
      mascotGroup.appendChild(selectVariant);
      mascotGroup.appendChild(selectPos);

      // --- GROUPE ILLUSTRATION ANIMÉE (MONTAGE AUTOMATIQUE) ---
      const illustGroup = document.createElement('div');
      illustGroup.className = 'segment-illustration-controls';

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';

      const handleImageFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (re) => {
          const dataUrl = re.target.result;
          const img = new Image();
          img.onload = () => {
            seg.image = img;
            seg.imageData = dataUrl;
            this.renderSegmentsList();
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      };

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageFile(file);
      });

      if (seg.imageData) {
        const previewBox = document.createElement('div');
        previewBox.className = 'segment-img-preview-box';

        const thumb = document.createElement('img');
        thumb.className = 'segment-img-thumb';
        thumb.src = seg.imageData;
        thumb.title = 'Cliquer pour changer l\'illustration';
        thumb.addEventListener('click', (e) => {
          e.stopPropagation();
          fileInput.click();
        });

        const btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.className = 'btn-delete-img';
        btnDel.textContent = '✕';
        btnDel.title = 'Supprimer l\'illustration';
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          seg.image = null;
          seg.imageData = null;
          this.renderSegmentsList();
        });

        previewBox.appendChild(thumb);
        previewBox.appendChild(btnDel);

        // Sélecteur d'effet d'animation (Ken Burns)
        const selectAnim = document.createElement('select');
        selectAnim.className = 'segment-anim-select';
        selectAnim.title = 'Animation de l\'illustration (Effet Ken Burns)';
        selectAnim.innerHTML = `
          <option value="zoom-in" ${seg.animationStyle === 'zoom-in' ? 'selected' : ''}>🔍 Zoom In</option>
          <option value="zoom-out" ${seg.animationStyle === 'zoom-out' ? 'selected' : ''}>🔎 Zoom Out</option>
          <option value="pan" ${seg.animationStyle === 'pan' ? 'selected' : ''}>↔️ Panoramique</option>
          <option value="static" ${seg.animationStyle === 'static' ? 'selected' : ''}>⏹️ Statique</option>
        `;

        selectAnim.addEventListener('change', (e) => {
          e.stopPropagation();
          seg.animationStyle = e.target.value;
        });

        illustGroup.appendChild(previewBox);
        illustGroup.appendChild(selectAnim);
      } else {
        const btnAddImg = document.createElement('button');
        btnAddImg.type = 'button';
        btnAddImg.className = 'btn-segment-image';
        btnAddImg.innerHTML = `🖼️ + Illustration`;
        btnAddImg.title = 'Ajouter une image d\'illustration pour cette scène';

        btnAddImg.addEventListener('click', (e) => {
          e.stopPropagation();
          fileInput.click();
        });

        illustGroup.appendChild(btnAddImg);
      }

      illustGroup.appendChild(fileInput);

      controlsRow.appendChild(mascotGroup);
      controlsRow.appendChild(illustGroup);

      card.appendChild(topRow);
      card.appendChild(controlsRow);

      // Drag & Drop d'image directement sur la carte de scène
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.classList.add('drag-target');
      });

      card.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.classList.remove('drag-target');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.classList.remove('drag-target');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleImageFile(e.dataTransfer.files[0]);
        }
      });

      // Clic sur la carte pour chercher dans l'audio
      card.addEventListener('click', () => {
        this.audioManager.seek(seg.start);
        if (this.onSegmentSelect) {
          this.onSegmentSelect(seg);
        }
      });

      this.segmentsListEl.appendChild(card);
    });
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  }
}
