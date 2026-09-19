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

      // Heuristiques intelligentes basées sur le contexte
      if (text.includes('?')) {
        chosenEmotion = (lastEmotion === 'pensive') ? 'surprise' : 'pensive';
      } else if (text.includes('!')) {
        const excitePool = ['enthousiaste', 'joyeuse', 'determinee', 'enervee'].filter(e => availableEmotions.includes(e));
        chosenEmotion = excitePool.find(e => e !== lastEmotion) || 'enthousiaste';
      } else if (seg.duration > 2.2) {
        const explainPool = ['explicative', 'confiante', 'serieuse'].filter(e => availableEmotions.includes(e));
        chosenEmotion = explainPool.find(e => e !== lastEmotion) || 'explicative';
      } else if (index === 0) {
        chosenEmotion = availableEmotions.includes('enthousiaste') ? 'enthousiaste' : availableEmotions[0];
      } else {
        // Sélection aléatoire parmi les émotions disponibles différentes de la précédente
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
        variantIndex: chosenVariant
      };
    });
  }

  /**
   * Retourne l'attitude active { emotion, variantIndex } pour le timestamp en cours
   */
  getPoseAtTime(currentTime) {
    if (!this.segments || this.segments.length === 0) {
      return { emotion: 'neutre', variantIndex: 0 };
    }

    const activeSegment = this.segments.find(seg => currentTime >= seg.start && currentTime <= seg.end);
    if (activeSegment) {
      return {
        emotion: activeSegment.emotion,
        variantIndex: activeSegment.variantIndex
      };
    }

    // Pendant les silences : retour en posture neutre variante 0
    return { emotion: 'neutre', variantIndex: 0 };
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
      this.segmentsCountEl.textContent = `${this.segments.length} segment${this.segments.length > 1 ? 's' : ''} dynamiques`;
    }

    if (this.segments.length === 0) {
      this.segmentsListEl.innerHTML = `
        <div class="timeline-empty">
          Chargez ou générez un audio pour afficher le découpage dynamique des émotions et des poses.
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

      // Horodatage
      const timeBox = document.createElement('div');
      timeBox.className = 'segment-time';
      timeBox.innerHTML = `
        <span class="time-start">${this.formatTime(seg.start)}</span>
        <span>→ ${this.formatTime(seg.end)}</span>
      `;

      // Texte de la phrase
      const textBox = document.createElement('div');
      textBox.className = 'segment-text';
      textBox.textContent = seg.text;
      textBox.title = seg.text;

      // Contrôles de sélection d'émotion et de variante de pose
      const controlsBox = document.createElement('div');
      controlsBox.style.display = 'flex';
      controlsBox.style.gap = '6px';
      controlsBox.style.alignItems = 'center';

      // Sélecteur d'émotion
      const selectEmo = document.createElement('select');
      selectEmo.className = 'segment-pose-select';

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
      selectVariant.style.width = '75px';

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

      controlsBox.appendChild(selectEmo);
      controlsBox.appendChild(selectVariant);

      card.appendChild(timeBox);
      card.appendChild(textBox);
      card.appendChild(controlsBox);

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
