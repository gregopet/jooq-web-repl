import Repl from '../Repl';

/**
 * Stores snippets in the local storage.
 * Each snippet has three properties: name, content and id (ID is randomly generated upon snippet insertion)
 */
export default class StorageDialog {
    private editor: Repl;
    private dialog: HTMLElement;
    private snippetNames: HTMLElement;
    private previewContent: HTMLElement;
    private snippetReplaceButton: HTMLButtonElement;
    private deleteButton: HTMLButtonElement;
    private renameButton: HTMLButtonElement;
    private addButton: HTMLButtonElement;

    

    constructor(editor: Repl) {
        document.addEventListener("keydown", ev => {
            if (ev.key == "Escape") {
                this.closeDialog();
            }
        });

        editor.registerShortcut({ ctrl: true, key: "S", hint: "Storage", action: () => this.toggleDialog() });

        this.dialog = document.getElementById("storage-dialog");
        this.snippetNames = document.getElementById("snippet-listing-names");
        this.previewContent = document.getElementById("snippet-preview-content");
        this.snippetReplaceButton = document.getElementById("snippet-replace") as HTMLButtonElement;
        this.deleteButton = document.getElementById("snippet-delete") as HTMLButtonElement;
        this.renameButton = document.getElementById("snippet-rename") as HTMLButtonElement;
        this.addButton = document.getElementById("snippet-add") as HTMLButtonElement;

        this.addButton.addEventListener("click", this.copyEditorToSnippet);
        this.deleteButton.addEventListener("click", this.deleteCurrentSnippet);
        this.renameButton.addEventListener("click", this.renameCurrentSnippet);
        this.snippetReplaceButton.addEventListener("click", this.sendSnippetToEditor);
    }

    private getSnippetsFromStorage() {
        let snippets = window.localStorage.getItem('repl-saved-snippets');
        if (!snippets) return [];
        return JSON.parse(snippets);
    }
    private setSnippetsInStorage(snippets) {
        window.localStorage.setItem('repl-saved-snippets', JSON.stringify(snippets));
    }

    private copyEditorToSnippet() {
        let snippetContent = this.editor.editor.getValue();

        let name = window.prompt("Enter a name for this snippet:");
        if (name) {
            let snippets = this.getSnippetsFromStorage();
            let snippet = {
                id: Math.floor(Math.random() * 100000000),
                name: name,
                content: snippetContent
            }
            snippets.push(snippet);
            this.setSnippetsInStorage(snippets);
            this.loadSnippets();
        }
    }

    private renameCurrentSnippet() {
        let active = this.snippetNames.querySelector('.active');
        if (active) {
            let index = active.attributes.getNamedItem("snippetId").value;
            let snippets = this.getSnippetsFromStorage();
            let theSnippet = snippets.find( sn => '' + sn.id == active.attributes.getNamedItem("snippetId").value )
            if (theSnippet) {
                let newName = window.prompt("Enter a new name for this snippet:", theSnippet.name);
                if (newName) {
                    theSnippet.name = newName;
                    this.setSnippetsInStorage(snippets);
                    this.loadSnippets();
                }
            }
        }
    }

    private deleteCurrentSnippet() {
        let active = this.snippetNames.querySelector('.active');
        if (active) {
            let index = active.attributes.getNamedItem("snippetId").value;
            let snippets = this.getSnippetsFromStorage().filter( sn => '' + sn.id != index);
            this.setSnippetsInStorage(snippets);
            this.loadSnippets();
        }
    }

    private loadSnippets() {
        this.snippetReplaceButton.disabled = true;
        while (this.snippetNames.firstChild) {
            this.snippetNames.removeChild(this.snippetNames.firstChild);
        }

        let snippets = this.getSnippetsFromStorage();
        this.previewContent.innerText = "";

        if (snippets.length == 0) {
            this.snippetNames.classList.add("empty");
        } else {
            this.snippetNames.classList.remove("empty");
            snippets.forEach( snippet => {
                var node = document.createElement("li");
                node.classList.add("list-group-item");
                node.innerText = snippet.name;
                node.addEventListener("click", () => {
                    this.snippetNames.childNodes.forEach( (node:HTMLElement) => node.classList.remove("active") );
                    node.classList.add("active");
                    this.previewContent.innerText = snippet.content;
                    this.snippetReplaceButton.disabled = false;
                });
                let attr = document.createAttribute("snippetId");
                attr.value = snippet.id;
                node.attributes.setNamedItem(attr);
                this.snippetNames.appendChild(node);
            })
        }
    }

    private sendSnippetToEditor() {
        let snippet = this.previewContent.innerText;
        this.editor.editor.setValue(snippet);
        this.closeDialog();
    }

    private toggleDialog() {
        if (this.dialog.style.display != "block") {
            this.loadSnippets();
            this.dialog.style.display = "block";
        } else {
            this.dialog.style.display = "none";
        }
    }

    private closeDialog() {
        this.dialog.style.display = "none";
    }
}