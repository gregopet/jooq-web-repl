import * as splitter from 'split.js';
import CommandPanel from './ui/CommandPanel';
import DocumentationDialog from './ui/DocumentationDialog';
import StorageDialog from './ui/StorageDialog';
import { DatabaseChooser } from './ui/DatabaseSelect';
import ResultPanel from './ui/ResultPanel';
import Repl, { REPLOptions } from './Repl';

// CodeMirror plugins run via side effects
import 'codemirror/mode/clike/clike';
import 'codemirror/addon/hint/show-hint';

// We also need a few CSS files
import '../styles.css'
import 'bootstrap/dist/css/bootstrap.css'
import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/hint/show-hint.css'


document.addEventListener("DOMContentLoaded", function(event) {

    // A closeable command area
    const commandArea = document.querySelector('.command-area') as HTMLDivElement;
    const helpShowButton = document.querySelector('#command-area-show') as HTMLButtonElement;
    const helpCloseButton = document.getElementById('command-area-close') as HTMLButtonElement;
    helpShowButton.addEventListener("click", showCommandArea);
    helpCloseButton.addEventListener("click", closeCommandArea);
    
    function showCommandArea() {
        commandArea.style.display = "block";
        helpShowButton.style.display = "none"
    }
    function closeCommandArea() {
        commandArea.style.display = "none";
        helpShowButton.style.display = "block"
    }

    // The loading indicator
    const resultsLoader = document.querySelector("#results-pane > .loader") as HTMLElement;

    // The editor itself
    const replOptions: REPLOptions = {
        textArea: document.querySelector('#script-content'),
        resultsPane: new ResultPanel(document.querySelector("#results-pane pre"), document.getElementById("result-tabs") as HTMLDivElement),
        databaseProvider: DatabaseChooser(document.querySelector("#database-select") as HTMLSelectElement),
        commandCheatSheet: new CommandPanel(document.getElementById('shortcut-list') as HTMLUListElement),
        onCommandExecutionStarted: () => { resultsLoader.style.display = 'block' },
        onCommandExecutionFinished: () => { resultsLoader.style.display = 'none' },
        //augmentors: [ jooqGrid ]
    }; 

    const editor = new Repl(replOptions);
    new DocumentationDialog(editor);
    new StorageDialog(editor);

    // The splitter between script & command panes
    let split = splitter.default(['#query-pane', '#results-pane'], {
        minSize: 50,
        direction: 'vertical',
        gutterSize: 6
    });
});
