// helper functions - also used by later scripts!
function htmlEncode( html ) {
    return document.createElement( 'a' ).appendChild(document.createTextNode( html ) ).parentNode.innerHTML;
};


const APP = (function() {

    const resultsPane = document.getElementById('results-pane');
    const resultsArea = document.querySelector("#results-pane pre");
    const resultsLoader = document.querySelector("#results-pane > .loader");
    const submitButton = document.querySelector('#submit-button');
    const completeButton = document.querySelector('#complete-button');
    const helpShowButton = document.querySelector('#command-area-show');
    const helpCloseButton = document.getElementById('command-area-close');
    const commandArea = document.querySelector('.command-area');

    var editor = null; // CodeMirror instance

    function init() {
        submitButton.addEventListener("click", eval);
        completeButton.addEventListener("click", () => editor.showHint());
        helpShowButton.addEventListener("click", showCommandArea);
        helpCloseButton.addEventListener("click", closeCommandArea);
        fetchDatabases();
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

    function fetchDatabases() {
        fetch("/databases")
        .then( resp => {
            return resp.json();
        })
        .then( databases => {
            const selector = document.querySelector("#database-select")
            for (var db in databases) {
                selector.options.add(new Option(databases[db], db));
                if (selector.value === "") {
                    selector.value = db;
                }
            }
        })
    }

    function appendSelectedDatabasePrefix(endpoint) {
        let database = document.querySelector("#database-select").value
        if (database) return "/databases/" + database + endpoint;
        else return "/databases" + endpoint;
    }

    function eval() {
        submitButton.disabled = true;

        showLoader();
        fetch(appendSelectedDatabasePrefix("/eval"), {
            method: 'POST',
            body: JSON.stringify(getSnippet())
        })
        .then( resp => {
            hideLoader();
            submitButton.disabled = false;
            return resp.json();
        })
        .then( result => {
            resultsArea.innerText = result.output;
            resultsArea.classList.toggle('completed-with-error', result.error)
        })
        .catch ( err => {
            resultsArea.innerText = "Network error submitting query to server!\n" + err;
            resultsArea.classList.add('completed-with-error')
        })
    }

    /**
     * Invoke suggestion mechanism. Returns the data CodeMirror needs to display suggestions.
     */
    function suggest() {
        return fetch(appendSelectedDatabasePrefix("/suggest"), {
            method: 'POST',
            body: JSON.stringify(getSnippet())
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
        appendSelectedDatabasePrefix: appendSelectedDatabasePrefix
    }
})();

document.addEventListener("DOMContentLoaded", function(event) {
    APP.init();
});
