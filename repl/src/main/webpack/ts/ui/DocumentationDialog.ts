import Repl from '../Repl';

// helper functions - also used by later scripts!
function htmlEncode( html: string ): string {
    const fakeElement = document.createElement( 'a' );
    fakeElement.appendChild(document.createTextNode( html ))
    return fakeElement.innerHTML;
};

/**
 * Handles the logic of fetching Javadocs for selected class or method and displaying them in a Bootstrap dialog.
 */
export default class DocumentationDialog {
    private javadocDialog: HTMLElement;
    private javadocDialogSignature: HTMLElement;
    private javadocDialogDocumentation: HTMLElement;
    private latestJavadocs: any[] = [];
    private currentJavadocIndex = 0;
    private editor: Repl;

    constructor(editor: Repl) {
        this.editor = editor;
        editor.registerShortcut({ ctrl: true, key: 'Q', hint: 'Docs', action: () => this.javadoc()})
        this.catchGlobalShortcuts()

        this.javadocDialog = document.querySelector('#documentation-dialog');
        this.javadocDialogSignature = document.querySelector('#documentation-dialog-signature');
        this.javadocDialogDocumentation = document.querySelector('#documentation-dialog-documentation');
    }

    private catchGlobalShortcuts() {
        document.addEventListener("keydown", ev => {
            if (ev.key == "Escape") {
                this.closeJavadocs();
            }
            if (ev.key == "ArrowRight" && this.areJavadocsOpen()) {
                this.openJavadocs(1);
            }
            if (ev.key == "ArrowLeft" && this.areJavadocsOpen()) {
                this.openJavadocs(-1);
            }
        });
    }

    /** Fetches javadocs for the current code position and displays them, storing unopened ones on the DOM element */
    private javadoc() {
        this.editor.backgroundRequestStarted();
        return fetch(this.editor.appendSelectedDatabasePrefix("/javadoc"), {
            method: 'POST',
            body: JSON.stringify(this.editor.getSnippet()),
            headers: {
                "X-CSRF-TOKEN" : this.editor.getCSRFFromCookie()
            }
        })
        .then( resp => {
            this.editor.backgroundRequestFinished();
            return resp.json()
        })
        .then(docs => {
            this.latestJavadocs = docs.map( (javadoc, idx) => {
                const positionString = docs.length == 0 ? "" : " " + (idx + 1) + "/" + docs.length
                return {
                    title : "<span>" + htmlEncode(javadoc.signature) + "</span><span>" + positionString + "</span>",
                    body : javadoc.documentation ? "<div>" + docs[idx].documentation + "</div>" : "<div>Detailed javadoc not available, possibly due to <a href='https://bugs.openjdk.java.net/browse/JDK-8186876'>JDK-8186876</a></div>"
                }
            })
            if (docs.length > 0) {
                this.openJavadocs();
            }
        })
    }

    /**
      * Opens the whole modal dialog.
      * @param offset If not given, open the dialog and display the first hint. If given, scroll the offset by
      *        specified amount.
      */
    private openJavadocs(offset?: number) {
        this.javadocDialog.style.display = "block";
        if (offset === undefined) {
            this.currentJavadocIndex = 0;
        } else {
            this.currentJavadocIndex += offset;
            while (this.currentJavadocIndex < 0) this.currentJavadocIndex += this.latestJavadocs.length;
            while (this.currentJavadocIndex >= this.latestJavadocs.length) this.currentJavadocIndex -= this.latestJavadocs.length;
        }
        this.javadocDialogSignature.innerHTML = this.latestJavadocs[this.currentJavadocIndex].title;
        this.javadocDialogDocumentation.innerHTML = this.latestJavadocs[this.currentJavadocIndex].body;
        this.javadocDialogDocumentation.focus(); // allow keyboard scrolling
    }

    /** Closes the whole modal dialog */
    private closeJavadocs() {
        if (this.areJavadocsOpen) {
            this.javadocDialog.style.display = "none";
            this.editor.editor.focus()
        }
    }
    /** Queries whether javadocs are currently open */
    private areJavadocsOpen() {
        return this.javadocDialog.style.display == "block";
    }
}