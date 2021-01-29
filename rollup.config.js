import resolve from '@rollup/plugin-node-resolve';
import banner from 'rollup-plugin-banner';
import babel from 'rollup-plugin-babel';
// import exclude from 'rollup-plugin-exclude-dependencies-from-bundle';
import commonjs from '@rollup/plugin-commonjs';
import { join } from 'path';

const bannerConfig = {
  file: join(__dirname, 'LICENSE.txt'),
};

const config = {
  plugins: [
    resolve({
      preferBuiltins: true,
    }),
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
  ],
  external: [
    'crypto',
    'stream',
    'fs',
    'stream',
    'path',
    'util',
    'stream-json',
    'stream-json/streamers/StreamArray',
  ],
};

export default [
  {
    ...config,
    input: 'src/dist.js',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      exports: 'default',
    },
  },
  {
    ...config,
    input: 'src/index.js',
    output: {
      file: 'dist/index.mjs',
      format: 'esm',
    },
  },
];
