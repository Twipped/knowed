
import { isArrayOf } from './utils';

export const BIND_EAST = '\tEAST\t';
export const BIND_WEST = '\tWEST\t';
export const BIND_NORTH = '\tNORTH\t';
export const BIND_SOUTH = '\tSOUTH\t';

export const BIND = {
  EAST: BIND_EAST,
  WEST: BIND_WEST,
  NORTH: BIND_NORTH,
  SOUTH: BIND_SOUTH,
};

export const MOVEMENT = {
  [BIND_WEST]:  [ BIND_WEST, BIND_EAST ],
  [BIND_EAST]:  [ BIND_EAST, BIND_WEST ],
  [BIND_NORTH]: [ BIND_NORTH, BIND_SOUTH ],
  [BIND_SOUTH]: [ BIND_SOUTH, BIND_NORTH ],
};

export const oppositeDirection = (dir) => MOVEMENT[dir] && MOVEMENT[dir][1];
export const isValidDirection = (dir) => MOVEMENT[dir];
export const areValidDirections = isArrayOf(isValidDirection);
