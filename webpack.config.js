const path = require('path');

module.exports = {
  entry: './config.js',
  mode: 'production',
  output: {
    filename: 'config.js',
    path: path.resolve(__dirname, 'dist'),
  },
};