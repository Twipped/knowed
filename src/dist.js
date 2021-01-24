
import MemStore from './stores/mem';
import JsonStore from './stores/json';
import AbstractStore from './stores/abstract';
import ProtoGraphDB from './index';

ProtoGraphDB.AbstractStore = AbstractStore;
ProtoGraphDB.MemStore = MemStore;
ProtoGraphDB.JsonStore = JsonStore;

export default ProtoGraphDB;
