/**
 * A ResultsPane that is a simple <pre> element.
  */
export default class ResultPanel {

    /** The panel's parent */
    private parent: HTMLElement;
    private preElement: HTMLPreElement;
    private tabBar: HTMLDivElement | undefined;
    
    /** The various (currently displayed) alternate representations of the results */
    private alternateRepresentations = [];

    /**
     * @param preElement The <pre> element we want to display results in
     * @param tabBar An element into which alternate result representations will be pushed.
     */
    constructor(preElement: HTMLPreElement, tabBar: HTMLDivElement | undefined) {
        this.preElement = preElement;
        this.tabBar = tabBar;
        this.parent = preElement.parentNode as HTMLElement;
    }

    
    /**
     * Clears out the current contents of the result pane.
     */
    clear() {
        this.preElement.innerText = '';
        if (this.tabBar) {
            this.tabBar.innerHTML = "";
        }
        this.showResult(this.preElement);
        this.alternateRepresentations.splice(0).forEach( (el) => {
            this.preElement.parentNode.removeChild(el);
        });
    }

    /**
     * Execution was performed on the server (successfully or not)
     * @param result The result of the evaluation
     * @param errorOccured If true, then the evaluation threw an uncaught exception
     */
    normally(result: Success | EvaluationError, errorOccured: boolean) {
        this.clear();
        this.preElement.innerText = result.output;
        this.parent.classList.toggle('completed-with-error', errorOccured)
    }

    /**
     * Adds an alternate result representation as a tab.
     * @param name The name of this tab
     * @param responseDOM The result representation.
     */
    normalAlternateResponse(name: string, responseDOM: HTMLElement) {
        if (this.tabBar) {
            this.alternateRepresentations.push(responseDOM);
            responseDOM.classList.add("result-representation");
            if (this.tabBar.childNodes.length == 0) {
                this.insertTab("Output", this.preElement, true);
            }
            this.insertTab(name, responseDOM);
            this.hideResult(responseDOM);
            this.preElement.parentNode.appendChild(responseDOM);
        }
    }

   /**
    * The server did not respond in the expected format.
    * @param text The server's response as text
    * @param code The HTTP status code returned by the server
    */
   serverError(text: string, code: number) {
        this.clear();
        this.preElement.innerText = "Unexpected response " + code + ", server said: " + text;
        this.parent.classList.add('completed-with-error')
   }

   /**
    * Network code threw an error while submitting the evaluation request.
    * @param err The error that was thrown.
    */
   networkError(err) {
        this.clear();
        this.preElement.innerText = "Network error submitting query to server!\n" + err;
        this.parent.classList.add('completed-with-error')
   }

   private insertTab(name: string, content: HTMLElement, active = false) {
       const button = document.createElement("div");
       button.innerText = name;
       button.addEventListener("click", () => {
            this.deactivateTabButtons();
            button.classList.add('active');
            this.hideAllResults();
            this.showResult(content);
       });
       if (active) {
           button.classList.add('active');
       }
       this.tabBar.appendChild(button);
   }
   
   private deactivateTabButtons() {
        if (this.tabBar) {
            this.tabBar.childNodes.forEach( (n:HTMLElement) => {
                n.classList.remove('active');
            });
        }
   }

   private showResult(el:HTMLElement) {
       el.style.display = 'block';
   }
   private hideResult(el:HTMLElement) {
       el.style.display = 'none';
   }
   private hideAllResults() {
        this.hideResult(this.preElement);
        this.alternateRepresentations.forEach( (el) => this.hideResult(el));
   }
}