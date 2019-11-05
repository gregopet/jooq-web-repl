import CommandWindow from "./ui/CommandPanel";
import * as debounce from "debounce-promise";
import * as ndjsonStream from "can-ndjson-stream";
import * as CodeMirror from 'codemirror';

export interface REPLOptions {
    /** 
     * A textarea on which to initialize CodeMirror 
     */
    textArea: HTMLTextAreaElement;
    
    /** 
     * This is where our results will be displayed 
     */
    resultsPane: any;

    /** 
     * A function we can call to get the currently selected database (or null if no DB is selected) 
     */
    databaseProvider: (() => string | null);

    /** 
     * The button to run the evaluation, if there is an external one. When not given, the editor will try
     * to create its own submit button using "registerShortcut". 
     */
    submitButton?: HTMLButtonElement;

    /** A cheatsheet for REPL commands */
    commandCheatSheet: CommandWindow;

    /** A function to invoke when a command is run, to e.g. display a waiting indicator */
    onCommandExecutionStarted?: () => any;

    /** A function to invoke when a command run has finished; will be called with the result object */
    onCommandExecutionFinished?: (result) => any;

    /** 
     * if given, keyboard shortcuts will be listened to at this element. Otherwise, they will be registered
     * on document 
     */
    keyboardShortcutRoot?: HTMLElement;

    /**
     * An array of result augmentations (formatters that can display a nicer view of a result, e.g. grids).
     */
    augmentors?: any;
}

export default class Repl {

    private config: REPLOptions;
    private submitButton: HTMLElement;
    private executionInProgress = false;
    editor: CodeMirror.EditorFromTextArea;
    
    /** Track how many requests are going on in the background to provide some kind of waiting indicator */
    private backgroundRequestsInFlight = 0;


    constructor(options: REPLOptions) {
        if (!options || !options.textArea) throw "No textArea provided for REPL initialization!";
        if (!options.resultsPane) throw "No results pane for REPL initialization!";
        if (!options.augmentors) options.augmentors = [];

        this.config = options;

        this.submitButton = this.registerShortcut({
            ctrl: true, 
            key: 'Enter', 
            hint: 'Submit', 
            action: () => { this.eval() }, 
            triggerOnNode: options.submitButton 
        });

        this.editor = this.initCodemirror();
    }
    

    /**
     * Registers a shortcut, inserting a hint into the cheatsheet if one was provided.
     * The parameter is an object with the following parameters:
     *   - key (required): the key that will be matched to event.key properties
     *   - alt: if true, the shortcut will require ALT to be pressed
     *   - ctrl: if true, the shortcut will require CTRL to be pressed
     *   - shift: if true, the shortcut will require SHIFT to be pressed
     *   - hint: The name of this shortcut to display as a hint. If not given, command will not be registered in the
     *     cheat sheet.
     *   - action: a function to perform when this shortcut is invoked
     *   - triggerOnNode: if a node is given, triggering the event will be bound to it
     *     instead of creating a new button.
     *
     * Returns the created button or null if no button was created.
     */
    registerShortcut(key): HTMLElement {
        // TODO: which DOM element to register the key on?
        const lcaseKey = key.key.toLowerCase();
        const ucaseKey = key.key.toUpperCase();

        const eventsRoot = this.config.keyboardShortcutRoot || document;

        eventsRoot.addEventListener("keydown", (ev:KeyboardEvent) => {
            if (ev.ctrlKey == !!key.ctrl && ev.altKey == !!key.alt && ev.shiftKey == !!key.shift) {
                if (ev.key == key.key || ev.key == lcaseKey || ev.key == ucaseKey) {
                    if (ev.preventDefault) ev.preventDefault();
                    key.action();
                }
            }
        });
        if (key.triggerOnNode) {
            key.triggerOnNode.addEventListener("click", key.action);
            return key.triggerOnNode;
        } else if (this.config.commandCheatSheet) {
            return this.config.commandCheatSheet.addShortcut(key.ctrl, key.alt, key.shift, key.key, key.hint, key.action);
        }
    }

    appendSelectedDatabasePrefix(endpoint) {
        let database = this.config.databaseProvider != null ? this.config.databaseProvider() : null;
        if (database) return "/databases/" + database + endpoint;
        else return "/databases" + endpoint;
    }

