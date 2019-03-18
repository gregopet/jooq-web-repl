/**
 * Handles the logic of fetching Javadocs for selected class or method and displaying them in a Bootstrap dialog.
 */
const Javadoc = (function(editor) {

    const javadocDialog = document.querySelector('#documentation-dialog');
    const javadocDialogSignature = document.querySelector('#documentation-dialog-signature');
    const javadocDialogDocumentation = document.querySelector('#documentation-dialog-documentation');
    const javadocButton = document.querySelector('#javadoc-button');

    let latestJavadocs = [];
    let currentJavadocIndex = 0;

    init();

    function init() {
        javadocButton.addEventListener("click",  javadoc);
        catchGlobalShortcuts();
    }

    function catchGlobalShortcuts() {
        document.addEventListener("keydown", ev => {
            if (ev.key == "Escape") {
                closeJavadocs();
            }
            if (ev.ctrlKey && !ev.altKey && !ev.shiftKey && (ev.key == "q" || ev.key == "Q")) {
                javadoc();
            }
            if (ev.key == "ArrowRight" && areJavadocsOpen()) {
                openJavadocs(1);
            }
            if (ev.key == "ArrowLeft" && areJavadocsOpen()) {
                openJavadocs(-1);
            }
        });
    }

    /** Fetches javadocs for the current code position and displays them, storing unopened ones on the DOM element */
    function javadoc() {
        return fetch(editor.appendSelectedDatabasePrefix("/javadoc"), {
            method: 'POST',
            body: JSON.stringify(editor.getSnippet()),
            headers: {
                "X-CSRF-TOKEN" : editor.getCSRFFromCookie()
            }
        })
        .then( resp => resp.json() )
        .then(docs => {
            latestJavadocs = docs.map( (javadoc, idx) => {
                const positionString = docs.length == 0 ? "" : " " + (idx + 1) + "/" + docs.length
                return {
                    title : "<span>" + htmlEncode(javadoc.signature) + "</span><span>" + positionString + "</span>",
                    body : javadoc.documentation ? "<div>" + docs[idx].documentation + "</div>" : "<div>Detailed javadoc not available, possibly due to <a href='https://bugs.openjdk.java.net/browse/JDK-8186876'>JDK-8186876</a></div>"
                }
            })
            if (docs.length > 0) {
                openJavadocs();
            }
        })
    }

    /**
      * Opens the whole modal dialog.
      * @param offset If not given, open the dialog and display the first hint. If given, scroll the offset by
      *        specified amount.
      */
    function openJavadocs(offset) {
        javadocDialog.style.display = "block";
        if (offset === undefined) {
            currentJavadocIndex = 0;
        } else {
            currentJavadocIndex += offset;
            while (currentJavadocIndex < 0) currentJavadocIndex += latestJavadocs.length;
            while (currentJavadocIndex >= latestJavadocs.length) currentJavadocIndex -= latestJavadocs.length;
        }
        javadocDialogSignature.innerHTML = latestJavadocs[currentJavadocIndex].title;
        javadocDialogDocumentation.innerHTML = latestJavadocs[currentJavadocIndex].body;
        javadocDialogDocumentation.focus(); // allow keyboard scrolling
    }

    /** Closes the whole modal dialog */
    function closeJavadocs() {
        if (areJavadocsOpen) {
            javadocDialog.style.display = "none";
            editor.getEditor().focus()
        }
    }
    /** Queries whether javadocs are currently open */
    function areJavadocsOpen() {
        return javadocDialog.style.display == "block";
    }
});