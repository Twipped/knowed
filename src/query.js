
import { isUndefinedOrNull, isFunction, isString, isObject, isArrayOf, pall, pmap, intersect, assert } from './utils';
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
  NAVIGATE,
  BIND,
  UNBIND,
  UNBIND_BY_KEY,
  UPDATE_META,
  PUT_DATA,
  CLEAR_DATA,
  DELETE,
} from './ops';

import { isStore } from './stores/abstract';
import {
  BIND_EAST,
  BIND_WEST,
  BIND_NORTH,
  BIND_SOUTH,
  isValidDirection,
} from './binding';

export const isQuery = (input) => input._isQuery;
export const isArrayOfQueries = isArrayOf(isQuery);



export default class Query {

  constructor (transaction, travels = []) {
    if (!transaction) throw new Error('Must pass a transaction at Query initialization');
    this.transaction = transaction;
    this.traversal = [ ...travels ];
    this.qid = querygen();
    this.descendants = [];

    if (this.traversal[0] && this.traversal[0][0] === SOULS) {
      const [ , souls ] = this.traversal.shift();
      this.souls = souls;
    } else {
      this.souls = [];
    }
  }

  _spawnChild (...travels) {
    const q = new Query(this.transaction, [ [ QUERY, this ], ...travels ]);
    this.descendants.push(q);
    return q;
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

  to (directionOrKey, create = false) {
    if (isObject(directionOrKey, true)) {
      directionOrKey = { direction: BIND_SOUTH, create, key: null, ...directionOrKey };
    } else if (isValidDirection(directionOrKey)) {
      directionOrKey = { direction: directionOrKey, create, key: null };
    } else if (isString(directionOrKey)) {
      directionOrKey = { direction: BIND_SOUTH, create, key: directionOrKey };
    } else if (isUndefinedOrNull(directionOrKey)) {
      directionOrKey = { direction: BIND_SOUTH, create, key: null };
    } else {
      assert.fail(`Unknown first argument for query.to(), expected plain object, direction or key, received ${typeof directionOrKey}`);
    }

    if (isFunction(directionOrKey.create)) {
      create = directionOrKey.create;
      directionOrKey.create = (soulid) => create(new Query(this.transaction, [ SOULS, [ soulid ] ]));
    }

    return this._spawnChild([ NAVIGATE, directionOrKey ]);
  }

  setMeta (key, value) {
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

  bind (queryOrSouls, directionOrKey) {
    if (isObject(directionOrKey, true)) {
      directionOrKey = { direction: BIND_SOUTH, key: null, ...directionOrKey };
    } else if (isValidDirection(directionOrKey)) {
      directionOrKey = { direction: directionOrKey, key: null };
    } else if (isString(directionOrKey)) {
      directionOrKey = { direction: BIND_SOUTH, key: directionOrKey };
    } else if (isUndefinedOrNull(directionOrKey)) {
      directionOrKey = { direction: BIND_SOUTH, key: null };
    } else {
      assert.fail(`Unknown second argument for query.bind(), expected plain object, direction or key, received ${typeof directionOrKey}`);
    }

    const { direction, key } = directionOrKey;

    assert(isValidDirection(direction), 'Did not receive a valid binding direction. Found: ' + direction);
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

  unbind (queryOrSouls, { direction = BIND_SOUTH } = {}) {
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

  async settle (...dependencies) {
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

    if (this.descendants.length) {
      await pmap(this.descendants, (d) => d.settle());
      this.descendants = [];
    }

    return souls;
  }

  async resolve () {
    await this.settle();
    return this;
  }

  async includes (query) {
    const [ left, right ] = await pall(
      this.settle(),
      query.settle(),
    );

    return intersect(left, right).length === right.length;
  }

  async map (fn, { withData = false, concurrency = Infinity }) {
    const store = await this.transaction.ensureInitialized();

    let results = await pmap(this.settle(), async (soulid, index) => {
      const subq = new Query(this.transaction, [ [ SOULS, [ soulid ] ] ]);

      let res = withData
        ? fn(subq, await store.getSoulData(soulid), index)
        : fn(subq, index)
			;

      res = await res;

      if (!res) return undefined;
      if (isSoulId(res)) res = [ res ];
      if (isQuery(res)) res = res.settle();
      return res;
    }, { concurrency });

    results = results.flat(1).filter(isSoulId);

    return new Query(this.transaction, [ SOULS, results ]);
  }

  async get (all = false) {
    const souls = await this.settle();
    const store = await this.transaction.ensureInitialized();

    if (!all) {
      return souls.length ? await store.getSoulData(souls[0]) : null;
    }

    if (!souls.length) return [];

    return pmap(this.souls, (soulid) => store.getSoulData(soulid));
  }

  async getMeta (...args) {
    let key = null;
    let all = false;
    if (args.length === 1) {
      if (isString(args[0])) {
        key = args[0];
      } else if (args[0] === true) {
        all = true;
      }
    } else if (args.length > 1) {
      [ key, all ] = args;
    }

    const souls = await this.settle();
    const store = await this.transaction.ensureInitialized();

    if (!all) {
      return souls.length ? await store.getSoulMetadata(souls[0], key) : null;
    }

    if (!souls.length) return [];

    return pmap(this.souls, (soulid) => store.getSoulMetadata(soulid, key));
  }

  async keys () {
    const store = await this.transaction.ensureInitialized();
    const keys = await pmap(this.settle(), (soulid) => store.getBoundKeySouls(soulid));
    return keys.flat(1);
  }

  async exists () {
    const souls = this.settle();
    return !!souls.length;
  }

}

Query.prototype.BIND_EAST = BIND_EAST;
Query.prototype.BIND_WEST = BIND_WEST;
Query.prototype.BIND_NORTH = BIND_NORTH;
Query.prototype.BIND_SOUTH = BIND_SOUTH;
Query.prototype._isQuery = true;

Query.create = (transaction, key, create = false) => new Query(transaction, [ [ FROM_ALIAS, key, create ] ]);
Query.isQuery = isQuery;
Query.isArrayOfQueries = isArrayOfQueries;
