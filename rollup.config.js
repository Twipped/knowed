import resolve from '@rollup/plugin-node-resolve';
import banner from 'rollup-plugin-banner';
import babel from 'rollup-plugin-babel';
// import exclude from 'rollup-plugin-exclude-dependencies-from-bundle';
import commonjs from '@rollup/plugin-commonjs';
import { join } from 'path';

const bannerConfig = {
	file: join(__dirname, 'LICENSE.txt'),
};

const plugins = [
	resolve(),
	// exclude(),
	commonjs({
		include: 'node_modules/**',
	}),
	babel({
		exclude: 'node_modules/**',
		presets: [
			'@babel/env',
		],
	}),
	banner(bannerConfig),
];

export default [
	{
		input: 'src/dist.js',
		output: {
			file: 'dist/index.cjs.js',
			format: 'cjs',
			exports: 'default',
		},
		plugins,
		external: [
			'crypto',
			'fs-extra',
		],
	},
	{
		input: 'src/index.js',
		output: {
			file: 'dist/index.esm.js',
			format: 'esm',
		},
		plugins,
		external: [
			'crypto',
			'fs-extra',
		],
	},

];
