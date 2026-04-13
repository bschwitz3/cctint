import type { Backend } from './backend';
import type { Config } from '../config/defaults';
import type { State } from '../core/types';

const HEX = /^#[0-9a-fA-F]{6}$/;
const ESC = '\x1b';
const BEL = '\x07';

export const iterm2 = {
  setBackground(hex: string): string {
    if (!HEX.test(hex)) throw new Error(`invalid hex: ${hex}`);
    const normalized = hex.slice(1).toLowerCase();
    return `${ESC}]1337;SetColors=bg=${normalized}${BEL}`;
  },
  resetBackground(): string {
    // Emit both iTerm2's proprietary reset AND the standard OSC 111 reset.
    // iTerm2's SetColors=bg=default occasionally doesn't fully revert after
    // successive overrides; OSC 111 is the XTerm standard for "reset bg color"
    // and iTerm2 honors it. Belt-and-suspenders for reliable recovery.
    return `${ESC}]1337;SetColors=bg=default${BEL}${ESC}]111${BEL}`;
  },
  switchProfile(name: string): string {
    if (!name) throw new Error('profile name must be non-empty');
    if (name.includes(BEL) || name.includes(ESC)) {
      throw new Error('profile name contains control characters');
    }
    return `${ESC}]1337;SetProfile=${name}${BEL}`;
  },
};

export const iterm2Backend: Backend = {
  encodeState(state: State, config: Config): string {
    if (config.mode === 'live-color') {
      return iterm2.setBackground(config.colors[state].bg);
    }
    return iterm2.switchProfile(config.profiles[state]);
  },
  encodeReset(config: Config): string {
    if (config.mode === 'live-color') {
      return iterm2.resetBackground();
    }
    return iterm2.switchProfile(config.profiles.default);
  },
};
