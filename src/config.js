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

  // Phase 4 ramp values (not used yet; speed and gap stay fixed)
  RAMP_SPEED_STEP: 5,       // +px/s
  RAMP_SPEED_EVERY: 10,     // bites
  RAMP_SPEED_MAX: 260,      // px/s
  RAMP_GAP_STEP: 4,         // −px
  RAMP_GAP_EVERY: 5,        // bites
  RAMP_GAP_MIN: 150,        // px

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

  // --- Layout / feel ---
  MOSQUITO_X: 96,           // fixed horizontal centre of the mosquito
  MOSQUITO_START_Y: 300,
  MIN_TOP: 60,              // shortest top obstacle, so the ceiling is always blocked
  FIRST_PAIR_X: 420,        // where the first pair spawns (just off screen)
  HOVER_AMPLITUDE: 6,       // px, idle bob on title / ready screens
  HOVER_PERIOD_S: 1.2,
  RESTART_LOCK_MS: 300,     // ignore taps right after game over appears

  // --- Storage ---
  BEST_KEY: 'amoskito.best',
};
