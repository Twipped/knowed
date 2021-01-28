

export { default as MemStore } from './stores/mem';
export { default as JsonStore } from './stores/json';
export { default as AbstractStore } from './stores/abstract';
export {
  BIND_EAST,
  BIND_WEST,
  BIND_NORTH,
  BIND_SOUTH,
  BIND,
} from './binding';

import { isStore } from './stores/abstract';
import Transaction from './transaction';

export default class Knowed {

  constructor (store, options = {}) {
    this.store = store;
    this.options = options;
  }

  async transaction (fn) {
    if (!isStore(this.store)) {
      throw new TypeError('Knowed did not receive a valid store object');
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
