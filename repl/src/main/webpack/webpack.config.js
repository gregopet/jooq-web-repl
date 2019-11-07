var path = require('path');
var MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    plugins: [
        new MiniCssExtractPlugin({
            // Options similar to the same options in webpackOptions.output
            // all options are optional
            filename: '../resources/webroot/repl.css',
            //chunkFilename: 'repl-[id].css',
            ignoreOrder: false, // Enable to remove warnings about conflicting order
        }),
    ],
    entry: path.resolve(__dirname, "ts/index.ts"),
    module: {
        rules: [
            {
              test: /\.tsx?$/,
              use: 'ts-loader',
              exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: [
                    { loader: MiniCssExtractPlugin.loader },
                    'css-loader',
                ],
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