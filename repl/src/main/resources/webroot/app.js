const APP = (function() {

    function init() {
        document.querySelector('#submit-button').addEventListener("click", eval);
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
        fetch("/databases/" + getSelectedDatabase() + "/eval", {
            method: 'POST',
            body: document.querySelector('#script-content').value
        })
        .then( resp => {
            return resp.text();
        })
        .then( txt => {
            document.querySelector("#results-pane").innerHTML = txt
        });
    }
    
    return {
        init: init
    }
})();

document.addEventListener("DOMContentLoaded", function(event) {
    APP.init();
});
