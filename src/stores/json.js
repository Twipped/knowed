
import fs from 'fs-extra';
import MemStore from './mem';
import { isMap, isSet } from '../utils';
import stream from 'stream';
import { promisify } from 'util';
import StreamArray from 'stream-json/streamers/StreamArray';

const pipeline = promisify(stream.pipeline);
const stat = (f) => fs.stat(f).catch(() => null);
const writable = (f) => fs.access(f, fs.constants.W_OK).then(() => true, () => false);

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

    const rows = fs.createReadStream(this.path).pipe(StreamArray.withParser());

    try {
      this._cache = new Map();
      for await (const { value: [ k, v ] } of rows) {
        this._cache.set(k, v);
      }
    } catch (err) {
      throw new Error(`pGraph JSONStore could not load db file "${this.path}": ${err.message}`);
    }
  }

  async close (write) {
    if (write) {
      await pipeline(
        stringifyCache(this._cache),
        fs.createWriteStream(this.path, { encoding: 'utf8' }),
      );
    }

    this._cache = null;
  }

}

function replacer (key, value) {
  const original = this[key];

  if (isMap(original) || isSet(original)) {
    return [ ...original ];
  }

  return value;
}

function stringifyCache (cache) {
  return stream.Readable.from(async function* cachedump (entries) {
    yield '[';
    let i = 0;
    for (let [ k, v ] of entries) {
      k = JSON.stringify(k);
      v = JSON.stringify(v, replacer);
      yield `${i++ ? ',' : ''}\n[${k},${v}]`;
    }
    yield '\n]';
  }(cache.entries()));
}
