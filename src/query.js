
import { isUndefinedOrNull, isString, merge, isArray, isObject, isArrayOf } from './utils';
import {
	hashForRootKey,
} from './shared';
import Soul, { isSoul, isArrayOfSouls } from './soul';

const SOULS = 'SOULS';
const ROOTKEY = 'ROOTKEY';
const TRAVEL_DOWN = 'TRAVEL_DOWN';
const TRAVEL_UP = 'TRAVEL_UP';
const MAKE_LINK = 'MAKE_LINK';
const PUT_DATA = 'PUT_DATA';
const SET_ADD = 'SET_ADD';
const SET_DELETE = 'SET_DELETE';
const CONCAT = 'CONCAT';

const OPS = {
	async SOULS ({ souls }, soulsToInclude) {

	},
	async ROOTKEY ({ db, create }, key, type) {
		const soulid = await db.store.valGet(hashForRootKey(key));
		if (!soulid && !create) return [];

		const soul = new Soul(db, soulid || type);
		await soul.ensure();
		if (soul.fresh) {
			await db.store.valPut(hashForRootKey(key), soul.id);
		}
		return [ soul ];
	},

	async CONCAT ({ souls: currentSouls }, value) {
		if (isQuery(value)) value = await value.resolve();
		if (!isArray(value) && isSoul(value)) value = [ value ];

		// at this point we should always have an array of souls as the input.
		if (!isArrayOfSouls(value)) throw new TypeError('Query concat input was not a collection of souls.');

		return currentSouls.concat(value);
	},
	async TRAVEL_DOWN ({ souls }, key, type) {
		const proms = souls.map((soul) => soul.traverse(key, true, type));
		return (await Promise.all(proms)).flat();
	},
	async TRAVEL_UP ({ souls }, key) {
		const proms = souls.map((soul) => soul.traverse(key, false));
		return (await Promise.all(proms)).flat();
	},
	async MAKE_LINK ({ souls }, key, soulsToLink, overwrite) {
		const proms = souls.map(async (soul) => {
			if (overwrite) await soul.unlinkAll(key);
			for (const s of soulsToLink) {
				await soul.link(key, s);
			}
			return souls;
		});
		return (await Promise.all(proms)).flat();
	},
	async PUT_DATA ({ souls }, data, overwrite) {
		const proms = souls.map((soul) => soul.put(data, overwrite));
		return (await Promise.all(proms)).flat();
	},
	async SET_ADD ({ souls }, soulsToAdd, overwrite) {

	},
	async SET_DELETE ({ souls }, soulsToRemove) {

	},
};

export default class Query {

	constructor (db, travels, parent = null) {
		this.db = db;
		this.souls = [];
		this.parent = parent;
		this.relatives = parent ? new Set([ parent ]) : new Set();
		this.traversal = travels;
	}

	get length () {
		return this.souls.length;
	}

	down (key, type) {
		const q = new Query(this.db, [ ...this.traversal, [ TRAVEL_DOWN, key, type ] ],	this);
		this.relatives.add(q);
		return q;
	}

	up (key) {
		const q = new Query(this.db, [ ...this.traversal, [ TRAVEL_UP, key ] ], this);
		this.relatives.add(q);
		return q;
	}

	add (value, overwrite = false) {
		if (!(value instanceof Query || value instanceof Soul)) {
			throw new Error('Query.add() only accepts another query or a Soul object.');
		}

		this.traversal.push([ SET_ADD, value, overwrite ]);
		this.relatives.add(value);
		return this;
	}

	put (value, overwrite = false) {
		if (!isObject(value, true)) {
			throw new Error('Query.put() only accepts plain objects for data to attach.');
		}

		this.traversal.push( [ PUT_DATA, { ...value }, overwrite ] );
		return this;
	}

	link (key, value, overwrite = false) {
		if (!isString(key)) throw new TypeError('Expected a string key to identify the link.');
		if (value instanceof Soul) {
			value = new Query(this.db, [ SOULS, [ value ] ], this);
		}
		if (isArrayOfSouls(value)) {
			value = new Query(this.db, [ SOULS, value ], this);
		}
		if (isArrayOfQueries(value)) {
			value.forEach((q) => this.link(key, q, overwrite));
			return;
		}
		if (!(value instanceof Query)) {
			throw new Error('Query.link() only accepts another Query object, Soul object, or an array of Query or Soul objects.');
		}

		this.relatives.add(value);
		this.traversal.push([ MAKE_LINK, key, value, overwrite ]);
		return this;
	}

	unlink (key, value = null) {
		if (!isString(key)) throw new TypeError('Expected a string key to identify the link.');
		if (value && !(value instanceof Query || value instanceof Soul)) {
			throw new Error('Query.unlink() only accepts another query or a Soul object.');
		}
	}

	concat (...queries) {
		const traversal = [ ...this.traversal ];
		for (const q of queries) {
			traversal.push([ CONCAT, q ]);
		}
		const q = new Query(this.db, traversal, this);
		this.relatives.push(q);
		return q;
	}

	async resolve () {
		if (!this.traversal.length) return;
		let souls = [ ...this.souls ];
		for (const [ action, ...args ] of this.traversal) {
			const op = OPS[action];
			if (!op) throw new Error('Could not find operation for ' + action);

			souls = await op({ souls }, ...args);
			if (!souls) throw new Error(`Query resolution for ${action} returned nothing. This shouldn't ever happen.`);
		}
		this.souls = souls;
		this.traversal = [];
	}

	async get (one = false) {
		await this.resolve();
		if (!this.souls || !this.souls.length) return one ? null : [];
		if (one) return this.souls[0] ? this.souls[0].get() : null;
		return Promise.all(this.souls.map((s) => s.get()));
	}

	then (...args) {
		return this.get(true).then(...args);
	}
}

Query.create = (db, key, type) => new Query(db, null, [ [ ROOTKEY, key, type ] ]);

export const isQuery = Query.isQuery = (input) => input instanceof Query;
export const isArrayOfQueries = Query.isArrayOfQueries = isArrayOf(isQuery);
