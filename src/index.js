

export { default as Query } from './query';
export { default as Soul } from './soul';
export { default as Transaction } from './transaction';
export { default as MemStore } from './stores/mem';
export { default as JsonStore } from './stores/json';

import Transaction from './transaction';

export default class ProtoGraphDB {

	constructor (store, options = {}) {
		this.store = store;
		this.options = options;
	}

	async transaction (fn) {
		const Store = this.store;
		const store = new Store(this.options);
		const transaction = new Transaction(store);
		if (fn) {
			const result = await fn(transaction);
			await transaction.end();
			return result;
		}
		return transaction;
	}

}
