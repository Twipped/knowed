
import { isArrayOf } from './utils';

export const BIND_RIGHT = 'RIGHT';
export const BIND_LEFT = 'LEFT';
export const BIND_UP = 'UP';
export const BIND_DOWN = 'DOWN';

export const DIRECTION = {
  [BIND_RIGHT]: BIND_RIGHT,
  [BIND_LEFT]: BIND_LEFT,
  [BIND_UP]: BIND_UP,
  [BIND_DOWN]: BIND_DOWN,
};

export const MOVEMENT = {
  [BIND_LEFT]:  [ BIND_LEFT, BIND_RIGHT ],
  [BIND_RIGHT]: [ BIND_RIGHT, BIND_LEFT ],
  [BIND_UP]:    [ BIND_UP, BIND_DOWN ],
  [BIND_DOWN]:  [ BIND_DOWN, BIND_UP ],
};

export const oppositeDirection = (dir) => MOVEMENT[dir] && MOVEMENT[dir][1];
export const isValidDirection = (dir) => DIRECTION[dir];
export const areValidDirections = isArrayOf(isValidDirection);
