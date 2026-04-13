import type { State } from '../core/types';
import type { Config } from '../config/defaults';

/**
 * A terminal backend emits escape code strings (no side effects).
 * The caller decides when and where to write them.
 */
export interface Backend {
  /** Escape code that expresses the given state per the given config. */
  encodeState(state: State, config: Config): string;
  /** Escape code that resets the terminal to the user's untinted baseline. */
  encodeReset(config: Config): string;
}
