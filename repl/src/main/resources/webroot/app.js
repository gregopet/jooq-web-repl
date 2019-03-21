// helper functions - also used by later scripts!
function htmlEncode( html ) {
    return document.createElement( 'a' ).appendChild(document.createTextNode( html ) ).parentNode.innerHTML;
};

/**
 * Constructs an instance of the REPL editor. The constructor can be called with an initialization object to set up
 * the editor. It accepts the following properties:
 *   - textArea (required): A textarea on which to initialize CodeMirror, given as a DOM element
 *   - resultsPane (required): whatever will display our results. Needs to support 3 methods: normally,
 *     serverError and networkError (see PreResultsPane for details).
 *   - databaseProvider: a function we can call without parameters to get a database index. If not provided, scripts
 *     will always be run without a database
 *   - commandCheatSheet: a cheatsheet implementation (see relevant JS file)
 *   - onCommandExecutionStarted: A function to invoke when a command is run, to e.g. display a waiting indicator
 *   - onCommandExecutionFinished: A function to invoke when a command run has finished; will be called with the result object
 */
const APP = (function(config) {

    if (!config || !config.textArea) throw "No textArea provided for REPL initialization!";
    if (!config.resultsPane) throw "No results pane for REPL initialization!";

    const submitButton = registerShortcut({ctrl: true, key: 'Enter', hint: 'Submit', action: () => { eval() } });
    var editor = initCodemirror(); // CodeMirror instance

    /**
     * Registers a shortcut, inserting a hint into the cheatsheet if one was provided.
     * The parameter is an object with the following parameters:
     *   - key (required): the key that will be matched to event.key properties
     *   - alt: if true, the shortcut will require ALT to be pressed
     *   - ctrl: if true, the shortcut will require CTRL to be pressed
     *   - shift: if true, the shortcut will require SHIFT to be pressed
     *   - hint: The name of this shortcut to display as a hint. If not given, command will not be registered in the
     *     cheat sheet.
     *   - action: a function to perform when this shortcut is invoked
     *
     * Returns the created button or null if no button was created.
     */
    function registerShortcut(key) {
        // TODO: which DOM element to register the key on?
        const lcaseKey = key.key.toLowerCase();
        const ucaseKey = key.key.toUpperCase();

        document.addEventListener("keydown", ev => {
            if (ev.ctrlKey == !!key.ctrl && ev.altKey == !!key.alt && ev.shiftKey == !!key.shift) {
                if (ev.key == key.key || ev.key == lcaseKey || ev.key == ucaseKey) {
                    if (ev.preventDefault) ev.preventDefault();
                    key.action();
                }
            }
        });
        if (config.commandCheatSheet) {
            return config.commandCheatSheet.addShortcut(key.ctrl, key.alt, key.shift, key.key, key.hint, key.action);
        }
    }

    function appendSelectedDatabasePrefix(endpoint) {
        let database = config.databaseProvider != null ? config.databaseProvider() : null;
        if (database) return "/databases/" + database + endpoint;
        else return "/databases" + endpoint;
    }

    function eval() {
        if (submitButton) submitButton.disabled = true;

        if (config.onCommandExecutionStarted) config.onCommandExecutionStarted();
        fetch(appendSelectedDatabasePrefix("/eval"), {
            method: 'POST',
            body: JSON.stringify(getSnippet()),
            headers: {
                "X-CSRF-TOKEN" : getCSRFFromCookie()
            }
        })
        .then( resp => {
            if (config.onCommandExecutionFinished) config.onCommandExecutionFinished(resp);
            if (submitButton) submitButton.disabled = false;
            const contentType = resp.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return resp.json().then( result => config.resultsPane.normally(result));
            } else {
                return resp.text().then( result => config.resultsPane.serverError(result, resp.status));
            }
        })
        .catch ( err => config.resultsPane.networkError(err));
    }

    /**
     * Invoke suggestion mechanism. Returns the data CodeMirror needs to display suggestions.
     */
    function suggest() {
        return fetch(appendSelectedDatabasePrefix("/suggest"), {
            method: 'POST',
            body: JSON.stringify(getSnippet()),
            headers: {
                "X-CSRF-TOKEN" : getCSRFFromCookie()
            }
        })
        .then( resp => resp.json() )
        .then(mapSuggestions )
        .catch ( err => { resultsArea.innerText = "Network error submitting query to server!\n" + err});
    }
    
    /** Maps the returned suggestions to a format our editor can understand */
    function mapSuggestions(result) {
        
        // Remove duplicates and display non-matching suggestions last (suggestions come pre-sorted alphabetically)
        let lastAdded = undefined;
        let matchType = [];
        let dontMatchType = [];
        result.suggestions.forEach( sugg => {
            if (sugg.continuation !== lastAdded) {
                lastAdded = sugg.continuation
            
                if (sugg.matchesType) {
                    matchType.push({ text: sugg.continuation });
                } else {
                    dontMatchType.push({ text: sugg.continuation, className: 'matches-type-false' });
                }
            }
        });
        
        return {
                from: editor.posFromIndex(result.anchor),
                to: editor.posFromIndex(result.cursor),
                list: matchType.concat(dontMatchType)
        }
    }
    
    /**
    * Constructs a payload that can be sent to the server for evaluation, representing the current state of the snippet.
    */
    function getSnippet() {
        return {
            script: editor.getValue(),
            cursorPosition:  editor.indexFromPos(editor.getCursor())
        }
    }
    
    function initCodemirror() {
        let cmEditor = CodeMirror.fromTextArea(config.textArea, {
            lineNumbers: true,
            mode: { name: "clike" },
            extraKeys: {"Ctrl-Space": "autocomplete"},
            hintOptions: {
                hint: suggest,
                completeSingle: false
            }
        });
        if (config.commandCheatSheet) {
            config.commandCheatSheet.addShortcut(true, false, false, "Space", "Completion", () => { cmEditor.showHint() })
        }

        // let layouting do its magic and then redraw the editor to avoid weird issues like an ultra-thin editor
        window.setTimeout(() => cmEditor.refresh(), 300);

        return cmEditor;
    }

    /** Reads the document cookies and retrieves the CSRF token, if present; otherwise, an empty string is returned */
    function getCSRFFromCookie() {
        var match = document.cookie.match(new RegExp('(^| )' + 'X-CSRF' + '=([^;]+)'));
        if (match) return match[2]; else return "";
    }

    return {
        /** The CodeMirror editor instance */
        getEditor: () => editor,

        /** Gets the current contents and cursor position from the editor */
        getSnippet: getSnippet,

        /** Gets the index of the current database from the selector */
        appendSelectedDatabasePrefix: appendSelectedDatabasePrefix,

        /** Reads the document cookies and retrieves the CSRF token, if present; otherwise, an empty string is returned */
        getCSRFFromCookie: getCSRFFromCookie,

        registerShortcut: registerShortcut
    }
});

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
    const editor = APP({
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
