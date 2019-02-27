const APP = (function() {

    const splitter = document.querySelector("#splitter");
    const resultsPane = document.querySelector("#results-pane");
    const submitButton = document.querySelector('#submit-button');
    const completeButton = document.querySelector('#complete-button');
    const javadocButton = document.querySelector('#javadoc-button');
    const helpToggleButton = document.querySelector('#command-area-toggle');
    const commandArea = document.querySelector('.command-area');
    const javadocDialog = document.querySelector('#documentation-dialog');
    const javadocDialogSignature = document.querySelector('#documentation-dialog-signature');
    const javadocDialogDocumentation = document.querySelector('#documentation-dialog-documentation');

    // yay for global variables..
    let latestJavadocs = [];
    let currentJavadocIndex = 0;

    let editor = null; // CodeMirror instance

    function init() {
        submitButton.addEventListener("click", eval);
        completeButton.addEventListener("click", () => editor.showHint());
        javadocButton.addEventListener("click",  javadoc);
        helpToggleButton.addEventListener("click", toggleCommandArea);
        fetchDatabases();
        catchGlobalShortcuts();
        initCodemirror();
        initResizer();
    }

    function initResizer() {
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

    function catchGlobalShortcuts() {
        document.addEventListener("keydown", ev => {
            if (ev.ctrlKey && !ev.altKey && !ev.shiftKey && ev.key == "Enter") {
                eval();
            }
            if (ev.ctrlKey && !ev.altKey && !ev.shiftKey && (ev.key == "q" || ev.key == "Q")) {
                javadoc();
            }
            if (ev.key == "Escape") {
                closeJavadocs();
            }
            if (ev.key == "ArrowRight" && areJavadocsOpen()) {
                openJavadocs(1);
            }
            if (ev.key == "ArrowLeft" && areJavadocsOpen()) {
                openJavadocs(-1);
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
                selector.options.length = 0;
                selector.options.add(new Option(databases[db], db));
            }
        })
    }

    function getSelectedDatabase() {
        return document.querySelector("#database-select").value
    }

    function eval() {
        submitButton.disabled = true;

        showLoader(true);
        fetch("/databases/" + getSelectedDatabase() + "/eval", {
            method: 'POST',
            body: JSON.stringify(getSnippet())
        })
        .then( resp => {
            showLoader(false);
            submitButton.disabled = false;
            return resp.json();
        })
        .then( result => {
            resultsPane.innerText = result.output;
            resultsPane.classList.toggle('completed-with-error', result.error)
        })
        .catch ( err => {
            document.querySelector("#results-pane").innerText = "Network error submitting query to server!\n" + err;
            resultsPane.classList.add('completed-with-error')
        })
    }
    
    /** Fetches javadocs for the current code position and displays them, storing unopened ones on the DOM element */
    function javadoc() {
        return fetch("/databases/" + getSelectedDatabase() + "/javadoc", {
            method: 'POST',
            body: JSON.stringify(getSnippet())
        })
        .then( resp => resp.json() )
        .then(docs => {
            latestJavadocs = docs.map( (javadoc, idx) => {
                const positionString = docs.length == 0 ? "" : " " + (idx + 1) + "/" + docs.length
                return {
                    title : "<span>" + javadoc.signature + "</span><span>" + positionString + "</span>",
                    body : javadoc.documentation ? "<div>" + docs[idx].documentation + "</div>" : "<div>Detailed javadoc not available, possibly due to <a href='https://bugs.openjdk.java.net/browse/JDK-8186876'>JDK-8186876</a></div>"
                }
            })
            if (docs.length > 0) {
                openJavadocs();
            }
        })
    }

    /**
      * Opens the whole modal dialog.
      * @param offset If not given, open the dialog and display the first hint. If given, scroll the offset by
      *        specified amount.
      */
    function openJavadocs(offset) {
        javadocDialog.style.display = "block";
        if (offset === undefined) {
            currentJavadocIndex = 0;
        } else {
            currentJavadocIndex += offset;
            while (currentJavadocIndex < 0) currentJavadocIndex += latestJavadocs.length;
            while (currentJavadocIndex >= latestJavadocs.length) currentJavadocIndex -= latestJavadocs.length;
        }
        javadocDialogSignature.innerHTML = latestJavadocs[currentJavadocIndex].title;
        javadocDialogDocumentation.innerHTML = latestJavadocs[currentJavadocIndex].body;
        javadocDialogDocumentation.focus(); // allow keyboard scrolling
    }

    /** Closes the whole modal dialog */
    function closeJavadocs() {
        if (areJavadocsOpen) {
            javadocDialog.style.display = "none";
            editor.focus()
        }
    }
    /** Queries whether javadocs are currently open */
    function areJavadocsOpen() {
        return javadocDialog.style.display == "block";
    }

    /**
     * Invoke suggestion mechanism. Returns the data CodeMirror needs to display suggestions.
     */
    function suggest() {
        return fetch("/databases/" + getSelectedDatabase() + "/suggest", {
            method: 'POST',
            body: JSON.stringify(getSnippet())
        })
        .then( resp => resp.json() )
        .then(mapSuggestions )
        .catch ( err => { document.querySelector("#results-pane").innerText = "Network error submitting query to server!\n" + err});
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
    
    function showLoader(show) {
        if (show) {
            document.querySelector("#results-pane").innerHTML = "... EXECUTING ...";
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

    /** Turns the buttons & hints box on/off */
    function toggleCommandArea() {
        if (commandArea.style.display != 'none') {
            commandArea.style.display = "none";
        } else {
            commandArea.style.display = "block";
        }
    }
    
    return {
        init: init
    }
})();

document.addEventListener("DOMContentLoaded", function(event) {
    APP.init();
});
