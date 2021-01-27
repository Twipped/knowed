/* eslint quotes:0, new-cap:0 */

import tap from 'tap';
import Knowed, { JsonStore } from '../src/index';
import { resolve } from 'path';
import fs from 'fs-extra';

tap.test('jsonstore-1', async (t) => {
  const path = resolve(__dirname, 'artifacts/jsonstore-1.json');

  await fs.remove(path);

  const pg = new Knowed(JsonStore, { path });
  await pg.transaction(async (tr) => {

    const supervisor = tr.query('employee-1', true).setMeta('type', 'supervisor');
    const subordinates = supervisor.right(true).setMeta('type', 'subordinates');
    const employee = tr.query('employee-2', true).setMeta('type', 'employee');

    subordinates.bindDown(employee);
    employee.bindUp(supervisor, 'supervisor');

    await employee;
  });

  await t.resolves(fs.readJson(path));

  await pg.transaction(async (tr) => {

    const refetch = tr.query('employee-1', false).right().down();

    t.equal(await refetch.getMeta('type'), 'employee', 'Was able to renavigate to the employee by way of their supervisor');

  });
});

