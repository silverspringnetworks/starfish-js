
var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: './lib/starfish.js',
  output: {
    filename: 'starfish-sdk.js',
    path: path.resolve(__dirname, 'webdist'),
    library: 'StarfishService'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: "babel-loader",
        exclude: [
          path.resolve(__dirname, "test"),
          path.resolve(__dirname, "dist"),
          path.resolve(__dirname, "webdist"),
          path.resolve(__dirname, "node_modules")
        ]
      }
    ]
  },
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    dns: 'empty'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    })
  ]
};
