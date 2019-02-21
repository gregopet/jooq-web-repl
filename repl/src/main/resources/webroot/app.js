const APP = (function() {

    const scriptContent = document.querySelector('#script-content');
    const submitButton = document.querySelector('#submit-button');
    const completeButton = document.querySelector('#complete-button');

    function init() {
        submitButton.addEventListener("click", eval);
        completeButton.addEventListener("click", complete);
        fetchDatabases();
        catchGlobalShortcuts();
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
    * Constructs a payload that can be sent to the server for evaluation, representing the current state of the snippet.
    */
    function getSnippet() {
        return {
            script: scriptContent.value,
            cursorPosition:  scriptContent.selectionEnd
        }
    }

    function showLoader(show) {
        if (show) {
            document.querySelector("#results-pane").innerHTML = "... EXECUTING ...";
        }
    }
    
    return {
        init: init
    }
})();

document.addEventListener("DOMContentLoaded", function(event) {
    APP.init();
});
