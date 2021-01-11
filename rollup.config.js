import resolve from '@rollup/plugin-node-resolve';
import banner from 'rollup-plugin-banner';
import { join } from 'path';

const bannerConfig = {
	file: join(__dirname, 'LICENSE.txt'),
};

export default [
	{
		input: 'src/dist.js',
		output: {
			file: 'dist/index.cjs.js',
			format: 'cjs',
			exports: 'default',
		},
		plugins: [
			resolve(),
			banner(bannerConfig),
		],
	},
	{
		input: 'src/index.js',
		output: {
			file: 'dist/index.esm.js',
			format: 'esm',
		},
		plugins: [
			resolve(),
			banner(bannerConfig),
		],
	},

];
