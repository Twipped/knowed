
import {
	isStore,
} from './shared';
import Query from './query';
import Soul from './soul';

export default class Transaction {

	constructor (store = null) {
		if (!isStore(store)) {
			throw new TypeError('ProtoGraphDB did not receive a valid store object');
		}
		this.store = store;
		this.initialized = false;
	}

	async ensureInitialized () {
		if (this.initialized) return true;
		await this.store.initialize();
	}

	async commit () {
		await this.store.close(true);
		this.store = null;
	}

	async end () {
		await this.store.close(false);
		this.store = null;
	}

	query (key, type) {
		return new Query(this, key, type);
	}

	soul (id) {
		return new Soul(this, id);
	}

}
