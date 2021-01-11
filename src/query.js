
import { isString, isObject, isArrayOf, pall, map, intersect } from './utils';
import {
	hashForRootKey,
} from './shared';
import Soul, { isSoul, isArrayOfSouls } from './soul';

export const isQuery = Query.isQuery = (input) => input instanceof Query;
export const isArrayOfQueries = Query.isArrayOfQueries = isArrayOf(isQuery);

const SOULS = 'SOULS';
const ROOTKEY = 'ROOTKEY';
const TRAVEL_TO_CHILD = 'TRAVEL_TO_CHILD';
const TRAVEL_TO_PARENT = 'TRAVEL_TO_PARENT';
const LINK = 'LINK';
const UNLINK = 'UNLINK';
const UNLINK_ALL = 'UNLINK_ALL';
const PUT_DATA = 'PUT_DATA';
const CONCAT = 'CONCAT';

const OPS = {
	async SOULS ({ souls }, soulsToInclude) {
		return souls.concat(soulsToInclude);
	},

	async ROOTKEY ({ db, create }, key, type) {
		const soulid = await db.store.valGet(hashForRootKey(key));
		if (!soulid && !create) return [];

		const soul = new Soul(db, soulid || type);
		await soul.ensure();
		if (soul.fresh) {
			// this is a new soul, so we need to create the root level key-ref to it.
			await db.store.valPut(hashForRootKey(key), soul.id);
		}
		return [ soul ];
	},

	async CONCAT ({ souls: currentSouls }, query) {
		await query.resolve();
		return currentSouls.concat(query.souls);
	},

	async TRAVEL_TO_CHILD ({ souls }, key, type) {
		const proms = souls.map((soul) => soul.traverse(key, true, type));
		return (await Promise.all(proms)).flat();
	},
	async TRAVEL_TO_PARENT ({ souls }, key) {
		const proms = souls.map((soul) => soul.traverse(key, false));
		return (await Promise.all(proms)).flat();
	},
	async LINK ({ souls }, key, soulsToLink, overwrite) {
		await Promise.all(souls.map(async (soul) => {
			if (overwrite) await soul.unlinkAll(key);
			for (const s of soulsToLink) {
				await soul.link(key, s);
			}
			return souls;
		}));
		return souls;
	},
	async UNLINK ({ souls }, key, soulsToUnlink) {
		await Promise.all(souls.map(
			(soul) => Promise.all(
				soulsToUnlink.map((s) => soul.unlink(key, s)),
			),
		));
		return souls;
	},
	async UNLINK_ALL ({ souls }, key) {
		await Promise.all(souls.map(async (soul) => {
			await soul.unlinkAll(key);
			return souls;
		}));
		return souls;
	},
	async PUT_DATA ({ souls }, data, overwrite) {
		const proms = souls.map((soul) => soul.put(data, overwrite));
		return (await Promise.all(proms)).flat();
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

	get empty () {
		return !this.souls.length && !this.traversal.length;
	}

	toChild (key, type) {
		this.assert();
		const q = new Query(this.db, [ ...this.traversal, [ TRAVEL_TO_CHILD, key, type ] ],	this);
		this.relatives.add(q);
		return q;
	}

	toParent (key) {
		this.assert();
		const q = new Query(this.db, [ ...this.traversal, [ TRAVEL_TO_PARENT, key ] ], this);
		this.relatives.add(q);
		return q;
	}

	down (...args) { return this.toChild(...args); }
	up (...args) { return this.toParent(...args); }

	add (value, overwrite = false) {
		return this.link('', value, overwrite);
	}

	remove (value) {
		return this.unlink('', value);
	}

	clear () {
		return this.unlinkAll('');
	}

	contents () {
		return this.toChild('');
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
		if (isSoul(value)) {
			value = new Query(this.db, [ SOULS, [ value ] ], this);
		}
		if (isArrayOfSouls(value)) {
			value = new Query(this.db, [ SOULS, value ], this);
		}
		if (isArrayOfQueries(value)) {
			value.forEach((q) => this.link(key, q, overwrite));
			return;
		}
		if (!(isQuery(value))) {
			throw new Error('Query.link() only accepts another Query object, Soul object, or an array of Query or Soul objects.');
		}

		this.relatives.add(value);
		this.traversal.push([ LINK, key, value, overwrite ]);
		return this;
	}

	unlink (key, value = null) {
		if (!isString(key)) throw new TypeError('Expected a string key to identify the link.');
		if (isSoul(value)) {
			value = new Query(this.db, [ SOULS, [ value ] ], this);
		}
		if (isArrayOfSouls(value)) {
			value = new Query(this.db, [ SOULS, value ], this);
		}
		if (isArrayOfQueries(value)) {
			value.forEach((q) => this.unlink(key, q));
			return;
		}
		if (!(isQuery(value))) {
			throw new Error('Query.link() only accepts another Query object, Soul object, or an array of Query or Soul objects.');
		}

		this.relatives.add(value);
		this.traversal.push([ UNLINK, key, value ]);

		return this;
	}

	unlinkAll (key) {
		this.traversal.push([ UNLINK_ALL, key ]);

		return this;
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

	async has (query) {
		await pall(
			this.resolve(),
			query.resolve(),
		);

		const left  = map(this.souls, 'id');
		const right = map(query.souls, 'id');
		return intersect(left, right).length === right.length;
	}

	async map (fn) {
		return Promise.all(this.souls.map(fn));
	}

	async get (one = false) {
		await this.resolve();
		if (!this.souls || !this.souls.length) return one ? null : [];
		if (one) return this.souls.length ? this.souls[0].get() : null;
		return this.map((s) => s.get());
	}

	then (...args) {
		return this.resolve()
			.then(() => this.map((s) => s.ensure()))
			.then(...args);
	}

	async delete () {
		await this.resolve();
		await Promise.all(this.souls.map((s) => s.delete()));
		this.souls = [];
	}
}

Query.create = (db, key, type) => new Query(db, null, [ [ ROOTKEY, key, type ] ]);
