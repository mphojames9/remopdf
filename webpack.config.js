const path = require('path');

module.exports = {
  entry: {
    main: './src/index.js',
    editor: './src/editor.js',
    resumeBuilder: './src/resumeBuilder.js'
  },

  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  }
};