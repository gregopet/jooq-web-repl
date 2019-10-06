/**
 * A ResultsPane that is a simple <pre> element.
 *
 * @param preElement The <pre> element we want to display results in
 * @param tabBar An element into which alternate result representations will be pushed.
 */
const PreResultsPane = function(preElement, tabBar) {

    /** The various alternate representations of the results */
    const alternateRepresentations = [];

    /**
     * Clears out the current contents of the result pane.
     */
    function clear() {
        preElement.innerText = '';
        if (tabBar) {
            tabBar.innerHTML = "";
        }
        showResult(preElement);
        alternateRepresentations.splice(0).forEach( (el) => {
            preElement.parentNode.removeChild(el);
        });
    }

    /**
     * Execution was performed on the server (successfully or not)
     * @param a deserialized EvaluationResponse sent by the server
     */
    function normally(result) {
        clear();
        preElement.innerText = result.output;
        preElement.parentNode.classList.toggle('completed-with-error', result.error)
    }

    /**
     * Adds an alternate result representation as a tab.
     * @param name The name of this tab
     * @param responseDOM The DOM model for this response.
     */
    function normalAlternateResponse(name, responseDOM) {
        if (tabBar) {
            alternateRepresentations.push(responseDOM);
            responseDOM.classList.add("result-representation");
            if (tabBar.childNodes.length == 0) {
                insertTab("Output", preElement, true);
            }
            insertTab(name, responseDOM);
            hideResult(responseDOM);
            preElement.parentNode.appendChild(responseDOM);
        }
    }

   /**
    * The server did not respond in the expected format.
    * @param text The server's response as text
    * @param code The HTTP status code returned by the server
    */
   function serverError(text, code) {
        clear();
        preElement.innerText = "Unexpected response " + code + ", server said: " + text;
        preElement.parentNode.classList.add('completed-with-error')
   }

   /**
    * Network code threw an error while submitting the evaluation request.
    * @param err The error that was thrown.
    */
   function networkError(err) {
        clear();
        preElement.innerText = "Network error submitting query to server!\n" + err;
        preElement.parentNode.classList.add('completed-with-error')
   }

   // tab handling private functions

   function insertTab(name, content, active) {
       const button = document.createElement("div");
       button.innerText = name;
       button.addEventListener("click", () => {
           deactivateTabButtons();
           button.classList.add('active');
           hideAllResults();
           showResult(content);
       });
       if (active) {
           button.classList.add('active');
       }
       tabBar.appendChild(button);
   }
   function deactivateTabButtons() {
       if (tabBar) {
           tabBar.childNodes.forEach( (n) => {
               n.classList.remove('active');
           });
       }
   }

   function showResult(el) {
       el.style.display = 'block';
   }
   function hideResult(el) {
       el.style.display = 'none';
   }
   function hideAllResults() {
       hideResult(preElement);
       alternateRepresentations.forEach( (el) => hideResult(el));
   }


    return {
        clear: clear,
        normally: normally,
        normalAlternateResponse: normalAlternateResponse,
        serverError : serverError,
        networkError : networkError
    }

}