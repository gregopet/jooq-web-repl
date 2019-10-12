/**
 * Constructs an instance of the REPL editor. The constructor can be called with an initialization object to set up
 * the editor. It accepts the following properties:
 *   - textArea (required): A textarea on which to initialize CodeMirror, given as a DOM element
 *   - resultsPane (required): whatever will display our results. Needs to support 3 methods: normally,
 *     serverError and networkError (see PreResultsPane for details).
 *   - databaseProvider: a function we can call without parameters to get a database index. If not provided, scripts
 *     will always be run without a database
 *   - submitButton: the button to run the evaluation, if there is an external one. When not given, the editor will try
 *     to create its own submit button using "registerShortcut".
 *   - commandCheatSheet: a cheatsheet implementation (see relevant JS file)
 *   - onCommandExecutionStarted: A function to invoke when a command is run, to e.g. display a waiting indicator
 *   - onCommandExecutionFinished: A function to invoke when a command run has finished; will be called with the result object
 *   - keyboardShortcutRoot: if given, keyboard shortcuts will be listened to at this element. Otherwise, they will be registered
 *     on document.
 */
const Repl = (function(config) {

    if (!config || !config.textArea) throw "No textArea provided for REPL initialization!";
    if (!config.resultsPane) throw "No results pane for REPL initialization!";

    let submitButton = registerShortcut({
        ctrl: true, 
        key: 'Enter', 
        hint: 'Submit', 
        action: () => { eval() }, 
        triggerOnNode: config.submitButton 
    });
    var editor = initCodemirror(); // CodeMirror instance
    
    let executionInProgress = false;

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
     *   - triggerOnNode: if a node is given, triggering the event will be bound to it
     *     instead of creating a new button.
     *
     * Returns the created button or null if no button was created.
     */
    function registerShortcut(key) {
        // TODO: which DOM element to register the key on?
        const lcaseKey = key.key.toLowerCase();
        const ucaseKey = key.key.toUpperCase();

        const eventsRoot = config.keyboardShortcutRoot || document;

        eventsRoot.addEventListener("keydown", ev => {
            if (ev.ctrlKey == !!key.ctrl && ev.altKey == !!key.alt && ev.shiftKey == !!key.shift) {
                if (ev.key == key.key || ev.key == lcaseKey || ev.key == ucaseKey) {
                    if (ev.preventDefault) ev.preventDefault();
                    key.action();
                }
            }
        });
        if (key.triggerOnNode) {
            key.triggerOnNode.addEventListener("click", key.action);
            return key.triggerOnNode;
        } else if (config.commandCheatSheet) {
            return config.commandCheatSheet.addShortcut(key.ctrl, key.alt, key.shift, key.key, key.hint, key.action);
        }
    }

    function appendSelectedDatabasePrefix(endpoint) {
        let database = config.databaseProvider != null ? config.databaseProvider() : null;
        if (database) return "/databases/" + database + endpoint;
        else return "/databases" + endpoint;
    }

    function eval() {
        if (executionInProgress) {
            console.log("A previous execution is still in progress, aborting");
            return;
        } else {
            executionInProgress = true;
        }
        if (submitButton) submitButton.disabled = true;
        config.resultsPane.clear();
        backgroundRequestStarted();

        if (config.onCommandExecutionStarted) config.onCommandExecutionStarted();
        fetch(appendSelectedDatabasePrefix("/eval"), {
            method: 'POST',
            body: JSON.stringify(getSnippet()),
            headers: {
                "X-CSRF-TOKEN" : getCSRFFromCookie()
            }
        })
        .then( resp => {
            backgroundRequestFinished();
            if (config.onCommandExecutionFinished) config.onCommandExecutionFinished(resp);
            if (submitButton) submitButton.disabled = false;
            const contentType = resp.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return resp.json().then( result => {
                    config.resultsPane.normally(result);
                    if (result.errorOutput) {
                        // TODO: refactor the error creation into a class?
                        const log = document.createElement("pre");
                        log.innerHTML = result.errorOutput;
                        config.resultsPane.normalAlternateResponse("Log", log);
                    }
                })
            } else {
                return resp.text().then( result => config.resultsPane.serverError(result, resp.status));
            }
        })
        .catch ( err => config.resultsPane.networkError(err))
        .finally( () => executionInProgress = false);
    }

    /**
     * Invoke suggestion mechanism. Returns the data CodeMirror needs to display suggestions.
     */
    function suggest() {
        backgroundRequestStarted();
        return fetch(appendSelectedDatabasePrefix("/suggest"), {
            method: 'POST',
            body: JSON.stringify(getSnippet()),
            headers: {
                "X-CSRF-TOKEN" : getCSRFFromCookie()
            }
        })
        .then( resp => {
            backgroundRequestFinished();
            return resp.json();
        })
        .then(mapSuggestions )
        .catch ( err => { config.resultsPane.networkError("Network error submitting query to server!\n" + err)});
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

    // Track how many requests are going on in the background to provide some kind of waiting indicator
    let backgroundRequestsInFlight = 0;

    function backgroundRequestStarted() {
        if (backgroundRequestsInFlight == 0) {
            document.body.classList.add("requests-in-flight");
        }
        backgroundRequestsInFlight++;
    }

    function backgroundRequestFinished() {
        backgroundRequestsInFlight--;
        if (backgroundRequestsInFlight == 0) {
            document.body.classList.remove("requests-in-flight");
        }
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


        backgroundRequestStarted: backgroundRequestStarted,
        backgroundRequestFinished: backgroundRequestFinished,
        registerShortcut: registerShortcut
    }
});
