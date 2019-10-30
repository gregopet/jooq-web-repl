// All our dependencies, we'd like to reference them as UMD modules from the browser
module.exports = {
    debounce: require('debounce-promise'),
    Split: require('split.js'),
    CodeMirror: require('codemirror'),
    cmClike: require('codemirror/mode/clike/clike'),
    cmHintDialog: require('codemirror/addon/hint/show-hint.js'),
    ndjsonStream: require('can-ndjson-stream'),
};