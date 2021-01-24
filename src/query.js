
import { isString, isObject, isArrayOf, pall, pmap, intersect, assert } from './utils';
import {
	isSoulId,
	isArrayOfSoulIds,
	querygen,
} from './ids';
import Operations, {
	QUERY,
	SOULS,
	FROM_ALIAS,
	SET_ALIAS,
	REMOVE_ALIAS,
	TRAVEL_IN_DIRECTION,
	TRAVEL_TO_KEY,
	TRAVEL_FROM_KEY,
	BIND,
	UNBIND,
	UNBIND_BY_KEY,
	UPDATE_META,
	PUT_DATA,
	CLEAR_DATA,
	DELETE,
} from './ops';

import { isStore, DIRECTION, isValidDirection } from './stores/abstract';

export const isQuery = (input) => input instanceof Query;
export const isArrayOfQueries = isArrayOf(isQuery);



export default class Query {

	constructor (transaction, travels = []) {
		if (!transaction) throw new Error('Must pass a transaction at Query initialization');
		this.transaction = transaction;
		this.traversal = [ ...travels ];
		this.qid = querygen();

		if (this.traversal[0] && this.traversal[0][0] === SOULS) {
			const [ , souls ] = this.traversal.shift();
			this.souls = souls;
		} else {
			this.souls = [];
		}
	}

	get empty () {
		return !this.souls.length && !this.traversal.length;
	}

	get length () {
		return this.souls.length;
	}

	alias (alias) {
		assert(alias && isString(alias), 'Alias must be a non-empty string');
		this.traversal.push( [ SET_ALIAS, alias ] );
		return this;
	}

	dealias (alias) {
		assert(alias && isString(alias), 'Alias must be a non-empty string');
		this.traversal.push( [ REMOVE_ALIAS, alias ] );
		return this;
	}

	to (direction, createIfMissing = true) {
		return new Query(this.transaction, [ [ QUERY, this ], [ TRAVEL_IN_DIRECTION, direction, createIfMissing ] ]);
	}

	key (key, directionForCreation = DIRECTION.RIGHT) {
		return new Query(this.transaction, [ [ QUERY, this ], [ TRAVEL_TO_KEY, key, directionForCreation ] ]);
	}

	keyParent (key, directionForCreation = DIRECTION.LEFT) {
		return new Query(this.transaction, [ [ QUERY, this ], [ TRAVEL_FROM_KEY, key, directionForCreation ] ]);
	}

	down (...args) { return this.to(DIRECTION.UP, ...args); }
	up (...args) { return this.to(DIRECTION.DOWN, ...args); }
	left (...args) { return this.to(DIRECTION.LEFT, ...args); }
	right (...args) { return this.to(DIRECTION.RIGHT, ...args); }

	set (key, value) {
		if (isString(key) && value !== undefined) {
			key = { [key]: value };
		}

		this.traversal.push( [ UPDATE_META, key ]);
		return this;
	}

	put (value, update = true) {
		assert(isObject(value, true), 'Query.put() only accepts plain objects for data to attach.');

		this.traversal.push( [ PUT_DATA, { ...value }, update ] );
		return this;
	}

	clear () {
		this.traversal.push( [ CLEAR_DATA ] );
		return this;
	}

	bind (direction, queryOrSouls, key) {
		assert(isValidDirection(direction), 'Expected LEFT, RIGHT, UP or DOWN as a direction.');
		assert(!key || isString(key), 'Key must either be falsy or a non-empty string');

		if (isSoulId(queryOrSouls)) {
			queryOrSouls = new Query(this.transaction, [ SOULS, [ queryOrSouls ] ]);
		}
		if (isArrayOfSoulIds(queryOrSouls)) {
			queryOrSouls = new Query(this.transaction, [ SOULS, queryOrSouls ]);
		}
		if (isArrayOfQueries(queryOrSouls)) {
			queryOrSouls.forEach((q) => this.bind(direction, q));
			return this;
		}

		assert(isQuery(queryOrSouls), 'Query.bind() only accepts another Query object, Soul ID, or an array of Queries or Souls IDs');

		this.traversal.push([ BIND, queryOrSouls, direction, key || null ]);
		return this;
	}

