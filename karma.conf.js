var webpack = require('webpack');

module.exports = function(config) {
  config.set({
    frameworks: ['mocha'],

    files: [
      'test/**/*.js'
    ],

    preprocessors: {
      'test/**/*.js': ['webpack']
    },

    webpack: {
      module: {
        loaders: [{
          test: /\.js$/,
          exclude: /(node_modules)/,
          loader: 'babel-loader'
        }]
      }
    }


  });
};
