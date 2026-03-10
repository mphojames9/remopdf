const path = require('path');

module.exports = {
  entry: {
    main: './src/index.js',
    editor: './src/editor.js',
    resume: './src/app.js'
  },

  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  }
};