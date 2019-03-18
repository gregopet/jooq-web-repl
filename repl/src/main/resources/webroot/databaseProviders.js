/*
 * Database selectors are objects that can return the selected database via their method "selected()".
 */

/**
 * The constructor needs a select DOM element it will populate with the available databases and query the currently
 * selected value when 'selected()' is called.
 */
const DatabaseChooser = function(selectNode) {
    fetchDatabases();

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

    return function() {
        return selectNode.value
    }
};


/**
 * A database selector that will always return the value it was initialized with without bothering the user.
 */
const DatabaseFixedProvider = function(databaseId) {
    return function() {
        return databaseId;
    }
}