	unbind (direction, queryOrSouls = null) {
		assert(isValidDirection(direction), 'Expected LEFT, RIGHT, UP or DOWN as a direction.');

		if (isSoulId(queryOrSouls)) {
			queryOrSouls = new Query(this.transaction, [ SOULS, [ queryOrSouls ] ]);
		}
		if (isArrayOfSoulIds(queryOrSouls)) {
			queryOrSouls = new Query(this.transaction, [ SOULS, queryOrSouls ]);
		}
		if (isArrayOfQueries(queryOrSouls)) {
			queryOrSouls.forEach((q) => this.unbind(direction, q));
			return this;
		}

		assert(isQuery(queryOrSouls), 'Query.unbind() only accepts another Query object, Soul ID, or an array of Queries or Souls IDs');

		this.traversal.push([ UNBIND, queryOrSouls, direction ]);

		return this;
	}

	unbindKey (key) {
		assert(key && isString(key), 'Key must be a non-empty string');

		this.traversal.push([ UNBIND_BY_KEY, key ]);

		return this;
	}

	concat (...queries) {
		queries = queries.flat(Infinity).map((q) => {
			if (isQuery(q)) return [ QUERY, q ];
			if (isSoulId(q)) return [ SOULS, [ q ] ];
			if (isArrayOfSoulIds(q)) return [ SOULS, q ];
			return null;
		}).filter(Boolean);

		return new Query(this.transaction, [ [ QUERY, this ], ...queries ]);
	}

	delete () {
		this.traversal.push([ DELETE ]);
		return this;
	}

	async resolve (...dependencies) {
		if (!this.traversal.length) return [ ...this.souls ];

		assert(!dependencies.includes(this.qid), 'Circular query dependency detected');

		let souls = [ ...this.souls ];
		const { transaction, qid } = this;
		const store = await transaction.ensureInitialized();
		assert(isStore(store), 'Transaction did not resolve with a datastore');

		for (const [ action, ...args ] of this.traversal) {
			const op = Operations[action];
			assert(op, 'Could not find operation for ' + action);

			souls = await op({ qid, transaction, store, souls, dependencies }, ...args);
			assert(souls, `Query resolution for ${action} returned nothing. This shouldn't ever happen.`);
		}
		this.souls = souls;
		this.traversal = [];

		return souls;
	}

	async includes (query) {
		const [ left, right ] = await pall(
			this.resolve(),
			query.resolve(),
		);

		return intersect(left, right).length === right.length;
	}

	async map (fn, { withData = false, concurrency = Infinity }) {
		const store = await this.transaction.ensureInitialized();

		let results = await pmap(this.resolve(), async (soulid, index) => {
			const subq = new Query(this.transaction, [ [ SOULS, [ soulid ] ] ]);

			let res = withData
				? fn(subq, await store.getSoulData(soulid), index)
				: fn(subq, index)
			;

			res = await res;

			if (!res) return undefined;
			if (isSoulId(res)) res = [ res ];
			if (isQuery(res)) res = res.resolve();
			return res;
		}, { concurrency });

		results = results.flat(1).filter(isSoulId);

		return new Query(this.transaction, [ SOULS, results ]);
	}

	async get (all = true) {
		const souls = await this.resolve();
		const store = await this.transaction.ensureInitialized();

		if (!all) {
			return souls.length ? await store.getSoulData(souls[0]) : null;
		}

		if (!souls.length) return [];

		return pmap(this.souls, (soulid) => store.getSoulData(soulid));
	}

	async stat (all = false) {
		const souls = await this.resolve();
		const store = await this.transaction.ensureInitialized();

		if (!all) {
			return souls.length ? await store.getSoulMetadata(souls[0]) : null;
		}

		if (!souls.length) return [];

		return pmap(this.souls, (soulid) => store.getSoulMetadata(soulid));
	}

	async keys () {
		const store = await this.transaction.ensureInitialized();
		const keys = await pmap(this.resolve(), (soulid) => store.getBoundKeySouls(soulid));
		return keys.flat(1);
	}

	then (...args) {
		return this.resolve().then(...args);
	}

}

Query.create = (transaction, key, create = false) => new Query(transaction, [ [ FROM_ALIAS, key, create ] ]);
Query.isQuery = isQuery;
Query.isArrayOfQueries = isArrayOfQueries;
