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
    TOUCH_SENSITIVITY: 1.4,  // sur mobile, le vaisseau bouge 1,4 fois plus que le doigt
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

  /* ====================================================================
     2. OUTILS
     ==================================================================== */

  function rand(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
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

  function loadBest() {
    const value = parseInt(storage.get(CONFIG.STORAGE_KEY_BEST, '0'), 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  /* ====================================================================
     4. SONS
     Tous les sons sont fabriqués par le code (aucun fichier audio).
     Le son ne démarre qu'après la première action du joueur,
     comme l'exigent les navigateurs.
     ==================================================================== */

  const Sound = {
    ctx: null,
    master: null,
    noiseBuffer: null,
    muted: storage.get(CONFIG.STORAGE_KEY_MUTE, '0') === '1',

    // À appeler à chaque clic / touche : crée ou réveille le moteur audio
    unlock() {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) {
        try {
          this.ctx = new AudioCtx();
          this.master = this.ctx.createGain();
          this.master.gain.value = this.muted ? 0 : CONFIG.VOLUME;
          this.master.connect(this.ctx.destination);
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

    // Note simple avec une enveloppe courte (pas de "clic" désagréable)
    tone(freq, duration, type, volume, freqEnd, delay) {
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
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    },

    // Bruit filtré (souffle, explosion)
    noise(duration, volume, freqStart, freqEnd, delay) {
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
      gain.connect(this.master);
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
  };

  let stars = [];

  function resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    view.dpr = Math.min(window.devicePixelRatio || 1, CONFIG.MAX_PIXEL_RATIO);
    canvas.width = Math.round(w * view.dpr);
    canvas.height = Math.round(h * view.dpr);
    view.scale = Math.min(w, h) / CONFIG.WORLD_SHORT_SIDE;
    view.W = w / view.scale;
    view.H = h / view.scale;
    createStars();

    // Le joueur reste toujours dans l'écran
    const p = game.player;
    if (p) {
      p.x = clamp(p.x, p.r, view.W - p.r);
      p.y = clamp(p.y, p.r, view.H - p.r);
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
    ambientTimer: 0,
    resumeTimer: 0,
    deathTimer: 0,

    // Bonus actifs : secondes restantes pour chacun (0 = inactif)
    effects: { shield: 0, slow: 0, magnet: 0 },
    timeScale: 1, // vitesse des dangers (descend pendant le ralenti)

    shake: 0,
    flash: 0,
    bgTime: 0,

    stats: { energy: 0, grazes: 0, powerups: 0 },
    newRecord: false,
    finalScore: 0,
    shownScore: 0,
  };

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
    game.particles.length = 0;
    game.rings.length = 0;
    game.texts.length = 0;
  }

  // Remet ABSOLUMENT TOUT à zéro pour une nouvelle partie
  function resetGame() {
    clearWorld();
    game.player = createPlayer();
    game.time = 0;
    game.score = 0;
    game.level = 1;
    game.spawnTimer = CONFIG.FIRST_SPAWN_DELAY;
    game.energyTimer = CONFIG.FIRST_ENERGY_DELAY;
    game.laserTimer = rand(CONFIG.LASER_MIN_INTERVAL, CONFIG.LASER_MAX_INTERVAL);
    game.powerupTimer = CONFIG.POWERUP_FIRST_DELAY;
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
      x: 0, y: 0,           // position actuelle (unités de jeu)
      startX: 0, startY: 0, // position au moment du toucher
      shipX: 0, shipY: 0,   // position du vaisseau au moment du toucher
    },
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
          startGame();
        } else if (game.state === 'gameover' &&
                   performance.now() - game.stateChangedAt > CONFIG.GAMEOVER_INPUT_DELAY) {
          startGame();
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
      x: (e.clientX - rect.left) / view.scale,
      y: (e.clientY - rect.top) / view.scale,
    };
  }

  function onPointerDown(e) {
    e.preventDefault();
    if (e.pointerType === 'mouse') {
      if (e.button === 2) { requestDash(); return; } // clic droit = dash
      if (e.button !== 0) return;
    }
    const ptr = input.pointer;
    if (ptr.active) { requestDash(); return; } // deuxième doigt = dash

    const pos = pointerToWorld(e);
    ptr.active = true;
    ptr.id = e.pointerId;
    ptr.type = e.pointerType;
    ptr.x = ptr.startX = pos.x;
    ptr.y = ptr.startY = pos.y;
    ptr.shipX = game.player ? game.player.x : pos.x;
    ptr.shipY = game.player ? game.player.y : pos.y;
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

  // Point vers lequel le vaisseau se dirige quand on joue à la souris ou au doigt
  function pointerTarget() {
    const ptr = input.pointer;
    if (ptr.type === 'touch') {
      // Au doigt : déplacement relatif, pour que le doigt ne cache pas le vaisseau
      return {
        x: clamp(ptr.shipX + (ptr.x - ptr.startX) * CONFIG.TOUCH_SENSITIVITY, 0, view.W),
        y: clamp(ptr.shipY + (ptr.y - ptr.startY) * CONFIG.TOUCH_SENSITIVITY, 0, view.H),
      };
    }
    return { x: ptr.x, y: ptr.y };
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
    btnDash: $('btn-dash'),
    menuBest: $('menu-best'),
    goScore: $('go-score'),
    goBest: $('go-best'),
    goTime: $('go-time'),
    goLevel: $('go-level'),
    goEnergy: $('go-energy'),
    goGraze: $('go-graze'),
    goPowerups: $('go-powerups'),
    goRecord: $('go-record'),
    powerups: $('powerups'),
    screens: {
      menu: $('screen-menu'),
      pause: $('screen-pause'),
      gameover: $('screen-gameover'),
    },
  };

  const ICON_SOUND_ON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/>' +
    '<path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const ICON_SOUND_OFF =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/>' +
    '<path d="M16 9l6 6M22 9l-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  // Affiche un seul écran (ou aucun si name vaut null)
  function showScreen(name) {
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
    ui.btnDash.classList.toggle('hidden', !(s === 'playing' && input.touchMode));
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
  const hudCache = { score: null, best: null, level: null, dashReady: null };

  function refreshHud() {
    if (game.state === 'menu') return;
    const score = Math.floor(game.score);
    const best = Math.max(game.best, score);
    if (score !== hudCache.score) { ui.score.textContent = formatScore(score); hudCache.score = score; }
    if (best !== hudCache.best) { ui.best.textContent = formatScore(best); hudCache.best = best; }
    if (game.level !== hudCache.level) { ui.level.textContent = String(game.level); hudCache.level = game.level; }
    const dashReady = !game.player || game.player.dashCooldown <= 0;
    if (dashReady !== hudCache.dashReady) {
      ui.btnDash.classList.toggle('cooldown', !dashReady);
      hudCache.dashReady = dashReady;
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

  /* ====================================================================
     9. DÉROULEMENT D'UNE PARTIE
     Chaque fonction vérifie l'état actuel : un double clic ou une touche
     appuyée deux fois ne peut jamais lancer deux parties en même temps.
     ==================================================================== */

  function startGame() {
    if (game.state !== 'menu' && game.state !== 'gameover') return;
    Sound.unlock();
    resetGame();
    showScreen(null);
    setState('playing');
    Sound.start();
  }

  function pauseGame() {
    if (game.state !== 'playing') return;
    input.dashQueued = false;
    setState('paused');
    showScreen('pause');
  }

  function resumeGame() {
    if (game.state !== 'paused') return;
    showScreen(null);
    game.resumeTimer = CONFIG.RESUME_DELAY;
    setState('playing');
    Sound.click();
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

  function goToMenu() {
    if (game.state !== 'paused' && game.state !== 'gameover') return;
    if (game.state === 'paused') saveBestIfNeeded(Math.floor(game.score));
    clearWorld();
    game.player = null;
    game.ambientTimer = 0;
    ui.menuBest.textContent = formatScore(game.best);
    showScreen('menu');
    setState('menu');
  }

  function killPlayer() {
    const p = game.player;
    p.alive = false;
    clearPowerupEffects(); // les bonus s'arrêtent à la mort
    explode(p.x, p.y);
    game.shake = REDUCED_MOTION ? 5 : 18;
    game.flash = REDUCED_MOTION ? 0.35 : 0.9;
    game.deathTimer = CONFIG.DEATH_DURATION;
    input.dashQueued = false;
    Sound.explosion();
    setState('dying');
  }

  function endGame() {
    const finalScore = Math.floor(game.score);
    game.finalScore = finalScore;
    game.shownScore = 0;
    game.newRecord = saveBestIfNeeded(finalScore);

    ui.goScore.textContent = '0';
    ui.goBest.textContent = formatScore(game.best);
    ui.goTime.textContent = formatTime(game.time);
    ui.goLevel.textContent = String(game.level);
    ui.goEnergy.textContent = String(game.stats.energy);
    ui.goGraze.textContent = String(game.stats.grazes);
    ui.goPowerups.textContent = String(game.stats.powerups);
    ui.goRecord.classList.toggle('hidden', !game.newRecord);
    ui.menuBest.textContent = formatScore(game.best);

    showScreen('gameover');
    setState('gameover');
    if (game.newRecord) Sound.record();
    else Sound.gameOver();
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
    } else if (input.pointer.active) {
      const t = pointerTarget();
      const ox = t.x - p.x;
      const oy = t.y - p.y;
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
        dashing ? COLORS.white : COLORS.player,
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
    addRing(p.x, p.y, 8, 55, 0.3, COLORS.player, 3);
    Sound.dash();
  }

  // --- Éclats et traqueurs ---

  function spawnHazard(type, speedMult) {
    const W = view.W;
    const H = view.H;
    const p = game.player && game.player.alive ? game.player : null;
    const isSeeker = type === 'seeker';
    const r = isSeeker ? CONFIG.SEEKER_RADIUS : rand(CONFIG.SHARD_MIN_RADIUS, CONFIG.SHARD_MAX_RADIUS);
    const out = CONFIG.SPAWN_OFFSCREEN + r;

    // Point de départ sur le pourtour de l'écran, jamais trop près du joueur
    let x = 0;
    let y = 0;
    let ok = false;
    for (let i = 0; i < 12 && !ok; i++) {
      const t = Math.random() * (2 * W + 2 * H);
      if (t < W) { x = t; y = -out; }
      else if (t < W + H) { x = W + out; y = t - W; }
      else if (t < 2 * W + H) { x = t - W - H; y = H + out; }
      else { x = -out; y = t - 2 * W - H; }
      ok = !p || Math.hypot(x - p.x, y - p.y) >= CONFIG.SAFE_SPAWN_DISTANCE;
    }
    if (!ok) return;

    // Direction : souvent vers le joueur, sinon vers un point au hasard
    let tx;
    let ty;
    if (p && Math.random() < CONFIG.AIM_AT_PLAYER_CHANCE) {
      tx = p.x + rand(-CONFIG.AIM_SPREAD, CONFIG.AIM_SPREAD);
      ty = p.y + rand(-CONFIG.AIM_SPREAD, CONFIG.AIM_SPREAD);
    } else {
      tx = rand(W * 0.1, W * 0.9);
      ty = rand(H * 0.1, H * 0.9);
    }
    const angle = Math.atan2(ty - y, tx - x);
    const speed = (isSeeker
      ? CONFIG.SEEKER_SPEED
      : rand(CONFIG.SHARD_MIN_SPEED, CONFIG.SHARD_MAX_SPEED)) * speedMult;

    const hazard = {
      type: type,
      x: x,
      y: y,
      r: r,
      hitR: r * (isSeeker ? 0.8 : CONFIG.SHARD_HITBOX),
      angle: angle,
      speed: speed,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: rand(0, TAU),
      spin: rand(-3, 3),
      age: 0,
      entered: false,  // est déjà entré dans l'écran ?
      grazing: false,  // est en train de frôler le joueur ?
      grazed: false,   // bonus de frôlement déjà donné ?
      homing: isSeeker ? CONFIG.SEEKER_HOMING_TIME : 0,
      trailTimer: 0,
      points: null,
    };

    // Forme irrégulière de l'éclat (5 à 8 sommets)
    if (!isSeeker) {
      const n = randInt(5, 8);
      hazard.points = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + rand(-0.2, 0.2);
        const rr = r * rand(0.88, 1);
        hazard.points.push(Math.cos(a) * rr, Math.sin(a) * rr);
      }
    }
    game.hazards.push(hazard);
  }

  function spawnWave() {
    if (game.hazards.length >= CONFIG.MAX_HAZARDS) return;
    const mult = speedMultiplier();
    let seekers = 0;
    for (const h of game.hazards) if (h.type === 'seeker') seekers++;
    const seeker = game.level >= CONFIG.SEEKER_FROM_LEVEL &&
                   seekers < CONFIG.SEEKER_MAX &&
                   Math.random() < CONFIG.SEEKER_CHANCE;
    spawnHazard(seeker ? 'seeker' : 'shard', mult);
    if (game.level >= CONFIG.DOUBLE_SPAWN_FROM_LEVEL && Math.random() < CONFIG.DOUBLE_SPAWN_CHANCE) {
      spawnHazard('shard', mult);
    }
  }

  function updateHazards(dt, active) {
    const W = view.W;
    const H = view.H;
    const p = game.player;
    for (const h of game.hazards) {
      h.age += dt;

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

    // Suppression des objets sortis de l'écran (pas de fuite de mémoire)
    removeDead(game.hazards, function (h) {
      const m = h.r + CONFIG.DESPAWN_MARGIN;
      const outside = h.x < -m || h.x > W + m || h.y < -m || h.y > H + m;
      return !h.dead && !(h.entered && outside) && h.age < CONFIG.HAZARD_MAX_AGE;
    });
  }

  // --- Énergie ---

  function spawnEnergy() {
    if (game.energies.length >= CONFIG.MAX_ENERGY) return;
    const p = game.player;
    const margin = 60;
    let x = view.W / 2;
    let y = view.H / 2;
    for (let i = 0; i < 15; i++) {
      x = rand(margin, view.W - margin);
      y = rand(margin + 30, view.H - margin);
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
    game.score += CONFIG.ENERGY_POINTS;
    game.stats.energy++;
    p.dashCooldown = 0; // l'énergie recharge le dash
    burst(e.x, e.y, { count: 22, colors: [COLORS.energy, COLORS.white], speed: [80, 260], life: [0.3, 0.6], size: [2, 4], drag: 3 });
    addRing(e.x, e.y, 10, 60, 0.4, COLORS.energy, 3);
    addText(e.x, e.y - 22, '+' + CONFIG.ENERGY_POINTS, COLORS.energy, 20, 0.9, -45);
    Sound.collect();
  }

  // --- Lasers ---

  function spawnLaser() {
    const p = game.player;
    if (!p || !p.alive) return;
    const horizontal = Math.random() < 0.5;
    const offset = CONFIG.LASER_OFFSET;
    addLaser(horizontal, (horizontal ? p.y : p.x) + rand(-offset, offset));
    if (game.level >= CONFIG.LASER_CROSS_FROM_LEVEL && Math.random() < 0.4) {
      addLaser(!horizontal, (horizontal ? p.x : p.y) + rand(-offset, offset));
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
        game.shake = Math.max(game.shake, REDUCED_MOTION ? 2 : 7);
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

  // --- Bonus temporaires (bouclier, ralenti, aimant) ---

  function clearPowerupEffects() {
    for (const type of POWERUP_TYPES) game.effects[type] = 0;
    game.timeScale = 1;
  }

  function spawnPowerup() {
    if (game.powerups.length > 0) return; // un seul bonus à la fois sur le terrain
    const p = game.player;
    // De préférence un bonus qui n'est pas déjà actif
    let choices = POWERUP_TYPES.filter(function (t) { return game.effects[t] <= 0; });
    if (choices.length === 0) choices = POWERUP_TYPES;
    const type = choices[randInt(0, choices.length - 1)];

    const margin = 70;
    let x = view.W / 2;
    let y = view.H / 2;
    for (let i = 0; i < 15; i++) {
      x = rand(margin, view.W - margin);
      y = rand(margin + 30, view.H - margin);
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
    game.shake = Math.max(game.shake, REDUCED_MOTION ? 2 : 8);
    Sound.shieldHit();
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
      if (h.dead) continue;
      const dx = h.x - p.x;
      const dy = h.y - p.y;
      const d2 = dx * dx + dy * dy;
      const hitDist = pr + h.hitR;
      if (!invincible && d2 < hitDist * hitDist) {
        if (game.effects.shield > 0) absorbHit(h.x, h.y, h);
        else killPlayer();
        return;
      }
      const grazeDist = hitDist + CONFIG.NEAR_MISS_MARGIN;
      if (d2 < grazeDist * grazeDist) {
        if (!invincible) h.grazing = true;
      } else if (h.grazing && !h.grazed) {
        // L'éclat est passé tout près sans toucher : bonus !
        h.grazing = false;
        h.grazed = true;
        game.score += CONFIG.NEAR_MISS_POINTS;
        game.stats.grazes++;
        addText(p.x, p.y - 30, 'Frôlé ! +' + CONFIG.NEAR_MISS_POINTS, COLORS.player, 15, 0.8, -40);
        Sound.graze();
      }
    }

    // Lasers
    if (!invincible) {
      for (const l of game.lasers) {
        if (!laserIsActive(l)) continue;
        const d = l.horizontal ? Math.abs(p.y - l.pos) : Math.abs(p.x - l.pos);
        if (d < CONFIG.LASER_WIDTH / 2 + pr * 0.6) {
          if (game.effects.shield > 0) absorbHit(p.x, p.y, null);
          else killPlayer();
          return;
        }
      }
    }
  }

  function onLevelUp() {
    const cx = view.W / 2;
    const cy = view.H * 0.3;
    // Retire l'annonce du niveau précédent pour que les textes ne se superposent pas
    removeDead(game.texts, function (t) { return t.tag !== 'level'; });
    addText(cx, cy, 'NIVEAU ' + game.level, COLORS.text, 46, 1.8, -10, 'level');
    if (game.level === CONFIG.SEEKER_FROM_LEVEL) {
      addText(cx, cy + 46, 'Les traqueurs arrivent !', COLORS.seeker, 22, 2.2, -10, 'level');
    }
    if (game.level === CONFIG.LASER_FROM_LEVEL) {
      addText(cx, cy + 46, 'Attention aux lasers !', COLORS.laser, 22, 2.2, -10, 'level');
      game.laserTimer = 2;
    }
    Sound.levelUp();
  }

  // --- Mises à jour selon l'état ---

  function updateMenu(dt) {
    // Des éclats décoratifs traversent l'écran derrière le menu
    game.ambientTimer -= dt;
    if (game.ambientTimer <= 0) {
      game.ambientTimer = CONFIG.MENU_SPAWN_INTERVAL;
      if (game.hazards.length < 25) spawnHazard('shard', 0.55);
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

    game.time += dt;
    const level = 1 + Math.floor(game.time / CONFIG.LEVEL_DURATION);
    if (level > game.level) {
      game.level = level;
      onLevelUp();
    }
    game.score += dt * CONFIG.POINTS_PER_SECOND * (1 + (game.level - 1) * CONFIG.SCORE_LEVEL_BONUS);

    updateActivePowerups(dt);
    updatePlayer(dt);

    // Le ralenti n'agit que sur les dangers : le joueur garde toute sa vitesse
    const worldDt = dt * game.timeScale;

    // Apparitions
    game.spawnTimer -= worldDt;
    if (game.spawnTimer <= 0) {
      game.spawnTimer = spawnInterval();
      spawnWave();
    }
    game.energyTimer -= dt;
    if (game.energyTimer <= 0) {
      game.energyTimer = rand(CONFIG.ENERGY_MIN_INTERVAL, CONFIG.ENERGY_MAX_INTERVAL);
      spawnEnergy();
    }
    game.powerupTimer -= dt;
    if (game.powerupTimer <= 0) {
      game.powerupTimer = rand(CONFIG.POWERUP_MIN_INTERVAL, CONFIG.POWERUP_MAX_INTERVAL);
      spawnPowerup();
    }
    if (game.level >= CONFIG.LASER_FROM_LEVEL) {
      game.laserTimer -= worldDt;
      if (game.laserTimer <= 0) {
        const faster = Math.max(0.6, 1 - (game.level - CONFIG.LASER_FROM_LEVEL) * 0.05);
        game.laserTimer = rand(CONFIG.LASER_MIN_INTERVAL, CONFIG.LASER_MAX_INTERVAL) * faster;
        spawnLaser();
      }
    }

    updateHazards(worldDt, true);
    updateEnergies(dt);
    updatePowerups(dt);
    updateLasers(worldDt);
    checkCollisions();
    updateEffects(dt);
  }

  function updateDying(dt) {
    game.deathTimer -= dt;
    const slow = dt * CONFIG.DEATH_SLOWMO; // ralenti pendant l'explosion
    updateHazards(slow, false);
    updateEnergies(slow);
    updatePowerups(slow);
    updateLasers(slow);
    updateEffects(dt);
    if (game.deathTimer <= 0) endGame();
  }

  function updateGameOver(dt) {
    const slow = dt * 0.35;
    updateHazards(slow, false);
    updateEnergies(slow);
    updatePowerups(slow);
    updateLasers(slow);
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
    burst(x, y, { count: 80, colors: [COLORS.player, COLORS.white, COLORS.shard], speed: [80, 560], life: [0.5, 1.3], size: [2, 6], drag: 2.2 });
    addRing(x, y, 10, 170, 0.7, COLORS.white, 4);
    addRing(x, y, 10, 280, 1.0, COLORS.player, 2);
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
    ctx.setTransform(k, 0, 0, k, sx * k, sy * k);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    drawGrid();
    drawStars();
    drawEnergies();
    drawPowerups();
    drawLasers();
    drawHazards();
    drawEdgeWarnings();
    drawPlayer();
    drawParticles();
    drawRings();
    drawTexts();
    drawResumeHint();

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
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rot);
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fillStyle = COLORS.shardFill;
    ctx.fill();
    ctx.strokeStyle = COLORS.shardHalo; // halo lumineux "pas cher"
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = COLORS.shard;
    ctx.lineWidth = 2.2;
    ctx.stroke();
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
    if (p.grace > 0 && Math.floor(p.grace * 14) % 2 === 0) ctx.globalAlpha = 0.3;

    // Anneau qui indique la recharge du dash
    ctx.lineWidth = 2;
    if (p.dashCooldown > 0) {
      const ready = 1 - p.dashCooldown / CONFIG.DASH_COOLDOWN;
      ctx.strokeStyle = 'rgba(62, 242, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, p.r + 9, -Math.PI / 2, -Math.PI / 2 + TAU * ready);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(62, 242, 255, 0.16)';
      ctx.beginPath();
      ctx.arc(0, 0, p.r + 9, 0, TAU);
      ctx.stroke();
    }

    // Vaisseau
    const dashing = p.dashTime > 0;
    const r = p.r;
    ctx.rotate(p.angle);
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = glow(dashing ? 30 : 18);
    ctx.fillStyle = dashing ? COLORS.white : COLORS.player;
    ctx.beginPath();
    ctx.moveTo(r * 1.35, 0);
    ctx.lineTo(-r * 0.9, -r * 0.85);
    ctx.lineTo(-r * 0.45, 0);
    ctx.lineTo(-r * 0.9, r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.playerCore;
    ctx.beginPath();
    ctx.arc(r * 0.1, 0, r * 0.28, 0, TAU);
    ctx.fill();
    ctx.restore();
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
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = COLORS.player;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 10 + 80 * k, 0, TAU);
    ctx.stroke();
    ctx.font = '800 40px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.text;
    ctx.shadowColor = COLORS.player;
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

    // Boutons
    bindButton('btn-play', startGame);
    bindButton('btn-resume', resumeGame);
    bindButton('btn-quit', function () { Sound.click(); goToMenu(); });
    bindButton('btn-replay', startGame);
    bindButton('btn-menu', function () { Sound.click(); goToMenu(); });
    bindButton('btn-pause', pauseGame);
    bindButton('btn-sound', toggleMute);

    ui.btnDash.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      requestDash();
    });

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
    window.addEventListener('resize', resize);
    resize();

    // Interface de départ
    ui.menuBest.textContent = formatScore(game.best);
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
