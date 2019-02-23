const APP = (function() {

    const submitButton = document.querySelector('#submit-button');
    const completeButton = document.querySelector('#complete-button');
	let editor = null; // CodeMirror instance

    function init() {
        submitButton.addEventListener("click", eval);
        completeButton.addEventListener("click", suggest);
        fetchDatabases();
        catchGlobalShortcuts();
		initCodemirror();
    }

    function catchGlobalShortcuts() {
        document.addEventListener("keydown", ev => {
            if (ev.ctrlKey && !ev.altKey && !ev.shiftKey && ev.key == "Enter") {
                eval();
            }
            if (ev.ctrlKey && !ev.altKey && !ev.shiftKey && ev.key == " ") {
                suggest();
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
        .then( result => document.querySelector("#results-pane").innerText = result.output)
        .catch ( err => document.querySelector("#results-pane").innerText = "Network error submitting query to server!\n" + err);
    }
    
    /**
     * Invoke suggestion mechanism.
     */
    function suggest() {
        fetch("/databases/" + getSelectedDatabase() + "/suggest", {
            method: 'POST',
            body: JSON.stringify(getSnippet())
        })
        .then( resp => {
            return resp.json();
        })
        .then( result => console.log(result))
        .catch ( err => document.querySelector("#results-pane").innerText = "Network error submitting query to server!\n" + err);
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
			mode: "clike"
		});
    }
    
    return {
        init: init
    }
})();

document.addEventListener("DOMContentLoaded", function(event) {
    APP.init();
});
