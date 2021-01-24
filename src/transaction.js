
import { isStore } from './stores/abstract';
import Query from './query';

export default class Transaction {

	constructor (store = null) {
		if (!isStore(store)) {
			throw new TypeError('ProtoGraphDB Transaction did not receive a valid store object');
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

	query (key, create = false) {
		return Query.create(this, key, create);
	}

}
