const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    main: './src/index.js',
    editor: './src/editor.js',
    resumeBuilder: './src/resumeBuilder.js'
  },

  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'docs'),
    publicPath: '/remopdf/',
    clean: true
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
      inject: "body"
    }),

    new CopyPlugin({
      patterns: [
        { from: "public/about", to: "about" },
        { from: "public/resumePro", to: "resumePro" },
        { from: "public/privacy", to: "privacy" },
        { from: "public/editor", to: "editor" },
        { from: "public/images", to: "images" }
      ]
    })
  ]
};