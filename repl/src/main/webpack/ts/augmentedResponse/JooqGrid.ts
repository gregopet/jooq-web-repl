const jooqGrid = (function() {

    function canAugment(data) {
        if (data.type && data.type == 'json/jooq-grid') {
            return true;
        } else {
            return false;
        }
    }

    function augment(data) {
        var json = JSON.parse(data.output);
        var table = document.createElement("table");
        table.classList.add("jooq-grid");

        table.appendChild(createHeader(json));
        table.appendChild(createBody(json));

        return table;
    }

    // header

    function createHeader(json) {
        var thead = document.createElement("thead");
        var tr = document.createElement("tr");
        thead.appendChild(tr);

        json.fields.map(createColumn).forEach((col) => tr.appendChild(col));

        return thead;
    }

    function createColumn(json) {
        var col = document.createElement("th");
        col.title = json.table + "." + json.name + " (" + json.type + ")";
        col.innerText = json.name;
        col.classList.add(json.type);
        return col;
    }

    // body

    function createBody(json) {
        var body = document.createElement("tbody");
        json.records.map( (rec) =>  createRow(json, rec)).forEach( (row) => body.appendChild(row));
        return body;
    }

    function createRow(json, row) {
        var tr = document.createElement("tr");
        for (let a = 0; a < json.fields.length; a++) {
            tr.appendChild(createCell(json.fields[a], row[a]));
        }
        return tr;
    }

    function createCell(field, content) {
        var td = document.createElement("td");
        td.classList.add(field.type);
        if (content === null) {
            td.classList.add("NULL");
            td.innerText = "null";
        } else {
            td.innerText = content;
            td.title = content;
        }
        return td;
    }

    return {
        canAugment: canAugment,
        augment: augment
    }
})();