import path from 'path';
import { fileURLToPath } from 'url';
import TerserPlugin from 'terser-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseConfig = {
  entry: path.resolve(__dirname, 'src/resizable.js'),
  target: ['web'],
  output: {
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'Resizable',
      type: 'umd',
      export: 'default',
    },
    globalObject: 'this',
  },
  devtool: 'source-map',
};

const unminified = {
  ...baseConfig,
  mode: 'development',
  optimization: {
    minimize: false,
  },
  output: {
    ...baseConfig.output,
    filename: 'resizable.js',
  },
};

const minified = {
  ...baseConfig,
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
  output: {
    ...baseConfig.output,
    filename: 'resizable.min.js',
  },
};

export default [unminified, minified];
