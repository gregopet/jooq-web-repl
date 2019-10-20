var path = require('path');

module.exports = {
    entry: path.resolve(__dirname, "index.js"),
    output: {
        library: 'LIBS',
        path: path.resolve(__dirname, "."),
        filename: "dependencies.js",
        libraryTarget: "umd"
    }
};