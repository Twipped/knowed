
import MemStore from './stores/mem';
import JsonStore from './stores/json';
import AbstractStore from './stores/abstract';
import Knowed from './index';
import {
  BIND_RIGHT,
  BIND_LEFT,
  BIND_UP,
  BIND_DOWN,
  DIRECTION as BIND,
} from './binding';

Knowed.AbstractStore = AbstractStore;
Knowed.MemStore = MemStore;
Knowed.JsonStore = JsonStore;
Knowed.BIND_RIGHT = BIND_RIGHT;
Knowed.BIND_LEFT = BIND_LEFT;
Knowed.BIND_UP = BIND_UP;
Knowed.BIND_DOWN = BIND_DOWN;
Knowed.BIND = BIND;

export default Knowed;
