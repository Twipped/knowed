
import AbstractStore from './abstract';
import {
  BIND_RIGHT,
  BIND_LEFT,
  BIND_UP,
  BIND_DOWN,
  MOVEMENT,
  oppositeDirection,
  isValidDirection,
  areValidDirections,
} from '../binding';

import { isArray, isObject, isMap, isSet, assert, pmap, fromPairs, nullIterator, entries } from '../utils';
import sha256 from '../sha';
import { isSoulId } from '../ids';

const hashForSoulAlias = (key) => `ALIAS-${sha256(key)}`;
// const isSoulAlias = (hash) => (isString(hash) && hash.length === 42 + 6 && hash.startsWith('ALIAS-'));

export default class MemStore extends AbstractStore {

  async initialize () {
    if (this.initialized) return;
    this.initialized = true;
    this._cache = new Map();
    this._catalog = new Set();
  }

  async close (/* write */) {
    this._cache = null;
  }

  async soulAliasExists (alias) {
    return this._cache.has(hashForSoulAlias(alias));
  }

  async setSoulAlias (alias, soulid) {
    const aliasHash = hashForSoulAlias(alias);

    const existing = this._cache.get(aliasHash);
    if (existing && isSoulId(existing)) {
      // this soul is already aliased by this value, we have nothing to do
      if (existing === soulid) return;

      const soulAliases = new ManagedSet(this._cache, `${existing}-ALIASES`);
      soulAliases.delete(alias);
    }

    this._cache.set(aliasHash, soulid);
    const soulAliases = new ManagedSet(this._cache, `${soulid}-ALIASES`);
    soulAliases.add(alias);

    const allAliases = new ManagedSet(this._cache, 'ALIASES');
    allAliases.add(alias);
  }

  async resolveSoulAlias (alias) {
    const soulid = this._cache.get(hashForSoulAlias(alias));
    return isSoulId(soulid) ? soulid : null;
  }

  async removeSoulAlias (alias) {
    // garbage cleanup
    const soulid = this.resolveSoulAlias(alias);
    if (soulid) {
      const soulAliases = new ManagedSet(this._cache, `${soulid}-ALIASES`);
      soulAliases.delete(alias);
    }

    this._cache.delete(hashForSoulAlias(alias));

    const allAliases = new ManagedSet(this._cache, 'ALIASES');
    allAliases.delete(alias);
  }

  async getSoulAliases (soulid) {
    const aliases = new ManagedSet(this._cache, `${soulid}-ALIASES`);
    return aliases.toJSON();
  }

  async isAliasedAs (soulid, alias) {
    const aliases = new ManagedSet(this._cache, `${soulid}-ALIASES`);
    return aliases.has(alias);
  }

  async clearAliases (soulid) {

    const aliases = new ManagedSet(this._cache, `${soulid}-ALIASES`);
    for (const alias of aliases) {
      this._cache.delete(hashForSoulAlias(alias));
    }
    aliases.clear();
  }

  async listAliases () {
    const allAliases = new ManagedSet(this._cache, 'ALIASES');
    return Array.from(allAliases.values());
  }


  async soulExists (soulid) {
    return this._cache.has(soulid);
  }

  async createSoul (soulid) {
    return this._touchSoul(soulid);
  }

  async _touchSoul (soulid) {
    this._catalog.add(soulid);

    const soul = new ManagedMap(this._cache, soulid);
    soul.set('id', soulid);
    if (!soul.has('cdate')) soul.set('cdate', Date.now());
    soul.set('mdate', Date.now());
    return soul;
  }

  async getSoulMetadata (soulid, propertyKey = null) {
    if (isArray(soulid)) {
      return pmap(soulid, (sid) => this.getSoulMetadata(sid, propertyKey));
    }

    const soul = new ManagedMap(this._cache, soulid);
    if (!soul) return null;

    if (propertyKey !== null) return soul.get(propertyKey);
    return soul.toJSON();
  }

  async setSoulMetadata (soulid, properties) {
    if (isArray(soulid)) {
      return pmap(soulid, (sid) => this.setSoulMetadata(sid, properties));
    }

    const soul = await this._touchSoul(soulid);
    for (const [ k, v ] of entries(properties)) {
      soul.set(k, v);
    }
  }


