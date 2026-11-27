// All tunable numbers in one place.
// The "Starting values to tune" table from BUILD_DOC.md is the first block.

export const CONFIG = {
  // --- Starting values to tune (BUILD_DOC.md) ---
  GRAVITY: 1400,            // px/s², pulls the mosquito down between taps
  FLAP_PUSH: -420,          // px/s, sets upward speed on each tap
  MAX_FALL_SPEED: 600,      // px/s, caps downward speed
  SCROLL_SPEED: 160,        // px/s, fixed until the Phase 4 ramp
  GAP_SIZE: 190,            // px, fixed until the Phase 4 ramp
  PAIR_SPACING: 220,        // px, horizontal open space between one pair and the next
  OBSTACLE_WIDTH: 70,       // px
  CLOTHES_HEIGHT: 385,      // px, the clothes stack is 385 px tall at 70 px wide
  LONGEST_TOP: 380,         // px, longest top obstacle (keeps a 70 px minimum bottom)
  WING_FRAME_MS: 70,        // ms per wing-flap frame (try 60–80)

  // Death sequence: flash, then spin + drop, then dazed still, then game over.
  DEATH_FLASH_MS: 80,       // Amos flashes white, frozen mid-flap
  DEATH_SPIN_S: 0.4,        // spin + drop duration
  DEATH_SPIN_TURNS: 1.5,    // turns during the spin
  DEATH_DAZED_S: 0.5,       // dazed image in the room before game over

  // Difficulty ramp (Phase 4). Starts from SCROLL_SPEED and GAP_SIZE.
  RAMP_START_BITES: 20,     // bites before the ramp begins, so the first 20 feel unchanged
  RAMP_SPEED_STEP: 5,       // +px/s...
  RAMP_SPEED_EVERY: 10,     // ...every 10 bites
  RAMP_SPEED_MAX: 260,      // px/s cap
  RAMP_GAP_STEP: 4,         // −px...
  RAMP_GAP_EVERY: 5,        // ...every 5 bites
  RAMP_GAP_MIN: 150,        // px floor

  // Screen shake on the crash
  SHAKE_PX: 5,
  SHAKE_S: 0.28,

  // Game over: a line under "You no see road?!", chosen by what Amos crashed
  // into. It's picked at random from that group plus "general" (the coil
  // group covers its smoke too). If NEPA's light was on at the crash, only the
  // "lit" group is used. Never the same line twice in a row when another is
  // available. Add, edit or remove lines freely; an empty group is fine.
  GAME_OVER_LINES: {
    clothes: ['Wrapper don catch you.', 'Singlet don hold you.'],
    bedpost: ['Bedpost no dey shift.', 'Na bedpost you wan bite?'],
    coil: ['Coil don do im work.', 'Na coil smoke you dey sniff?'],
    floor: ['Floor don collect you.', 'Jeje, Amos!'],
    general: ['Small blood, big wahala.', 'Oga still dey sleep sha.', 'Even NEPA dey try pass you.'],
    lit: ['Who on light?', 'Light don expose you.'],
  },

  // --- Screen ---
  WIDTH: 360,
  HEIGHT: 640,
  FLOOR_Y: 640,             // touching this kills the mosquito

  // --- Loop ---
  STEP: 1 / 60,             // fixed physics step (s)
  MAX_FRAME_DT: 0.25,       // ignore longer frames (tab switch, slow frame)
  MAX_STEPS_PER_FRAME: 5,

  // --- Sprite display sizes (on-screen px) ---
  MOSQUITO_DRAW_W: 68,      // Amos is shown 64–72 px wide
  DAZED_ROOM_W: 72,         // dazed still in the room
  DAZED_GAMEOVER_W: 240,    // dazed still on the game over screen
  LOGO_W: 300,              // title logo
  COIL_BASE_SRC_H: 90,      // bottom 90 px of the coil image is the coil itself
  COIL_SMOKE_FADE: 20,      // px, top of the smoke fades out over this height

  // --- Room objects (on-screen px, from the Room objects table) ---
  SLEEPER_X: 118,           // left end
  SLEEPER_LEGS_Y: 612,      // bed legs
  SLEEPER_W: 240,
  SLEEPER_H: 114,
  BREATH_SWELL: 0.015,      // asleep image swells 1.5% taller from the bed legs
  BREATH_PERIOD_S: 3,
  FAN_RIGHT_X: 356,
  FAN_BASE_Y: 480,
  FAN_W: 62,
  FAN_H: 168,

  // --- Lighting ---
  BG_DARKEN: 0.75,          // background layer darkened ~75% in the dark
  OBSTACLE_DARKEN: 0.15,    // obstacles only lightly darkened, edges stay clear
  OUTLINE_COLOR: '#fff1d0', // thin crisp cream outline around Amos
  OUTLINE_PX: 1.5,          // outline width (1–2 px)
  OUTLINE_DARK_COLOR: '#1a120c', // dark edge outside the cream outline, so Amos
  OUTLINE_DARK_PX: 1,       //   also stands out against the bright lit room
  OUTLINE_DARK_ALPHA: 0.85,
  OBSTACLE_OUTLINE_COLOR: '#1a120c', // dark outline round every obstacle (and the smoke)
  OBSTACLE_OUTLINE_PX: 1.5,
  OBSTACLE_OUTLINE_ALPHA: 0.9,
  LIT_BG_DIM: 0.35,         // background stays this dark when NEPA brings light,
                            //   so obstacles and Amos stay easy to see
  BULB_X: 181,              // painted ceiling bulb centre
  BULB_Y: 55,
  LAMP_X: 78,               // rechargeable lamp centre
  LAMP_Y: 380,
  LAMP_GLOW_R: 95,          // px, radius of the lamp's pool of light
  LAMP_GLOW_ALPHA: 0.28,    // warm glow strength
  MOON_X: 128,              // window centre (moonlight through the curtains)
  MOON_Y: 210,
  MOON_R: 110,
  MOON_STRENGTH: 0.25,      // how much the window cuts through the darkness

  // --- NEPA power event (Phase 3) ---
  NEPA_FIRST_MIN_S: 8,      // first power return 8–12 s into a round...
  NEPA_FIRST_MAX_S: 12,
  NEPA_FIRST_MIN_BITES: 3,  // ...and only after at least 3 pairs passed
  NEPA_EVERY_MIN_S: 20,     // then every 20–30 s (counted from the last cut)
  NEPA_EVERY_MAX_S: 30,
  NEPA_FLICKER_S: 0.3,      // warning: bulb flickers before the light comes
  NEPA_FADE_S: 0.4,         // overlay fades dark -> fully lit
  NEPA_LIT_MIN_S: 5,        // power lasts 5–7 s (from the fade starting)
  NEPA_LIT_MAX_S: 7,
  NEPA_CUT_WARN_S: 0.35,    // warning: bulb stutters and gusts die down before the cut
  NEPA_BONUS: 3,            // bites for surviving the light
  NEPA_BANNER_S: 1,         // "NEPA Took Light!" banner
  UP_NEPA_TEXT_S: 1.7,      // "Up NEPA!" shout shown on screen (matches the recording)
  BULB_GLOW_R: 140,         // px, glow round the lit bulb
  BULB_GLOW_ALPHA: 0.35,

  // Fan and gusts (gusts move Amos's position, never his flap speed)
  FAN_SPINUP_S: 0.6,        // fan spins (and wind lines show) before gusts start
  GUST_RAMP_S: 0.6,         // gusts grow to full strength over this time
  GUST_AMPLITUDE: 60,       // px/s peak drift (spec range 60–90; lowered after player feedback)
  GUST_PERIOD_S: 1.5,       // one up-and-down cycle
  FAN_SHAKE_PX: 1,
  CLOTHES_SWAY_PX: 5,       // visual only; hitboxes don't move
  WIND_LINES: 12,
  WIND_LINE_SPEED: 420,     // px/s, right to left
  WIND_ALPHA_MIN: 0.2,      // wind lines while the fan spins up (warning)
  WIND_ALPHA_MAX: 0.4,      // wind lines at full gust (drawn behind obstacles)

  // --- Sound (Phase 4) ---
  MASTER_VOLUME: 0.8,
  BUZZ_HZ: 560,             // mosquito whine
  BUZZ_VOL: 0.05,
  BUZZ_FLAP_RISE: 1.18,     // pitch jumps 18% on each flap...
  BUZZ_FLAP_GLIDE_S: 0.12,  // ...then glides back
  SNORE_VOL: 0.22,
  GENERATOR_VOL: 0.05,      // distant, only while dark
  FAN_VOL: 0.12,
  FAN_WINDDOWN_S: 0.9,
  BULB_BUZZ_VOL: 0.08,
  THUD_VOL: 0.8,             // crash thud when Amos hits something
  VOICE_VOL: 1,
  VOICE_AFTER_CRASH_S: 0.3, // "You no see road?!" starts this long after the crash
  // Recorded files (put them in assets/audio/ and set the path; null = none).
  // Voice lines only play from files. Setting a path for an effect
  // (switch, bulbBuzz, powerCut, thud) replaces its synthesised sound.
  AUDIO_FILES: {
    upNepa: 'assets/audio/up_nepa.mp3',
    nepaTookLight: 'assets/audio/nepa_took_light.mp3',
    youNoSeeRoad: null,     // set to 'assets/audio/you_no_see_road.mp3' once recorded
    switch: null,
    bulbBuzz: null,
    powerCut: null,
    thud: null,
  },

  // Mute button (top right)
  MUTE_BTN: { x: 314, y: 14, w: 36, h: 36 },

  // --- Layout / feel ---
  MOSQUITO_X: 96,           // fixed horizontal centre of the mosquito
  MOSQUITO_START_Y: 300,
  MIN_TOP: 60,              // shortest top obstacle, so the ceiling is always blocked
  FIRST_PAIR_X: 420,        // where the first pair spawns (just off screen)
  HOVER_AMPLITUDE: 6,       // px, idle bob on title / ready screens
  HOVER_PERIOD_S: 1.2,
  RESTART_LOCK_MS: 300,     // ignore taps right after game over appears

  // --- Sharing (Phase 5) ---
  // Shared links always point here, wherever the game was played.
  SHARE_URL: 'https://amoskito.app/',
  SHARE_TEXT: 'Amos Kito survived {n}. This mosquito no gree sleep. Beat my score!',
  TOAST_MS: 1600,

  // --- Storage ---
  BEST_KEY: 'amoskito.best',
  MUTE_KEY: 'amoskito.muted',
};
