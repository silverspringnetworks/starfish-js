import path from 'path';

module.exports = {
  entry: './lib/starfish.js',
  output: {
    filename: 'starfish-sdk.js',
    path: path.resolve(__dirname, 'webdist'),
    library: 'StarfishService'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: ['env']
        }
      }
    ]
  },
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    dns: 'empty'
  }
};
