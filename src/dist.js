
import MemStore from './stores/mem';
import JsonStore from './stores/json';
import AbstractStore from './stores/abstract';
import ProtoGraphDB from './index';
import {
  BIND_RIGHT,
  BIND_LEFT,
  BIND_UP,
  BIND_DOWN,
  DIRECTION as BIND,
} from './binding';

ProtoGraphDB.AbstractStore = AbstractStore;
ProtoGraphDB.MemStore = MemStore;
ProtoGraphDB.JsonStore = JsonStore;
ProtoGraphDB.BIND_RIGHT = BIND_RIGHT;
ProtoGraphDB.BIND_LEFT = BIND_LEFT;
ProtoGraphDB.BIND_UP = BIND_UP;
ProtoGraphDB.BIND_DOWN = BIND_DOWN;
ProtoGraphDB.BIND = BIND;

export default ProtoGraphDB;
