import fs from 'fs'
import path from 'path'
import type {Configuration} from 'webpack'
import WebpackDevServer from 'webpack-dev-server'
import merge from 'webpack-merge'
import yargs from 'yargs'

import {devServer} from './devServer'
import {getPackageMetadata} from './getPackageMetadata'
import {getPlugins} from './plugins'

const appDir = fs.realpathSync(process.cwd())

const getCliArgs = (): Webpack.CliArgs =>
  yargs(process.argv.slice(2))
    .options({
      mode: { type: 'string', default: 'development' },
    })
    .parseSync()

export type Mode = 'production' | 'development'

const getOutputs = (mode: Mode) => ({
  path: path.join(appDir, 'build'),
  pathinfo: mode === 'development',
  publicPath: process.env.PUBLIC_URL ?? getPackageMetadata()?.homepage ?? '',
})

const base: Configuration = {
  target: ['browserslist'],
  resolve: {
    alias: { src: path.join(appDir, 'src') },
    extensions: ['.tsx', '.jsx', '.ts', '.js'],
  },
  infrastructureLogging: {
    level: 'none',
  },
  experiments: { topLevelAwait: true, layers: true, cacheUnaffected: true, outputModule: true },
  cache: { type: 'filesystem' },
  plugins: [],
}
const plugins = getPlugins('production')

const production: Configuration = {
  mode: 'production',
  devtool: false,
  resolve: {
    ...base.resolve,
    alias: {
      ...(base.resolve?.alias ?? {}),
      'react-dom$': 'react-dom/profiling',
      'scheduler/tracing': 'scheduler/tracing-profiling',
    },
  },
  stats: 'errors-warnings',
  performance: { maxAssetSize: 1e6 },
  optimization: { minimizer: [plugins.terser(), plugins.cssMinimizer()], minimize: true },
  plugins: [],
}

const development: Partial<Configuration & { devServer: WebpackDevServer.Configuration }> = {
  optimization: { minimize: false },
  mode: 'development',
  stats: 'normal',
  devtool: 'source-map',
  plugins: [],
  devServer,
}

const getConfig: (mode: Mode) => Partial<Configuration> = mode =>
  merge(base, {
    ...(mode === 'production' ? production : development),
    output: getOutputs(mode),
  })

export { getConfig, getCliArgs }
