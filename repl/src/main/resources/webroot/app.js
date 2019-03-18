// helper functions - also used by later scripts!
function htmlEncode( html ) {
    return document.createElement( 'a' ).appendChild(document.createTextNode( html ) ).parentNode.innerHTML;
};

/**
 * Constructs an instance of the REPL editor. The constructor can be called with an initialization object to set up
 * the editor. It accepts the following properties:
 *   - databaseProvider: a function we can call without parameters to get a database index. If not provided, scripts
 *     will always be run without a database
 */
const APP = (function(config) {
    config = config || {}

    const resultsPane = document.getElementById('results-pane');
    const resultsArea = document.querySelector("#results-pane pre");
    const resultsLoader = document.querySelector("#results-pane > .loader");
    const submitButton = document.querySelector('#submit-button');
    const completeButton = document.querySelector('#complete-button');
    const helpShowButton = document.querySelector('#command-area-show');
    const helpCloseButton = document.getElementById('command-area-close');
    const commandArea = document.querySelector('.command-area');

    var editor = null; // CodeMirror instance
    init();

    function init() {
        submitButton.addEventListener("click", eval);
        completeButton.addEventListener("click", () => editor.showHint());
        helpShowButton.addEventListener("click", showCommandArea);
        helpCloseButton.addEventListener("click", closeCommandArea);
        catchGlobalShortcuts();
        initCodemirror();
    }

    function catchGlobalShortcuts() {
        document.addEventListener("keydown", ev => {
            if (ev.ctrlKey && !ev.altKey && !ev.shiftKey && ev.key == "Enter") {
                eval();
            }
        })
    }

    function appendSelectedDatabasePrefix(endpoint) {
        let database = config.databaseProvider != null ? config.databaseProvider() : null;
        if (database) return "/databases/" + database + endpoint;
        else return "/databases" + endpoint;
    }

    function eval() {
        submitButton.disabled = true;

        showLoader();
        fetch(appendSelectedDatabasePrefix("/eval"), {
            method: 'POST',
            body: JSON.stringify(getSnippet()),
            headers: {
                "X-CSRF-TOKEN" : getCSRFFromCookie()
            }
        })
        .then( resp => {
            hideLoader();
            submitButton.disabled = false;
            const contentType = resp.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return resp.json().then( result => {
                    resultsArea.innerText = result.output;
                    resultsArea.parentNode.classList.toggle('completed-with-error', result.error)
                })
            } else {
                return resp.text().then( result => {
                    resultsArea.innerText = "Unexpected response, server said: " + result;
                    resultsArea.parentNode.classList.add('completed-with-error')
                })
            }
        })
        .catch ( err => {
            resultsArea.innerText = "Network error submitting query to server!\n" + err;
            resultsArea.parentNode.classList.add('completed-with-error')
        })
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
        editor = CodeMirror.fromTextArea(document.querySelector('#script-content'), {
            lineNumbers: true,
            mode: { name: "clike" },
            extraKeys: {"Ctrl-Space": "autocomplete"},
            hintOptions: {
                hint: suggest,
                completeSingle: false
            }
        });

        // let layouting do its magic and then redraw the editor to avoid weird issues like an ultra-thin editor
        window.setTimeout(() => editor.refresh(), 300);
    }


    function showCommandArea() {
        commandArea.style.display = "block";
        helpShowButton.style.display = "none"
    }
    function closeCommandArea() {
        commandArea.style.display = "none";
        helpShowButton.style.display = "block"
    }

    /**
     * Replaces the results screen with a loader.
     * The loader overlays the results areas so we don't need to hide those.
     */
    function showLoader() {
        resultsLoader.style.display = "block";
    }

    /**
     * Shows the results pane again instead of the loader.
     */
    function hideLoader() {
        resultsLoader.style.display = "none";
    }

    /** Reads the document cookies and retrieves the CSRF token, if present; otherwise, an empty string is returned */
    function getCSRFFromCookie() {
        var match = document.cookie.match(new RegExp('(^| )' + 'X-CSRF' + '=([^;]+)'));
        if (match) return match[2]; else return "";
    }

    return {
        /** The CodeMirror editor instance */
        getEditor: () => editor,

        /** The initialization function called on DOM load */
        init: init,

        /** The main container for evaluation results */
        resultsPane: resultsPane,

        /** Gets the current contents and cursor position from the editor */
        getSnippet: getSnippet,

        /** Gets the index of the current database from the selector */
        appendSelectedDatabasePrefix: appendSelectedDatabasePrefix,

        /** Reads the document cookies and retrieves the CSRF token, if present; otherwise, an empty string is returned */
        getCSRFFromCookie: getCSRFFromCookie
    }
});

document.addEventListener("DOMContentLoaded", function(event) {
    const editor = APP({
        databaseProvider: DatabaseChooser(document.querySelector("#database-select"))
    });
    Storage(editor);
});
