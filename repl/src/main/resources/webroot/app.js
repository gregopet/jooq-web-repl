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
    let split = Split(['#query-pane', '#results-pane'], {
        minSize: 50,
        direction: 'vertical',
        gutterSize: 6
    });
});
