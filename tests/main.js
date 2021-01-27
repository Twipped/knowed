/* eslint quotes:0, new-cap:0 */

import tap from 'tap';
import PGraph, { MemStore } from '../src/index';

tap.test('basic query', async (t) => {
  const pg = new PGraph(MemStore);
  await pg.transaction(async (tr) => {

    const employee = tr.query('employee-1', true)
      .put({
        name: 'John Smith',
      })
      .setMeta('foo', 'bar')
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

    const supervisor = tr.query('employee-1', true).setMeta('name', 'supervisor');
    const subordinates = supervisor.right(true).setMeta('name', 'subordinates');
    const employee = tr.query('employee-2', true).setMeta('name', 'employee');

    const bindSubordinatesToEmployee = subordinates.bindDown(employee);
    const bindEmployeeToSupervisor = employee.bindUp(supervisor, 'supervisor');

    await employee;

    const db = tr.store._cache;

    const supSoulid = supervisor.souls[0];
    const empSoulid = employee.souls[0];
    const subordinatesSoulid = subordinates.souls[0];

    t.same(tr.store._catalog, new Set([ supSoulid, empSoulid, subordinatesSoulid ]), 'three souls were created and tracked');

    t.same(db.get('ALIASES'), new Set([ 'employee-2', 'employee-1' ]), 'both employees were aliased');

    t.ok(db.has(supSoulid), 'supervisor soul exists in db');
    t.ok(db.has(empSoulid), 'employee soul exists in db');
    t.ok(db.has(subordinatesSoulid), 'supervisors subordinates collection exists in db');

    t.notEqual(supSoulid, subordinatesSoulid, 'subordinates soul differs from supervisor soul');
    t.notEqual(empSoulid, subordinatesSoulid, 'subordinates soul differs from employees soul');
    t.equal(bindEmployeeToSupervisor.souls[0], empSoulid, 'bindEmployeeToSupervisor is still the employee soul');
    t.equal(bindSubordinatesToEmployee.souls[0], subordinatesSoulid, 'bindSubordinatesToEmployee is still the subordinates soul');

    t.same(db.get(empSoulid + '-TO_KEY'), new Map([ [ supSoulid, [ 'supervisor', 'UP' ] ] ]), 'employee recorded the key link to the supervisor');
    t.same(db.get(supSoulid + '-RIGHT'), new Set([ subordinatesSoulid ]), 'supervisor is bound to the subordinates soul');
    t.same(db.get(supSoulid + '-DOWN'), new Set([ empSoulid ]), 'supervisor is bound to the employee');
    t.same(db.get(empSoulid + '-UP'), new Set([ supSoulid, subordinatesSoulid ]), 'employee is bound to the supervisor and the subordinates collection');

    const refetch = tr.query('employee-1', false).right().down();
    await refetch;

    t.same(refetch.souls, [ empSoulid ], 'renavigating to the employee via the supervisor works');

  });
});

