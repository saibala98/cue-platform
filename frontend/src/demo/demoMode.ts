export const DEMO_MODE = import.meta.env?.VITE_DEMO_MODE === 'true';

export const DEMO_PASSWORD = 'demo1234';

export const DEMO_STORAGE_KEYS = {
  state: 'cue_demo_state_v1',
  tourSeen: 'cue_demo_tour_seen',
  justReset: 'cue_demo_just_reset',
} as const;
