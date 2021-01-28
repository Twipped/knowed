
import MemStore from './stores/mem';
import JsonStore from './stores/json';
import AbstractStore from './stores/abstract';
import Knowed from './index';
import {
  BIND_EAST,
  BIND_WEST,
  BIND_NORTH,
  BIND_SOUTH,
  BIND,
} from './binding';

Knowed.AbstractStore = AbstractStore;
Knowed.MemStore = MemStore;
Knowed.JsonStore = JsonStore;
Knowed.BIND_EAST = BIND_EAST;
Knowed.BIND_WEST = BIND_WEST;
Knowed.BIND_NORTH = BIND_NORTH;
Knowed.BIND_SOUTH = BIND_SOUTH;
Knowed.BIND = BIND;

export default Knowed;
