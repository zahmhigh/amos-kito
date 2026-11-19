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
  DEATH_FLASH_MS: 80,       // white flash on hit
  DEATH_SPIN_S: 0.4,        // spin + drop duration
  DEATH_SPIN_TURNS: 1.5,    // turns during the spin
  DEATH_DAZED_S: 0.5,       // dazed image before game over

  // Phase 4 ramp values (not used yet; speed and gap stay fixed in Phase 1)
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

  // --- Art loading (Phase 1 uses coloured boxes only) ---
  LOAD_ART: false,
};
