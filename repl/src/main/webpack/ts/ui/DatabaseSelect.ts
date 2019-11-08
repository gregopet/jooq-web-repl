/**
 * Populate a select node with the available databases,
 * @param selectNode 
 */
export function DatabaseChooser(selectNode: HTMLSelectElement): () => string {
    fetchDatabases();

    function fetchDatabases() {
        fetch("/databases")
        .then( resp => {
            return resp.json();
        })
        .then( databases => {
            for (var db in databases) {
                selectNode.options.add(new Option(databases[db], db));
                if (selectNode.value === "") {
                    selectNode.value = db;
                }
            }
        })
    }

    return function() {
        return selectNode.value
    }
};