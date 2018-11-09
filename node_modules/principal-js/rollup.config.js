import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import pkg from './package.json'

export default [
  // browser-friendly UMD build
  // {
  //   entry: 'src/index.js',
  //   dest: pkg.browser,
  //   format: 'umd',
  //   moduleName: 'principal-js',
  //   plugins: [
  //     // resolve(),
  //     // commonjs(),
  //     babel({
  //       exclude: ['node_modules/**'],
  //       externalHelpers: true,
  //       plugins: ['@babel/plugin-external-helpers', 'add-module-exports'],
  //       presets: ['@babel/preset-env']
  //     })
  //   ]
  // },
  {
    input: 'index.js',
    external: ['util', 'debug'],
    output: {
      format: 'es',
      file: pkg.module
    },
    plugins: [
      resolve(),
      commonjs(),
      babel({
        exclude: ['node_modules/**'],
        presets: [['@babel/preset-env', { useBuiltIns: 'usage' }]]
      })
    ]
  },
  {
    input: 'index.js',
    output: {
      format: 'cjs',
      file: pkg.main
    },
    external: ['util', 'debug'],
    plugins: [
      resolve(),
      commonjs(),
      babel({
        exclude: ['node_modules/**'],
        presets: [['@babel/preset-env', { useBuiltIns: 'usage' }]]
      })
    ]
  }
]
