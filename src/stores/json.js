
import fs from 'fs-extra';
import MemStore from './mem';
import { isSoulId } from '../ids';

const stat = (f) => fs.stat(f).catch(() => null);
const writable = (f) => fs.access(f, fs.constants.W_OK).then(() => true, () => false);

const STREAM_THRESHOLD = 1024 * 1024; // 1MB

function stripBom (content) {
	// we do this because JSON.parse would convert it to a utf8 string if encoding wasn't specified
	if (Buffer.isBuffer(content)) content = content.toString('utf8');
	return content.replace(/^\uFEFF/, '');
}

export default class JSONStore extends MemStore {

	constructor ({ path }) {
		super();
		this.path = path;
	}

	async initialize () {
		if (this.initialized) return;
		await super.initialize();

		const stats = await stat(this.path);
		if (!stats) {
			// file doesn't exist, so lets create an empty one.
			if (!await writable) {
				throw new Error(`pGraph JSONStore cannot create a db file at "${this.path}", no write permission.`);
			}
			await fs.ensureFile(this.path).catch((err) => {
				throw new Error(`pGraph JSONStore cannot create a db file at "${this.path}": ${err.message}`);
			});
			fs.writeJson(this.path, []);
			return;
		}

		if (stats.size < STREAM_THRESHOLD) {
			const data = stripBom(await fs.readFile(this.path, { encoding: 'utf8' }));
			if (!data) {
				this._cache = new Map();
				return;
			}

			try {
				for (const [ k, v ] of JSON.parse(data)) {
					this._cache.set(k, v);
					if (isSoulId(k)) this._catalog.add(k);
				}
			} catch (err) {
				throw new Error(`pGraph JSONStore could not load db file "${this.path}": ${err.message}`);
			}
			return;
		}
	}

	async close (write) {
		if (write) {
			await fs.writeJson(this._cache);
		}
		this._cache = null;
	}

}
