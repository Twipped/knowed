
const hash = (type, key) => `${type.toUpperCase()}{${key}}`;
import fs from 'fs-extra';
// import { parser } from 'stream-json';
// import { chain } from 'stream-chain';
import { isArray, isObject, isUndefined, isMap, isSet } from '../utils';

const stat = (f) => fs.stat(f).catch(() => null);
const writable = (f) => fs.access(f, fs.constants.W_OK).then(() => true, () => false);

const STREAM_THRESHOLD = 1024 * 1024; // 1MB

function stripBom (content) {
	// we do this because JSON.parse would convert it to a utf8 string if encoding wasn't specified
	if (Buffer.isBuffer(content)) content = content.toString('utf8');
	return content.replace(/^\uFEFF/, '');
}

export default class JSONStore {

	constructor ({ path }) {
		this.path = path;
		this.data = {};
	}

	async initialize () {
		const stats = await stat(this.path);
		if (!stats) {
			// file doesn't exist, so lets create an empty one.
			if (!await writable) {
				throw new Error(`pGraph JSONStore cannot create a db file at "${this.path}", no write permission.`);
			}
			await fs.ensureFile(this.path).catch((err) => {
				throw new Error(`pGraph JSONStore cannot create a db file at "${this.path}": ${err.message}`);
			});
			fs.writeJson(this.path, {});
		}

		if (stats.size < STREAM_THRESHOLD) {
			const data = stripBom(await fs.readFile(this.path, { encoding: 'utf8' }));
			if (!data) {
				this.data = {};
				return;
			}

			try {
				this.data = JSON.parse(data);
			} catch (err) {
				throw new Error(`pGraph JSONStore could not load db file "${this.path}": ${err.message}`);
			}
			return;
		}

		// chain([
		// 	fs.createReadStream(this.path, { encoding: 'utf8' }),
		// 	json.parser(),
		// 	(data) => {

		// 	}
		// ]);

	}

	async close (write) {
		if (write) {
			await fs.writeJson(this.data);
		}
		this.data = null;
	}

	async valSet (key, value) {
		this.data[hash('VAL', key)] = value;
		return this;
	}

	async valGet (key, fallback = null) {
		const h = hash('VAL', key);
		if (typeof this.data[h] === 'undefined') return fallback;
		return this.data[h];
	}

	async valDelete (key) {
		this._map.delete(hash('VAL', key));
		this.data[hash('VAL', key)] = undefined;
		return this;
	}

	async valHas (key) {
		return typeof this.data[hash('VAL', key)] === 'undefined';
	}


	ensureMap (key, create = false) {
		const h = hash('MAP', key);
		const v = this.data[h];
		if (isUndefined(v)) {
			if (create) return (this.data[h] = new Map());
			return false;
		}
		if (isMap(v)) return v;
		if (isObject(v, true)) return (this.data[h] = new Map(Object.entries(v)));
		if (isArray(v) && (!v.length) || isArray(v[0])) return (this.data[h] = new Map(v));
		if (create) return (this.data[h] = new Map());
		return false;
	}

	async mapEntries (key) {
		const map = this.ensureMap(key);
		return map ? Array.from(map.entries()) : [];
	}

	async mapSet (key, field, value) {
		const map = this.ensureMap(key, true);
		map.set(field, value);
		return this;
	}

	async mapDelete (key, field) {
		const map = this.ensureMap(key);
		if (!map) return this;
		map.delete(field);
		if (!map.size) this.data[hash('MAP', key)] = undefined;
		return this;
	}

	async mapOverwrite (key, def) {
		this._map.set(hash('MAP', key), new Map(def));
		return this;
	}

	async mapHas (key, field) {
		const map = this.ensureMap(key);
		return !!map && map.has(field);
	}

	async mapClear (key) {
		this.data[hash('MAP', key)] = undefined;
	}


	ensureSet (key, create = false) {
		const h = hash('SET', key);
		const v = this.data[h];
		if (isUndefined(v)) {
			if (create) return (this.data[h] = new Set());
			return false;
		}
		if (isSet(v)) return v;
		if (isArray(v)) return (this.data[h] = new Set(v));
		if (create) return (this.data[h] = new Set());
		return false;
	}

	async setValues (key) {
		const set = this.ensureSet(key);
		return set ? Array.from(set) : [];
	}

	async setHas (key, value) {
		const set = this.ensureSet(key);
		return !!set && set.has(value);
	}

	async setAdd (key, value) {
		const set = this.ensureSet(key, true);
		set.add(value);
		return this;
	}

	async setOverwrite (key, ...values) {
		this.data[hash('SET', key)] = new Set(values);
		return this;
	}

	async setDelete (key, ...values) {
		const set = this.ensureSet(key);
		if (!set) return this;

		for (const value of values) {
			set.delete(value);
		}

		if (!set.size) this.data[hash('SET', key)] = undefined;
		return this;
	}

	async setClear (key) {
		this.data[hash('SET', key)] = undefined;
		return this;
	}

}
