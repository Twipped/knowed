
const hash = (type, key) => `${type.toUpperCase()}{${key}}`;

export default class MemStore {

	constructor () {
		this._map = new Map();
	}

	async initialize () {
		this._map = new Map();
	}

	async close (/* write */) {
		this._map.clear();
	}

	async valSet (key, value) {
		this._map.set(hash('VAL', key), value);
		return this;
	}

	async valGet (key) {
		return this._map.get(hash('VAL', key));
	}

	async valDelete (key) {
		this._map.delete(hash('VAL', key));
		return this;
	}

	async valHas (key) {
		return this._map.has(hash('VAL', key));
	}



	async mapEntries (key) {
		const map = this._map.get(hash('MAP', key));
		return map ? Array.from(map.entries()) : [];
	}

	async mapSet (key, field, value) {
		const map = this._map.get(hash('MAP', key)) || new Map();
		map.set(field, value);
		this._map.set(hash('MAP', key), map);
		return this;
	}

	async mapDelete (key, field) {
		const map = this._map.get(hash('MAP', key));
		if (!map || !map.size) return this;
		map.delete(field);
		this._map.set(hash('MAP', key), map);
		return this;
	}

	async mapOverwrite (key, def) {
		this._map.set(hash('MAP', key), new Map(def));
		return this;
	}

	async mapHas (key, field) {
		const map = this._map.get(hash('MAP', key));
		return map && map.has(field);
	}



	async setValues (key) {
		const set = this._map.get(hash('SET', key));
		return set ? Array.from(set) : [];
	}

	async setHas (key, value) {
		const set = this._map.get(hash('MAP', key));
		return set && set.has(value);
	}

	async setAdd (key, value) {
		const set = this._map.get(hash('SET', key)) || new Set();
		set.add(value);
		this._map.set(hash('SET', key), set);
		return this;
	}

	async setOverwrite (key, ...values) {
		this._map.set(hash('SET', key), new Set(values));
		return this;
	}

	async setDelete (key, ...values) {
		const set = this._map.get(hash('SET', key));
		if (!set || !set.size) return this;

		for (const value of values) {
			set.delete(value);
		}

		this._map.set(hash('SET', key), set);
		return this;
	}

	async setClear () {
		this._map.clear();
		return this;
	}

}
