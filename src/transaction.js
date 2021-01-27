
import { isStore } from './stores/abstract';
import {
  BIND_RIGHT,
  BIND_LEFT,
  BIND_UP,
  BIND_DOWN,
} from './binding';
import Query from './query';

export default class Transaction {

  constructor (store = null) {
    if (!isStore(store)) {
      throw new TypeError('Knowed Transaction did not receive a valid store object');
    }
    this.store = store;
    this.initialized = false;
  }

  async ensureInitialized () {
    if (this.initialized) return this.store;
    const { store } = this;
    await store.initialize();
    return store;
  }

  async commit () {
    return this.end(true);
  }

  async rollback () {
    return this.end(false);
  }

  async end (write) {
    if (!this.store) return;
    await this.store.close(write);
    this.store = null;
  }

  query (key, create = true) {
    return Query.create(this, key, create);
  }

}

Transaction.prototype.BIND_RIGHT = BIND_RIGHT;
Transaction.prototype.BIND_LEFT = BIND_LEFT;
Transaction.prototype.BIND_UP = BIND_UP;
Transaction.prototype.BIND_DOWN = BIND_DOWN;
