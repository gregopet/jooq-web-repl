var path = require('path');

module.exports = {
    entry: path.resolve(__dirname, "ts/index.ts"),
    module: {
        rules: [
            {
              test: /\.tsx?$/,
              use: 'ts-loader',
              exclude: /node_modules/,
            },
          ],
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
    },
    output: {
        library: 'REPL',
        path: path.resolve(__dirname, "."),
        filename: "../resources/webroot/repl.js",
        libraryTarget: "umd",
    },
};