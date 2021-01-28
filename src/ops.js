
import { pmap, isString, isFunction } from './utils';
import { isSoulId, soulgen } from './ids';
import { oppositeDirection } from './binding';

export const SOULS = 'SOULS';
export const QUERY = 'QUERY';
export const FROM_ALIAS = 'FROM_ALIAS';
export const SET_ALIAS = 'SET_ALIAS';
export const REMOVE_ALIAS = 'REMOVE_ALIAS';
export const NAVIGATE = 'NAVIGATE';
export const BIND = 'BIND';
export const UNBIND = 'UNBIND';
export const UNBIND_BY_KEY = 'UNBIND_BY_KEY';
export const UPDATE_META = 'UPDATE_META';
export const PUT_DATA = 'PUT_DATA';
export const CLEAR_DATA = 'CLEAR_DATA';
export const DELETE = 'DELETE';

export default {
  async SOULS ({ souls }, soulsToInclude) {
    return souls.concat(soulsToInclude.filter(isSoulId));
  },

  async QUERY ({ qid, dependencies, souls }, queryToInclude) {
    return souls.concat(await queryToInclude.settle(qid, dependencies));
  },

  async FROM_ALIAS ({ store, souls }, alias, createIfMissing) {
    let soulid = await store.resolveSoulAlias(alias);

    if (!soulid) {
      if (!createIfMissing) return souls;

      soulid = await soulgen(store);
      await store.createSoul(soulid);
      await store.setSoulAlias(alias, soulid);
    }

    return [ ...souls, soulid ];
  },

  async SET_ALIAS ({ store, souls }, alias) {
    if (!souls.length) return souls;
    await store.setSoulAlias(alias, souls[0]);
    return souls;
  },

  async REMOVE_ALIAS ({ store, souls }, key) {
    if (isString(key)) {
      await store.removeSoulAlias(key);
      return souls;
    }

    if (key === true) {
      await pmap(souls, async (soulid) => store.clearAliases(soulid));
    }
    return souls;
  },

  async NAVIGATE ({ store, souls }, { direction, create, key, reverse } = {}) {
    return (await pmap(souls, async (soulid) => {
      let boundSouls;
      if (key) {
        boundSouls = await store.getBoundSoul(soulid, key);
        if (boundSouls) return boundSouls;
      } else if (direction) {
        boundSouls = await store.getBoundSouls(soulid, direction);
        if (boundSouls.length) return boundSouls;
      }

      if (!create) return [];

      const newSoulID = await soulgen(store);
      await store.createSoul(newSoulID);
      if (reverse) {
        await store.bindSouls(newSoulID, soulid, { key, direction: oppositeDirection(direction) });
      } else {
        await store.bindSouls(soulid, newSoulID, { key, direction });
      }
      if (isFunction(create)) await create(newSoulID);
      return newSoulID;
    })).flat(Infinity).filter(isSoulId);
  },

  async BIND ({ qid, dependencies, store, souls }, query, direction, key) {
    // first we resolve all the queries into an array of souls
    const soulsToLink = await query.settle(qid, ...dependencies);

    await pmap(souls, (startSoulId) =>
      pmap(soulsToLink, (endSoulId) => store.bindSouls(startSoulId, endSoulId, { direction, key })),
    );

    return souls;
  },

  async UNBIND ({ qid, dependencies, store, souls }, query, direction) {
    // first we resolve all the queries into an array of souls
    const soulsToLink = query.settle(qid, ...dependencies);

    await pmap(souls, (startSoulId) =>
      pmap(soulsToLink, (endSoulId) => store.unbindSouls(startSoulId, { soulid: endSoulId, direction })),
    );

    return souls;
  },

  async UNBIND_BY_KEY ({ store, souls }, key) {
    await pmap(souls, (startSoulId) =>
      store.unbindSouls(startSoulId, { key }),
    );
    return souls;
  },

  async UPDATE_META ({ store, souls }, data) {
    await store.setSoulMetadata(souls, data);
    return souls;
  },

  async PUT_DATA ({ store, souls }, data, update) {
    await pmap(souls, (soulid) => store.setSoulData(soulid, data, update));
    return souls;
  },

  async CLEAR_DATA ({ store, souls }) {
    await pmap(souls, (soulid) => store.clearSoulData(soulid));
    return souls;
  },

  async DELETE ({ store, souls }) {
    await pmap(souls, (soulid) => store.deleteSoul(soulid));
    return [];
  },
};

