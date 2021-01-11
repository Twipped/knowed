
import { isFunction, isString } from './utils';
import { randomBytes } from 'crypto';

export function isStore (store) {
	return !!store
		&& isFunction(store.get)
		&& isFunction(store.set)
		&& isFunction(store.has)
		&& isFunction(store.delete);
}

export const SOUL_CACHE_EXPIRE = 1000;
export const ROOT_SOUL = 'SOUL-'.padEnd(37, '0');

export const hashForLink = (soul, key, outgoing = true) => `${outgoing ? '>' : '<'}\t${key}\t${soul}`;
export const hashForRootKey = (key) => `ROOTKEY[${key}]`;

export const SOUL_ID_REGEX = /SOUL\[(\w+)\]-[0-9A-F]{32,42}/;
export const isSoulId = (id) => {
	if (!isString(id)) return false;
	const match = id.toUpperCase().match(SOUL_ID_REGEX);
	if (!match) return false;
	return { id: match[0], type: match[1] };
};

export const soulgen = (type, entropy = 0) =>
	`SOUL[${type.toUpperCase()}]-` + randomBytes(32 + entropy).toString('hex');
