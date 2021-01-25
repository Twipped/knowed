
import { pmap } from './utils';
import { isSoulId, soulgen } from './ids';
import { oppositeDirection } from './binding';

export const SOULS = 'SOULS';
export const QUERY = 'QUERY';
export const FROM_ALIAS = 'FROM_ALIAS';
export const SET_ALIAS = 'SET_ALIAS';
export const REMOVE_ALIAS = 'REMOVE_ALIAS';
export const TRAVEL_IN_DIRECTION = 'TRAVEL_IN_DIRECTION';
export const TRAVEL_TO_KEY = 'TRAVEL_TO_KEY';
export const TRAVEL_FROM_KEY = 'TRAVEL_FROM_KEY';
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
		return souls.concat(await queryToInclude.resolve(qid, dependencies));
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
		await store.removeSoulAlias(key);
		return souls;
	},

	async TRAVEL_IN_DIRECTION ({ store, souls }, direction, createIfMissing) {
		return await pmap(souls, async (soulid) => {
			const boundSouls = await store.getBoundSouls(soulid, direction);
			if (!boundSouls.length && !createIfMissing) return [];

			const newSoulId = await soulgen(store);
			await store.createSoul(soulid);
			await store.bindSouls(soulid, newSoulId, { direction });
			return newSoulId;
		}).flat(Infinity).filter(isSoulId);
	},

	async TRAVEL_TO_KEY ({ store, souls }, key, directionIfMissing) {
		return await pmap(souls, async (soulid) => {
			const boundSoul = await store.getBoundSoul(soulid, key);
			if (!boundSoul && !directionIfMissing) return null;

			const newSoulId = await soulgen(store);
			await store.createSoul(soulid);
			await store.bindSouls(soulid, newSoulId, { key, direction: directionIfMissing });
			return newSoulId;
		}).flat(Infinity).filter(isSoulId);
	},

	async TRAVEL_FROM_KEY ({ store, souls }, key, directionIfMissing) {
		return await pmap(souls, async (soulid) => {
			const boundSoul = await store.getBoundSoul(soulid, key);
			if (!boundSoul && !directionIfMissing) return null;

			const newSoulId = await soulgen(store);
			await store.createSoul(soulid);
			await store.bindSouls(newSoulId, soulid, { key, direction: oppositeDirection(directionIfMissing) });
			return newSoulId;
		}).flat(Infinity).filter(isSoulId);
	},

	async BIND ({ qid, dependencies, store, souls }, queriesToLink, direction, key) {
		// first we resolve all the queries into an array of souls
		const soulsToLink = pmap(queriesToLink, (q) => q.resolve(qid, ...dependencies))
			.flat(Infinity)
			.filter(isSoulId);

		await pmap(souls, (startSoulId) =>
			pmap(soulsToLink, (endSoulId) => store.bindSouls(startSoulId, endSoulId, { direction, key })),
		);

		return souls;
	},

	async UNBIND ({ qid, dependencies, store, souls }, queriesToUnlink, direction) {
		// first we resolve all the queries into an array of souls
		const soulsToLink = pmap(queriesToUnlink, (q) => q.resolve(qid, ...dependencies))
			.flat(Infinity)
			.filter(isSoulId);

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