  async soulHasData (soulid) {
    if (isArray(soulid)) {
      return pmap(soulid, (sid) => this.soulHasData(sid));
    }
    this._cache.has(`${soulid}-DATA`);
  }

  async setSoulData (soulid, data, update = true) {
    if (isArray(soulid)) {
      return pmap(soulid, (sid) => this.setSoulData(sid, data, update));
    }
    await this._touchSoul(soulid);
    if (update) {
      data = { ...(await this.getSoulData(soulid)), ...data };
    }
    this._cache.set(`${soulid}-DATA`, data);
  }

  async getSoulData (soulid) {
    if (isArray(soulid)) {
      return pmap(soulid, (sid) => this.getSoulData(sid));
    }
    return this._cache.get(`${soulid}-DATA`);
  }

  async clearSoulData (soulid) {
    this._cache.delete(`${soulid}-DATA`);
  }


  async bindSouls (startSoulId, endSoulId, { direction = BIND_RIGHT, key = null }) {
    await Promise.all([
      this._touchSoul(startSoulId),
      this._touchSoul(endSoulId),
    ]);

    const directions = MOVEMENT[direction];
    assert(isValidDirection(direction), `Unknown binding direction, "${direction}".`);
    assert(startSoulId, 'Missing starting soul id.');
    assert(endSoulId, 'Missing ending soul id.');

    const fromSet = new ManagedSet(this._cache, `${startSoulId}-${directions[0]}`);
    const toSet   = new ManagedSet(this._cache, `${endSoulId  }-${directions[1]}`);

    fromSet.add(endSoulId);
    toSet.add(startSoulId);

    if (key || key === 0) {
      const soulToKey = new ManagedMap(this._cache, `${startSoulId}-TO_KEY`);
      const soulByKey = new ManagedMap(this._cache, `${startSoulId}-BY_KEY`);

      soulToKey.set(endSoulId, [ key, direction ]);
      soulByKey.set(key, [ endSoulId, direction ]);
    }
  }

  async unbindSouls (startSoulId, { soulid: endSoulId = null, key = null, direction = BIND_RIGHT }) {
    assert(isValidDirection(direction), `Unknown binding direction, "${direction}".`);
    assert(startSoulId, 'Missing starting soul id.');
    assert(endSoulId || key, 'Missing ending soul id or key.');

    const soulToKey = new ManagedMap(this._cache, `${endSoulId}-TO_KEY`);
    const soulByKey = new ManagedMap(this._cache, `${endSoulId}-BY_KEY`);

    if (key || key === 0 && !endSoulId) {
      [ endSoulId, direction ] = soulByKey.get(key);
    } else if (!key && key !== 0) {
      [ key ] = soulToKey.get(endSoulId);
    }

    if (endSoulId) soulToKey.delete(endSoulId);
    if (key) soulByKey.delete(key);

    const directions = MOVEMENT[direction];
    const startSet = new ManagedSet(this._cache, `${startSoulId}-${directions[0]}`);
    const endSet   = new ManagedSet(this._cache, `${endSoulId  }-${directions[1]}`);

    startSet.delete(endSoulId);
    endSet.delete(startSoulId);
  }

  async getBoundSouls (startSoulId, direction = BIND_RIGHT) {
    const directions = MOVEMENT[direction];
    assert(directions, `Unknown binding direction, "${direction}".`);

    const fromSet = new ManagedSet(this._cache, `${startSoulId}-${directions[0]}`);

    return Array.from(fromSet);
  }

  async getBoundSoul (startSoulId, key) {
    const soulByKey = new ManagedMap(this._cache, `${startSoulId}-BY_KEY`);
    const [ endSoulId ] = soulByKey.get(key);
    return endSoulId;
  }

  async getBoundKeys (soulid) {
    const soulToKey = new ManagedMap(this._cache, `${soulid}-TO_KEY`);
    return Array.from(soulToKey, ([ , v ]) => v);
  }

