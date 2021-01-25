

export { default as MemStore } from './stores/mem';
export { default as JsonStore } from './stores/json';
export { default as AbstractStore } from './stores/abstract';
export {
  BIND_RIGHT,
  BIND_LEFT,
  BIND_UP,
  BIND_DOWN,
  DIRECTION as BIND,
} from './binding';

import { isStore } from './stores/abstract';
import Transaction from './transaction';

export default class ProtoGraphDB {

  constructor (store, options = {}) {
    this.store = store;
    this.options = options;
  }

  async transaction (fn) {
    if (!isStore(this.store)) {
      throw new TypeError('ProtoGraphDB did not receive a valid store object');
    }
    const Store = this.store;
    const store = new Store(this.options);
    const transaction = new Transaction(store);
    if (fn) {
      try {
        const result = await fn(transaction);
        await transaction.commit();
        return result;
      } catch (e) {
        await transaction.rollback();
        throw e;
      }
    }
    return transaction;
  }

}
