/** Makes the splitter draggable and double-clickable */
function createSplitter() {
    const resultsPane = document.getElementById('results-pane');
    const splitter = document.querySelector("#splitter");

    var isMouseDown = false;
    splitter.addEventListener("mousedown", () => isMouseDown = true);
    document.addEventListener("mouseup", () => isMouseDown = false);
    document.addEventListener("mousemove", (ev) => {
        if (ev && isMouseDown && ev.offsetY) {
            var dist = ev.clientY - resultsPane.offsetTop;
            resultsPane.style['flex-basis'] = "" + (resultsPane.offsetHeight - dist) + "px";
            resultsPane.style['flex-grow'] = "0";
            if (ev.preventDefault) ev.preventDefault();
        }
    });

    // go back to "neutral" size when double clicking on the splitter
    document.addEventListener("dblclick", (ev) => {
        resultsPane.style['flex-basis'] = "";
        resultsPane.style['flex-grow'] = "0";
    });
}

document.addEventListener("DOMContentLoaded", function(event) {

    // A closeable command area
    const commandArea = document.querySelector('.command-area');
    const helpShowButton = document.querySelector('#command-area-show');
    const helpCloseButton = document.getElementById('command-area-close');
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
    const resultsLoader = document.querySelector("#results-pane > .loader");

    // The editor itself
    const editor = Repl({
        textArea: document.querySelector('#script-content'),
        resultsPane: PreResultsPane(document.querySelector("#results-pane pre")),
        databaseProvider: DatabaseChooser(document.querySelector("#database-select")),
        commandCheatSheet: BootstrapListCheatSheet(document.getElementById('shortcut-list')),
        onCommandExecutionStarted: () => { resultsLoader.style.display = 'block' },
        onCommandExecutionFinished: () => { resultsLoader.style.display = 'none' }
    });
    Javadoc(editor);
    Storage(editor);

    // The splitter between script & command panes
    createSplitter();

});