  async getBoundKeySouls (soulid) {
    const soulToKey = new ManagedMap(this._cache, `${soulid}-TO_KEY`);
    return Array.from(soulToKey);
  }


  async clearSoulBindings (soulid, direction = 'ALL') {
    if (direction === 'ALL') direction = [ BIND_LEFT, BIND_DOWN, BIND_RIGHT, BIND_UP ];
    if (!isArray(direction)) direction = [ direction ];
    assert(areValidDirections(direction), 'One or more binding directions are unknown.');

    const souls = direction
      .map((dir) => {
        const set = new ManagedSet(this._cache, `${soulid}-${dir}`);
        const ids = Array.from(set, (id) => [ dir, id ]);
        set.clear();
        return ids;
      })
      .flat(Infinity);

    await pmap(souls, ([ dir, fromSoul ]) =>
      this.unbindSouls(fromSoul, { soulid, direction: oppositeDirection(dir) }),
    );
  }

  async deleteSoul (soulid) {
    await this.clearSoulData(soulid);
    await this.clearSoulBindings(soulid);
    await this.clearAliases(soulid);
    this._cache.delete(soulid);
  }

}

export class ManagedSet {

  constructor (cache, cacheKey) {
    this._cache = cache;
    this._key = cacheKey;
  }

  _ensure (create = true) {
    let v = this._cache.get(this._key);
    if (!v && !create) return undefined;
    if (isSet(v)) return v;

    if (isArray(v)) {
      v = new Set(v);
    } else {
      v = new Set();
    }

    this._cache.set(this._key, v);
    return v;
  }

  add (value) {
    const set = this._ensure(true);
    set.add(value);
    return this;
  }

  delete (value) {
    const set = this._ensure(false);
    set && set.delete(value);

    if (!(set && set.size)) this._cache.delete(this._key);
    return this;
  }

  clear () {
    this._cache.delete(this._key);
  }

  has (value) {
    const set = this._ensure(false);
    return set && set.has(value) || false;
  }

  values () {
    const set = this._ensure(false);
    if (!set) return nullIterator();
    return set.values();
  }

  entries () {
    const set = this._ensure(false);
    if (!set) return nullIterator();
    return set.entries();
  }

  [Symbol.iterator] () {
    const set = this._ensure(false);
    if (!set) return nullIterator();
    return set[Symbol.iterator]();
  }

  toJSON () {
    const set = this._ensure(false);
    if (!set) return {};
    return Array.from(set);
  }
}

export class ManagedMap {

  constructor (cache, cacheKey) {
    this._cache = cache;
    this._key = cacheKey;
  }

  _ensure (create = true) {
    let v = this._cache.get(this._key);
    if (!v && !create) return undefined;
    if (isMap(v)) return v;

    if (isObject(v, true)) {
      v = new Map(Object.entries(v));
    } else if (isArray(v) && (v.length) && isArray(v[0])) {
      v = new Map(v);
    } else {
      v = new Map();
    }

    this._cache.set(this._key, v);
    return v;
  }

  set (key, value) {
    const map = this._ensure(true);
    map.set(key, value);
    return this;
  }

  get (key) {
    const set = this._ensure(false);
    return set && set.get(key);
  }

  delete (key) {
    const map = this._ensure(false);
    map && map.delete(key);

    if (!map || !map.size) this._cache.delete(this._key);
    return this;
  }

  clear () {
    this._cache.delete(this._key);
  }

  has (key) {
    const map = this._ensure(false);
    return map && map.has(key) || false;
  }

  keys () {
    const map = this._ensure(false);
    if (!map) return nullIterator();
    return map.keys();
  }

  values () {
    const map = this._ensure(false);
    if (!map) return nullIterator();
    return map.values();
  }

  entries () {
    const map = this._ensure(false);
    if (!map) return nullIterator();
    return map.entries();
  }

  [Symbol.iterator] () {
    const map = this._ensure(false);
    if (!map) return nullIterator();
    return map.entries();
  }

  toJSON () {
    const map = this._ensure(false);
    if (!map) return {};
    return fromPairs(map.entries());
  }
}
