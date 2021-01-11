
import {
	isString,
	sift,
	merge,
	pall,
	isArrayOf,
} from './utils';

import {
	isSoulId,
	soulgen,
	hashForLink,
	SOUL_CACHE_EXPIRE,
} from './shared';


function parseLink (hash) {
	const [ dir, key, id ] = hash.split('\t');
	const outgoing = dir === '>';
	return { outgoing, dir, key, id, hash };
}

export default class Soul {

	constructor (db, typeOrId) {
		this.db = db;
		this.data = null;
		this.links = null;
		this.lastIO = 0;
		this.fresh = false;

		const s = isSoulId(typeOrId);
		if (s) {
			this.id = s.id;
			this.type = s.type;
		} else {
			this.id = null;
			this.type = typeOrId.toUpperCase();
		}
	}

	async ensure () {
		await this.db.ensureInitialized();
		if (!this.id) return this.create();
		if (!this.data || Date.now() - this.lastIO > SOUL_CACHE_EXPIRE) return this.read();
		return this;
	}

	async create () {
		let id;
		let ok = -10;
		let exists;

		do {
			id = soulgen(this.type, 10 + ok);
			exists = await this.db.store.valHas(id);
		} while (ok++ && exists);

		if (!ok) throw new Error('Somehow we created ten random souls that already exist, have we hit entropy?');

		this.data = {};
		this.links = new Set();
		this.fresh = true;

		await this.write();

		return this;
	}

	async write () {
		await this.db.store.valSet(this.id, {
			id: this.id,
			type: this.type,
			links: Array.from(this.links),
			data: this.data,
		});
		this.lastIO = Date.now();
		return this;
	}

	async read (force) {
		const raw = await this.db.store.valGet(this.id);
		if (!raw && !force) throw new Error('Expected soul is missing from the datastore: ' + this.id);

		const { links = [], data = {} } = raw;
		this.links = new Set(links);
		this.data = data;
		this.lastIO = Date.now();
		this.fresh = false;
		return this;
	}

	async put (data, overwrite = false) {
		await this.ensure();
		this.data = overwrite ? data : merge(this.data, data);
		await this.write();
	}

	async get () {
		await this.ensure();
		return merge(this.data); // this copies the full tree
	}

	then (...args) {
		return this.get().then(...args);
	}

	async link (key, soul) {
		if (isString(soul)) soul = new Soul(this.db, soul);

		await pall(
			this.ensure(),
			soul.ensure(),
		);

		this.links.add(hashForLink(soul.id, key, true));
		soul.links.add(hashForLink(soul.id, key, false));

		await pall(
			this.write(),
			soul.write(),
		);
		return this;
	}

	async unlink (key, soul) {
		if (isString(soul)) soul = new Soul(this.db, soul);

		await pall(
			this.ensure(),
			soul.ensure(),
		);

		this.links.delete(hashForLink(soul.id, key, true));
		soul.links.delete(hashForLink(this.id, key, false));

		await pall(
			this.write(),
			soul.write(),
		);
		return this;
	}

	async unlinkAll (key, up = true) {
		await this.ensure();
		const links = sift(this.links, (hash) => {
			const link = parseLink(hash);
			const { dir, key: k } = link;
			if (key !== k) return false;
			return (up === null || (up ? dir === '>' : dir === '<')) && link;
		});

		const proms = links.map(async ({ id, outgoing }) => {
			const soul = new Soul(this.db, id);
			await soul.ensure();

			this.links.delete(hashForLink(soul.id, key, outgoing));
			soul.links.delete(hashForLink(this.id, key, !outgoing));

			await soul.write();
		});

		proms.push(this.write);

		await pall(proms);
		return this;
	}

	async traverse (key, up = true, createType = null) {
		const direction = up ? '>' : '<';

		await this.ensure();
		const ids = sift(this.links, (hash) => {
			const { dir, key: k, id } = parseLink(hash);
			return dir === direction && key === k && id;
		});

		if (ids.length) return ids.map((id) => new Soul(this.db, id));

		if (createType && !up) throw new Error('Cannot create new parent branch nodes on traversal');
		// Attempting to create parents on traversal would result in extraneous souls.

		if (up && createType) {
			const soul = new Soul(this.id, createType);
			await soul.ensure();
			await this.link(soul, key);
			return [ soul ];
		}

		return [];
	}

	async delete () {
		await this.ensure();

		const proms = sift(this.links, async (hash) => {
			const { outgoing, key, id } = parseLink(hash);

			const soul = new Soul(this.db, id);
			await soul.ensure();

			soul.links.delete(hashForLink(this.id, key, !outgoing));
		});

		proms.push(this.db.store.valDelete(this.id));

		await pall(proms);
		return this;
	}
}

export const isSoul = Soul.isSoul = (input) => input instanceof Soul;
export const isArrayOfSouls = Soul.isArrayOfSouls = isArrayOf(isSoul);
