/**
 * DEFAULT MASCOTS - ANIME PODCAST STUDIO
 * Catalogue étendu de 14 émotions de base (incluant Bonjour/Salutation et Au revoir/Outro)
 * avec multiples variantes de poses par émotion.
 * Mascotte par défaut : Kai (illustrations PNG détourées fournies par l'utilisateur).
 * Charte : Bleu sombre profond (#070b14, #0b1329), accents or (#f59e0b, #fbbf24). ZÉRO ROSE.
 */

export const BASE_EMOTIONS = [
  { id: 'bonjour', label: 'Bonjour / Salutation', icon: '👋', hint: 'Coucou de la main, accueil chaleureux et intro' },
  { id: 'au_revoir', label: 'Au revoir / Outro', icon: '✌️', hint: 'Geste d\'adieu, signe de la main ou V en conclusion' },
  { id: 'neutre', label: 'Neutre', icon: '🙂', hint: 'Calme, écoute attentive, posture de repos' },
  { id: 'enthousiaste', label: 'Enthousiaste', icon: '✨', hint: 'Dynamique, grands gestes, énergie communicative' },
  { id: 'explicative', label: 'Explicative', icon: '💡', hint: 'Pédagogique, index pointé, paumes ouvertes' },
  { id: 'pensive', label: 'Pensive', icon: '🤔', hint: 'Main au menton, regard vers le haut, questionnement' },
  { id: 'surprise', label: 'Surprise', icon: '⚡', hint: 'Yeux écarquillés, sursaut, étonnement' },
  { id: 'confiante', label: 'Confiante', icon: '😎', hint: 'Sourire assuré, bras croisés ou pouce levé' },
  { id: 'joyeuse', label: 'Joyeuse', icon: '😄', hint: 'Rire franc, yeux pétillants, satisfaction' },
  { id: 'serieuse', label: 'Sérieuse', icon: '🧐', hint: 'Regard concentré, pose posée et mesurée' },
  { id: 'ironique', label: 'Ironique', icon: '😏', hint: 'Demi-sourire malicieux, regard en coin' },
  { id: 'enervee', label: 'Passionnée', icon: '💢', hint: 'Sourcils froncés, poing levé, ferveur' },
  { id: 'determinee', label: 'Déterminée', icon: '🔥', hint: 'Posture d\'action, regard droit, engagement' },
  { id: 'embarrassee', label: 'Timide', icon: '😳', hint: 'Regard fuyant, main derrière la tête, modestie' }
];

const KAI_BASE_PATH = './assets/mascots/kai';

export const DEFAULT_MASCOTS = [
  {
    id: 'kai',
    name: 'Kai',
    isDefault: true,
    emotions: {
      bonjour: [`${KAI_BASE_PATH}/bonjour_0.png`],
      neutre: [`${KAI_BASE_PATH}/neutre_0.png`],
      explicative: [`${KAI_BASE_PATH}/explicative_0.png`, `${KAI_BASE_PATH}/explicative_1.png`],
      pensive: [`${KAI_BASE_PATH}/pensive_0.png`],
      surprise: [`${KAI_BASE_PATH}/surprise_0.png`],
      confiante: [`${KAI_BASE_PATH}/confiante_0.png`],
      joyeuse: [`${KAI_BASE_PATH}/joyeuse_0.png`],
      ironique: [`${KAI_BASE_PATH}/ironique_0.png`],
      enervee: [`${KAI_BASE_PATH}/enervee_0.png`],
      embarrassee: [`${KAI_BASE_PATH}/embarrassee_0.png`]
    }
  }
];
