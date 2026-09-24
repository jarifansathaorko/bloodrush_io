// ============================================================
// BloodRush.io — State Machine
// ============================================================

export const AppState = {
  BOOT: "BOOT",
  LOADING: "LOADING",
  MAIN_MENU: "MAIN_MENU",
  NAME_INPUT: "NAME_INPUT",
  MODE_SELECT: "MODE_SELECT",
  PRE_MATCH: "PRE_MATCH",
  GAMEPLAY: "GAMEPLAY",
  REVIVE_PROMPT: "REVIVE_PROMPT",
  RESULT: "RESULT",
  REWARD: "REWARD",
  COLLECTION: "COLLECTION",
  SETTINGS: "SETTINGS",
};

export const MatchState = {
  LOADING: "LOADING",
  COUNTDOWN: "COUNTDOWN",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  ENDING: "ENDING",
  ENDED: "ENDED",
};

export class StateMachine {
  constructor(initialState) {
    this.state = initialState;
    this._listeners = {};
  }

  on(state, callback) {
    if (!this._listeners[state]) this._listeners[state] = [];
    this._listeners[state].push(callback);
    return this;
  }

  off(state, callback) {
    if (!this._listeners[state]) return;
    this._listeners[state] = this._listeners[state].filter(
      (cb) => cb !== callback,
    );
  }

  transition(newState, data = {}) {
    const prev = this.state;
    this.state = newState;
    const cbs = this._listeners[newState] || [];
    cbs.forEach((cb) => cb({ from: prev, to: newState, data }));
    const anyCbs = this._listeners["*"] || [];
    anyCbs.forEach((cb) => cb({ from: prev, to: newState, data }));
  }

  is(state) {
    return this.state === state;
  }
}

export default StateMachine;
