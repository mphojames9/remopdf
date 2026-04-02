const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    main: './src/index.js',
    editor: './src/editor.js',
    resumeBuilder: './src/resumeBuilder.js'
  },

  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'docs'),
    publicPath: '/remopdf/',   // ✅ correct for GitHub Pages
    clean: true
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
      inject: "body"
    })
  ]
};