
import { BIND_EAST } from '../binding';

function fail (name) {
  throw new TypeError(`Invoked the ${name} function on AbstractStore. This should not have happened, did your store implement correctly?`);
}

export default class AbstractStore {

  constructor (options) {
    if (this.constructor === 'AbstractStore') {
      throw new TypeError('AbstractStore cannot be used directly as a pGraph data store.');
    }
    this.options = options;
    this.initialized = false;
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

  async bindSouls (startSoulId, endSoulId, { direction = BIND_EAST, key = null }) { fail('bindSouls', startSoulId, endSoulId, direction, key); }
  async unbindSouls (startSoulId, { soulid: endSoulId = null, key = null, direction = BIND_EAST }) { fail('unbindSouls', startSoulId, endSoulId, key, direction); }
  async getBoundSouls (startSoulId, direction = BIND_EAST) { fail('getBoundSouls', startSoulId, direction); }
  async getBoundSoul (startSoulId, key) { fail('getBoundSoul', startSoulId, key); }
  async getBoundKeys (soulid) { fail('getBoundKeys', soulid); }
  async getBoundKeySouls (soulid) { fail('getBoundKeySouls', soulid); }
  async clearSoulBindings (soulid, direction = 'ALL') { fail('clearSoulBindings', soulid, direction); }

}

export const isStore = (input) => (input instanceof AbstractStore) || input.prototype instanceof AbstractStore;
