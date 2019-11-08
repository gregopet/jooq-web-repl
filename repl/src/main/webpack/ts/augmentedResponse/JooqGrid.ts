export default class JooqGrid {
    canAugment(data: AugmentedOutput): boolean {
        return data.type == 'json/jooq-grid';
    }

    augment(data: AugmentedOutput): HTMLElement {
        var json = JSON.parse(data.output);
        var table = document.createElement("table");
        table.classList.add("jooq-grid");

        table.appendChild(this.createHeader(json));
        table.appendChild(this.createBody(json));

        return table;
    }

    // header

    private createHeader(json) {
        var thead = document.createElement("thead");
        var tr = document.createElement("tr");
        thead.appendChild(tr);

        json.fields.map(this.createColumn).forEach((col) => tr.appendChild(col));

        return thead;
    }

    private createColumn(json) {
        var col = document.createElement("th");
        col.title = json.table + "." + json.name + " (" + json.type + ")";
        col.innerText = json.name;
        col.classList.add(json.type);
        return col;
    }

    // body

    private createBody(json) {
        var body = document.createElement("tbody");
        json.records.map( (rec) => this.createRow(json, rec)).forEach( (row) => body.appendChild(row));
        return body;
    }

    private createRow(json, row) {
        var tr = document.createElement("tr");
        for (let a = 0; a < json.fields.length; a++) {
            tr.appendChild(this.createCell(json.fields[a], row[a]));
        }
        return tr;
    }

    private createCell(field, content) {
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
}