/* eslint quotes:0, new-cap:0 */

import tap from 'tap';
import Knowed, { JsonStore, BIND } from '../src/index';
import { resolve } from 'path';
import { remove, readJson } from '../src/utils/fs';


tap.test('jsonstore-1', async (t) => {
  const path = resolve(__dirname, 'artifacts/jsonstore-1.json');

  await remove(path);

  const pg = new Knowed(JsonStore, { path });
  await pg.transaction(async (tr) => {

    const supervisor = tr.query('employee-1', true).setMeta('type', 'supervisor');
    const subordinates = supervisor.to('subordinates', true).setMeta('type', 'subordinates');
    const employee = tr.query('employee-2', true).setMeta('type', 'employee');

    subordinates.bind(employee);
    employee.bind(supervisor, { key: 'supervisor', direction: BIND.NORTH });

    await employee.resolve();
  });

  await t.resolves(readJson(path));

  await pg.transaction(async (tr) => {

    const refetch = tr.query('employee-1', false).to('subordinates').to();

    t.equal(await refetch.getMeta('type'), 'employee', 'Was able to renavigate to the employee by way of their supervisor');

  });
});