    private eval() {
        if (this.executionInProgress) {
            console.log("A previous execution is still in progress, aborting");
            return;
        } else {
            this.executionInProgress = true;
        }
        if (this.submitButton) (this.submitButton as HTMLButtonElement).disabled = true;
        this.config.resultsPane.clear();
        this.backgroundRequestStarted();

        if (this.config.onCommandExecutionStarted) this.config.onCommandExecutionStarted();
        fetch(this.appendSelectedDatabasePrefix("/eval"), {
            method: 'POST',
            body: JSON.stringify(this.getSnippet()),
            headers: {
                "X-CSRF-TOKEN" : this.getCSRFFromCookie()
            }
        })
        .then( resp => {
            this.backgroundRequestFinished();
            if (this.config.onCommandExecutionFinished) this.config.onCommandExecutionFinished(resp);
            if (this.submitButton) (this.submitButton as HTMLButtonElement).disabled = false;
            const contentType = resp.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                let firstResultRead = false;

                const processMainResult = (result) => {
                    this.config.resultsPane.normally(result);
                    if (result.errorOutput) {
                        // TODO: refactor the error creation into a class?
                        const log = document.createElement("pre");
                        log.innerHTML = result.errorOutput;
                        this.config.resultsPane.normalAlternateResponse("Log", log);
                    }
                };

                const readFromReader = (reader) => {
                    reader.read().then( (readResult) => {
                        if (!readResult.done) {
                            if (!firstResultRead) {
                                firstResultRead = true;
                                processMainResult(readResult.value);
                            } else {
                                this.config.augmentors.forEach( (augmentor) => {
                                    if (augmentor.canAugment(readResult.value)) {
                                        this.config.resultsPane.normalAlternateResponse(readResult.value.name, augmentor.augment(readResult.value));
                                    }
                                });
                            }
                            readFromReader(reader);
                        }
                    });
                }
                readFromReader(ndjsonStream(resp.body).getReader());
            } else {
                return resp.text().then( result => this.config.resultsPane.serverError(result, resp.status));
            }
        })
        .catch ( err => this.config.resultsPane.networkError(err))
        .finally( () => this.executionInProgress = false);
    }

    /**
     * Invoke suggestion mechanism. Returns the data CodeMirror needs to display suggestions.
     */
    suggest = () => {
        // TODO possible optimization: narrow list locally if new input is more precise version of last one
        this.backgroundRequestStarted();
        return fetch(this.appendSelectedDatabasePrefix("/suggest"), {
            method: 'POST',
            body: JSON.stringify(this.getSnippet()),
            headers: {
                "X-CSRF-TOKEN" : this.getCSRFFromCookie()
            }
        })
        .then( resp => {
            this.backgroundRequestFinished();
            return resp.json();
        })
        .then( (x) => this.mapSuggestions(x))
        .catch ( err => { this.config.resultsPane.networkError("Network error submitting query to server!\n" + err)});
    }

    /** Maps the returned suggestions to a format our editor can understand */
    private mapSuggestions(result) {
        // Remove duplicates and display non-matching suggestions last (suggestions come pre-sorted alphabetically)
        let lastAdded = undefined;
        let matchType = [];
        let dontMatchType = [];
        result.suggestions.forEach( sugg => {
            if (sugg.continuation !== lastAdded) {
                lastAdded = sugg.continuation

                if (sugg.matchesType) {
                    matchType.push({ text: sugg.continuation });
                } else {
                    dontMatchType.push({ text: sugg.continuation, className: 'matches-type-false' });
                }
            }
        });

        return {
                from: this.editor.posFromIndex(result.anchor),
                to: this.editor.posFromIndex(result.cursor),
                list: matchType.concat(dontMatchType)
        }
    }

    /**
    * Constructs a payload that can be sent to the server for evaluation, representing the current state of the snippet.
    */
   getSnippet() {
        return {
            script: this.editor.getValue(),
            cursorPosition:  this.editor.indexFromPos(this.editor.getCursor())
        }
    }

    private initCodemirror(): CodeMirror.EditorFromTextArea {
        let hintOptions = {
            hint: debounce(this.suggest, 500, { leading: true }),
            completeSingle: false
        }
        let cmEditor = CodeMirror.fromTextArea(this.config.textArea, {
            lineNumbers: true,
            mode: { name: "clike" },
            extraKeys: {"Ctrl-Space": "autocomplete"},
            hintOptions: hintOptions,
        });

        if (this.config.commandCheatSheet) {
            this.config.commandCheatSheet.addShortcut(true, false, false, "Space", "Completion", () => { cmEditor.showHint(hintOptions) })
        }

        // let layouting do its magic and then redraw the editor to avoid weird issues like an ultra-thin editor
        window.setTimeout(() => cmEditor.refresh(), 300);

        return cmEditor;
    }

    /** Reads the document cookies and retrieves the CSRF token, if present; otherwise, an empty string is returned */
    getCSRFFromCookie() {
        var match = document.cookie.match(new RegExp('(^| )' + 'X-CSRF' + '=([^;]+)'));
        if (match) return match[2]; else return "";
    }

    backgroundRequestStarted() {
        if (this.backgroundRequestsInFlight == 0) {
            document.body.classList.add("requests-in-flight");
        }
        this.backgroundRequestsInFlight++;
    }

    backgroundRequestFinished() {
        this.backgroundRequestsInFlight--;
        if (this.backgroundRequestsInFlight == 0) {
            document.body.classList.remove("requests-in-flight");
        }
    }
};