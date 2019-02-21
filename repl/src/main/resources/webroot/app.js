const APP = (function() {

    const submitButton = document.querySelector('#submit-button');

    function init() {
        submitButton.addEventListener("click", eval);
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
            body: JSON.stringify({ script: document.querySelector('#script-content').value })
        })
        .then( resp => {
            showLoader(false);
            submitButton.disabled = false;

        })
        .then( result => {
            document.querySelector("#results-pane").innerText = result.output
        });
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
