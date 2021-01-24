
import { isString, isArrayOf } from './utils';
import { randomBytes } from 'crypto';

const MAX_ENTROPY = 10;

export const soulgen = async (store) => {
	let entropy = 0;
	do {
		const soulid = 'SOUL-' + randomBytes(16 + entropy).toString('hex').toUpperCase();
		if (!await store.soulExists(soulid)) return soulid;
	} while (++entropy <= MAX_ENTROPY);
	throw new Error('Somehow we have we hit soul entropy? This should not be possible.');
};

export const querygen = () => randomBytes(16).toString('hex').toUpperCase();

export const SOUL_ID_REGEX = /^SOUL-[0-9A-F]{32,42}$/;

export const isSoulId = (id) => {
	if (!id || !isString(id)) return false;
	const match = id.match(SOUL_ID_REGEX);
	return !!match;
};

export const isArrayOfSoulIds = isArrayOf(isSoulId);
