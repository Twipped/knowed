
import fs from 'fs';
import { exists, touch, isWritable, writeJson, pipeline } from '../utils/fs';
import MemStore from './mem';
import { isMap, isSet } from '../utils';
import StreamArray from 'stream-json/streamers/StreamArray';
import { Readable } from 'stream';

export default class JSONStore extends MemStore {

  async initialize () {
    if (this.initialized) return;
    this.initialized = true;
    this._cache = new Map();
    this._catalog = new Set();

    const { path } = this.options;

    if (!await exists(path)) {
      // file doesn't exist, so lets create an empty one.
      if (!await isWritable(path)) {
        throw new Error(`pGraph JSONStore cannot create a db file at "${path}", no write permission.`);
      }
      await touch(path).catch((err) => {
        throw new Error(`pGraph JSONStore cannot create a db file at "${path}": ${err.message}`);
      });
      await writeJson(path, []);
      return;
    }

    const rows = fs.createReadStream(path).pipe(StreamArray.withParser());

    try {
      this._cache = new Map();
      for await (const { value: [ k, v ] } of rows) {
        this._cache.set(k, v);
        this._catalog.add(v);
      }
    } catch (err) {
      throw new Error(`pGraph JSONStore could not load db file "${path}": ${err.message}`);
    }
  }

  async close (write) {
    if (!this._cache) return;
    if (write) {
      await pipeline(
        stringifyCache(this._cache),
        fs.createWriteStream(this.options.path, { encoding: 'utf8' }),
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
  return Readable.from(async function* cachedump () {
    yield '[';
    let i = 0;
    for (let [ k, v ] of cache.entries()) {
      k = JSON.stringify(k);
      v = JSON.stringify(v, replacer);
      yield `${i++ ? ',' : ''}\n[${k},${v}]`;
    }
    yield '\n]';
  }());
}
