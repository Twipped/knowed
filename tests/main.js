/* eslint quotes:0, new-cap:0 */

import suite from 'tapsuite';
import PGraph, { MemStore } from '../src/index';

suite('main', (s) => {

	s.test('basic query', async (t) => {
		// const pg = new PGraph(MemStore);
		// await pg.transaction(async (tr) => {

		// 	const employee = tr.query('employee-1', 'EMPLOYEE').put({
		// 		name: 'John Smith',
		// 	});

		// 	const employees = tr.query('employees').add(employee);
		// });
	});
});

