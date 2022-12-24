var webpack = require('webpack'),
  path = require('path'),
  fileSystem = require('fs-extra'),
  env = require('./utils/env'),
  CopyWebpackPlugin = require('copy-webpack-plugin'),
  HtmlWebpackPlugin = require('html-webpack-plugin'),
  TerserPlugin = require('terser-webpack-plugin');
var { CleanWebpackPlugin } = require('clean-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

/**
 * Taken from https://github.com/abhijithvijayan/wext-manifest-webpack-plugin
 * updated to hackily use webpack 5.
 *
 * TODO(jqphu): make a pull request to merge this back in.
 */
const PLUGIN_NAME = 'wext-manifest-webpack-plugin';

function getEntryResource(module) {
  const resource = null;

  if (module && typeof module.resource === 'string') {
    return module.resource;
  }

  return resource;
}

class WextManifestWebpackPlugin {
  // Define `apply` as its prototype method which is supplied with compiler as its argument
  apply(compiler) {
    /**
     *  webpack 4+ comes with a new plugin system.
     *
     *  (// ToDo: support old plugin system //)
     */
    const { hooks } = compiler;

    // Check for hooks for 4+
    if (hooks) {
      // Runs plugin after a compilation has been created.
      hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
        // Triggered when an asset from a chunk was added to the compilation.
        compilation.hooks.chunkAsset.tap(PLUGIN_NAME, (chunk, file) => {
          // Only handle js files with entry modules
          if (!file.endsWith('.js')) {
            return;
          }

          for (const entryModule of compilation.chunkGraph.getChunkEntryModulesIterable(
            chunk
          )) {
            // Returns path containing name of asset
            const resource = getEntryResource(entryModule);
            const isManifest =
              (resource && /manifest\.json$/.test(resource)) || false;

            if (isManifest) {
              chunk.files = [...chunk.files].filter((f) => {
                return f !== file;
              });

              delete compilation.assets[file];
              // https://github.com/abhijithvijayan/wext-manifest-webpack-plugin/issues/1
              // console.emoji('🦄', `${PLUGIN_NAME}: removed ${file}`, 29);
              console.log(`${PLUGIN_NAME}: removed ${file}`);
            }
          }
        });
      });
    }
  }
}

const targetBrowser = process.env.TARGET_BROWSER;
const destPath = path.join(__dirname, 'build');
const buildPath = path.join(destPath, targetBrowser);

const ASSET_PATH = process.env.ASSET_PATH || '/';

var alias = {
  'react-dom': '@hot-loader/react-dom',
};

// load the secrets
var secretsPath = path.join(__dirname, 'secrets.' + env.NODE_ENV + '.js');

var fileExtensions = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'eot',
  'otf',
  'svg',
  'ttf',
  'woff',
  'woff2',
];

if (fileSystem.existsSync(secretsPath)) {
  alias['secrets'] = secretsPath;
}

var options = {
  mode: process.env.NODE_ENV || 'development',
  entry: {
    manifest: './src/manifest.json',
    popup: path.join(__dirname, 'src', 'pages', 'Popup', 'index.jsx'),
    background: path.join(__dirname, 'src', 'pages', 'Background', 'index.ts'),
    contentScript: path.join(__dirname, 'src', 'pages', 'Content', 'index.ts'),
    injectedScript: path.join(
      __dirname,
      'src',
      'pages',
      'Injected',
      'index.ts'
    ),
  },
  chromeExtensionBoilerplate: {
    notHotReload: ['background', 'contentScript'],
  },
  output: {
    filename: '[name].bundle.js',
    path: buildPath,
    clean: true,
    publicPath: ASSET_PATH,
  },
  module: {
    rules: [
      {
        // look for .css or .scss files
        test: /\.(css|scss)$/,
        // in the `src` directory
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
          },
          {
            loader: 'postcss-loader',
          },
        ],
      },
      {
        test: new RegExp('.(' + fileExtensions.join('|') + ')$'),
        type: 'asset/resource',
        exclude: /node_modules/,
        // loader: 'file-loader',
        // options: {
        //   name: '[name].[ext]',
        // },
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        exclude: /node_modules/,
      },
      { test: /\.(ts|tsx)$/, loader: 'ts-loader', exclude: /node_modules/ },
      {
        test: /\.(js|jsx)$/,
        use: [
          {
            loader: 'source-map-loader',
          },
          {
            loader: 'babel-loader',
          },
        ],
        exclude: /node_modules/,
      },
      {
        type: 'javascript/auto', // prevent webpack handling json with its own loaders,
        test: /manifest\.json$/,
        use: 'wext-manifest-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    alias: alias,
    extensions: fileExtensions
      .map((extension) => '.' + extension)
      .concat(['.js', '.jsx', '.ts', '.tsx', '.css']),
  },
  plugins: [
    new WextManifestWebpackPlugin(),
    new CleanWebpackPlugin({ verbose: false }),
    new webpack.ProgressPlugin(),
    // expose and write the allowed env vars on the compiled bundle
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/waves.png',
          to: buildPath,
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/robot.png',
          to: buildPath,
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/rocket.png',
          to: buildPath,
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/glass.png',
          to: buildPath,
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/failed.png',
          to: buildPath,
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/waves_bottom.png',
          to: buildPath,
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/waves_top.png',
          to: buildPath,
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/unknown.png',
          to: buildPath,
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/icon-128.png',
          to: buildPath,
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/icon-32.png',
          to: buildPath,
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/icon-32-gray.png',
          to: buildPath,
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/sign-in-image.png',
          to: buildPath,
          force: true,
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets/img/unknown-box.png',
          to: buildPath,
          force: true,
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'pages', 'Popup', 'index.html'),
      filename: 'popup.html',
      chunks: ['popup'],
      cache: false,
    }),

    new NodePolyfillPlugin(),
  ],
  infrastructureLogging: {
    level: 'info',
  },
};

if (env.NODE_ENV === 'development') {
  options.devtool = 'cheap-module-source-map';
} else {
  options.optimization = {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
    ],
  };
}

module.exports = options;
