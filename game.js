/* ======================================================================
   ÉCLATS NÉON
   Jeu d'arcade en HTML, CSS et JavaScript "vanilla".
   Rien à installer : ouvre simplement index.html dans un navigateur.

   Organisation du fichier :
     1.  Réglages (tout ce qu'on peut modifier pour changer le jeu)
     2.  Outils
     3.  Sauvegarde (localStorage protégé)
     4.  Sons (Web Audio, générés par le code)
     5.  Affichage (canvas, taille de l'écran, étoiles)
     6.  État du jeu
     7.  Commandes (clavier, souris, tactile)
     8.  Interface (écrans, HUD, boutons)
     9.  Déroulement d'une partie (menu, jeu, pause, fin)
     10. Logique du jeu (joueur, ennemis, énergie, lasers, collisions)
     11. Effets visuels (particules, ondes, textes)
     12. Dessin
     13. Boucle principale et démarrage
   ====================================================================== */

(function () {
  'use strict';

  /* ====================================================================
     1. RÉGLAGES
     ==================================================================== */

  // Version du jeu, affichée dans les Réglages. À augmenter à chaque mise à jour :
  // grosse mise à jour 1.8 -> 1.9, petite correction 1.8 -> 1.81 -> 1.82.
  // Penser à mettre la même dans VERSION, en haut de sw.js (mode hors ligne).
  const GAME_VERSION = '1.9';

  const CONFIG = {
    // --- Affichage ---
    WORLD_SHORT_SIDE: 720,   // le plus petit côté de l'écran vaut toujours 720 unités de jeu
    MAX_PIXEL_RATIO: 2,      // limite la résolution pour garder un jeu fluide
    GRID_SIZE: 64,
    GRID_SPEED: 14,
    STAR_SPEED: 22,

    // --- Joueur ---
    PLAYER_RADIUS: 13,
    PLAYER_HITBOX: 0.7,      // la zone de collision fait 70 % du dessin : plus juste
    PLAYER_SPEED: 400,       // unités par seconde
    PLAYER_ACCEL: 12,        // réactivité des déplacements (plus haut = plus nerveux)
    POINTER_FOLLOW: 5,       // douceur du suivi de la souris / du doigt
    JOYSTICK_RADIUS: 60,     // rayon du joystick tactile, en pixels à l'écran
    JOYSTICK_DEADZONE: 0.12, // zone morte au centre du joystick (12 % du rayon)
    JOYSTICK_KNOB: 0.42,     // taille du bouton du joystick (par rapport au rayon)
    JOYSTICK_ZONE: 1.6,      // zone où le pouce attrape le joystick (× le rayon) ; ailleurs = dash
    JOYSTICK_MARGIN: 20,     // espace sous le joystick (en plus de la barre du bas des iPhone)
    DASH_SPEED: 1150,
    DASH_DURATION: 0.17,     // secondes d'invincibilité pendant le dash
    DASH_COOLDOWN: 1.1,      // secondes avant de pouvoir refaire un dash

    // --- Éclats (ennemis de base) ---
    SHARD_MIN_RADIUS: 11,
    SHARD_MAX_RADIUS: 24,
    SHARD_MIN_SPEED: 170,
    SHARD_MAX_SPEED: 290,
    SHARD_HITBOX: 0.72,      // zone de collision un peu plus petite que le dessin
    AIM_AT_PLAYER_CHANCE: 0.6,
    AIM_SPREAD: 150,
    SPAWN_OFFSCREEN: 140,    // distance d'apparition hors de l'écran (laisse le temps de voir l'alerte)
    SAFE_SPAWN_DISTANCE: 260,// aucun ennemi n'apparaît plus près du joueur
    DESPAWN_MARGIN: 60,
    HAZARD_MAX_AGE: 20,
    MAX_HAZARDS: 70,

    // --- Traqueurs ---
    SEEKER_FROM_LEVEL: 3,
    SEEKER_CHANCE: 0.22,
    SEEKER_MAX: 4,
    SEEKER_RADIUS: 13,
    SEEKER_SPEED: 150,
    SEEKER_TURN_RATE: 1.7,   // radians par seconde
    SEEKER_HOMING_TIME: 3.2, // secondes pendant lesquelles il suit le joueur

    // --- Lasers ---
    LASER_FROM_LEVEL: 4,
    LASER_CROSS_FROM_LEVEL: 7,
    LASER_MIN_INTERVAL: 5,
    LASER_MAX_INTERVAL: 9,
    LASER_WARNING: 1.15,     // durée de l'alerte avant le tir
    LASER_ACTIVE: 0.35,      // durée pendant laquelle le laser est dangereux
    LASER_FADE: 0.25,
    LASER_WIDTH: 26,
    LASER_OFFSET: 80,

    // --- Difficulté ---
    LEVEL_DURATION: 15,      // secondes par niveau
    FIRST_SPAWN_DELAY: 1.0,
    SPAWN_INTERVAL_START: 0.85,
    SPAWN_INTERVAL_MIN: 0.2,
    SPAWN_INTERVAL_FACTOR: 0.87, // l'intervalle est multiplié par ce nombre à chaque niveau
    SPEED_BONUS_PER_LEVEL: 0.09,
    SPEED_MULT_MAX: 2.1,
    DOUBLE_SPAWN_FROM_LEVEL: 5,
    DOUBLE_SPAWN_CHANCE: 0.3,

    // --- Énergie ---
    FIRST_ENERGY_DELAY: 2.5,
    ENERGY_MIN_INTERVAL: 3,
    ENERGY_MAX_INTERVAL: 5.5,
    ENERGY_LIFETIME: 7,
    ENERGY_BLINK_TIME: 1.8,
    ENERGY_RADIUS: 12,
    MAX_ENERGY: 3,

    // --- Bonus temporaires ---
    POWERUP_FIRST_DELAY: 12,  // secondes de jeu avant le premier bonus
    POWERUP_MIN_INTERVAL: 12,
    POWERUP_MAX_INTERVAL: 18,
    POWERUP_LIFETIME: 8,      // temps pour l'attraper avant qu'il disparaisse
    POWERUP_BLINK_TIME: 2,
    POWERUP_RADIUS: 16,
    SHIELD_DURATION: 10,      // le bouclier dure 10 s ou encaisse 1 coup
    SHIELD_GRACE: 1.0,        // invincibilité après que le bouclier a encaissé un coup
    SLOW_DURATION: 5,
    SLOW_FACTOR: 0.45,        // les dangers vont à 45 % de leur vitesse
    MAGNET_DURATION: 8,
    MAGNET_RADIUS: 280,
    MAGNET_SPEED: 520,
    POWERUP_WARN_TIME: 2,     // le bonus clignote quand il lui reste 2 s

    // --- Score ---
    POINTS_PER_SECOND: 10,
    SCORE_LEVEL_BONUS: 0.25, // +25 % de points par seconde à chaque niveau
    ENERGY_POINTS: 100,
    NEAR_MISS_POINTS: 25,
    NEAR_MISS_MARGIN: 22,

    // --- Éclats diviseurs (niveau 5+) ---
    SPLITTER_FROM_LEVEL: 5,
    SPLITTER_CHANCE: 0.2,
    SPLITTER_RADIUS: 28,
    SPLITTER_SPEED: 0.8,       // vitesse par rapport à un éclat normal
    SPLIT_TIME: 1.5,           // secondes à l'écran avant d'éclater
    SPLIT_SPREAD: 0.45,        // écart entre les 3 morceaux (radians)
    SPLIT_PIECE_SPEED: 1.5,    // les morceaux vont 1,5 fois plus vite
    SPAWN_GRACE: 0.25,         // un morceau qui vient d'apparaître est inoffensif 0,25 s

    // --- Mines (niveau 6+) ---
    MINE_FROM_LEVEL: 6,
    MINE_MIN_INTERVAL: 4,
    MINE_MAX_INTERVAL: 7,
    MINE_MAX: 4,
    MINE_ARM_TIME: 1.5,        // clignotement avant l'explosion
    MINE_RADIUS: 13,
    MINE_RING_SPEED: 300,      // vitesse de l'anneau d'explosion (unités / s)
    MINE_RING_MAX: 190,
    MINE_RING_WIDTH: 14,
    MINE_SAFE_DISTANCE: 200,   // une mine n'apparaît jamais plus près du joueur

    // --- Trous noirs (niveau 8+) ---
    HOLE_FROM_LEVEL: 8,
    HOLE_MIN_INTERVAL: 9,
    HOLE_MAX_INTERVAL: 14,
    HOLE_LIFETIME: 6,
    HOLE_GROW_TIME: 0.8,
    HOLE_RANGE: 300,           // portée de l'attraction
    HOLE_PULL: 1700,           // force d'attraction sur le joueur (au plus près)
    HOLE_PULL_HAZARD: 260,     // attraction sur les éclats
    HOLE_CORE: 26,             // rayon mortel du centre
    HOLE_SAFE_DISTANCE: 260,

    // --- Boss de survie ---
    BOSS_EVERY: 5,             // un boss tous les 5 niveaux
    BOSS_DURATION: 20,         // secondes à survivre
    BOSS_ENTER_TIME: 1.5,
    BOSS_LEAVE_TIME: 1.5,
    BOSS_RADIUS: 64,
    BOSS_ATTACK_INTERVAL: 3.2,
    BOSS_TELEGRAPH: 0.7,       // le boss s'illumine avant chaque attaque
    BOSS_RING_SHARDS: 14,
    BOSS_RING_GAP: 3,          // trou dans la couronne pour passer
    BOSS_BEAM_WARNING: 1.0,
    BOSS_BEAM_ACTIVE: 2.0,
    BOSS_BEAM_SWEEP: 1.6,      // angle balayé par le rayon (radians)
    BOSS_BEAM_WIDTH: 22,
    BOSS_BONUS: 1000,          // multiplié par le niveau et le combo

    // --- Modes ---
    TIMEATTACK_DURATION: 60,
    TIMEATTACK_LEVEL_DURATION: 8,
    ZEN_HIT_PENALTY: 100,
    ZEN_GRACE: 1.5,

    // --- Combo ---
    COMBO_WINDOW: 4,         // secondes pour enchaîner l'action suivante (frôlement, énergie, bonus)
    COMBO_STEP: 3,           // actions enchaînées pour gagner +1 au multiplicateur
    COMBO_MAX: 5,            // multiplicateur maximum (x5)

    // --- Rythme et effets ---
    MAX_STEP: 1 / 120,       // pas de simulation maximal (évite qu'un objet en traverse un autre)
    MAX_FRAME_TIME: 0.1,     // évite un bond énorme après un ralentissement
    RESUME_DELAY: 1.2,       // petit temps de préparation après une pause
    DEATH_DURATION: 1.4,
    DEATH_SLOWMO: 0.25,
    MENU_SPAWN_INTERVAL: 0.7,
    MAX_PARTICLES: 700,
    SHAKE_DECAY: 7,
    FLASH_DECAY: 2.2,
    SCORE_COUNT_DURATION: 0.9,
    GAMEOVER_INPUT_DELAY: 500, // ms avant que Entrée puisse relancer (évite les relances par accident)
    VOLUME: 0.45,

    // --- Sauvegarde ---
    STORAGE_KEY_BEST: 'eclatsNeon.record',
    STORAGE_KEY_MUTE: 'eclatsNeon.sonCoupe',
    STORAGE_KEY_DAILY: 'eclatsNeon.defi',      // record du défi du jour (avec sa date)
    STORAGE_KEY_POINTS: 'eclatsNeon.points',   // points cumulés : débloquent les vaisseaux
    STORAGE_KEY_SHIP: 'eclatsNeon.vaisseau',   // vaisseau choisi
    STORAGE_KEY_TIMEATTACK: 'eclatsNeon.recordChrono',
    STORAGE_KEY_ACH: 'eclatsNeon.succes',
    STORAGE_KEY_SETTINGS: 'eclatsNeon.reglages',
    STORAGE_KEY_TUTO: 'eclatsNeon.tutoFait',
    STORAGE_KEY_DATA_VERSION: 'eclatsNeon.versionDonnees',
    // Changer ce numéro efface la progression de TOUS les joueurs
    // (records, points, vaisseaux, succès) au lancement suivant. Le réglage du son est gardé.
    DATA_VERSION: '2',
  };

  const COLORS = {
    background: '#05010f',
    grid: 'rgba(140, 70, 255, 0.11)',
    star: '#cfe8ff',
    player: '#3ef2ff',
    playerCore: '#eaffff',
    shard: '#ff3d8b',
    shardFill: 'rgba(255, 61, 139, 0.16)',
    shardHalo: 'rgba(255, 61, 139, 0.28)',
    seeker: '#ff9d3d',
    seekerHalo: 'rgba(255, 157, 61, 0.3)',
    energy: '#ffe14d',
    shield: '#4dffa6',
    slow: '#b388ff',
    magnet: '#5c8dff',
    laser: '#ff2d6f',
    laserCore: '#fff0f6',
    combo: '#f4f0ff',
    splitCrack: '#ffd6e6',
    mine: '#ff4a3d',
    mineRing: '#ff8a3d',
    hole: '#ff2dd2',
    boss: '#ff2d6f',
    bossCore: '#ffb13d',
    text: '#e8f7ff',
    white: '#ffffff',
  };

  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  const TAU = Math.PI * 2;
  const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Bonus temporaires : nom affiché, couleur et réglage de durée correspondant
  const POWERUPS = {
    shield: { name: 'Bouclier', color: COLORS.shield, durationKey: 'SHIELD_DURATION' },
    slow:   { name: 'Ralenti',  color: COLORS.slow,   durationKey: 'SLOW_DURATION' },
    magnet: { name: 'Aimant',   color: COLORS.magnet, durationKey: 'MAGNET_DURATION' },
  };
  const POWERUP_TYPES = Object.keys(POWERUPS);

  function powerupDuration(type) {
    return CONFIG[POWERUPS[type].durationKey];
  }

  // Vaisseaux à débloquer avec les points cumulés. Purement visuel : la zone
  // de collision est la même pour tous, le jeu reste équitable.
  // (Pas de rose, d'orange ni de rouge : ce sont les couleurs des dangers.)
  const SHIPS = [
    { id: 'fleche',    name: 'Flèche',    color: '#3ef2ff', cost: 0 },
    { id: 'libellule', name: 'Libellule', color: '#b6ff4a', cost: 1000 },
    { id: 'comete',    name: 'Comète',    color: '#ffd447', cost: 3000 },
    { id: 'delta',     name: 'Delta',     color: '#b388ff', cost: 6000 },
    { id: 'etoile',    name: 'Étoile',    color: '#f4f7ff', cost: 10000 },
    { id: 'prisme',    name: 'Prisme',    color: '#ffffff', cost: 20000, rainbow: true },
  ];

  // Formes des vaisseaux (pointe vers la droite), en multiples du rayon
  const SHIP_SHAPES = {
    fleche:    [1.35, 0, -0.9, -0.85, -0.45, 0, -0.9, 0.85],
    libellule: [1.6, 0, 0.2, -0.28, -0.35, -1.05, -0.55, -0.25, -1.0, 0, -0.55, 0.25, -0.35, 1.05, 0.2, 0.28],
    delta:     [1.25, 0, -0.8, -1.15, -0.5, -0.35, -0.75, 0, -0.5, 0.35, -0.8, 1.15],
    etoile:    [1.5, 0, 0.3, -0.3, 0, -1.1, -0.3, -0.3, -1.1, 0, -0.3, 0.3, 0, 1.1, 0.3, 0.3],
    prisme:    [1.4, 0, 0.1, -0.85, -1.0, 0, 0.1, 0.85],
  };

  /* ====================================================================
     2. OUTILS
     ==================================================================== */

  // Hasard pour les effets visuels seulement (particules, étoiles, tremblement).
  // Les apparitions utilisent les suites "rejouables" plus bas (défi du jour).
  function rand(min, max) { return min + Math.random() * (max - min); }
  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }
  function angleDiff(from, to) { return Math.atan2(Math.sin(to - from), Math.cos(to - from)); }
  function $(id) { return document.getElementById(id); }

  // Supprime d'une liste les éléments qui ne doivent plus exister (sans créer de nouveau tableau)
  function removeDead(list, keep) {
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      if (keep(list[i])) list[n++] = list[i];
    }
    list.length = n;
  }

  function formatScore(n) { return Math.floor(n).toLocaleString('fr-FR'); }

  function formatTime(seconds) {
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  // Date du jour en heure locale, ex. "2026-11-02" (sert de graine au défi du jour)
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function formatToday() {
    return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }

  // --- Hasard "rejouable" ---
  // Avec la même graine, mulberry32 donne toujours la même suite de nombres.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Transforme un texte en nombre (graine)
  function hashString(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Petits outils autour d'un générateur de hasard
  function makeRng(next) {
    return {
      next: next,
      range: function (min, max) { return min + next() * (max - min); },
      int: function (min, max) { return Math.floor(min + next() * (max - min + 1)); },
      chance: function (p) { return next() < p; },
    };
  }

  // Une suite de hasard séparée par type d'apparition. Chaque apparition tire
  // UNE valeur dans sa suite puis utilise son propre générateur : ainsi le
  // défi du jour reste identique pour tous, quoi que fasse le joueur.
  const SPAWN_STREAMS = ['hazard', 'energy', 'powerup', 'laser', 'mine', 'hole', 'boss'];
  const streams = {};

  function seedStreams(seedText) {
    for (const name of SPAWN_STREAMS) streams[name] = mulberry32(hashString(seedText + ':' + name));
  }

  function spawnRng(name) {
    return makeRng(mulberry32(Math.floor(streams[name]() * 4294967296)));
  }

  /* ====================================================================
     3. SAUVEGARDE
     localStorage peut être bloqué (navigation privée, réglages) :
     chaque accès est protégé pour que le jeu fonctionne quand même.
     ==================================================================== */

  const storage = {
    get(key, fallback) {
      try {
        const value = window.localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, String(value));
      } catch (e) {
        /* stockage indisponible : on continue sans sauvegarder */
      }
    },
  };

  function loadInt(key) {
    const value = parseInt(storage.get(key, '0'), 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function loadBest() {
    return loadInt(CONFIG.STORAGE_KEY_BEST);
  }

  // Record du défi du jour, enregistré avec sa date : { date: "2026-11-02", best: 1234 }
  function loadDailyBest(dateKey) {
    try {
      const data = JSON.parse(storage.get(CONFIG.STORAGE_KEY_DAILY, 'null'));
      if (data && data.date === dateKey && Number.isFinite(data.best)) return Math.max(0, Math.floor(data.best));
    } catch (e) {
      /* donnée abîmée : on repart de zéro */
    }
    return 0;
  }

  function saveDailyBest(dateKey, best) {
    storage.set(CONFIG.STORAGE_KEY_DAILY, JSON.stringify({ date: dateKey, best: best }));
  }

  function loadJSON(key, fallback) {
    try {
      const data = JSON.parse(storage.get(key, 'null'));
      return data && typeof data === 'object' ? data : fallback;
    } catch (e) {
      return fallback;
    }
  }

  // Remise à zéro de la progression, une seule fois par appareil, quand
  // DATA_VERSION change. Doit passer AVANT tout chargement de données.
  function resetOldData() {
    if (storage.get(CONFIG.STORAGE_KEY_DATA_VERSION, '') === CONFIG.DATA_VERSION) return;
    const keep = [CONFIG.STORAGE_KEY_MUTE];
    try {
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.indexOf('eclatsNeon.') === 0 && keep.indexOf(key) === -1) keys.push(key);
      }
      keys.forEach(function (key) { window.localStorage.removeItem(key); });
    } catch (e) {
      /* stockage indisponible : rien à effacer */
    }
    storage.set(CONFIG.STORAGE_KEY_DATA_VERSION, CONFIG.DATA_VERSION);
  }
  resetOldData();

  // --- Réglages du joueur ---
  const JOYSTICK_SIZES = { small: 48, medium: CONFIG.JOYSTICK_RADIUS, large: 74 };

  function loadSettings() {
    const s = { music: 60, sfx: 100, joystick: 'medium', reduceFx: false };
    const data = loadJSON(CONFIG.STORAGE_KEY_SETTINGS, null);
    if (data) {
      if (Number.isFinite(data.music)) s.music = clamp(Math.round(data.music), 0, 100);
      if (Number.isFinite(data.sfx)) s.sfx = clamp(Math.round(data.sfx), 0, 100);
      if (JOYSTICK_SIZES[data.joystick]) s.joystick = data.joystick;
      s.reduceFx = !!data.reduceFx;
    }
    return s;
  }

  const settings = loadSettings();

  function saveSettings() {
    storage.set(CONFIG.STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }

  function joyRadius() {
    return JOYSTICK_SIZES[settings.joystick] || CONFIG.JOYSTICK_RADIUS;
  }

  // Moins de tremblements, de flashs et de particules (réglage ou préférence du système)
  function reducedFx() {
    return REDUCED_MOTION || settings.reduceFx;
  }

  /* ====================================================================
     4. SONS
     Tous les sons sont fabriqués par le code (aucun fichier audio).
     Le son ne démarre qu'après la première action du joueur,
     comme l'exigent les navigateurs.
     ==================================================================== */

  const Sound = {
    ctx: null,
    master: null,    // volume général (0 quand le son est coupé)
    sfxGain: null,   // volume des effets
    musicGain: null, // volume de la musique
    noiseBuffer: null,
    muted: storage.get(CONFIG.STORAGE_KEY_MUTE, '0') === '1',

    // À appeler à chaque clic / touche : crée ou réveille le moteur audio
    unlock() {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      // Le navigateur n'autorise le son qu'au moment d'une vraie action du joueur
      // (clic, touche, doigt qui se lève) : on attend ce moment-là.
      if (navigator.userActivation && !navigator.userActivation.isActive) return;
      if (!this.ctx) {
        try {
          this.ctx = new AudioCtx();
          this.master = this.ctx.createGain();
          this.master.gain.value = this.muted ? 0 : CONFIG.VOLUME;
          this.master.connect(this.ctx.destination);
          this.sfxGain = this.ctx.createGain();
          this.sfxGain.gain.value = settings.sfx / 100;
          this.sfxGain.connect(this.master);
          this.musicGain = this.ctx.createGain();
          this.musicGain.gain.value = 0; // la musique démarre en fondu
          this.musicGain.connect(this.master);
          // Quand le navigateur autorise enfin le son, la musique peut démarrer
          this.ctx.onstatechange = function () { Music.tryStart(); };
          // Bruit blanc réutilisé pour les explosions et le dash
          const length = Math.floor(this.ctx.sampleRate * 1.5);
          this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
          const data = this.noiseBuffer.getChannelData(0);
          for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        } catch (e) {
          this.ctx = null;
          return;
        }
      }
      // 'suspended' ou 'interrupted' (iPhone après un appel ou un changement d'app)
      if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') {
        const promise = this.ctx.resume();
        if (promise && promise.catch) promise.catch(function () {});
      }
    },

    setMuted(muted) {
      this.muted = muted;
      storage.set(CONFIG.STORAGE_KEY_MUTE, muted ? '1' : '0');
      if (this.ctx && this.master) {
        const now = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setValueAtTime(muted ? 0 : CONFIG.VOLUME, now);
      }
    },

    canPlay() {
      return !!this.ctx && !this.muted && this.ctx.state === 'running';
    },

    // Applique les volumes choisis dans les réglages
    applyVolumes() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this.sfxGain.gain.setValueAtTime(settings.sfx / 100, now);
      if (Music.playing) {
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setValueAtTime(settings.music / 100, now);
      }
    },

    // Note simple avec une enveloppe courte (pas de "clic" désagréable)
    // out : vers quelle sortie (effets par défaut, ou musique)
    tone(freq, duration, type, volume, freqEnd, delay, out) {
      if (!this.canPlay()) return;
      const t = this.ctx.currentTime + (delay || 0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(out || this.sfxGain);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    },

    // Bruit filtré (souffle, explosion)
    noise(duration, volume, freqStart, freqEnd, delay, out) {
      if (!this.canPlay() || !this.noiseBuffer) return;
      const t = this.ctx.currentTime + (delay || 0);
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freqStart, t);
      filter.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(out || this.sfxGain);
      src.start(t);
      src.stop(t + duration + 0.05);
    },

    // --- Effets sonores du jeu ---
    click()     { this.tone(660, 0.06, 'square', 0.08); },
    start()     {
      this.tone(392, 0.12, 'triangle', 0.2);
      this.tone(523, 0.12, 'triangle', 0.2, 0, 0.09);
      this.tone(784, 0.22, 'triangle', 0.22, 0, 0.18);
    },
    dash()      { this.noise(0.2, 0.22, 4000, 500); this.tone(260, 0.16, 'sawtooth', 0.06, 820); },
    collect()   { this.tone(880, 0.08, 'triangle', 0.22); this.tone(1320, 0.14, 'triangle', 0.2, 0, 0.06); },
    graze()     { this.tone(1400, 0.06, 'sine', 0.09, 2100); },
    levelUp()   { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.07, 0, i * 0.07)); },
    laserWarn() { this.tone(200, 0.5, 'sawtooth', 0.05, 320); },
    laserFire() { this.noise(0.4, 0.25, 2200, 200); this.tone(130, 0.35, 'sawtooth', 0.12, 60); },
    explosion() { this.noise(1.0, 0.55, 3000, 60); this.tone(160, 0.8, 'sawtooth', 0.18, 35); },
    gameOver()  { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.16, 0, 0.1 + i * 0.16)); },
    record()    { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.16, 0, 0.1 + i * 0.09)); },
    powerUp()   { [660, 880, 1175, 1568].forEach((f, i) => this.tone(f, 0.14, 'sine', 0.16, 0, i * 0.05)); },
    shieldHit() { this.noise(0.35, 0.3, 5000, 400); this.tone(900, 0.3, 'triangle', 0.15, 200); },
    slowStart() { this.tone(500, 0.6, 'sawtooth', 0.06, 110); },
    powerEnd()  { this.tone(700, 0.08, 'square', 0.06); this.tone(470, 0.12, 'square', 0.06, 0, 0.08); },
    comboUp(m)  { this.tone(500 + m * 140, 0.1, 'square', 0.07); this.tone(750 + m * 190, 0.16, 'square', 0.07, 0, 0.06); },
    comboLost() { this.tone(420, 0.2, 'triangle', 0.1, 170); },
    newShip()   { [523, 784, 1047, 1568].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.14, 0, 0.5 + i * 0.1)); },
    denied()    { this.tone(190, 0.14, 'square', 0.07, 140); },
    split()     { this.noise(0.18, 0.18, 3000, 600); this.tone(700, 0.12, 'triangle', 0.08, 1200); },
    mineArm()   { this.tone(880, 0.05, 'square', 0.05); },
    mineBoom()  { this.noise(0.5, 0.35, 2500, 120); this.tone(110, 0.4, 'sawtooth', 0.12, 50); },
    holeOpen()  { this.tone(90, 1.2, 'sawtooth', 0.07, 45); },
    bossAlarm() { [0, 0.35, 0.7].forEach((d) => this.tone(330, 0.25, 'square', 0.09, 220, d)); },
    bossCharge(){ this.tone(200, 0.6, 'sawtooth', 0.06, 600); },
    bossWin()   { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.16, 0, i * 0.08)); },
    zenHit()    { this.tone(300, 0.25, 'triangle', 0.12, 150); },
    achievement() { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.13, 0, i * 0.09)); },
  };

  /* ====================================================================
     4 bis. MUSIQUE (générée par le code)
     Boucle synthwave : grosse caisse, charleston, basse, arpège.
     Les notes sont programmées à l'avance sur l'horloge audio (précise),
     le tempo monte avec le niveau et la musique s'intensifie pendant le boss.
     ==================================================================== */

  // Accords (en Hz) : La mineur, Fa, Do, Sol — note grave puis notes de l'accord
  const MUSIC_CHORDS = [
    [110.00, 220.00, 261.63, 329.63],
    [87.31, 174.61, 220.00, 261.63],
    [130.81, 261.63, 329.63, 392.00],
    [98.00, 196.00, 246.94, 293.66],
  ];

  const Music = {
    playing: false,
    wanted: false,   // la musique devrait jouer (dès que le son est autorisé)
    timer: null,
    step: 0,
    nextTime: 0,

    // Demande la musique (en jeu) ou l'arrête
    want(on) {
      this.wanted = on;
      if (on) this.tryStart();
      else this.stop();
    },

    tryStart() {
      if (!this.wanted || this.playing) return;
      if (!Sound.ctx || Sound.ctx.state !== 'running' || !Sound.musicGain) return;
      this.playing = true;
      this.step = 0;
      this.nextTime = Sound.ctx.currentTime + 0.08;
      const g = Sound.musicGain.gain;
      const now = Sound.ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(settings.music / 100, now + 0.6); // fondu d'entrée
      this.timer = setInterval(() => this.schedule(), 25);
    },

    stop() {
      if (!this.playing) return;
      this.playing = false;
      clearInterval(this.timer);
      this.timer = null;
      if (Sound.ctx && Sound.musicGain) {
        const g = Sound.musicGain.gain;
        const now = Sound.ctx.currentTime;
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now);
        g.linearRampToValueAtTime(0, now + 0.4); // fondu de sortie
      }
    },

    tempo() {
      let bpm = 100 + (game.level - 1) * 5;
      if (game.boss.active) bpm += 8;
      return Math.min(bpm, 140);
    },

    // Programme les notes des 120 prochaines millisecondes
    schedule() {
      const ctx = Sound.ctx;
      if (!ctx || ctx.state !== 'running') return;
      if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.02; // rattrapage après une coupure
      while (this.nextTime < ctx.currentTime + 0.12) {
        this.playStep(this.step, this.nextTime);
        this.nextTime += 60 / this.tempo() / 4; // une double croche
        this.step = (this.step + 1) % 64;
      }
    },

    playStep(step, time) {
      const s = step % 16;
      const chord = MUSIC_CHORDS[Math.floor(step / 16) % 4];
      const delay = Math.max(0, time - Sound.ctx.currentTime);
      const out = Sound.musicGain;
      const intense = game.level >= 3 || game.boss.active;
      if (s % 4 === 0) Sound.tone(140, 0.22, 'sine', 0.45, 45, delay, out);            // grosse caisse
      if (s % 4 === 2) Sound.noise(0.05, 0.05, 9000, 7000, delay, out);                // charleston
      if (s % 2 === 0) Sound.tone(chord[0] * (s % 8 === 6 ? 2 : 1), 0.2, 'triangle', 0.2, 0, delay, out); // basse
      if (intense) Sound.tone(chord[1 + (s % 3)] * 2, 0.09, 'square', 0.025, 0, delay, out);            // arpège
      if (game.boss.active && s === 0) Sound.tone(chord[0] * 2, 1.6, 'sawtooth', 0.035, 0, delay, out);  // nappe du boss
    },
  };

  /* ====================================================================
     5. AFFICHAGE
     Le monde du jeu utilise des "unités" : le plus petit côté de l'écran
     vaut toujours 720 unités. L'image n'est donc jamais déformée et le jeu
     reste équitable quelle que soit la taille de la fenêtre.
     ==================================================================== */

  const canvas = $('game');
  const ctx = canvas.getContext('2d');

  const view = {
    dpr: 1,      // densité de pixels de l'écran
    scale: 1,    // pixels CSS par unité de jeu
    W: CONFIG.WORLD_SHORT_SIDE, // largeur du monde en unités
    H: CONFIG.WORLD_SHORT_SIDE, // hauteur du monde en unités
    cssW: 0,     // taille de l'écran (pixels CSS) au dernier redimensionnement
    cssH: 0,
    // Zone de jeu dans l'écran (pixels CSS). Sur téléphone en portrait, elle
    // s'arrête sous le score et au-dessus du joystick.
    ox: 0,
    oy: 0,
    fw: 0,
    fh: 0,
    framed: false, // true quand la zone est plus petite que l'écran (cadre dessiné)
    key: '',
  };

  let stars = [];

  // Calcule la zone de jeu selon l'écran
  function computePlayfield(w, h) {
    const full = { x: 0, y: 0, w: w, h: h, framed: false };
    // Seulement sur écran tactile, en portrait (en paysage et sur ordinateur : tout l'écran)
    if (!input.touchMode || h < w * 1.15) return full;
    const buttons = $('top-buttons').getBoundingClientRect();
    const probe = $('safe-probe').getBoundingClientRect();
    const safeBottom = Math.max(0, h - probe.bottom);
    const top = Math.round(buttons.bottom + 10);                         // sous le score et les boutons
    const bottom = Math.round(joyBottomGap(safeBottom) + joyRadius() * 2 + 12); // au-dessus du joystick
    const fh = h - top - bottom;
    if (fh < w * 0.9) return full; // écran trop court : on garde tout
    return { x: 0, y: top, w: w, h: fh, framed: true };
  }

  function resize() {
    // Taille réelle de l'écran (fiable sur iPhone après une rotation)
    const w = Math.max(1, Math.round(canvas.clientWidth || window.innerWidth));
    const h = Math.max(1, Math.round(canvas.clientHeight || window.innerHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.MAX_PIXEL_RATIO);
    const field = computePlayfield(w, h);
    const key = [w, h, dpr, field.x, field.y, field.w, field.h].join(',');
    if (key === view.key) return; // rien n'a changé

    const oldW = view.W;
    const oldH = view.H;
    const oldRatio = view.cssW ? view.cssW / view.cssH : 0;
    view.key = key;
    view.cssW = w;
    view.cssH = h;
    view.dpr = dpr;
    view.ox = field.x;
    view.oy = field.y;
    view.fw = field.w;
    view.fh = field.h;
    view.framed = field.framed;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    view.scale = Math.min(field.w, field.h) / CONFIG.WORLD_SHORT_SIDE;
    view.W = field.w / view.scale;
    view.H = field.h / view.scale;
    createStars();
    updateJoystickHome();

    if (oldRatio) {
      // Tout garde sa place par rapport à l'écran (un objet au milieu reste au milieu)
      remapWorld(view.W / oldW, view.H / oldH);
      // Rotation du téléphone en pleine partie : petit temps de préparation ("PRÊT ?")
      if (Math.abs(w / h - oldRatio) > 0.15) {
        input.pointer.active = false; // le joystick repart de zéro
        input.pointer.id = null;
        if (game.state === 'playing') game.resumeTimer = Math.max(game.resumeTimer, CONFIG.RESUME_DELAY);
      }
    }

    // Le joueur reste toujours dans l'écran
    const p = game.player;
    if (p) {
      p.x = clamp(p.x, p.r, view.W - p.r);
      p.y = clamp(p.y, p.r, view.H - p.r);
    }
  }

  // Replace tous les objets du jeu quand la forme de l'écran change
  function remapWorld(sx, sy) {
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return;
    const move = function (o) { o.x *= sx; o.y *= sy; };
    if (game.player) move(game.player);
    game.hazards.forEach(move);
    game.energies.forEach(move);
    game.powerups.forEach(move);
    game.mines.forEach(move);
    game.holes.forEach(move);
    game.beams.forEach(move);
    game.particles.forEach(move);
    game.rings.forEach(move);
    game.texts.forEach(move);
    for (const l of game.lasers) l.pos *= l.horizontal ? sy : sx;
    const b = game.boss;
    if (b.active) {
      b.x *= sx;
      b.y *= sy;
      b.targetY = Math.max(view.H * 0.24, 190);
    }
  }

  function createStars() {
    const count = Math.min(260, Math.floor((view.W * view.H) / 7000));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: rand(0, view.W),
        y: rand(0, view.H),
        depth: rand(0.2, 1),
        size: rand(0.8, 2.2),
        phase: rand(0, TAU),
      });
    }
  }

  function updateStars(dt) {
    for (const s of stars) {
      s.y += CONFIG.STAR_SPEED * s.depth * dt;
      s.x -= CONFIG.STAR_SPEED * 0.3 * s.depth * dt;
      if (s.y > view.H) { s.y -= view.H; s.x = rand(0, view.W); }
      if (s.x < 0) s.x += view.W;
    }
  }

  // Le flou lumineux (shadowBlur) se mesure en vrais pixels : on l'adapte à l'écran
  function glow(amount) {
    return amount * view.scale * view.dpr;
  }

  /* ====================================================================
     6. ÉTAT DU JEU
     ==================================================================== */

  const game = {
    state: 'menu', // 'menu' | 'playing' | 'paused' | 'dying' | 'gameover'
    stateChangedAt: 0,

    player: null,
    hazards: [],   // éclats et traqueurs
    energies: [],
    powerups: [],  // bonus posés sur le terrain
    lasers: [],
    beams: [],     // rayons tournants du boss
    mines: [],
    holes: [],     // trous noirs
    particles: [],
    rings: [],
    texts: [],

    time: 0,
    score: 0,
    level: 1,
    best: loadBest(),

    spawnTimer: 0,
    energyTimer: 0,
    laserTimer: 0,
    powerupTimer: 0,
    mineTimer: 0,
    holeTimer: 0,
    ambientTimer: 0,
    resumeTimer: 0,
    deathTimer: 0,

    // Bonus actifs : secondes restantes pour chacun (0 = inactif)
    effects: { shield: 0, slow: 0, magnet: 0 },
    timeScale: 1, // vitesse des dangers (descend pendant le ralenti)

    shake: 0,
    flash: 0,
    bgTime: 0,

    stats: { energy: 0, grazes: 0, powerups: 0, bestCombo: 1, dashes: 0, bosses: 0 },
    newRecord: false,
    finalScore: 0,
    shownScore: 0,

    // Modes : 'normal', 'daily' (défi du jour), 'timeattack' (contre-la-montre), 'zen'
    mode: 'normal',
    dailyKey: '',
    dailyBest: 0,
    newDailyRecord: false,
    bestTA: loadInt(CONFIG.STORAGE_KEY_TIMEATTACK), // record du contre-la-montre
    newModeRecord: false,
    endReason: 'death', // 'death' ou 'time' (fin du contre-la-montre)

    // Boss de survie
    boss: createBoss(),

    // Tutoriel du premier lancement
    tuto: { active: false, step: 0, moved: 0 },

    // Succès obtenus pendant la partie en cours
    sessionAch: [],

    // Combo : actions enchaînées, multiplicateur actuel, temps restant pour enchaîner
    combo: { chain: 0, mult: 1, timer: 0 },

    // Vaisseaux
    points: loadInt(CONFIG.STORAGE_KEY_POINTS), // points cumulés de toutes les parties
    shipId: 'fleche',
  };

  function createBoss() {
    return {
      active: false,
      phase: 'none',   // 'enter' (arrivée), 'fight' (attaques), 'leave' (départ)
      t: 0,
      x: 0,
      y: 0,
      rot: 0,
      attackTimer: 0,
      attackIndex: 0,
      order: [0, 1, 2],
      glow: 0,
      rng: null,
      number: 0,       // combien de boss dans cette partie
    };
  }

  function currentShip() {
    for (const ship of SHIPS) if (ship.id === game.shipId) return ship;
    return SHIPS[0];
  }

  // Durée d'un niveau selon le mode
  function levelDuration() {
    return game.mode === 'timeattack' ? CONFIG.TIMEATTACK_LEVEL_DURATION : CONFIG.LEVEL_DURATION;
  }

  /* --------------------------------------------------------------------
     SUCCÈS
     -------------------------------------------------------------------- */

  // stat + target : succès à compteur (une barre de progression est affichée)
  const ACHIEVEMENTS = [
    { id: 'premier-vol', icon: '🚀', name: 'Premier vol', desc: 'Termine ta première partie.', points: 100 },
    { id: 'survivant', icon: '⏱️', name: 'Survivant', desc: 'Survis 2 minutes en une partie.', points: 300, stat: 'time', target: 120 },
    { id: 'funambule', icon: '🎯', name: 'Funambule', desc: 'Frôle 10 éclats en une partie.', points: 200, stat: 'grazes', target: 10 },
    { id: 'combo-parfait', icon: '🔥', name: 'Combo parfait', desc: 'Atteins le combo x5.', points: 300, stat: 'combo', target: 5 },
    { id: 'collectionneur', icon: '💎', name: 'Collectionneur', desc: 'Ramasse 20 énergies en une partie.', points: 300, stat: 'energy', target: 20 },
    { id: 'chasseur-boss', icon: '👑', name: 'Chasseur de boss', desc: 'Survis à un boss.', points: 500 },
    { id: 'defi-releve', icon: '📅', name: 'Défi relevé', desc: 'Termine un défi du jour.', points: 200 },
    { id: 'vitesse-lumiere', icon: '⚡', name: 'Vitesse lumière', desc: 'Fais 50 dash au total.', points: 200, stat: 'dashes', target: 50 },
    { id: 'intouchable', icon: '🛡️', name: 'Intouchable', desc: 'Atteins le niveau 5 sans prendre de bonus.', points: 400 },
    { id: 'chrono', icon: '⏳', name: 'Contre la montre', desc: 'Fais 1 500 points en contre-la-montre.', points: 300, stat: 'timeattack', target: 1500 },
    { id: 'veteran', icon: '🎖️', name: 'Vétéran', desc: 'Atteins le niveau 10.', points: 500, stat: 'level', target: 10 },
    { id: 'evade', icon: '🌀', name: 'Évadé', desc: 'Échappe à un trou noir qui t\'attirait.', points: 300 },
  ];

  // Données sauvegardées : succès obtenus, meilleures valeurs, dash au total
  const ach = (function () {
    const data = loadJSON(CONFIG.STORAGE_KEY_ACH, {});
    return {
      unlocked: data.unlocked && typeof data.unlocked === 'object' ? data.unlocked : {},
      best: data.best && typeof data.best === 'object' ? data.best : {},
      dashes: Number.isFinite(data.dashes) ? data.dashes : 0,
    };
  })();

  function saveAch() {
    storage.set(CONFIG.STORAGE_KEY_ACH, JSON.stringify(ach));
  }

  // Progression d'un succès à compteur (meilleure valeur atteinte)
  function achProgress(a) {
    if (!a.stat) return 0;
    if (a.stat === 'dashes') return ach.dashes;
    return ach.best[a.stat] || 0;
  }

  // Retient une meilleure valeur (sauvegardée en fin de partie)
  function recordBest(stat, value) {
    if (!(value <= (ach.best[stat] || 0))) ach.best[stat] = value;
  }

  // Débloque un succès (jamais en mode zen) : points cumulés + notification
  function unlockAchievement(id) {
    if (game.mode === 'zen' || ach.unlocked[id]) return;
    let info = null;
    for (const a of ACHIEVEMENTS) if (a.id === id) info = a;
    if (!info) return;
    ach.unlocked[id] = true;
    saveAch();
    const ships = addPoints(info.points);
    game.sessionAch.push(info.name);
    showToast(info.icon + ' Succès : ' + info.name + ' (+' + info.points + ' pts)');
    if (ships.length) showToast('Nouveau vaisseau : ' + ships[0].name + ' !');
    Sound.achievement();
  }

  // Vérifie les succès liés à la partie en cours
  function checkAchievements() {
    if (game.mode === 'zen' || !game.player) return;
    const s = game.stats;
    if (game.time >= 120) unlockAchievement('survivant');
    if (s.grazes >= 10) unlockAchievement('funambule');
    if (s.bestCombo >= 5) unlockAchievement('combo-parfait');
    if (s.energy >= 20) unlockAchievement('collectionneur');
    if (ach.dashes >= 50) unlockAchievement('vitesse-lumiere');
    if (game.level >= 5 && s.powerups === 0) unlockAchievement('intouchable');
    if (game.level >= 10) unlockAchievement('veteran');
  }

  // En fin de partie : meilleures valeurs + succès de fin
  function finishAchievements(finalScore) {
    if (game.mode === 'zen') return;
    recordBest('time', Math.floor(game.time));
    recordBest('grazes', game.stats.grazes);
    recordBest('combo', game.stats.bestCombo);
    recordBest('energy', game.stats.energy);
    recordBest('level', game.level);
    if (game.mode === 'timeattack') recordBest('timeattack', finalScore);
    saveAch();
    unlockAchievement('premier-vol');
    if (game.mode === 'daily') unlockAchievement('defi-releve');
    if (game.mode === 'timeattack' && finalScore >= 1500) unlockAchievement('chrono');
  }

  // Couleur du vaisseau (le Prisme change de couleur en continu)
  function shipColor() {
    const ship = currentShip();
    if (!ship.rainbow) return ship.color;
    return 'hsl(' + Math.floor((game.bgTime * 90) % 360) + ', 100%, 65%)';
  }

  // Vaisseau choisi la dernière fois, s'il est bien débloqué
  function loadShipId() {
    const id = storage.get(CONFIG.STORAGE_KEY_SHIP, 'fleche');
    for (const ship of SHIPS) if (ship.id === id && ship.cost <= game.points) return id;
    return 'fleche';
  }

  function createPlayer() {
    return {
      x: view.W / 2,
      y: view.H / 2,
      vx: 0,
      vy: 0,
      r: CONFIG.PLAYER_RADIUS,
      angle: -Math.PI / 2,
      alive: true,
      dashTime: 0,
      dashCooldown: 0,
      dashDirX: 0,
      dashDirY: -1,
      trailTimer: 0,
      grace: 0, // courte invincibilité après que le bouclier a encaissé un coup
    };
  }

  function clearWorld() {
    game.hazards.length = 0;
    game.energies.length = 0;
    game.powerups.length = 0;
    game.lasers.length = 0;
    game.beams.length = 0;
    game.mines.length = 0;
    game.holes.length = 0;
    game.particles.length = 0;
    game.rings.length = 0;
    game.texts.length = 0;
    game.boss = createBoss();
  }

  const MODES = ['normal', 'daily', 'timeattack', 'zen'];

  // Remet ABSOLUMENT TOUT à zéro pour une nouvelle partie
  function resetGame(mode) {
    game.mode = MODES.indexOf(mode) >= 0 ? mode : 'normal';
    game.dailyKey = todayKey();
    game.dailyBest = loadDailyBest(game.dailyKey);
    game.newDailyRecord = false;
    game.newModeRecord = false;
    game.endReason = 'death';
    game.sessionAch = [];
    game.stats.dashes = 0;
    game.stats.bosses = 0;
    clearToasts();
    // Tutoriel au tout premier lancement de l'appareil
    game.tuto.active = storage.get(CONFIG.STORAGE_KEY_TUTO, '') !== '1';
    game.tuto.step = 0;
    game.tuto.moved = 0;
    // Défi du jour : la même graine pour tout le monde ce jour-là.
    // Partie normale : une graine différente à chaque fois.
    seedStreams(game.mode === 'daily'
      ? 'defi-' + game.dailyKey
      : 'partie-' + Math.random() + '-' + Date.now());

    clearWorld();
    game.player = createPlayer();
    game.time = 0;
    game.score = 0;
    game.level = 1;
    game.spawnTimer = CONFIG.FIRST_SPAWN_DELAY;
    game.energyTimer = CONFIG.FIRST_ENERGY_DELAY;
    game.laserTimer = spawnRng('laser').range(CONFIG.LASER_MIN_INTERVAL, CONFIG.LASER_MAX_INTERVAL);
    resetCombo();
    game.stats.bestCombo = 1;
    game.powerupTimer = CONFIG.POWERUP_FIRST_DELAY;
    game.mineTimer = 3;   // première mine 3 s après le niveau requis
    game.holeTimer = 4;   // premier trou noir 4 s après le niveau requis
    clearPowerupEffects();
    game.ambientTimer = 0;
    game.resumeTimer = 0;
    game.deathTimer = 0;
    game.shake = 0;
    game.flash = 0;
    game.stats.energy = 0;
    game.stats.grazes = 0;
    game.stats.powerups = 0;
    game.newRecord = false;
    game.finalScore = 0;
    game.shownScore = 0;
    input.dashQueued = false;
  }

  /* ====================================================================
     7. COMMANDES
     e.code désigne la position physique de la touche : KeyW/KeyA/KeyS/KeyD
     correspond à ZQSD sur un clavier AZERTY et à WASD sur un QWERTY.
     ==================================================================== */

  const input = {
    keys: new Set(),
    dashQueued: false,
    touchMode: !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches),
    pointer: {
      active: false,
      id: null,
      type: 'mouse',
      x: 0, y: 0,             // souris : position visée (unités de jeu)
      fingerX: 0, fingerY: 0, // joystick : position du pouce (pixels à l'écran)
    },
    joyHome: { x: 0, y: 0 },  // centre du joystick, fixe en bas au milieu (pixels à l'écran)
  };

  const MOVE_KEYS = {
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
  };

  // Touches qui ne doivent jamais faire défiler la page
  const BLOCKED_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

  function isDown(codes) {
    for (let i = 0; i < codes.length; i++) {
      if (input.keys.has(codes[i])) return true;
    }
    return false;
  }

  function clearInput() {
    input.keys.clear();
    input.dashQueued = false;
    input.pointer.active = false;
    input.pointer.id = null;
  }

  function requestDash() {
    if (game.state === 'playing' && game.resumeTimer <= 0) input.dashQueued = true;
  }

  function setTouchMode(enabled) {
    if (input.touchMode === enabled) return;
    input.touchMode = enabled;
    updateUI();
    resize(); // la zone de jeu dépend du mode tactile
  }

  function onKeyDown(e) {
    // On laisse passer les raccourcis du navigateur (Ctrl+R, Ctrl+P…)
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    Sound.unlock();
    const code = e.code;

    // Si un bouton a le focus, Entrée et Espace l'activent normalement
    const onButton = e.target && e.target.closest && e.target.closest('button');
    if (onButton && (code === 'Enter' || code === 'NumpadEnter' || code === 'Space')) return;

    if (BLOCKED_KEYS.has(code)) e.preventDefault();
    input.keys.add(code);
    if (e.repeat) return; // une touche maintenue ne déclenche l'action qu'une fois

    switch (code) {
      case 'Escape':
      case 'KeyP':
        // Dans un sous-écran du menu (vaisseaux, modes, succès, réglages) : Échap = retour
        if (SUB_SCREENS.indexOf(ui.current) >= 0) {
          if (code === 'Escape') backToMenu();
          break;
        }
        togglePause();
        break;
      case 'Space':
      case 'ShiftLeft':
      case 'ShiftRight':
        requestDash();
        break;
      case 'Enter':
      case 'NumpadEnter':
        e.preventDefault();
        if (game.state === 'menu') {
          if (ui.current === 'menu') startGame('normal');
        } else if (game.state === 'gameover' &&
                   performance.now() - game.stateChangedAt > CONFIG.GAMEOVER_INPUT_DELAY) {
          startGame(game.mode); // rejoue le même mode (défi du jour compris)
        } else if (game.state === 'paused') {
          resumeGame();
        }
        break;
      case 'KeyM':
        toggleMute();
        break;
      default:
        break;
    }
  }

  function onKeyUp(e) {
    input.keys.delete(e.code);
  }

  function pointerToWorld(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - view.ox) / view.scale,
      y: (e.clientY - rect.top - view.oy) / view.scale,
    };
  }

  // Position du doigt en pixels à l'écran (pour le joystick)
  function pointerToScreen(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e) {
    e.preventDefault();
    if (e.pointerType === 'mouse') {
      if (e.button === 2) { requestDash(); return; } // clic droit = dash
      if (e.button !== 0) return;
    }
    const ptr = input.pointer;
    if (e.pointerType === 'touch') {
      // Joystick fixe en bas au milieu : le pouce posé dessus le prend,
      // un doigt posé n'importe où ailleurs fait un dash
      const s = pointerToScreen(e);
      const zone = joyRadius() * CONFIG.JOYSTICK_ZONE;
      const onJoystick = Math.hypot(s.x - input.joyHome.x, s.y - input.joyHome.y) <= zone;
      if (ptr.active || !onJoystick) { requestDash(); return; }
      ptr.fingerX = s.x;
      ptr.fingerY = s.y;
    } else {
      if (ptr.active) { requestDash(); return; } // deuxième pointeur = dash
      const pos = pointerToWorld(e);
      ptr.x = pos.x;
      ptr.y = pos.y;
    }
    ptr.active = true;
    ptr.id = e.pointerId;
    ptr.type = e.pointerType;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* sans importance */ }
  }

  function onPointerMove(e) {
    // Clic droit pendant que le clic gauche est maintenu
    if (e.pointerType === 'mouse' && e.button === 2 && (e.buttons & 2)) requestDash();

    const ptr = input.pointer;
    if (!ptr.active || e.pointerId !== ptr.id) return;
    // Le clic gauche a été relâché alors qu'un autre bouton restait enfoncé
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) {
      ptr.active = false;
      ptr.id = null;
      return;
    }
    if (ptr.type === 'touch') {
      const s = pointerToScreen(e);
      ptr.fingerX = s.x;
      ptr.fingerY = s.y;
      return;
    }
    const pos = pointerToWorld(e);
    ptr.x = pos.x;
    ptr.y = pos.y;
  }

  function onPointerEnd(e) {
    if (e.pointerId === input.pointer.id) {
      input.pointer.active = false;
      input.pointer.id = null;
    }
  }

  // Joystick : direction et force (0 à 1) selon la distance du pouce au centre
  function joystickVector() {
    const ptr = input.pointer;
    const R = joyRadius();
    const dx = ptr.fingerX - input.joyHome.x;
    const dy = ptr.fingerY - input.joyHome.y;
    const len = Math.hypot(dx, dy);
    const dead = R * CONFIG.JOYSTICK_DEADZONE;
    if (len <= dead) return { x: 0, y: 0 };
    const force = Math.min(1, (len - dead) / (R - dead));
    return { x: (dx / len) * force, y: (dy / len) * force };
  }

  // Espace entre le bas de l'écran et le joystick (tient compte de la barre du bas des iPhone)
  function joyBottomGap(safeBottom) {
    return Math.max(CONFIG.JOYSTICK_MARGIN, safeBottom + 8);
  }

  // Place du joystick : fixe, en bas au milieu de l'écran
  function updateJoystickHome() {
    const R = joyRadius();
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const probe = $('safe-probe').getBoundingClientRect();
    const safeBottom = Math.max(0, h - probe.bottom);
    input.joyHome.x = w / 2;
    input.joyHome.y = clamp(h - joyBottomGap(safeBottom) - R, R + 8, Math.max(R + 8, h - R - 8));
  }

  /* ====================================================================
     8. INTERFACE
     ==================================================================== */

  const ui = {
    hud: $('hud'),
    score: $('hud-score'),
    best: $('hud-best'),
    level: $('hud-level'),
    btnPause: $('btn-pause'),
    btnSound: $('btn-sound'),
    menuBest: $('menu-best'),
    goScore: $('go-score'),
    goBest: $('go-best'),
    goTime: $('go-time'),
    goLevel: $('go-level'),
    goEnergy: $('go-energy'),
    goGraze: $('go-graze'),
    goPowerups: $('go-powerups'),
    goRecord: $('go-record'),
    goMode: $('go-mode'),
    goBestLabel: $('go-best-label'),
    goCombo: $('go-combo'),
    goPoints: $('go-points'),
    goUnlock: $('go-unlock'),
    goProgress: $('go-progress'),
    btnReplay: $('btn-replay'),
    powerups: $('powerups'),
    bestLabel: $('hud-best-label'),
    combo: $('combo'),
    comboMult: $('combo-mult'),
    comboSteps: $('combo-steps'),
    comboBar: $('combo-bar'),
    menuDaily: $('menu-daily'),
    hangarPoints: $('hangar-points'),
    ships: $('ships'),
    levelLabel: $('hud-level-label'),
    hudBar: $('hud-bar'),
    hudBarFill: $('hud-bar-fill'),
    goTitle: $('go-title'),
    goAch: $('go-ach'),
    toast: $('toast'),
    tuto: $('tuto'),
    tutoStep: $('tuto-step'),
    tutoText: $('tuto-text'),
    achList: $('achievements'),
    achCount: $('ach-count'),
    setMusic: $('set-music'),
    setMusicVal: $('set-music-val'),
    setSfx: $('set-sfx'),
    setSfxVal: $('set-sfx-val'),
    setJoystick: $('set-joystick'),
    setReduce: $('set-reduce'),
    btnTutoAgain: $('btn-tuto-again'),
    current: 'menu', // écran actuellement affiché
    screens: {
      menu: $('screen-menu'),
      pause: $('screen-pause'),
      gameover: $('screen-gameover'),
      hangar: $('screen-hangar'),
      modes: $('screen-modes'),
      achievements: $('screen-achievements'),
      settings: $('screen-settings'),
    },
  };

  // Sous-écrans du menu : Échap ou "Retour" ramène au menu
  const SUB_SCREENS = ['hangar', 'modes', 'achievements', 'settings'];

  const ICON_SOUND_ON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/>' +
    '<path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const ICON_SOUND_OFF =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/>' +
    '<path d="M16 9l6 6M22 9l-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  // Affiche un seul écran (ou aucun si name vaut null)
  function showScreen(name) {
    ui.current = name;
    for (const key in ui.screens) {
      const visible = key === name;
      ui.screens[key].classList.toggle('visible', visible);
      ui.screens[key].setAttribute('aria-hidden', visible ? 'false' : 'true');
    }
    // Évite qu'un bouton garde le focus et réagisse à la barre d'espace pendant le jeu
    const active = document.activeElement;
    if (active && active !== document.body && typeof active.blur === 'function') active.blur();
  }

  function setState(state) {
    game.state = state;
    game.stateChangedAt = performance.now();
    updateUI();
  }

  function updateUI() {
    const s = game.state;
    ui.hud.classList.toggle('hidden', s === 'menu');
    ui.powerups.classList.toggle('hidden', s === 'menu');
    ui.btnPause.classList.toggle('hidden', s !== 'playing');
    ui.tuto.classList.toggle('hidden', !(s === 'playing' && game.tuto.active));
    if (s !== 'playing') ui.toast.classList.add('hidden');
    updateJoystickHome();
  }

  function refreshSoundButton() {
    ui.btnSound.innerHTML = Sound.muted ? ICON_SOUND_OFF : ICON_SOUND_ON;
    ui.btnSound.setAttribute('aria-label', Sound.muted ? 'Activer le son' : 'Couper le son');
    ui.btnSound.setAttribute('aria-pressed', Sound.muted ? 'true' : 'false');
  }

  function toggleMute() {
    Sound.unlock();
    Sound.setMuted(!Sound.muted);
    refreshSoundButton();
    Sound.click();
  }

  // Le HUD n'est modifié que si une valeur change (évite du travail inutile)
  const hudCache = {
    score: null, best: null, level: null,
    comboVisible: null, comboMult: null, comboSteps: null, comboRatio: null,
    slotLabel: null, slotBar: null, slotRatio: null,
  };

  // Record affiché selon le mode
  function modeBest() {
    if (game.mode === 'daily') return game.dailyBest;
    if (game.mode === 'timeattack') return game.bestTA;
    return game.best;
  }

  // 3e case du HUD : niveau, temps restant (contre-la-montre) ou boss
  function hudSlot() {
    if (game.mode === 'timeattack') {
      const left = Math.max(0, CONFIG.TIMEATTACK_DURATION - game.time);
      return { label: 'Temps', value: String(Math.ceil(left)), ratio: left / CONFIG.TIMEATTACK_DURATION };
    }
    const b = game.boss;
    if (b.active && b.phase !== 'leave') {
      const left = b.phase === 'enter' ? CONFIG.BOSS_DURATION : Math.max(0, CONFIG.BOSS_ENTER_TIME + CONFIG.BOSS_DURATION - b.t);
      return { label: 'Boss', value: Math.ceil(left) + ' s', ratio: left / CONFIG.BOSS_DURATION };
    }
    return { label: 'Niveau', value: String(game.level), ratio: -1 };
  }

  function refreshHud() {
    if (game.state === 'menu') return;
    const score = Math.floor(game.score);
    if (score !== hudCache.score) { ui.score.textContent = formatScore(score); hudCache.score = score; }
    if (game.mode === 'zen') {
      if (hudCache.best !== 'zen') { ui.best.textContent = 'ZEN'; hudCache.best = 'zen'; }
    } else {
      const best = Math.max(modeBest(), score);
      if (best !== hudCache.best) { ui.best.textContent = formatScore(best); hudCache.best = best; }
    }
    const slot = hudSlot();
    if (slot.label !== hudCache.slotLabel) { ui.levelLabel.textContent = slot.label; hudCache.slotLabel = slot.label; }
    if (slot.value !== hudCache.level) { ui.level.textContent = slot.value; hudCache.level = slot.value; }
    const showBar = slot.ratio >= 0;
    if (showBar !== hudCache.slotBar) { ui.hudBar.classList.toggle('hidden', !showBar); hudCache.slotBar = showBar; }
    if (showBar) {
      const r = Math.round(clamp(slot.ratio, 0, 1) * 100) / 100;
      if (r !== hudCache.slotRatio) { ui.hudBarFill.style.transform = 'scaleX(' + r + ')'; hudCache.slotRatio = r; }
    }
    if (!ui.toast.classList.contains('hidden')) placeToast();

    // Combo : multiplicateur, progression vers le suivant et temps restant
    const c = game.combo;
    const comboVisible = c.chain > 0;
    if (comboVisible !== hudCache.comboVisible) {
      ui.combo.classList.toggle('hidden', !comboVisible);
      hudCache.comboVisible = comboVisible;
    }
    if (comboVisible) {
      if (c.mult !== hudCache.comboMult) {
        ui.comboMult.textContent = 'x' + c.mult;
        ui.combo.classList.toggle('hot', c.mult >= 3);
        hudCache.comboMult = c.mult;
      }
      const steps = c.mult >= CONFIG.COMBO_MAX ? -1 : c.chain % CONFIG.COMBO_STEP;
      if (steps !== hudCache.comboSteps) {
        ui.comboSteps.textContent = steps < 0
          ? 'MAX'
          : '●'.repeat(steps) + '○'.repeat(CONFIG.COMBO_STEP - steps);
        hudCache.comboSteps = steps;
      }
      const ratio = Math.round((c.timer / CONFIG.COMBO_WINDOW) * 100) / 100;
      if (ratio !== hudCache.comboRatio) {
        ui.comboBar.style.transform = 'scaleX(' + clamp(ratio, 0, 1) + ')';
        hudCache.comboRatio = ratio;
      }
    }

    // Jauges des bonus actifs
    for (const type of POWERUP_TYPES) {
      const chip = powerupChips[type];
      const remaining = game.effects[type];
      const visible = remaining > 0;
      if (visible !== chip.visible) {
        chip.el.classList.toggle('hidden', !visible);
        chip.visible = visible;
      }
      if (visible) {
        const ratio = Math.round((remaining / powerupDuration(type)) * 100) / 100;
        if (ratio !== chip.ratio) {
          chip.bar.style.transform = 'scaleX(' + clamp(ratio, 0, 1) + ')';
          chip.ratio = ratio;
        }
        const warn = remaining < CONFIG.POWERUP_WARN_TIME;
        if (warn !== chip.warn) {
          chip.el.classList.toggle('ending', warn);
          chip.warn = warn;
        }
      }
    }
  }

  // Crée une jauge (nom + barre de temps) par type de bonus, cachée par défaut
  const powerupChips = {};

  function buildPowerupHud() {
    for (const type of POWERUP_TYPES) {
      const el = document.createElement('div');
      el.className = 'pu-chip hidden';
      el.style.setProperty('--pu-color', POWERUPS[type].color);
      const name = document.createElement('span');
      name.className = 'pu-name';
      name.textContent = POWERUPS[type].name;
      const track = document.createElement('span');
      track.className = 'pu-bar';
      const bar = document.createElement('i');
      track.appendChild(bar);
      el.appendChild(name);
      el.appendChild(track);
      ui.powerups.appendChild(el);
      powerupChips[type] = { el: el, bar: bar, visible: false, ratio: -1, warn: false };
    }
  }

  // Textes qui changent selon le mode
  function refreshModeLabels() {
    const labels = { normal: 'Record', daily: 'Défi du jour', timeattack: 'Record 60 s', zen: 'Mode' };
    const replay = { normal: 'Rejouer', daily: 'Rejouer le défi', timeattack: 'Rejouer (60 s)', zen: 'Rejouer' };
    ui.bestLabel.textContent = labels[game.mode];
    ui.btnReplay.textContent = replay[game.mode];
    hudCache.best = null; // force la mise à jour
    hudCache.slotLabel = null;
    hudCache.level = null;
  }

  function refreshMenu() {
    ui.menuBest.textContent = formatScore(game.best);
    ui.menuDaily.textContent = formatScore(loadDailyBest(todayKey()));
  }

  // --- Notifications (succès, vaisseau débloqué) ---
  const toasts = { queue: [], timer: 0 };

  function showToast(text) {
    if (game.state !== 'playing') return; // en fin de partie, l'écran de fin les affiche
    toasts.queue.push(text);
    if (ui.toast.classList.contains('hidden')) nextToast();
  }

  function nextToast() {
    const text = toasts.queue.shift();
    if (!text) {
      ui.toast.classList.add('hidden');
      return;
    }
    ui.toast.textContent = text;
    ui.toast.classList.remove('hidden');
    // relance l'animation d'apparition
    ui.toast.style.animation = 'none';
    void ui.toast.offsetWidth;
    ui.toast.style.animation = '';
    placeToast();
    toasts.timer = 2.6;
  }

  function clearToasts() {
    toasts.queue.length = 0;
    toasts.timer = 0;
    ui.toast.classList.add('hidden');
  }

  function updateToasts(dt) {
    if (toasts.timer <= 0) return;
    toasts.timer -= dt;
    if (toasts.timer <= 0) nextToast();
  }

  // Place la notification juste sous le score, le combo et les bonus : elle ne cache rien
  function placeToast() {
    let bottom = ui.hud.getBoundingClientRect().bottom;
    for (const el of ui.powerups.children) {
      if (!el.classList.contains('hidden')) bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
    }
    ui.toast.style.top = Math.round(bottom + 10) + 'px';
  }

  // --- Sous-écrans du menu ---

  function openSubScreen(name, build) {
    if (game.state !== 'menu') return;
    if (build) build();
    showScreen(name);
    Sound.click();
  }

  function backToMenu() {
    if (SUB_SCREENS.indexOf(ui.current) < 0) return;
    refreshMenu();
    showScreen('menu');
    Sound.click();
  }

  function openHangar() { openSubScreen('hangar', buildHangar); }

  // Écran des modes : met à jour les records affichés
  function buildModes() {
    $('mode-best-normal').textContent = formatScore(game.best);
    $('mode-best-daily').textContent = formatScore(loadDailyBest(todayKey()));
    $('mode-best-timeattack').textContent = formatScore(game.bestTA);
  }

  // Écran des succès
  function buildAchievements() {
    let done = 0;
    ui.achList.textContent = '';
    for (const a of ACHIEVEMENTS) {
      const unlocked = !!ach.unlocked[a.id];
      if (unlocked) done++;
      const el = document.createElement('div');
      el.className = 'ach' + (unlocked ? ' done' : '');
      const icon = document.createElement('span');
      icon.className = 'ach-icon';
      icon.textContent = unlocked ? a.icon : '🔒';
      const name = document.createElement('span');
      name.className = 'ach-name';
      name.textContent = a.name + ' · ' + a.points + ' pts';
      const desc = document.createElement('span');
      desc.className = 'ach-desc';
      desc.textContent = a.desc;
      el.appendChild(icon);
      el.appendChild(name);
      el.appendChild(desc);
      if (a.stat && !unlocked) {
        const track = document.createElement('span');
        track.className = 'ach-progress';
        const bar = document.createElement('i');
        bar.style.transform = 'scaleX(' + clamp(achProgress(a) / a.target, 0, 1) + ')';
        track.appendChild(bar);
        el.appendChild(track);
      }
      ui.achList.appendChild(el);
    }
    ui.achCount.textContent = done + '/' + ACHIEVEMENTS.length;
  }

  // Écran des réglages : affiche les valeurs actuelles
  function buildSettings() {
    ui.setMusic.value = settings.music;
    ui.setMusicVal.textContent = settings.music;
    ui.setSfx.value = settings.sfx;
    ui.setSfxVal.textContent = settings.sfx;
    for (const b of ui.setJoystick.querySelectorAll('button')) {
      const on = b.getAttribute('data-size') === settings.joystick;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    ui.setReduce.checked = settings.reduceFx;
    const planned = storage.get(CONFIG.STORAGE_KEY_TUTO, '') !== '1';
    ui.btnTutoAgain.textContent = planned ? 'Prévu à la prochaine partie ✓' : 'Revoir le tutoriel';
  }

  function applyReduceFx() {
    document.documentElement.classList.toggle('reduce-fx', settings.reduceFx);
  }

  function bindSettings() {
    ui.setMusic.addEventListener('input', function () {
      settings.music = Number(ui.setMusic.value);
      ui.setMusicVal.textContent = settings.music;
      Sound.applyVolumes();
      saveSettings();
    });
    ui.setSfx.addEventListener('input', function () {
      settings.sfx = Number(ui.setSfx.value);
      ui.setSfxVal.textContent = settings.sfx;
      Sound.applyVolumes();
      saveSettings();
    });
    ui.setSfx.addEventListener('change', function () { Sound.unlock(); Sound.collect(); }); // aperçu du volume
    for (const b of ui.setJoystick.querySelectorAll('button')) {
      b.addEventListener('click', function () {
        settings.joystick = b.getAttribute('data-size');
        saveSettings();
        resize(); // la zone de jeu laisse la place au joystick
        updateJoystickHome();
        buildSettings();
        Sound.click();
      });
    }
    ui.setReduce.addEventListener('change', function () {
      settings.reduceFx = ui.setReduce.checked;
      saveSettings();
      applyReduceFx();
    });
    ui.btnTutoAgain.addEventListener('click', function () {
      try { window.localStorage.removeItem(CONFIG.STORAGE_KEY_TUTO); } catch (e) { /* stockage bloqué */ }
      buildSettings();
      Sound.click();
    });
  }

  function nextShip() {
    for (const ship of SHIPS) if (ship.cost > game.points) return ship;
    return null;
  }

  function buildHangar() {
    ui.hangarPoints.textContent = formatScore(game.points);
    ui.ships.textContent = '';
    for (const ship of SHIPS) {
      const unlocked = game.points >= ship.cost;
      const selected = ship.id === game.shipId;
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'ship-tile' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
      tile.style.setProperty('--ship-color', ship.rainbow ? '#ffffff' : ship.color);
      tile.setAttribute('aria-pressed', selected ? 'true' : 'false');
      tile.setAttribute('aria-label', ship.name + (unlocked
        ? (selected ? ', choisi' : ', disponible')
        : ', bloqué, ' + formatScore(ship.cost) + ' points'));

      const preview = document.createElement('canvas');
      preview.className = 'ship-preview';
      drawShipPreview(preview, ship, unlocked);
      const name = document.createElement('span');
      name.className = 'ship-name';
      name.textContent = ship.name;
      const status = document.createElement('span');
      status.className = 'ship-status';
      status.textContent = selected ? 'Choisi' : (unlocked ? 'Choisir' : '🔒 ' + formatScore(ship.cost) + ' pts');
      tile.appendChild(preview);
      tile.appendChild(name);
      tile.appendChild(status);

      if (!unlocked) {
        const track = document.createElement('span');
        track.className = 'ship-progress';
        const bar = document.createElement('i');
        bar.style.transform = 'scaleX(' + clamp(game.points / ship.cost, 0, 1) + ')';
        track.appendChild(bar);
        tile.appendChild(track);
      }

      tile.addEventListener('click', function () { selectShip(ship, tile); });
      ui.ships.appendChild(tile);
    }
  }

  function selectShip(ship, tile) {
    Sound.unlock();
    if (game.points < ship.cost) {
      // Bloqué : le vaisseau tremble
      tile.classList.remove('shake');
      void tile.offsetWidth; // relance l'animation
      tile.classList.add('shake');
      Sound.denied();
      return;
    }
    game.shipId = ship.id;
    storage.set(CONFIG.STORAGE_KEY_SHIP, ship.id);
    Sound.click();
    buildHangar();
  }

  // Ajoute un score aux points cumulés et renvoie les vaisseaux débloqués grâce à lui
  function addPoints(score) {
    const before = game.points;
    game.points = before + Math.max(0, Math.floor(score));
    storage.set(CONFIG.STORAGE_KEY_POINTS, game.points);
    return SHIPS.filter(function (s) { return s.cost > before && s.cost <= game.points; });
  }

  /* ====================================================================
     9. DÉROULEMENT D'UNE PARTIE
     Chaque fonction vérifie l'état actuel : un double clic ou une touche
     appuyée deux fois ne peut jamais lancer deux parties en même temps.
     ==================================================================== */

  function startGame(mode) {
    if (game.state !== 'menu' && game.state !== 'gameover') return;
    Sound.unlock();
    Music.want(false);
    resetGame(mode);
    refreshModeLabels();
    showScreen(null);
    setState('playing');
    if (game.tuto.active) showTutoStep();
    Sound.start();
    Music.want(true); // la musique repart du début
  }

  function pauseGame() {
    if (game.state !== 'playing') return;
    input.dashQueued = false;
    setState('paused');
    showScreen('pause');
    Music.want(false);
  }

  function resumeGame() {
    if (game.state !== 'paused') return;
    showScreen(null);
    game.resumeTimer = CONFIG.RESUME_DELAY;
    setState('playing');
    Sound.click();
    Music.want(true);
  }

  function togglePause() {
    if (game.state === 'playing') pauseGame();
    else if (game.state === 'paused') resumeGame();
  }

  function saveBestIfNeeded(score) {
    if (score > game.best) {
      game.best = score;
      storage.set(CONFIG.STORAGE_KEY_BEST, score);
      return true;
    }
    return false;
  }

  function saveDailyIfNeeded(score) {
    if (game.mode === 'daily' && score > game.dailyBest) {
      game.dailyBest = score;
      saveDailyBest(game.dailyKey, score);
      return true;
    }
    return false;
  }

  function saveTimeAttackIfNeeded(score) {
    if (score > game.bestTA) {
      game.bestTA = score;
      storage.set(CONFIG.STORAGE_KEY_TIMEATTACK, score);
      return true;
    }
    return false;
  }

  function goToMenu() {
    if (game.state !== 'paused' && game.state !== 'gameover') return;
    if (game.state === 'paused' && game.mode !== 'zen') {
      // Partie quittée en cours : son score compte quand même (sauf en zen)
      const score = Math.floor(game.score);
      if (game.mode === 'timeattack') saveTimeAttackIfNeeded(score);
      else saveBestIfNeeded(score);
      saveDailyIfNeeded(score);
      addPoints(score);
      saveAch();
    }
    Music.want(false);
    clearWorld();
    game.player = null;
    game.ambientTimer = 0;
    game.tuto.active = false;
    resetCombo();
    clearPowerupEffects();
    clearToasts();
    refreshMenu();
    showScreen('menu');
    setState('menu');
  }

  // Le joueur est touché : bouclier, mode zen, ou fin de partie
  function hitPlayer(x, y, hazard) {
    if (game.effects.shield > 0) absorbHit(x, y, hazard);
    else if (game.mode === 'zen') zenHit(x, y, hazard);
    else killPlayer();
  }

  // Mode zen : pas de mort, mais le combo et 100 points sont perdus
  function zenHit(x, y, hazard) {
    const p = game.player;
    if (hazard) hazard.dead = true;
    breakCombo();
    game.score = Math.max(0, game.score - CONFIG.ZEN_HIT_PENALTY);
    p.grace = CONFIG.ZEN_GRACE;
    game.flash = Math.max(game.flash, reducedFx() ? 0.15 : 0.35);
    game.shake = Math.max(game.shake, reducedFx() ? 2 : 8);
    burst(x, y, { count: 24, colors: [COLORS.shard, COLORS.white], speed: [80, 300], life: [0.3, 0.7], size: [2, 4], drag: 2.5 });
    addText(p.x, p.y - 36, '-' + CONFIG.ZEN_HIT_PENALTY, COLORS.shard, 18, 0.9, -40);
    Sound.zenHit();
  }

  function killPlayer() {
    const p = game.player;
    p.alive = false;
    clearPowerupEffects(); // les bonus s'arrêtent à la mort
    resetCombo();
    explode(p.x, p.y);
    game.shake = reducedFx() ? 5 : 18;
    game.flash = reducedFx() ? 0.35 : 0.9;
    game.deathTimer = CONFIG.DEATH_DURATION;
    input.dashQueued = false;
    Sound.explosion();
    Music.want(false);
    setState('dying');
  }

  // Contre-la-montre : le temps est écoulé
  function endTimeAttack() {
    game.endReason = 'time';
    clearPowerupEffects();
    resetCombo();
    input.dashQueued = false;
    Music.want(false);
    game.flash = reducedFx() ? 0.15 : 0.4;
    endGame();
  }

  function endGame() {
    const finalScore = Math.floor(game.score);
    const mode = game.mode;
    game.finalScore = finalScore;
    game.shownScore = 0;
    game.newRecord = (mode === 'normal' || mode === 'daily') && saveBestIfNeeded(finalScore);
    game.newDailyRecord = saveDailyIfNeeded(finalScore);
    game.newModeRecord = mode === 'timeattack' && saveTimeAttackIfNeeded(finalScore);
    const pointsBefore = game.points;
    addPoints(finalScore);
    finishAchievements(finalScore); // peut aussi rapporter des points
    const unlocked = SHIPS.filter(function (s) { return s.cost > pointsBefore && s.cost <= game.points; });
    const daily = mode === 'daily';
    const timed = mode === 'timeattack';

    ui.goScore.textContent = '0';
    ui.goTitle.textContent = game.endReason === 'time' ? 'TEMPS ÉCOULÉ !' : 'PARTIE TERMINÉE';
    ui.goMode.classList.toggle('hidden', !daily && !timed);
    ui.goMode.textContent = daily ? 'Défi du jour · ' + formatToday() : 'Contre-la-montre';
    ui.goBestLabel.textContent = daily ? 'Record du jour' : (timed ? 'Record 60 s' : 'Record');
    ui.goBest.textContent = formatScore(modeBest());
    ui.goTime.textContent = formatTime(game.time);
    ui.goLevel.textContent = String(game.level);
    ui.goCombo.textContent = 'x' + game.stats.bestCombo;
    ui.goEnergy.textContent = String(game.stats.energy);
    ui.goGraze.textContent = String(game.stats.grazes);
    ui.goPowerups.textContent = String(game.stats.powerups);
    ui.goPoints.textContent = formatScore(game.points);

    // Badges : record battu, vaisseau débloqué, succès obtenus
    let recordText = '';
    if (game.newRecord) recordText = 'Nouveau record !';
    else if (game.newDailyRecord) recordText = 'Nouveau record du jour !';
    else if (game.newModeRecord) recordText = 'Nouveau record 60 s !';
    ui.goRecord.textContent = recordText;
    ui.goRecord.classList.toggle('hidden', !recordText);
    ui.goAch.textContent = game.sessionAch.length ? '🏆 Succès : ' + game.sessionAch.join(', ') : '';
    ui.goAch.classList.toggle('hidden', game.sessionAch.length === 0);
    ui.goUnlock.textContent = unlocked.length
      ? 'Nouveau vaisseau : ' + unlocked.map(function (s) { return s.name; }).join(', ') + ' !'
      : '';
    ui.goUnlock.classList.toggle('hidden', unlocked.length === 0);
    const next = nextShip();
    ui.goProgress.textContent = next
      ? 'Prochain vaisseau : ' + next.name + ' à ' + formatScore(next.cost) + ' points cumulés'
      : 'Tous les vaisseaux sont débloqués !';
    refreshMenu();

    showScreen('gameover');
    setState('gameover');
    if (game.newRecord || game.newDailyRecord || game.newModeRecord) Sound.record();
    else Sound.gameOver();
    if (unlocked.length) Sound.newShip();
  }

  /* --------------------------------------------------------------------
     TUTORIEL (premier lancement) : 3 étapes qui avancent quand le joueur
     fait l'action. Pendant le tutoriel, le temps de jeu est arrêté :
     aucun ennemi n'apparaît.
     -------------------------------------------------------------------- */

  function showTutoStep() {
    const touch = input.touchMode;
    const texts = [
      touch ? 'Pose le pouce sur le joystick en bas et pousse pour te déplacer' : 'Déplace-toi avec les flèches, ZQSD ou la souris',
      touch ? 'Tape n\'importe où sur l\'écran pour faire un dash (invincible)' : 'Appuie sur Espace pour faire un dash (invincible)',
      'Attrape l\'énergie jaune : +100 points et dash rechargé',
    ];
    ui.tutoStep.textContent = 'Tutoriel · étape ' + (game.tuto.step + 1) + '/3';
    ui.tutoText.textContent = texts[game.tuto.step];
    ui.tuto.classList.remove('hidden');
  }

  function nextTutoStep() {
    game.tuto.step++;
    Sound.collect();
    if (game.tuto.step >= 3) {
      finishTutorial();
      return;
    }
    if (game.tuto.step === 2) {
      // Une énergie apparaît non loin du joueur
      const p = game.player;
      const x = clamp(p.x + (p.x < view.W / 2 ? 180 : -180), 60, view.W - 60);
      const y = clamp(p.y - 80, 90, view.H - 60);
      game.energies.push({ x: x, y: y, r: CONFIG.ENERGY_RADIUS, life: 999, age: 0, collected: false });
    }
    showTutoStep();
  }

  function finishTutorial() {
    if (!game.tuto.active) return;
    game.tuto.active = false;
    storage.set(CONFIG.STORAGE_KEY_TUTO, '1');
    ui.tuto.classList.add('hidden');
    // L'entraînement ne compte pas : la vraie partie commence à zéro
    game.score = 0;
    game.stats.energy = 0;
    game.stats.grazes = 0;
    game.energies.length = 0;
    resetCombo();
    removeDead(game.texts, function (t) { return t.tag !== 'level'; });
    addText(view.W / 2, view.H * 0.3, 'C\'EST PARTI !', COLORS.text, 44, 1.6, -10, 'level');
    Sound.levelUp();
  }

  function updateTutorial(dt) {
    const p = game.player;
    updatePlayer(dt);
    updateEnergies(dt);
    checkCollisions();
    updateEffects(dt);
    if (!game.tuto.active) return;
    if (game.tuto.step === 0) {
      game.tuto.moved += Math.hypot(p.vx, p.vy) * dt;
      if (game.tuto.moved > 150) nextTutoStep();
    } else if (game.tuto.step === 1) {
      if (game.stats.dashes > 0) nextTutoStep();
    } else if (game.stats.energy > 0) {
      nextTutoStep();
    }
  }

  /* ====================================================================
     10. LOGIQUE DU JEU
     ==================================================================== */

  function speedMultiplier() {
    return Math.min(CONFIG.SPEED_MULT_MAX, 1 + (game.level - 1) * CONFIG.SPEED_BONUS_PER_LEVEL);
  }

  function spawnInterval() {
    return Math.max(
      CONFIG.SPAWN_INTERVAL_MIN,
      CONFIG.SPAWN_INTERVAL_START * Math.pow(CONFIG.SPAWN_INTERVAL_FACTOR, game.level - 1)
    );
  }

  // --- Joueur ---

  function updatePlayer(dt) {
    const p = game.player;
    if (!p || !p.alive) return;
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.grace = Math.max(0, p.grace - dt);

    // 1. Vitesse voulue d'après les commandes
    let dx = 0;
    let dy = 0;
    if (isDown(MOVE_KEYS.left)) dx -= 1;
    if (isDown(MOVE_KEYS.right)) dx += 1;
    if (isDown(MOVE_KEYS.up)) dy -= 1;
    if (isDown(MOVE_KEYS.down)) dy += 1;

    let targetVx = 0;
    let targetVy = 0;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy); // même vitesse en diagonale
      targetVx = (dx / len) * CONFIG.PLAYER_SPEED;
      targetVy = (dy / len) * CONFIG.PLAYER_SPEED;
    } else if (input.pointer.active && input.pointer.type === 'touch') {
      // Joystick tactile : plus on pousse loin, plus on va vite
      const j = joystickVector();
      targetVx = j.x * CONFIG.PLAYER_SPEED;
      targetVy = j.y * CONFIG.PLAYER_SPEED;
    } else if (input.pointer.active) {
      // Souris : le vaisseau file vers le pointeur
      const ox = input.pointer.x - p.x;
      const oy = input.pointer.y - p.y;
      const d = Math.hypot(ox, oy);
      if (d > 1) {
        const speed = Math.min(CONFIG.PLAYER_SPEED, d * CONFIG.POINTER_FOLLOW);
        targetVx = (ox / d) * speed;
        targetVy = (oy / d) * speed;
      }
    }

    // 2. Dash
    if (input.dashQueued) {
      input.dashQueued = false;
      if (p.dashCooldown <= 0 && p.dashTime <= 0) startDash(p, targetVx, targetVy);
    }

    // 3. Mouvement (lissage indépendant du nombre d'images par seconde)
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.vx = p.dashDirX * CONFIG.DASH_SPEED;
      p.vy = p.dashDirY * CONFIG.DASH_SPEED;
      if (p.dashTime <= 0) {
        p.dashTime = 0;
        p.vx *= 0.3;
        p.vy *= 0.3;
      }
    } else {
      const k = 1 - Math.exp(-CONFIG.PLAYER_ACCEL * dt);
      p.vx += (targetVx - p.vx) * k;
      p.vy += (targetVy - p.vy) * k;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // 4. Le vaisseau reste dans l'écran
    if (p.x < p.r) { p.x = p.r; if (p.vx < 0) p.vx = 0; }
    if (p.x > view.W - p.r) { p.x = view.W - p.r; if (p.vx > 0) p.vx = 0; }
    if (p.y < p.r) { p.y = p.r; if (p.vy < 0) p.vy = 0; }
    if (p.y > view.H - p.r) { p.y = view.H - p.r; if (p.vy > 0) p.vy = 0; }

    // 5. Orientation et traînée lumineuse
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 25) {
      const wanted = Math.atan2(p.vy, p.vx);
      p.angle += angleDiff(p.angle, wanted) * Math.min(1, dt * 14);
    }
    p.trailTimer -= dt;
    if (speed > 40 && p.trailTimer <= 0) {
      const dashing = p.dashTime > 0;
      p.trailTimer = dashing ? 0.006 : 0.02;
      const back = p.angle + Math.PI;
      addParticle(
        p.x + Math.cos(back) * p.r * 0.6,
        p.y + Math.sin(back) * p.r * 0.6,
        Math.cos(back) * 60 + rand(-25, 25),
        Math.sin(back) * 60 + rand(-25, 25),
        dashing ? 0.35 : 0.28,
        dashing ? 5 : 3.5,
        dashing ? COLORS.white : shipColor(),
        2
      );
    }
  }

  function startDash(p, targetVx, targetVy) {
    let dx = targetVx;
    let dy = targetVy;
    if (Math.hypot(dx, dy) < 1) { dx = p.vx; dy = p.vy; }
    if (Math.hypot(dx, dy) < 25) { dx = Math.cos(p.angle); dy = Math.sin(p.angle); }
    const len = Math.hypot(dx, dy) || 1;
    p.dashDirX = dx / len;
    p.dashDirY = dy / len;
    p.dashTime = CONFIG.DASH_DURATION;
    p.dashCooldown = CONFIG.DASH_COOLDOWN;
    p.angle = Math.atan2(p.dashDirY, p.dashDirX);
    game.stats.dashes++;
    if (game.mode !== 'zen') ach.dashes++; // pour le succès "Vitesse lumière"
    addRing(p.x, p.y, 8, 55, 0.3, shipColor(), 3);
    Sound.dash();
  }

  // --- Éclats et traqueurs ---

  // Forme irrégulière d'un éclat (5 à 8 sommets)
  function shardShape(r, rng) {
    const n = rng.int(5, 8);
    const points = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + rng.range(-0.2, 0.2);
      const rr = r * rng.range(0.88, 1);
      points.push(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    return points;
  }

  // Fabrique un danger mobile (éclat, éclat diviseur, traqueur)
  function makeHazard(o) {
    const isSeeker = o.type === 'seeker';
    return {
      type: o.type,
      x: o.x,
      y: o.y,
      r: o.r,
      hitR: o.r * (isSeeker ? 0.8 : CONFIG.SHARD_HITBOX),
      angle: o.angle,
      speed: o.speed,
      vx: Math.cos(o.angle) * o.speed,
      vy: Math.sin(o.angle) * o.speed,
      rot: o.rot || 0,
      spin: o.spin || 0,
      age: 0,
      entered: !!o.entered, // est déjà entré dans l'écran ?
      grazing: false,       // est en train de frôler le joueur ?
      grazed: false,        // bonus de frôlement déjà donné ?
      homing: isSeeker ? (o.homing || CONFIG.SEEKER_HOMING_TIME) : 0,
      trailTimer: 0,
      points: o.points || null,
      harmless: o.harmless || 0, // inoffensif pendant ce temps (vient d'apparaître)
      splitSeed: o.splitSeed || 0,
      splitTimer: 0,
      dead: false,
    };
  }

  function spawnHazard(type, speedMult, rng) {
    const W = view.W;
    const H = view.H;
    const p = game.player && game.player.alive ? game.player : null;
    const isSeeker = type === 'seeker';
    const isSplitter = type === 'splitter';

    // 1. Tous les tirages au hasard d'abord, toujours dans le même ordre
    //    (c'est ce qui rend le défi du jour identique pour tout le monde)
    const r = isSeeker ? CONFIG.SEEKER_RADIUS
      : (isSplitter ? CONFIG.SPLITTER_RADIUS : rng.range(CONFIG.SHARD_MIN_RADIUS, CONFIG.SHARD_MAX_RADIUS));
    const aimAtPlayer = rng.chance(CONFIG.AIM_AT_PLAYER_CHANCE);
    const spreadX = rng.range(-CONFIG.AIM_SPREAD, CONFIG.AIM_SPREAD);
    const spreadY = rng.range(-CONFIG.AIM_SPREAD, CONFIG.AIM_SPREAD);
    const freeX = rng.range(0.1, 0.9);
    const freeY = rng.range(0.1, 0.9);
    let baseSpeed = isSeeker ? CONFIG.SEEKER_SPEED : rng.range(CONFIG.SHARD_MIN_SPEED, CONFIG.SHARD_MAX_SPEED);
    if (isSplitter) baseSpeed *= CONFIG.SPLITTER_SPEED;
    const rot = rng.range(0, TAU);
    const spin = rng.range(-3, 3);
    const points = isSeeker ? null : shardShape(r, rng);
    const splitSeed = isSplitter ? rng.next() : 0;

    // 2. Point de départ sur le pourtour de l'écran, jamais trop près du joueur
    const out = CONFIG.SPAWN_OFFSCREEN + r;
    let x = 0;
    let y = 0;
    let ok = false;
    for (let i = 0; i < 12 && !ok; i++) {
      const t = rng.next() * (2 * W + 2 * H);
      if (t < W) { x = t; y = -out; }
      else if (t < W + H) { x = W + out; y = t - W; }
      else if (t < 2 * W + H) { x = t - W - H; y = H + out; }
      else { x = -out; y = t - 2 * W - H; }
      ok = !p || Math.hypot(x - p.x, y - p.y) >= CONFIG.SAFE_SPAWN_DISTANCE;
    }
    if (!ok) return;

    // 3. Direction : souvent vers le joueur, sinon vers un point au hasard
    let tx;
    let ty;
    if (p && aimAtPlayer) {
      tx = p.x + spreadX;
      ty = p.y + spreadY;
    } else {
      tx = W * freeX;
      ty = H * freeY;
    }
    const angle = Math.atan2(ty - y, tx - x);
    game.hazards.push(makeHazard({
      type: type, x: x, y: y, r: r, angle: angle, speed: baseSpeed * speedMult,
      rot: rot, spin: spin, points: points, splitSeed: splitSeed,
    }));
  }

  function spawnWave() {
    // Le hasard est tiré avant tout test, pour que la suite reste identique
    const rng = spawnRng('hazard');
    const wantSeeker = rng.chance(CONFIG.SEEKER_CHANCE);
    const wantDouble = rng.chance(CONFIG.DOUBLE_SPAWN_CHANCE);
    const wantSplitter = rng.chance(CONFIG.SPLITTER_CHANCE);
    if (game.hazards.length >= CONFIG.MAX_HAZARDS) return;
    const mult = speedMultiplier();
    let seekers = 0;
    for (const h of game.hazards) if (h.type === 'seeker') seekers++;
    const seeker = game.level >= CONFIG.SEEKER_FROM_LEVEL && seekers < CONFIG.SEEKER_MAX && wantSeeker;
    const splitter = !seeker && game.level >= CONFIG.SPLITTER_FROM_LEVEL && wantSplitter;
    spawnHazard(seeker ? 'seeker' : (splitter ? 'splitter' : 'shard'), mult, rng);
    if (game.level >= CONFIG.DOUBLE_SPAWN_FROM_LEVEL && wantDouble) {
      spawnHazard('shard', mult, rng);
    }
  }

  // Un éclat diviseur éclate en 3 morceaux rapides, en éventail
  function splitHazard(h, pieces) {
    h.dead = true;
    const rng = makeRng(mulberry32(Math.floor(h.splitSeed * 4294967296)));
    for (let i = 0; i < 3; i++) {
      const r = rng.range(9, 12);
      pieces.push(makeHazard({
        type: 'shard', x: h.x, y: h.y, r: r,
        angle: h.angle + (i - 1) * CONFIG.SPLIT_SPREAD,
        speed: h.speed * CONFIG.SPLIT_PIECE_SPEED,
        rot: rng.range(0, TAU), spin: rng.range(-5, 5), points: shardShape(r, rng),
        entered: true, harmless: CONFIG.SPAWN_GRACE,
      }));
    }
    burst(h.x, h.y, { count: 18, colors: [COLORS.shard, COLORS.splitCrack], speed: [60, 220], life: [0.2, 0.5], size: [2, 4], drag: 3 });
    Sound.split();
  }

  function updateHazards(dt, active) {
    const W = view.W;
    const H = view.H;
    const p = game.player;
    const pieces = [];
    for (const h of game.hazards) {
      h.age += dt;
      if (h.harmless > 0) h.harmless -= dt;
      if (h.type === 'splitter' && h.entered && !h.dead && active) {
        h.splitTimer += dt;
        if (h.splitTimer >= CONFIG.SPLIT_TIME) splitHazard(h, pieces);
      }

      // Les traqueurs tournent progressivement vers le joueur
      if (h.type === 'seeker' && active && h.homing > 0 && p && p.alive) {
        if (h.entered) h.homing -= dt;
        const wanted = Math.atan2(p.y - h.y, p.x - h.x);
        const maxTurn = CONFIG.SEEKER_TURN_RATE * dt;
        h.angle += clamp(angleDiff(h.angle, wanted), -maxTurn, maxTurn);
        h.vx = Math.cos(h.angle) * h.speed;
        h.vy = Math.sin(h.angle) * h.speed;
      }

      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rot += h.spin * dt;

      if (!h.entered && h.x > -h.r && h.x < W + h.r && h.y > -h.r && h.y < H + h.r) {
        h.entered = true;
      }

      if (h.type === 'seeker' && active && h.entered) {
        h.trailTimer -= dt;
        if (h.trailTimer <= 0) {
          h.trailTimer = 0.05;
          addParticle(h.x, h.y, -h.vx * 0.2, -h.vy * 0.2, 0.4, 3, COLORS.seeker, 1);
        }
      }
    }

    for (const piece of pieces) game.hazards.push(piece);

    // Suppression des objets sortis de l'écran (pas de fuite de mémoire)
    removeDead(game.hazards, function (h) {
      const m = h.r + CONFIG.DESPAWN_MARGIN;
      const outside = h.x < -m || h.x > W + m || h.y < -m || h.y > H + m;
      return !h.dead && !(h.entered && outside) && h.age < CONFIG.HAZARD_MAX_AGE;
    });
  }

  // --- Énergie ---

  function spawnEnergy(rng) {
    if (game.energies.length >= CONFIG.MAX_ENERGY) return;
    const p = game.player;
    const margin = 60;
    let x = view.W / 2;
    let y = view.H / 2;
    for (let i = 0; i < 15; i++) {
      x = rng.range(margin, view.W - margin);
      y = rng.range(margin + 30, view.H - margin);
      const d = p ? Math.hypot(x - p.x, y - p.y) : 999;
      if (d > 140) break;
    }
    game.energies.push({ x: x, y: y, r: CONFIG.ENERGY_RADIUS, life: CONFIG.ENERGY_LIFETIME, age: 0, collected: false });
  }

  function updateEnergies(dt) {
    const p = game.player;
    const magnet = game.state === 'playing' && game.effects.magnet > 0 && p && p.alive;
    for (const e of game.energies) {
      e.life -= dt;
      e.age += dt;
      // Aimant : l'énergie proche glisse vers le joueur
      if (magnet && !e.collected) {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d < CONFIG.MAGNET_RADIUS && d > 0.001) {
          const move = Math.min(d, CONFIG.MAGNET_SPEED * dt);
          e.x += (dx / d) * move;
          e.y += (dy / d) * move;
          if (e.life < 0.6) e.life = 0.6; // ne disparaît pas pendant qu'elle est attirée
        }
      }
      if (e.life <= 0 && !e.collected) {
        burst(e.x, e.y, { count: 8, colors: [COLORS.energy], speed: [20, 70], life: [0.3, 0.5], size: [2, 3] });
      }
    }
    removeDead(game.energies, function (e) { return e.life > 0 && !e.collected; });
  }

  function collectEnergy(e) {
    const p = game.player;
    e.collected = true;
    addComboAction();
    const points = CONFIG.ENERGY_POINTS * game.combo.mult;
    game.score += points;
    game.stats.energy++;
    p.dashCooldown = 0; // l'énergie recharge le dash
    burst(e.x, e.y, { count: 22, colors: [COLORS.energy, COLORS.white], speed: [80, 260], life: [0.3, 0.6], size: [2, 4], drag: 3 });
    addRing(e.x, e.y, 10, 60, 0.4, COLORS.energy, 3);
    addText(e.x, e.y - 22, '+' + points, COLORS.energy, 20, 0.9, -45);
    Sound.collect();
  }

  // --- Lasers ---

  function spawnLaser(rng) {
    // Tirages d'abord, dans un ordre fixe
    const offset = CONFIG.LASER_OFFSET;
    const horizontal = rng.chance(0.5);
    const shift1 = rng.range(-offset, offset);
    const cross = rng.chance(0.4);
    const shift2 = rng.range(-offset, offset);
    const p = game.player;
    if (!p || !p.alive) return;
    addLaser(horizontal, (horizontal ? p.y : p.x) + shift1);
    if (game.level >= CONFIG.LASER_CROSS_FROM_LEVEL && cross) {
      addLaser(!horizontal, (horizontal ? p.x : p.y) + shift2);
    }
    Sound.laserWarn();
  }

  function addLaser(horizontal, pos) {
    const limit = horizontal ? view.H : view.W;
    game.lasers.push({ horizontal: horizontal, pos: clamp(pos, 30, limit - 30), t: 0, fired: false });
  }

  function laserIsActive(l) {
    return l.t >= CONFIG.LASER_WARNING && l.t < CONFIG.LASER_WARNING + CONFIG.LASER_ACTIVE;
  }

  function updateLasers(dt) {
    for (const l of game.lasers) {
      l.t += dt;
      if (!l.fired && l.t >= CONFIG.LASER_WARNING) {
        l.fired = true;
        game.shake = Math.max(game.shake, reducedFx() ? 2 : 7);
        Sound.laserFire();
        // Étincelles le long du rayon
        const len = l.horizontal ? view.W : view.H;
        for (let i = 0; i < 26; i++) {
          const along = rand(0, len);
          const x = l.horizontal ? along : l.pos;
          const y = l.horizontal ? l.pos : along;
          const a = rand(0, TAU);
          const s = rand(60, 220);
          addParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.25, 0.5), rand(2, 4), COLORS.laser, 3);
        }
      }
    }
    const total = CONFIG.LASER_WARNING + CONFIG.LASER_ACTIVE + CONFIG.LASER_FADE;
    removeDead(game.lasers, function (l) { return l.t < total; });
  }

  // --- Mines (niveau 6+) : clignotent, puis explosent en anneau ---

  function spawnMine(rng) {
    // Tirages d'abord (12 positions possibles), dans un ordre fixe
    const spots = [];
    for (let i = 0; i < 12; i++) spots.push(rng.range(0.1, 0.9), rng.range(0.15, 0.9));
    if (game.mines.length >= CONFIG.MINE_MAX) return;
    const p = game.player;
    for (let i = 0; i < spots.length; i += 2) {
      const x = view.W * spots[i];
      const y = view.H * spots[i + 1];
      if (!p || Math.hypot(x - p.x, y - p.y) >= CONFIG.MINE_SAFE_DISTANCE) {
        game.mines.push({ x: x, y: y, t: 0, exploded: false, ring: 0, beep: 0 });
        return;
      }
    }
  }

  function updateMines(dt, active) {
    for (const m of game.mines) {
      m.t += dt;
      if (!m.exploded) {
        // Bip de plus en plus rapide
        const left = CONFIG.MINE_ARM_TIME - m.t;
        m.beep -= dt;
        if (m.beep <= 0 && left > 0) {
          m.beep = Math.max(0.12, left * 0.3);
          if (active) Sound.mineArm();
        }
        if (m.t >= CONFIG.MINE_ARM_TIME) {
          m.exploded = true;
          burst(m.x, m.y, { count: 30, colors: [COLORS.mine, COLORS.mineRing, COLORS.white], speed: [80, 320], life: [0.3, 0.7], size: [2, 5], drag: 2 });
          game.shake = Math.max(game.shake, reducedFx() ? 2 : 6);
          if (active) Sound.mineBoom();
        }
      } else {
        m.ring = (m.t - CONFIG.MINE_ARM_TIME) * CONFIG.MINE_RING_SPEED;
      }
    }
    removeDead(game.mines, function (m) { return !m.exploded || m.ring < CONFIG.MINE_RING_MAX; });
  }

  // --- Trous noirs (niveau 8+) : attirent le joueur et dévient les éclats ---

  function spawnHole(rng) {
    const spots = [];
    for (let i = 0; i < 12; i++) spots.push(rng.range(0.15, 0.85), rng.range(0.2, 0.85));
    if (game.holes.length > 0) return;
    const p = game.player;
    for (let i = 0; i < spots.length; i += 2) {
      const x = view.W * spots[i];
      const y = view.H * spots[i + 1];
      if (!p || Math.hypot(x - p.x, y - p.y) >= CONFIG.HOLE_SAFE_DISTANCE) {
        game.holes.push({ x: x, y: y, t: 0, rot: 0, caught: false });
        Sound.holeOpen();
        return;
      }
    }
  }

  // Force du trou noir : il grandit à l'apparition et s'éteint à la fin
  function holeStrength(hole) {
    const grow = clamp(hole.t / CONFIG.HOLE_GROW_TIME, 0, 1);
    const fade = clamp((CONFIG.HOLE_LIFETIME - hole.t) / 0.5, 0, 1);
    return Math.min(grow, fade);
  }

  function updateHoles(dt, active) {
    const p = game.player;
    for (const hole of game.holes) {
      hole.t += dt;
      hole.rot += dt * 2.5;
      const s = holeStrength(hole);
      // Les éclats proches sont déviés
      for (const h of game.hazards) {
        const dx = hole.x - h.x;
        const dy = hole.y - h.y;
        const d = Math.hypot(dx, dy);
        if (d < CONFIG.HOLE_RANGE && d > 1) {
          const f = CONFIG.HOLE_PULL_HAZARD * s * (1 - d / CONFIG.HOLE_RANGE) * dt;
          h.vx += (dx / d) * f;
          h.vy += (dy / d) * f;
        }
      }
      // Poussière aspirée (effet visuel)
      if (Math.random() < dt * 30 * s) {
        const a = rand(0, TAU);
        const rr = CONFIG.HOLE_RANGE * rand(0.45, 1);
        addParticle(hole.x + Math.cos(a) * rr, hole.y + Math.sin(a) * rr, -Math.cos(a) * rr * 1.2, -Math.sin(a) * rr * 1.2, 0.8, 2, COLORS.hole, 0);
      }
      if (p && p.alive && Math.hypot(p.x - hole.x, p.y - hole.y) < CONFIG.HOLE_RANGE * 0.8) hole.caught = true;
    }
    removeDead(game.holes, function (hole) {
      if (hole.t < CONFIG.HOLE_LIFETIME) return true;
      if (active && hole.caught && p && p.alive) unlockAchievement('evade');
      return false;
    });
  }

  // Attraction sur le joueur (le dash permet de s'échapper)
  function applyHolePull(dt) {
    const p = game.player;
    if (!p || !p.alive || p.dashTime > 0) return;
    for (const hole of game.holes) {
      const dx = hole.x - p.x;
      const dy = hole.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < CONFIG.HOLE_RANGE && d > 1) {
        const a = CONFIG.HOLE_PULL * holeStrength(hole) * (1 - d / CONFIG.HOLE_RANGE) * game.timeScale;
        p.vx += (dx / d) * a * dt;
        p.vy += (dy / d) * a * dt;
      }
    }
  }

  // --- Boss de survie (tous les 5 niveaux) ---

  function startBoss() {
    const rng = spawnRng('boss');
    const number = game.boss.number + 1;
    const b = createBoss();
    b.active = true;
    b.phase = 'enter';
    b.number = number;
    b.rng = rng;
    b.x = view.W / 2;
    b.targetY = Math.max(view.H * 0.24, 190);
    b.y = -CONFIG.BOSS_RADIUS * 2;
    b.alpha = 1;
    // Ordre des attaques mélangé
    for (let i = 2; i > 0; i--) {
      const j = rng.int(0, i);
      const tmp = b.order[i];
      b.order[i] = b.order[j];
      b.order[j] = tmp;
    }
    b.attackTimer = 1.2;
    game.boss = b;
    Sound.bossAlarm();
  }

  function updateBoss(dt) {
    const b = game.boss;
    if (!b.active) return;
    b.t += dt;
    b.rot += dt * (b.phase === 'fight' ? 0.9 : 0.4);
    const enterEnd = CONFIG.BOSS_ENTER_TIME;
    const fightEnd = enterEnd + CONFIG.BOSS_DURATION;
    if (b.phase === 'enter') {
      const k = clamp(b.t / enterEnd, 0, 1);
      const ease = 1 - Math.pow(1 - k, 3);
      b.y = -CONFIG.BOSS_RADIUS * 2 + (b.targetY + CONFIG.BOSS_RADIUS * 2) * ease;
      if (b.t >= enterEnd) b.phase = 'fight';
    } else if (b.phase === 'fight') {
      b.x = view.W / 2 + Math.sin((b.t - enterEnd) * 0.7) * Math.min(140, view.W * 0.18);
      b.y = b.targetY + Math.sin((b.t - enterEnd) * 1.3) * 12;
      b.attackTimer -= dt;
      b.glow = clamp(1 - b.attackTimer / CONFIG.BOSS_TELEGRAPH, 0, 1);
      if (b.attackTimer <= CONFIG.BOSS_TELEGRAPH && !b.charging) {
        b.charging = true;
        Sound.bossCharge();
      }
      if (b.attackTimer <= 0) {
        bossAttack(b.order[b.attackIndex % 3]);
        b.attackIndex++;
        b.attackTimer = CONFIG.BOSS_ATTACK_INTERVAL * Math.max(0.65, 1 - (b.number - 1) * 0.1);
        b.charging = false;
        b.glow = 0;
      }
      if (b.t >= fightEnd) bossDefeated();
    } else {
      const k = clamp((b.t - fightEnd) / CONFIG.BOSS_LEAVE_TIME, 0, 1);
      b.y = b.targetY - (b.targetY + CONFIG.BOSS_RADIUS * 3) * k * k;
      b.alpha = 1 - k;
      if (k >= 1) {
        b.active = false;
        b.phase = 'none';
      }
    }
  }

  // Les 3 attaques du boss (tirages toujours dans le même ordre : défi du jour identique)
  function bossAttack(kind) {
    const b = game.boss;
    const rng = b.rng;
    const p = game.player;
    const mult = speedMultiplier();
    const toPlayer = p ? Math.atan2(p.y - b.y, p.x - b.x) : Math.PI / 2;
    if (kind === 0) {
      // Couronne d'éclats, avec un passage près du joueur
      const n = CONFIG.BOSS_RING_SHARDS;
      const offset = rng.range(0, TAU);
      const gapAngle = toPlayer + rng.range(-0.6, 0.6);
      const gapHalf = (CONFIG.BOSS_RING_GAP / 2) * (TAU / n);
      for (let i = 0; i < n; i++) {
        const a = offset + (i / n) * TAU;
        const r = rng.range(10, 14);
        const rot = rng.range(0, TAU);
        const spin = rng.range(-4, 4);
        const points = shardShape(r, rng);
        if (Math.abs(angleDiff(a, gapAngle)) < gapHalf) continue;
        game.hazards.push(makeHazard({
          type: 'shard', x: b.x + Math.cos(a) * CONFIG.BOSS_RADIUS, y: b.y + Math.sin(a) * CONFIG.BOSS_RADIUS,
          r: r, angle: a, speed: 190 * mult, rot: rot, spin: spin, points: points, entered: true,
        }));
      }
    } else if (kind === 1) {
      // Rayon tournant : il démarre à côté du joueur et balaie sa zone
      const dir = rng.chance(0.5) ? 1 : -1;
      const start = toPlayer - dir * CONFIG.BOSS_BEAM_SWEEP * 0.4;
      game.beams.push({ x: b.x, y: b.y, start: start, sweep: dir * CONFIG.BOSS_BEAM_SWEEP, angle: start, t: 0, fired: false });
    } else {
      // Salve de 3 traqueurs
      for (let i = -1; i <= 1; i++) {
        const a = toPlayer + i * 0.5 + rng.range(-0.1, 0.1);
        game.hazards.push(makeHazard({
          type: 'seeker', x: b.x + Math.cos(a) * CONFIG.BOSS_RADIUS, y: b.y + Math.sin(a) * CONFIG.BOSS_RADIUS,
          r: CONFIG.SEEKER_RADIUS, angle: a, speed: CONFIG.SEEKER_SPEED * 1.2 * mult, entered: true, homing: 2.5,
        }));
      }
    }
  }

  function beamActive(bm) {
    return bm.t >= CONFIG.BOSS_BEAM_WARNING && bm.t < CONFIG.BOSS_BEAM_WARNING + CONFIG.BOSS_BEAM_ACTIVE;
  }

  function updateBeams(dt, active) {
    const b = game.boss;
    for (const bm of game.beams) {
      bm.t += dt;
      if (b.active) { bm.x = b.x; bm.y = b.y; } // le rayon part toujours du boss
      const k = clamp((bm.t - CONFIG.BOSS_BEAM_WARNING) / CONFIG.BOSS_BEAM_ACTIVE, 0, 1);
      bm.angle = bm.start + bm.sweep * k;
      if (!bm.fired && bm.t >= CONFIG.BOSS_BEAM_WARNING) {
        bm.fired = true;
        game.shake = Math.max(game.shake, reducedFx() ? 2 : 6);
        if (active) Sound.laserFire();
      }
    }
    const total = CONFIG.BOSS_BEAM_WARNING + CONFIG.BOSS_BEAM_ACTIVE + 0.25;
    removeDead(game.beams, function (bm) { return bm.t < total; });
  }

  // Le joueur a survécu : gros bonus et explosion de couleurs
  function bossDefeated() {
    const b = game.boss;
    b.phase = 'leave';
    b.glow = 0;
    game.beams.length = 0;
    const bonus = CONFIG.BOSS_BONUS * game.level * game.combo.mult;
    game.score += bonus;
    game.stats.bosses++;
    const colors = [COLORS.boss, COLORS.bossCore, COLORS.energy, COLORS.shield, COLORS.slow, shipColor(), COLORS.white];
    burst(b.x, b.y, { count: 140, colors: colors, speed: [120, 620], life: [0.6, 1.6], size: [2, 6], drag: 1.8 });
    addRing(b.x, b.y, 20, 320, 1.0, COLORS.bossCore, 5);
    addRing(b.x, b.y, 20, 440, 1.3, COLORS.white, 2);
    game.shake = Math.max(game.shake, reducedFx() ? 3 : 14);
    game.flash = Math.max(game.flash, reducedFx() ? 0.15 : 0.5);
    removeDead(game.texts, function (t) { return t.tag !== 'level'; });
    addText(view.W / 2, view.H * 0.46, 'NOYAU VAINCU !', COLORS.bossCore, 40, 2.2, -10, 'level');
    addText(view.W / 2, view.H * 0.46 + 46, '+' + formatScore(bonus), COLORS.energy, 26, 2.2, -10, 'level');
    Sound.bossWin();
    unlockAchievement('chasseur-boss');
  }

  // --- Bonus temporaires (bouclier, ralenti, aimant) ---

  function clearPowerupEffects() {
    for (const type of POWERUP_TYPES) game.effects[type] = 0;
    game.timeScale = 1;
  }

  function spawnPowerup(rng) {
    const pick = rng.next();
    if (game.powerups.length > 0) return; // un seul bonus à la fois sur le terrain
    const p = game.player;
    // De préférence un bonus qui n'est pas déjà actif
    let choices = POWERUP_TYPES.filter(function (t) { return game.effects[t] <= 0; });
    if (choices.length === 0) choices = POWERUP_TYPES;
    const type = choices[Math.min(choices.length - 1, Math.floor(pick * choices.length))];

    const margin = 70;
    let x = view.W / 2;
    let y = view.H / 2;
    for (let i = 0; i < 15; i++) {
      x = rng.range(margin, view.W - margin);
      y = rng.range(margin + 30, view.H - margin);
      if (!p || Math.hypot(x - p.x, y - p.y) > 160) break;
    }
    game.powerups.push({ type: type, x: x, y: y, r: CONFIG.POWERUP_RADIUS, life: CONFIG.POWERUP_LIFETIME, age: 0, collected: false });
    addRing(x, y, 6, 50, 0.5, POWERUPS[type].color, 2);
  }

  function updatePowerups(dt) {
    for (const pu of game.powerups) {
      pu.life -= dt;
      pu.age += dt;
      if (pu.life <= 0 && !pu.collected) {
        burst(pu.x, pu.y, { count: 10, colors: [POWERUPS[pu.type].color], speed: [20, 80], life: [0.3, 0.6], size: [2, 3] });
      }
    }
    removeDead(game.powerups, function (pu) { return pu.life > 0 && !pu.collected; });
  }

  function collectPowerup(pu) {
    const info = POWERUPS[pu.type];
    pu.collected = true;
    game.effects[pu.type] = powerupDuration(pu.type); // reprendre le même bonus recharge sa durée
    game.stats.powerups++;
    addComboAction();
    burst(pu.x, pu.y, { count: 26, colors: [info.color, COLORS.white], speed: [80, 280], life: [0.3, 0.7], size: [2, 4], drag: 3 });
    addRing(pu.x, pu.y, 10, 80, 0.5, info.color, 3);
    addText(pu.x, pu.y - 28, info.name.toUpperCase() + ' !', info.color, 22, 1.1, -40);
    Sound.powerUp();
    if (pu.type === 'slow') Sound.slowStart();
  }

  // Décompte des bonus actifs (en temps réel, même pendant le ralenti)
  function updateActivePowerups(dt) {
    for (const type of POWERUP_TYPES) {
      if (game.effects[type] > 0) {
        game.effects[type] -= dt;
        if (game.effects[type] <= 0) {
          game.effects[type] = 0;
          Sound.powerEnd();
        }
      }
    }
    // Passage en douceur vers le ralenti, puis retour à la vitesse normale
    const target = game.effects.slow > 0 ? CONFIG.SLOW_FACTOR : 1;
    game.timeScale += (target - game.timeScale) * (1 - Math.exp(-8 * dt));
    if (Math.abs(target - game.timeScale) < 0.001) game.timeScale = target;
  }

  // Le bouclier encaisse un coup à la place du joueur
  function absorbHit(x, y, hazard) {
    const p = game.player;
    game.effects.shield = 0;
    p.grace = CONFIG.SHIELD_GRACE;
    if (hazard) hazard.dead = true; // l'éclat est détruit
    burst(x, y, { count: 30, colors: [COLORS.shield, COLORS.white, COLORS.shard], speed: [80, 360], life: [0.3, 0.8], size: [2, 5], drag: 2.5 });
    addRing(p.x, p.y, p.r + 14, 130, 0.5, COLORS.shield, 4);
    addText(p.x, p.y - 36, 'Bouclier brisé !', COLORS.shield, 16, 1, -40);
    game.shake = Math.max(game.shake, reducedFx() ? 2 : 8);
    Sound.shieldHit();
    breakCombo(); // un coup encaissé fait perdre le combo
  }

  // --- Combo ---

  // Une action réussie (frôlement, énergie, bonus) fait grimper le combo
  function addComboAction() {
    const c = game.combo;
    c.chain++;
    c.timer = CONFIG.COMBO_WINDOW;
    const mult = Math.min(CONFIG.COMBO_MAX, 1 + Math.floor(c.chain / CONFIG.COMBO_STEP));
    if (mult > c.mult) {
      c.mult = mult;
      if (mult > game.stats.bestCombo) game.stats.bestCombo = mult;
      const p = game.player;
      removeDead(game.texts, function (t) { return t.tag !== 'combo'; });
      addText(p.x, p.y - 72, 'COMBO x' + mult + ' !', COLORS.combo, 18 + mult * 3, 1.1, -30, 'combo');
      addRing(p.x, p.y, p.r + 6, 70 + mult * 10, 0.45, COLORS.combo, 3);
      Sound.comboUp(mult);
    }
  }

  function resetCombo() {
    game.combo.chain = 0;
    game.combo.mult = 1;
    game.combo.timer = 0;
  }

  // Combo perdu (temps écoulé ou coup encaissé), avec un petit signal
  function breakCombo() {
    const p = game.player;
    if (game.combo.mult > 1 && p) {
      addText(p.x, p.y - 72, 'Combo perdu', COLORS.combo, 14, 0.9, -30, 'combo');
      Sound.comboLost();
    }
    resetCombo();
  }

  // Le temps pour enchaîner s'écoule en temps réel (même pendant le ralenti)
  function updateCombo(dt) {
    const c = game.combo;
    if (c.chain === 0) return;
    c.timer -= dt;
    if (c.timer <= 0) breakCombo();
  }

  // Petit clignotement d'un effet quand il va bientôt s'arrêter
  function powerupFade(type) {
    const t = game.effects[type];
    if (t > CONFIG.POWERUP_WARN_TIME) return 1;
    return Math.floor(t * 8) % 2 === 0 ? 0.35 : 1;
  }

  // --- Collisions ---

  function checkCollisions() {
    const p = game.player;
    if (!p || !p.alive) return;
    const invincible = p.dashTime > 0 || p.grace > 0;
    const pr = p.r * CONFIG.PLAYER_HITBOX;

    // Énergie (zone de ramassage généreuse)
    for (const e of game.energies) {
      if (e.collected) continue;
      const rr = p.r + e.r;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy < rr * rr) collectEnergy(e);
    }

    // Bonus temporaires
    for (const pu of game.powerups) {
      if (pu.collected) continue;
      const rr = p.r + pu.r;
      const dx = pu.x - p.x;
      const dy = pu.y - p.y;
      if (dx * dx + dy * dy < rr * rr) collectPowerup(pu);
    }

    // Éclats et traqueurs
    for (const h of game.hazards) {
      if (h.dead || h.harmless > 0) continue;
      const dx = h.x - p.x;
      const dy = h.y - p.y;
      const d2 = dx * dx + dy * dy;
      const hitDist = pr + h.hitR;
      if (!invincible && d2 < hitDist * hitDist) {
        hitPlayer(h.x, h.y, h);
        return;
      }
      const grazeDist = hitDist + CONFIG.NEAR_MISS_MARGIN;
      if (d2 < grazeDist * grazeDist) {
        if (!invincible) h.grazing = true;
      } else if (h.grazing && !h.grazed) {
        // L'éclat est passé tout près sans toucher : bonus !
        h.grazing = false;
        h.grazed = true;
        addComboAction();
        const points = CONFIG.NEAR_MISS_POINTS * game.combo.mult;
        game.score += points;
        game.stats.grazes++;
        addText(p.x, p.y - 30, 'Frôlé ! +' + points, shipColor(), 15, 0.8, -40);
        Sound.graze();
      }
    }

    if (invincible) return;

    // Lasers
    for (const l of game.lasers) {
      if (!laserIsActive(l)) continue;
      const d = l.horizontal ? Math.abs(p.y - l.pos) : Math.abs(p.x - l.pos);
      if (d < CONFIG.LASER_WIDTH / 2 + pr * 0.6) {
        hitPlayer(p.x, p.y, null);
        return;
      }
    }

    // Mines : le corps (avant l'explosion) puis l'anneau
    for (const m of game.mines) {
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (!m.exploded) {
        if (d < CONFIG.MINE_RADIUS + pr) {
          m.t = CONFIG.MINE_ARM_TIME; // la mine touchée explose tout de suite
          hitPlayer(m.x, m.y, null);
          return;
        }
      } else if (Math.abs(d - m.ring) < CONFIG.MINE_RING_WIDTH / 2 + pr * 0.7) {
        hitPlayer(p.x, p.y, null);
        return;
      }
    }

    // Centre des trous noirs
    for (const hole of game.holes) {
      if (holeStrength(hole) > 0.3 && Math.hypot(p.x - hole.x, p.y - hole.y) < CONFIG.HOLE_CORE + pr) {
        hitPlayer(hole.x, hole.y, null);
        return;
      }
    }

    // Boss : son corps et ses rayons tournants
    const b = game.boss;
    if (b.active && b.phase !== 'leave' && Math.hypot(p.x - b.x, p.y - b.y) < CONFIG.BOSS_RADIUS * 0.8 + pr) {
      hitPlayer(p.x, p.y, null);
      return;
    }
    for (const bm of game.beams) {
      if (!beamActive(bm)) continue;
      const dx = p.x - bm.x;
      const dy = p.y - bm.y;
      const along = dx * Math.cos(bm.angle) + dy * Math.sin(bm.angle);
      const perp = Math.abs(-dx * Math.sin(bm.angle) + dy * Math.cos(bm.angle));
      if (along > 0 && perp < CONFIG.BOSS_BEAM_WIDTH / 2 + pr * 0.6) {
        hitPlayer(p.x, p.y, null);
        return;
      }
    }
  }

  function onLevelUp() {
    const cx = view.W / 2;
    // Quand un boss est là (ou arrive), les annonces passent sous lui
    const bossOnScreen = game.boss.active || game.level % CONFIG.BOSS_EVERY === 0;
    const cy = view.H * (bossOnScreen ? 0.46 : 0.3);
    let line = 0;
    // Retire l'annonce du niveau précédent pour que les textes ne se superposent pas
    removeDead(game.texts, function (t) { return t.tag !== 'level'; });
    addText(cx, cy, 'NIVEAU ' + game.level, COLORS.text, 46, 1.8, -10, 'level');
    const announce = function (text, color) {
      line++;
      addText(cx, cy + 8 + line * 38, text, color, 22, 2.4, -10, 'level');
    };
    if (game.level === CONFIG.SEEKER_FROM_LEVEL) announce('Les traqueurs arrivent !', COLORS.seeker);
    if (game.level === CONFIG.LASER_FROM_LEVEL) {
      announce('Attention aux lasers !', COLORS.laser);
      game.laserTimer = 2;
    }
    if (game.level === CONFIG.SPLITTER_FROM_LEVEL) announce('Les gros éclats se divisent !', COLORS.shard);
    if (game.level === CONFIG.MINE_FROM_LEVEL) {
      announce('Attention aux mines !', COLORS.mine);
      game.mineTimer = 2;
    }
    if (game.level === CONFIG.HOLE_FROM_LEVEL) {
      announce('Trous noirs en approche !', COLORS.hole);
      game.holeTimer = 2;
    }
    if (game.level % CONFIG.BOSS_EVERY === 0 && !game.boss.active) {
      announce('ALERTE : un boss arrive ! Survis 20 s', COLORS.boss);
      startBoss();
    }
    Sound.levelUp();
    checkAchievements();
  }

  // --- Mises à jour selon l'état ---

  function updateMenu(dt) {
    // Des éclats décoratifs traversent l'écran derrière le menu
    game.ambientTimer -= dt;
    if (game.ambientTimer <= 0) {
      game.ambientTimer = CONFIG.MENU_SPAWN_INTERVAL;
      if (game.hazards.length < 25) spawnHazard('shard', 0.55, makeRng(Math.random));
    }
    updateHazards(dt, false);
    updateEffects(dt);
  }

  function updatePlaying(dt) {
    // Petit temps de préparation après une pause : le monde reste figé
    if (game.resumeTimer > 0) {
      game.resumeTimer = Math.max(0, game.resumeTimer - dt);
      return;
    }

    // Tutoriel : le temps de jeu est arrêté, aucun ennemi n'apparaît
    if (game.tuto.active) {
      updateTutorial(dt);
      return;
    }

    game.time += dt;
    // Contre-la-montre : la partie s'arrête au bout de 60 s
    if (game.mode === 'timeattack' && game.time >= CONFIG.TIMEATTACK_DURATION) {
      game.time = CONFIG.TIMEATTACK_DURATION;
      endTimeAttack();
      return;
    }
    const level = 1 + Math.floor(game.time / levelDuration());
    if (level > game.level) {
      game.level = level;
      onLevelUp();
    }
    // Points de survie, multipliés par le combo
    game.score += dt * CONFIG.POINTS_PER_SECOND * (1 + (game.level - 1) * CONFIG.SCORE_LEVEL_BONUS) * game.combo.mult;

    updateActivePowerups(dt);
    updateCombo(dt);
    updatePlayer(dt);
    applyHolePull(dt);

    // Le ralenti n'agit que sur les dangers : le joueur garde toute sa vitesse
    const worldDt = dt * game.timeScale;
    // Pendant le boss, les apparitions normales s'arrêtent
    const calm = game.boss.active;

    // Apparitions
    if (!calm) {
      game.spawnTimer -= worldDt;
      if (game.spawnTimer <= 0) {
        game.spawnTimer = spawnInterval();
        spawnWave();
      }
      if (game.level >= CONFIG.MINE_FROM_LEVEL) {
        game.mineTimer -= worldDt;
        if (game.mineTimer <= 0) {
          const rng = spawnRng('mine');
          game.mineTimer = rng.range(CONFIG.MINE_MIN_INTERVAL, CONFIG.MINE_MAX_INTERVAL);
          spawnMine(rng);
        }
      }
      if (game.level >= CONFIG.HOLE_FROM_LEVEL) {
        game.holeTimer -= worldDt;
        if (game.holeTimer <= 0) {
          const rng = spawnRng('hole');
          game.holeTimer = rng.range(CONFIG.HOLE_MIN_INTERVAL, CONFIG.HOLE_MAX_INTERVAL);
          spawnHole(rng);
        }
      }
    }
    game.energyTimer -= dt;
    if (game.energyTimer <= 0) {
      const rng = spawnRng('energy');
      game.energyTimer = rng.range(CONFIG.ENERGY_MIN_INTERVAL, CONFIG.ENERGY_MAX_INTERVAL);
      spawnEnergy(rng);
    }
    game.powerupTimer -= dt;
    if (game.powerupTimer <= 0) {
      const rng = spawnRng('powerup');
      game.powerupTimer = rng.range(CONFIG.POWERUP_MIN_INTERVAL, CONFIG.POWERUP_MAX_INTERVAL);
      spawnPowerup(rng);
    }
    if (game.level >= CONFIG.LASER_FROM_LEVEL && !calm) {
      game.laserTimer -= worldDt;
      if (game.laserTimer <= 0) {
        const rng = spawnRng('laser');
        const faster = Math.max(0.6, 1 - (game.level - CONFIG.LASER_FROM_LEVEL) * 0.05);
        game.laserTimer = rng.range(CONFIG.LASER_MIN_INTERVAL, CONFIG.LASER_MAX_INTERVAL) * faster;
        spawnLaser(rng);
      }
    }

    updateHazards(worldDt, true);
    updateMines(worldDt, true);
    updateHoles(worldDt, true);
    updateBoss(worldDt);
    updateBeams(worldDt, true);
    updateEnergies(dt);
    updatePowerups(dt);
    updateLasers(worldDt);
    checkCollisions();
    checkAchievements();
    updateEffects(dt);
  }

  function updateDying(dt) {
    game.deathTimer -= dt;
    const slow = dt * CONFIG.DEATH_SLOWMO; // ralenti pendant l'explosion
    updateWorldOnly(slow);
    updateEffects(dt);
    if (game.deathTimer <= 0) endGame();
  }

  // Le décor continue de bouger (sans attaques ni sons) après la partie
  function updateWorldOnly(dt) {
    updateHazards(dt, false);
    updateMines(dt, false);
    updateHoles(dt, false);
    updateBeams(dt, false);
    updateEnergies(dt);
    updatePowerups(dt);
    updateLasers(dt);
  }

  function updateGameOver(dt) {
    updateWorldOnly(dt * 0.35);
    updateEffects(dt);

    // Le score final défile jusqu'à sa valeur
    if (game.shownScore < game.finalScore) {
      const step = Math.max(1, game.finalScore) * dt / CONFIG.SCORE_COUNT_DURATION;
      game.shownScore = Math.min(game.finalScore, game.shownScore + step);
      ui.goScore.textContent = formatScore(game.shownScore);
    }
  }

  function update(dt) {
    if (game.state !== 'paused') {
      game.bgTime += dt;
      updateStars(dt);
      game.shake *= Math.exp(-CONFIG.SHAKE_DECAY * dt);
      if (game.shake < 0.05) game.shake = 0;
      game.flash = Math.max(0, game.flash - dt * CONFIG.FLASH_DECAY);
    }

    if (game.state === 'playing') updateToasts(dt);

    switch (game.state) {
      case 'menu': updateMenu(dt); break;
      case 'playing': updatePlaying(dt); break;
      case 'dying': updateDying(dt); break;
      case 'gameover': updateGameOver(dt); break;
      default: break; // 'paused' : tout reste figé
    }
  }

  /* ====================================================================
     11. EFFETS VISUELS
     ==================================================================== */

  function addParticle(x, y, vx, vy, life, size, color, drag) {
    if (game.particles.length >= CONFIG.MAX_PARTICLES) return;
    if (reducedFx() && Math.random() < 0.6) return; // réglage "réduire les effets"
    game.particles.push({ x: x, y: y, vx: vx, vy: vy, life: life, maxLife: life, size: size, color: color, drag: drag || 0 });
  }

  function burst(x, y, o) {
    for (let i = 0; i < o.count; i++) {
      const a = rand(0, TAU);
      const s = rand(o.speed[0], o.speed[1]);
      addParticle(
        x, y,
        Math.cos(a) * s, Math.sin(a) * s,
        rand(o.life[0], o.life[1]),
        rand(o.size[0], o.size[1]),
        o.colors[i % o.colors.length],
        o.drag || 0
      );
    }
  }

  function addRing(x, y, r0, r1, life, color, width) {
    game.rings.push({ x: x, y: y, r0: r0, r1: r1, life: life, maxLife: life, color: color, width: width });
  }

  function addText(x, y, text, color, size, life, vy, tag) {
    game.texts.push({ x: x, y: y, text: text, color: color, size: size, life: life, maxLife: life, vy: vy || 0, tag: tag || null });
  }

  function explode(x, y) {
    const color = shipColor();
    burst(x, y, { count: 80, colors: [color, COLORS.white, COLORS.shard], speed: [80, 560], life: [0.5, 1.3], size: [2, 6], drag: 2.2 });
    addRing(x, y, 10, 170, 0.7, COLORS.white, 4);
    addRing(x, y, 10, 280, 1.0, color, 2);
  }

  function updateEffects(dt) {
    for (const pa of game.particles) {
      pa.life -= dt;
      if (pa.drag) {
        const f = Math.exp(-pa.drag * dt);
        pa.vx *= f;
        pa.vy *= f;
      }
      pa.x += pa.vx * dt;
      pa.y += pa.vy * dt;
    }
    removeDead(game.particles, function (pa) { return pa.life > 0; });

    for (const ring of game.rings) ring.life -= dt;
    removeDead(game.rings, function (ring) { return ring.life > 0; });

    for (const t of game.texts) {
      t.life -= dt;
      t.y += t.vy * dt;
    }
    removeDead(game.texts, function (t) { return t.life > 0; });
  }

  /* ====================================================================
     12. DESSIN
     ==================================================================== */

  function render() {
    const k = view.dpr * view.scale;

    // Fond
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Tremblement de l'écran (figé pendant la pause)
    let sx = 0;
    let sy = 0;
    if (game.shake > 0 && game.state !== 'paused') {
      sx = rand(-1, 1) * game.shake;
      sy = rand(-1, 1) * game.shake;
    }
    // Zone de jeu : sur téléphone en portrait, rien ne dépasse du cadre
    const ox = view.ox * view.dpr;
    const oy = view.oy * view.dpr;
    if (view.framed) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, view.fw * view.dpr, view.fh * view.dpr);
      ctx.clip();
    }
    ctx.setTransform(k, 0, 0, k, ox + sx * k, oy + sy * k);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    drawGrid();
    drawStars();
    drawHoles();
    drawEnergies();
    drawPowerups();
    drawMines();
    drawLasers();
    drawBeams();
    drawHazards();
    drawBoss();
    drawEdgeWarnings();
    drawPlayer();
    drawParticles();
    drawRings();
    drawTexts();
    drawResumeHint();
    if (view.framed) {
      ctx.restore();
      drawFieldFrame();
    }

    // Teinte violette pendant le ralenti
    const slowAmount = (1 - game.timeScale) / (1 - CONFIG.SLOW_FACTOR);
    if (slowAmount > 0.01) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = clamp(slowAmount, 0, 1) * 0.12;
      ctx.fillStyle = COLORS.slow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }

    // Flash blanc lors de l'explosion
    if (game.flash > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = Math.min(1, game.flash) * 0.7;
      ctx.fillStyle = COLORS.white;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }

    drawJoystick();
  }

  // Limites haut et bas de la zone de jeu (téléphone en portrait) : deux lignes néon
  function drawFieldFrame() {
    const d = view.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.globalAlpha = 1;
    const line = function (y) {
      const g = ctx.createLinearGradient(0, 0, view.cssW, 0);
      g.addColorStop(0, 'rgba(62, 242, 255, 0)');
      g.addColorStop(0.5, 'rgba(62, 242, 255, 0.6)');
      g.addColorStop(1, 'rgba(62, 242, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 1, view.cssW, 2);
    };
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 8 * d;
    line(view.oy);
    line(view.oy + view.fh);
    ctx.shadowBlur = 0;
  }

  // Joystick tactile, dessiné en pixels d'écran par-dessus le jeu
  function drawJoystick() {
    if (game.state !== 'playing' || !input.touchMode) return;
    const ptr = input.pointer;
    const R = joyRadius();
    const color = shipColor();
    let bx;
    let by;
    let kx;
    let ky;
    let alpha;
    bx = input.joyHome.x;
    by = input.joyHome.y;
    if (ptr.active && ptr.type === 'touch') {
      const dx = ptr.fingerX - bx;
      const dy = ptr.fingerY - by;
      const len = Math.hypot(dx, dy);
      const k = len > R ? R / len : 1;
      kx = bx + dx * k;
      ky = by + dy * k;
      alpha = 1;
    } else {
      // Au repos : montre où poser le pouce
      kx = bx;
      ky = by;
      alpha = 0.45;
    }
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    // Socle
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(12, 6, 34, 0.45)';
    ctx.beginPath();
    ctx.arc(bx, by, R, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Bouton
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14 * view.dpr;
    ctx.beginPath();
    ctx.arc(kx, ky, R * CONFIG.JOYSTICK_KNOB, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  function drawGrid() {
    const size = CONFIG.GRID_SIZE;
    const offset = (game.bgTime * CONFIG.GRID_SPEED) % size;
    ctx.beginPath();
    for (let x = -offset; x <= view.W; x += size) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, view.H);
    }
    for (let y = offset - size; y <= view.H; y += size) {
      ctx.moveTo(0, y);
      ctx.lineTo(view.W, y);
    }
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawStars() {
    ctx.fillStyle = COLORS.star;
    for (const s of stars) {
      const twinkle = 0.55 + 0.45 * Math.sin(game.bgTime * 2 + s.phase);
      ctx.globalAlpha = twinkle * s.depth;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawEnergies() {
    for (const e of game.energies) {
      if (e.collected) continue;
      // Clignote juste avant de disparaître
      if (e.life < CONFIG.ENERGY_BLINK_TIME && Math.floor(e.life * 10) % 2 === 0) continue;
      const r = e.r * (1 + Math.sin(e.age * 6) * 0.12);
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.age * 1.8);
      ctx.shadowColor = COLORS.energy;
      ctx.shadowBlur = glow(16);
      ctx.fillStyle = COLORS.energy;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.7, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 225, 77, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.7, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawLasers() {
    for (const l of game.lasers) {
      const w = CONFIG.LASER_WIDTH;
      const len = l.horizontal ? view.W : view.H;
      ctx.save();
      if (l.horizontal) {
        ctx.translate(0, l.pos);
      } else {
        ctx.translate(l.pos, 0);
        ctx.rotate(Math.PI / 2);
      }

      if (l.t < CONFIG.LASER_WARNING) {
        // Alerte : la zone dangereuse est montrée à l'avance
        const progress = l.t / CONFIG.LASER_WARNING;
        const blink = 0.5 + 0.5 * Math.sin(l.t * (10 + 22 * progress));
        ctx.fillStyle = 'rgba(255, 45, 111, ' + (0.06 + 0.14 * progress).toFixed(3) + ')';
        ctx.fillRect(0, -w / 2, len, w);
        ctx.strokeStyle = 'rgba(255, 45, 111, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -w / 2);
        ctx.lineTo(len, -w / 2);
        ctx.moveTo(0, w / 2);
        ctx.lineTo(len, w / 2);
        ctx.stroke();
        ctx.setLineDash([14, 10]);
        ctx.lineDashOffset = -l.t * 60;
        ctx.strokeStyle = 'rgba(255, 45, 111, ' + (0.35 + 0.5 * blink).toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();
      } else {
        // Tir
        const ft = l.t - CONFIG.LASER_WARNING;
        const alpha = ft < CONFIG.LASER_ACTIVE ? 1 : 1 - (ft - CONFIG.LASER_ACTIVE) / CONFIG.LASER_FADE;
        const thick = ft < CONFIG.LASER_ACTIVE ? w : w * Math.max(0, alpha);
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.shadowColor = COLORS.laser;
        ctx.shadowBlur = glow(24);
        ctx.fillStyle = COLORS.laser;
        ctx.fillRect(0, -thick / 2, len, thick);
        ctx.shadowBlur = 0;
        ctx.fillStyle = COLORS.laserCore;
        ctx.fillRect(0, -thick * 0.18, len, thick * 0.36);
      }
      ctx.restore();
    }
  }

  function drawPowerups() {
    for (const pu of game.powerups) {
      if (pu.collected) continue;
      // Clignote juste avant de disparaître
      if (pu.life < CONFIG.POWERUP_BLINK_TIME && Math.floor(pu.life * 10) % 2 === 0) continue;
      const color = POWERUPS[pu.type].color;
      const r = pu.r * (1 + Math.sin(pu.age * 5) * 0.08);
      ctx.save();
      ctx.translate(pu.x, pu.y);
      // Hexagone lumineux
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 6;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(12, 6, 34, 0.75)';
      ctx.fill();
      ctx.shadowColor = color;
      ctx.shadowBlur = glow(18);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      drawPowerupIcon(pu.type, r * 0.5);
      ctx.restore();
    }
  }

  // Icône dessinée au centre du bonus : bouclier, sablier ou aimant
  function drawPowerupIcon(type, s) {
    ctx.beginPath();
    if (type === 'shield') {
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.8, -s * 0.55);
      ctx.lineTo(s * 0.65, s * 0.35);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.65, s * 0.35);
      ctx.lineTo(-s * 0.8, -s * 0.55);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'slow') {
      ctx.moveTo(-s * 0.65, -s);
      ctx.lineTo(s * 0.65, -s);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.moveTo(-s * 0.65, s);
      ctx.lineTo(s * 0.65, s);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      const a = s * 0.6;
      ctx.lineWidth = s * 0.45;
      ctx.lineCap = 'butt';
      ctx.moveTo(-a, -s * 0.85);
      ctx.lineTo(-a, 0);
      ctx.arc(0, 0, a, Math.PI, 0, true); // demi-cercle du bas : forme en U
      ctx.lineTo(a, -s * 0.85);
      ctx.stroke();
    }
  }

  function drawHazards() {
    for (const h of game.hazards) {
      if (h.dead) continue;
      if (h.type === 'seeker') drawSeeker(h);
      else drawShard(h);
    }
  }

  function drawShard(h) {
    const pts = h.points;
    const splitter = h.type === 'splitter';
    // Éclat diviseur : il tremble de plus en plus avant d'éclater
    const k = splitter ? clamp(h.splitTimer / CONFIG.SPLIT_TIME, 0, 1) : 0;
    const jitter = splitter && k > 0.6 ? rand(-1, 1) * 2 * k : 0;
    ctx.save();
    ctx.translate(h.x + jitter, h.y + jitter);
    ctx.rotate(h.rot);
    if (h.harmless > 0) ctx.globalAlpha = 0.5; // morceau qui vient d'apparaître (inoffensif)
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fillStyle = COLORS.shardFill;
    ctx.fill();
    ctx.strokeStyle = COLORS.shardHalo; // halo lumineux "pas cher"
    ctx.lineWidth = splitter ? 9 : 7;
    ctx.stroke();
    ctx.strokeStyle = COLORS.shard;
    ctx.lineWidth = splitter ? 3 : 2.2;
    ctx.stroke();
    if (splitter) {
      // Fissures qui s'illuminent avant l'éclatement
      ctx.globalAlpha = 0.45 + 0.55 * k;
      ctx.strokeStyle = COLORS.splitCrack;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-h.r * 0.7, -h.r * 0.2);
      ctx.lineTo(0, h.r * 0.1);
      ctx.lineTo(h.r * 0.6, -h.r * 0.35);
      ctx.moveTo(0, h.r * 0.1);
      ctx.lineTo(h.r * 0.15, h.r * 0.7);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Trous noirs : disque sombre, bord magenta, bras en spirale, zone d'attraction
  function drawHoles() {
    for (const hole of game.holes) {
      const s = holeStrength(hole);
      if (s <= 0) continue;
      ctx.save();
      ctx.translate(hole.x, hole.y);
      // Zone d'attraction (pointillés)
      ctx.globalAlpha = 0.22 * s;
      ctx.setLineDash([8, 12]);
      ctx.strokeStyle = COLORS.hole;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, CONFIG.HOLE_RANGE, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      // Bras en spirale
      ctx.rotate(hole.rot);
      ctx.globalAlpha = 0.6 * s;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.rotate(TAU / 3);
        ctx.beginPath();
        ctx.arc(CONFIG.HOLE_CORE * 1.4, 0, CONFIG.HOLE_CORE * 1.6 * s, Math.PI * 0.6, Math.PI * 1.4);
        ctx.stroke();
      }
      // Disque central
      ctx.globalAlpha = s;
      ctx.shadowColor = COLORS.hole;
      ctx.shadowBlur = glow(24);
      ctx.fillStyle = '#05010f';
      ctx.beginPath();
      ctx.arc(0, 0, CONFIG.HOLE_CORE * (0.6 + 0.4 * s), 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = COLORS.hole;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  // Mines : clignotent de plus en plus vite, puis anneau d'explosion
  function drawMines() {
    for (const m of game.mines) {
      ctx.save();
      ctx.translate(m.x, m.y);
      if (!m.exploded) {
        const k = clamp(m.t / CONFIG.MINE_ARM_TIME, 0, 1);
        const blink = Math.sin(m.t * (8 + 30 * k)) > 0;
        // Zone de l'explosion annoncée
        ctx.globalAlpha = 0.08 + 0.12 * k;
        ctx.fillStyle = COLORS.mine;
        ctx.beginPath();
        ctx.arc(0, 0, CONFIG.MINE_RING_MAX, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.rotate(m.t * 2);
        ctx.fillStyle = COLORS.mine;
        ctx.shadowColor = COLORS.mine;
        ctx.shadowBlur = glow(blink ? 18 : 6);
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const r = i % 2 ? CONFIG.MINE_RADIUS * 0.7 : CONFIG.MINE_RADIUS * 1.15;
          const a = (i / 16) * TAU;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = blink ? COLORS.white : '#5a0d0a';
        ctx.beginPath();
        ctx.arc(0, 0, CONFIG.MINE_RADIUS * 0.35, 0, TAU);
        ctx.fill();
      } else {
        const fade = 1 - m.ring / CONFIG.MINE_RING_MAX;
        ctx.globalAlpha = clamp(fade, 0, 1);
        ctx.strokeStyle = COLORS.mineRing;
        ctx.shadowColor = COLORS.mineRing;
        ctx.shadowBlur = glow(16);
        ctx.lineWidth = CONFIG.MINE_RING_WIDTH;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, m.ring), 0, TAU);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = COLORS.white;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Rayons tournants du boss
  function drawBeams() {
    const len = 2600;
    for (const bm of game.beams) {
      ctx.save();
      ctx.translate(bm.x, bm.y);
      ctx.rotate(bm.angle);
      if (bm.t < CONFIG.BOSS_BEAM_WARNING) {
        // Alerte : position de départ et sens du balayage
        const k = bm.t / CONFIG.BOSS_BEAM_WARNING;
        ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(bm.t * (10 + 20 * k)));
        ctx.setLineDash([16, 10]);
        ctx.strokeStyle = COLORS.boss;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(CONFIG.BOSS_RADIUS, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        // Flèches qui montrent le sens de rotation
        const side = bm.sweep > 0 ? 1 : -1;
        ctx.fillStyle = COLORS.boss;
        for (let d = 160; d < 700; d += 180) {
          ctx.beginPath();
          ctx.moveTo(d, side * 22);
          ctx.lineTo(d - 12, side * 8);
          ctx.lineTo(d + 12, side * 8);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        const ft = bm.t - CONFIG.BOSS_BEAM_WARNING;
        const alpha = ft < CONFIG.BOSS_BEAM_ACTIVE ? 1 : 1 - (ft - CONFIG.BOSS_BEAM_ACTIVE) / 0.25;
        const w = CONFIG.BOSS_BEAM_WIDTH;
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.shadowColor = COLORS.boss;
        ctx.shadowBlur = glow(24);
        ctx.fillStyle = COLORS.boss;
        ctx.fillRect(0, -w / 2, len, w);
        ctx.shadowBlur = 0;
        ctx.fillStyle = COLORS.laserCore;
        ctx.fillRect(0, -w * 0.18, len, w * 0.36);
      }
      ctx.restore();
    }
  }

  // Boss : octogone qui tourne, cœur qui pulse, s'illumine avant d'attaquer
  function drawBoss() {
    const b = game.boss;
    if (!b.active) return;
    const R = CONFIG.BOSS_RADIUS;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.globalAlpha = clamp(b.alpha === undefined ? 1 : b.alpha, 0, 1);
    // Halo d'alerte avant une attaque
    if (b.glow > 0) {
      ctx.globalAlpha *= 0.25 + 0.5 * b.glow;
      ctx.fillStyle = COLORS.bossCore;
      ctx.beginPath();
      ctx.arc(0, 0, R * (1.15 + 0.35 * b.glow), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = clamp(b.alpha === undefined ? 1 : b.alpha, 0, 1);
    }
    ctx.rotate(b.rot);
    ctx.shadowColor = COLORS.boss;
    ctx.shadowBlur = glow(26);
    ctx.fillStyle = 'rgba(40, 4, 20, 0.85)';
    ctx.strokeStyle = COLORS.boss;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      if (i === 0) ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R);
      else ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Triangle intérieur qui tourne dans l'autre sens
    ctx.rotate(-b.rot * 2.2);
    ctx.strokeStyle = COLORS.bossCore;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      if (i === 0) ctx.moveTo(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62);
      else ctx.lineTo(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62);
    }
    ctx.closePath();
    ctx.stroke();
    // Cœur
    const pulse = 1 + 0.12 * Math.sin(game.bgTime * 6) + 0.25 * b.glow;
    ctx.fillStyle = COLORS.bossCore;
    ctx.shadowColor = COLORS.bossCore;
    ctx.shadowBlur = glow(20);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.24 * pulse, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawSeeker(h) {
    const pulse = h.homing > 0 ? 1 + 0.15 * Math.sin(h.age * 12) : 1;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.beginPath();
    ctx.arc(0, 0, h.r * pulse, 0, TAU);
    ctx.strokeStyle = COLORS.seekerHalo;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = COLORS.seeker;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = COLORS.seeker;
    ctx.beginPath();
    ctx.arc(0, 0, h.r * 0.38, 0, TAU);
    ctx.fill();
    ctx.rotate(h.angle);
    ctx.beginPath();
    ctx.moveTo(h.r * 1.5, 0);
    ctx.lineTo(h.r * 1.05, -h.r * 0.35);
    ctx.lineTo(h.r * 1.05, h.r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Petites flèches au bord de l'écran : annoncent les ennemis qui arrivent
  function drawEdgeWarnings() {
    if (game.state !== 'playing' && game.state !== 'paused') return;
    const pad = 14;
    for (const h of game.hazards) {
      if (h.entered) continue;
      const outside = Math.max(-h.x, h.x - view.W, -h.y, h.y - view.H);
      if (outside <= 0) continue;
      const alpha = clamp(1 - outside / (CONFIG.SPAWN_OFFSCREEN + 60), 0.15, 1);
      ctx.save();
      ctx.translate(clamp(h.x, pad, view.W - pad), clamp(h.y, pad, view.H - pad));
      ctx.rotate(Math.atan2(h.vy, h.vx));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = h.type === 'seeker' ? COLORS.seeker : COLORS.shard;
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-6, -7);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPlayer() {
    const p = game.player;
    if (!p || !p.alive) return;
    ctx.save();
    ctx.translate(p.x, p.y);

    // Aimant : grand cercle en pointillés qui tourne autour du joueur
    if (game.effects.magnet > 0) {
      ctx.save();
      ctx.rotate(game.bgTime * 0.8);
      ctx.setLineDash([10, 14]);
      ctx.globalAlpha = 0.28 * powerupFade('magnet');
      ctx.strokeStyle = COLORS.magnet;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, CONFIG.MAGNET_RADIUS, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // Bouclier : bulle verte autour du vaisseau
    if (game.effects.shield > 0) {
      const pulse = 1 + Math.sin(game.bgTime * 6) * 0.05;
      ctx.save();
      ctx.globalAlpha = powerupFade('shield');
      ctx.fillStyle = 'rgba(77, 255, 166, 0.10)';
      ctx.shadowColor = COLORS.shield;
      ctx.shadowBlur = glow(16);
      ctx.strokeStyle = COLORS.shield;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, (p.r + 14) * pulse, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Juste après un coup encaissé : le vaisseau clignote
    const baseAlpha = p.grace > 0 && Math.floor(p.grace * 14) % 2 === 0 ? 0.3 : 1;
    const ship = currentShip();
    const color = shipColor();

    // Anneau qui indique la recharge du dash
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.beginPath();
    if (p.dashCooldown > 0) {
      const ready = 1 - p.dashCooldown / CONFIG.DASH_COOLDOWN;
      ctx.globalAlpha = baseAlpha * 0.35;
      ctx.arc(0, 0, p.r + 9, -Math.PI / 2, -Math.PI / 2 + TAU * ready);
    } else {
      ctx.globalAlpha = baseAlpha * 0.16;
      ctx.arc(0, 0, p.r + 9, 0, TAU);
    }
    ctx.stroke();
    ctx.globalAlpha = baseAlpha;

    // Vaisseau (forme et couleur selon le vaisseau choisi)
    const dashing = p.dashTime > 0;
    ctx.rotate(p.angle);
    ctx.shadowColor = color;
    ctx.shadowBlur = glow(dashing ? 30 : 18);
    ctx.fillStyle = dashing ? COLORS.white : color;
    traceShip(ctx, ship.id, p.r);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.playerCore;
    ctx.beginPath();
    ctx.arc(p.r * shipCoreX(ship), 0, p.r * 0.28, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Trace le contour d'un vaisseau (pointe vers la droite) dans le contexte c
  function traceShip(c, id, r) {
    c.beginPath();
    if (id === 'comete') {
      // Tête ronde + queue en flammes
      c.arc(r * 0.4, 0, r * 0.66, 0, TAU);
      c.moveTo(r * 0.35, -r * 0.6);
      c.lineTo(-r * 0.85, -r * 0.62);
      c.lineTo(-r * 0.55, -r * 0.22);
      c.lineTo(-r * 1.55, 0);
      c.lineTo(-r * 0.55, r * 0.22);
      c.lineTo(-r * 0.85, r * 0.62);
      c.lineTo(r * 0.35, r * 0.6);
      c.closePath();
      return;
    }
    const pts = SHIP_SHAPES[id] || SHIP_SHAPES.fleche;
    c.moveTo(pts[0] * r, pts[1] * r);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i] * r, pts[i + 1] * r);
    c.closePath();
  }

  // Position du petit cœur lumineux du vaisseau
  function shipCoreX(ship) {
    return ship.id === 'comete' ? 0.4 : 0.1;
  }

  // Aperçu d'un vaisseau dans l'écran "Vaisseaux"
  function drawShipPreview(cv, ship, unlocked) {
    const size = 64;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(size * dpr);
    cv.height = Math.round(size * dpr);
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.translate(size / 2, size / 2 + 2);
    c.rotate(-Math.PI / 2); // pointe vers le haut
    c.lineJoin = 'round';
    const r = 15;
    if (!unlocked) {
      // Bloqué : silhouette en pointillés
      c.strokeStyle = 'rgba(232, 247, 255, 0.35)';
      c.lineWidth = 1.5;
      c.setLineDash([3, 3]);
      traceShip(c, ship.id, r);
      c.stroke();
      return;
    }
    let fill = ship.color;
    if (ship.rainbow) {
      const g = c.createLinearGradient(-r * 1.4, 0, r * 1.5, 0);
      const rainbow = ['#ff5c8a', '#ffd447', '#b6ff4a', '#3ef2ff', '#b388ff'];
      rainbow.forEach(function (col, i) { g.addColorStop(i / (rainbow.length - 1), col); });
      fill = g;
    }
    c.shadowColor = ship.rainbow ? '#ffffff' : ship.color;
    c.shadowBlur = 12 * dpr;
    c.fillStyle = fill;
    traceShip(c, ship.id, r);
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = COLORS.playerCore;
    c.beginPath();
    c.arc(r * shipCoreX(ship), 0, r * 0.28, 0, TAU);
    c.fill();
  }

  function drawParticles() {
    ctx.globalCompositeOperation = 'lighter';
    for (const pa of game.particles) {
      const a = pa.life / pa.maxLife;
      const s = pa.size * (0.5 + 0.5 * a);
      ctx.globalAlpha = a;
      ctx.fillStyle = pa.color;
      ctx.fillRect(pa.x - s / 2, pa.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawRings() {
    for (const ring of game.rings) {
      const a = ring.life / ring.maxLife;
      ctx.globalAlpha = a;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.width * a + 0.5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r0 + (ring.r1 - ring.r0) * (1 - a), 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of game.texts) {
      ctx.globalAlpha = Math.min(1, (t.life / t.maxLife) * 2.5);
      ctx.font = '800 ' + t.size + 'px ' + FONT;
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = glow(12);
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Après une pause : cercle qui se resserre sur le vaisseau + "PRÊT ?"
  function drawResumeHint() {
    const p = game.player;
    if (game.state !== 'playing' || game.resumeTimer <= 0 || !p) return;
    const k = game.resumeTimer / CONFIG.RESUME_DELAY;
    const color = shipColor();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 10 + 80 * k, 0, TAU);
    ctx.stroke();
    ctx.font = '800 40px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.text;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow(14);
    ctx.fillText('PRÊT ?', view.W / 2, view.H * 0.3);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  /* ====================================================================
     13. BOUCLE PRINCIPALE ET DÉMARRAGE
     Une seule boucle tourne du début à la fin : relancer une partie ne
     crée jamais de seconde boucle.
     ==================================================================== */

  let lastFrameTime = null;

  function frame(now) {
    requestAnimationFrame(frame);

    if (lastFrameTime === null) lastFrameTime = now;
    let dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    if (!(dt > 0)) dt = 0;
    if (dt > CONFIG.MAX_FRAME_TIME) dt = CONFIG.MAX_FRAME_TIME;

    // Découpe en petits pas : même comportement à 60 Hz qu'à 144 Hz,
    // et aucun objet rapide ne peut "sauter" par-dessus un autre.
    const steps = Math.max(1, Math.ceil(dt / CONFIG.MAX_STEP));
    const step = dt / steps;
    for (let i = 0; i < steps; i++) update(step);

    render();
    refreshHud();
  }

  function bindButton(id, action) {
    const button = $(id);
    button.addEventListener('click', function () {
      Sound.unlock();
      action();
      button.blur();
    });
  }

  function init() {
    buildPowerupHud();

    game.shipId = loadShipId();

    // Boutons
    bindButton('btn-play', function () { startGame('normal'); });
    bindButton('btn-ships', openHangar);
    bindButton('btn-modes', function () { openSubScreen('modes', buildModes); });
    bindButton('btn-achievements', function () { openSubScreen('achievements', buildAchievements); });
    bindButton('btn-settings', function () { openSubScreen('settings', buildSettings); });
    bindButton('btn-hangar-back', backToMenu);
    bindButton('btn-modes-back', backToMenu);
    bindButton('btn-ach-back', backToMenu);
    bindButton('btn-settings-back', backToMenu);
    // Cartes de l'écran "Modes"
    bindButton('btn-mode-normal', function () { startGame('normal'); });
    bindButton('btn-daily', function () { startGame('daily'); });
    bindButton('btn-mode-timeattack', function () { startGame('timeattack'); });
    bindButton('btn-mode-zen', function () { startGame('zen'); });
    bindButton('btn-tuto-skip', finishTutorial);
    bindSettings();
    applyReduceFx();
    bindButton('btn-resume', resumeGame);
    bindButton('btn-quit', function () { Sound.click(); goToMenu(); });
    bindButton('btn-replay', function () { startGame(game.mode); });
    bindButton('btn-menu', function () { Sound.click(); goToMenu(); });
    bindButton('btn-pause', pauseGame);
    bindButton('btn-sound', toggleMute);

    // Clavier
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Souris / tactile
    window.addEventListener('pointerdown', function (e) {
      Sound.unlock();
      if (e.pointerType === 'touch') setTouchMode(true);
      else if (e.pointerType === 'mouse') setTouchMode(false);
    }, true);
    // Sur iPhone, le son ne peut être débloqué qu'au moment où le doigt se lève
    window.addEventListener('pointerup', function () { Sound.unlock(); }, true);
    window.addEventListener('touchend', function () { Sound.unlock(); }, true);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerEnd);
    canvas.addEventListener('pointercancel', onPointerEnd);
    canvas.addEventListener('lostpointercapture', onPointerEnd);
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // Pause automatique quand on quitte l'onglet ou la fenêtre
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        pauseGame();
        clearInput();
      }
    });
    window.addEventListener('blur', function () {
      pauseGame();
      clearInput();
    });

    // Taille de l'écran
    // Taille de l'écran et rotation du téléphone. Sur iPhone, la nouvelle taille
    // n'est pas toujours connue tout de suite : on vérifie aussi un peu après.
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () {
      resize();
      setTimeout(resize, 150);
      setTimeout(resize, 500);
    });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(canvas);
    resize();

    // Interface de départ
    $('game-version').textContent = GAME_VERSION;
    refreshMenu();
    refreshSoundButton();
    showScreen('menu');
    setState('menu');

    setupOfflineMode();
    requestAnimationFrame(frame);
  }

  // Mode hors ligne : seulement quand le jeu est ouvert depuis un site (https://).
  // Il s'installe alors sur l'appareil et marche ensuite sans internet.
  // En double-cliquant sur index.html (file://), rien n'est activé : pas d'erreur.
  function setupOfflineMode() {
    if (!/^https?:$/.test(location.protocol) || !window.isSecureContext) return;

    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'manifest.json';
      document.head.appendChild(link);
    }

    if (!('serviceWorker' in navigator)) return;
    const register = function () {
      navigator.serviceWorker.register('sw.js').catch(function () {
        /* mode hors ligne indisponible : le jeu marche quand même en ligne */
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register);
  }

  init();
})();
