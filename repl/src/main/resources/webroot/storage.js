/**
 * Stores snippets in the local storage.
 * Each snippet has three properties: name, content and id (ID is randomly generated upon snippet insertion)
 */
const STORAGE = (function() {
    const dialog = document.getElementById("storage-dialog");
    const snippetNames = document.getElementById("snippet-listing-names");
    const previewContent = document.getElementById("snippet-preview-content");
    const snippetReplaceButton = document.getElementById("snippet-replace");
    const deleteButton = document.getElementById("snippet-delete");
    const renameButton = document.getElementById("snippet-rename");
    const addButton = document.getElementById("snippet-add");

    function init() {
        document.getElementById("storage-area-toggle").addEventListener("click", toggleDialog)
        document.addEventListener("keydown", ev => {
            if (ev.key == "Escape") {
                closeDialog();
            }
        });
        addButton.addEventListener("click", copyEditorToSnippet);
        deleteButton.addEventListener("click", deleteCurrentSnippet);
        renameButton.addEventListener("click", renameCurrentSnippet);
        snippetReplaceButton.addEventListener("click", sendSnippetToEditor);
    }

    function getSnippetsFromStorage() {
        let snippets = window.localStorage.getItem('repl-saved-snippets');
        if (!snippets) return [];
        return JSON.parse(snippets);
    }
    function setSnippetsInStorage(snippets) {
        window.localStorage.setItem('repl-saved-snippets', JSON.stringify(snippets));
    }

    function copyEditorToSnippet() {
        let snippetContent = APP.getEditor().getValue();

        let name = window.prompt("Enter a name for this snippet:");
        if (name) {
            let snippets = getSnippetsFromStorage();
            let snippet = {
                id: Math.floor(Math.random() * 100000000),
                name: name,
                content: snippetContent
            }
            snippets.push(snippet);
            setSnippetsInStorage(snippets);
            loadSnippets();
        }
    }

    function renameCurrentSnippet() {
        let active = snippetNames.querySelector('.active');
        if (active) {
            let index = active.attributes.snippetId;
            let snippets = getSnippetsFromStorage();
            let theSnippet = snippets.find( sn => '' + sn.id == active.attributes.snippetId )
            if (theSnippet) {
                let newName = window.prompt("Enter a new name for this snippet:", theSnippet.name);
                if (newName) {
                    theSnippet.name = newName;
                    setSnippetsInStorage(snippets);
                    loadSnippets();
                }
            }
        }
    }

    function deleteCurrentSnippet() {
        let active = snippetNames.querySelector('.active');
        if (active) {
            let index = active.attributes.snippetId;
            let snippets = getSnippetsFromStorage().filter( sn => '' + sn.id != index);
            setSnippetsInStorage(snippets);
            loadSnippets();
        }
    }

    function loadSnippets() {
        snippetReplaceButton.disabled = true;
        while (snippetNames.firstChild) {
            snippetNames.removeChild(snippetNames.firstChild);
        }

        let snippets = getSnippetsFromStorage();
        previewContent.innerText = "";

        if (snippets.length == 0) {
            snippetNames.classList.add("empty");
        } else {
            snippetNames.classList.remove("empty");
            snippets.forEach( snippet => {
                var node = document.createElement("li");
                node.classList.add("list-group-item");
                node.innerText = snippet.name;
                node.addEventListener("click", () => {
                    snippetNames.childNodes.forEach( node => node.classList.remove("active") );
                    node.classList.add("active");
                    previewContent.innerText = snippet.content;
                    snippetReplaceButton.disabled = false;
                });
                node.attributes.snippetId = snippet.id;
                snippetNames.appendChild(node);
            })
        }
    }

    function sendSnippetToEditor() {
        let snippet = previewContent.innerText;
        APP.getEditor().setValue(snippet);
        closeDialog();
    }

    function toggleDialog() {
        if (dialog.style.display != "block") {
            loadSnippets();
            dialog.style.display = "block";
        } else {
            dialog.style.display = "none";
        }
    }

    function closeDialog() {
        dialog.style.display = "none";
    }

    return {
        init: init
    }
})();

document.addEventListener("DOMContentLoaded", function(event) {
    STORAGE.init();
});