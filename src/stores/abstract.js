
import { isArrayOf } from '../utils';

function fail (name) {
	throw new TypeError(`Invoked the ${name} function on AbstractStore. This should not have happened, did your store implement correctly?`);
}

export const BIND_RIGHT = 'RIGHT';
export const BIND_LEFT = 'LEFT';
export const BIND_UP = 'UP';
export const BIND_DOWN = 'DOWN';

export const DIRECTION = {
	[BIND_RIGHT]: BIND_RIGHT,
	[BIND_LEFT]: BIND_LEFT,
	[BIND_UP]: BIND_UP,
	[BIND_DOWN]: BIND_DOWN,
};

export const MOVEMENT = {
	[BIND_LEFT]:  [ BIND_LEFT, BIND_RIGHT ],
	[BIND_DOWN]:  [ BIND_UP, BIND_DOWN ],
	[BIND_RIGHT]: [ BIND_RIGHT, BIND_LEFT ],
	[BIND_UP]:    [ BIND_DOWN, BIND_UP ],
};

export const oppositeDirection = (dir) => MOVEMENT[dir] && MOVEMENT[dir][1];
export const isValidDirection = (dir) => DIRECTION[dir];
export const areValidDirections = isArrayOf(isValidDirection);

export default class AbstractStore {

	constructor () {
		if (this.constructor === 'AbstractStore') {
			throw new TypeError('AbstractStore cannot be used directly as a pGraph data store.');
		}
	}

	async initialize () { fail('initialize'); }
	async close (write) { fail('close', write); }

	async soulAliasExists (key) { fail('soulAliasExists', key); }
	async setSoulAlias (key, soulid) { fail('setSoulAliaskey', soulid); }
	async resolveSoulAlias (key) { fail('resolveSoulAlias', key); }
	async deleteSoulAlias (key) { fail('deleteSoulAlias', key); }

	async soulExists (soulid) { fail('soulExists', soulid); }
	async createSoul (soulid) { fail('createSoul', soulid); }
	async deleteSoul (soulid) { fail('deleteSoul', soulid); }

	async getSoulMetadata (soulid, propertyKey) { fail('getSoulMetadata', soulid, propertyKey); }
	async setSoulMetadata (soulid, properties) { fail('getSoulProperties', soulid, properties); }

	async soulHasData (soulid) { fail('soulHasData', soulid); }
	async clearSoulData (soulid) { fail('clearSoulData', soulid); }
	async setSoulData (soulid, data) { fail('setSoulData', soulid, data); }
	async getSoulData (soulid) { fail('getSoulData', soulid); }

	async bindSouls (startSoulId, endSoulId, { direction = BIND_RIGHT, key = null }) { fail('bindSouls', startSoulId, endSoulId, direction, key); }
	async unbindSouls (startSoulId, { soulid: endSoulId = null, key = null, direction = BIND_RIGHT }) { fail('unbindSouls', startSoulId, endSoulId, key, direction); }
	async getBoundSouls (startSoulId, direction = BIND_RIGHT) { fail('getBoundSouls', startSoulId, direction); }
	async getBoundSoul (startSoulId, key) { fail('getBoundSoul', startSoulId, key); }
	async getBoundKeys (soulid) { fail('getBoundKeys', soulid); }
	async getBoundKeySouls (soulid) { fail('getBoundKeySouls', soulid); }
	async clearSoulBindings (soulid, direction = 'ALL') { fail('clearSoulBindings', soulid, direction); }

}

export const isStore = (input) => (input instanceof AbstractStore) || input.prototype instanceof AbstractStore;
