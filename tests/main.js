/* eslint quotes:0, new-cap:0 */

import tap from 'tap';
import PGraph, { MemStore, BIND } from '../src/index';

tap.test('basic query', async (t) => {
  const pg = new PGraph(MemStore);
  await pg.transaction(async (tr) => {

    const employee = tr.query('employee-1', true)
      .put({
        name: 'John Smith',
      })
      .set('foo', 'bar')
		;

    t.same(employee.souls.length, 0, 'Query does not yet have any souls.');
    t.same(employee.traversal, [
      [ 'FROM_ALIAS', 'employee-1', true ],
      [ 'PUT_DATA', { name: 'John Smith' }, true ],
      [ 'UPDATE_META', { foo: 'bar' } ],
    ], 'Traversal contains a root key and a put command');

    await employee;

    t.same(employee.souls.length, 1, 'Query now contains one soul.');
    t.same(employee.traversal.length, 0, 'Query no longer has any traversals.');

    const soulid = employee.souls[0];
    const db = tr.store._cache;

    t.match(soulid, /^SOUL-[0-9A-F]{32,42}$/, 'Soulid is in the correct format');
    t.ok(db.has(soulid), 'soul exists in db');
    t.ok(db.get(soulid).has('cdate'), 'Has a creation date.');
    t.ok(db.get(soulid).has('mdate'), 'Has a modification date.');
    t.equal(db.get(soulid).get('foo'), 'bar', 'Property we set exists.');

    t.same(db.get('ALIASES'), new Set([ 'employee-1' ]), 'system recorded the alias');
    t.same(db.get(soulid + '-ALIASES'), new Set([ 'employee-1' ]), 'soul recorded the alias');
    t.same(db.get(soulid + '-DATA'), { name: 'John Smith' }, 'Soul data recorded');

    const refetch = tr.query('employee-1', false);
    await refetch;

    t.same(employee.souls, refetch.souls, 'Refetch found the same soul.');
    t.same(await refetch.get(), [ { name: 'John Smith' } ], 'Retrieved the data from the record with the same alias.');
  });
});


tap.test('basic query', async (t) => {
  const pg = new PGraph(MemStore);
  await pg.transaction(async (tr) => {

    const superior = tr.query('employee-1');
    const subordinates = superior.down(true);
    const subordinate = tr.query('employee-2', true);

    subordinates.down(subordinate);
    subordinate.up(superior, 'supervisor');

    console.log(subordinate.traversal);

    await subordinate;

    const db = tr.store._cache;
    console.log(db);
  });
});

