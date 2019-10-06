/**
 * A ResultsPane that is a simple <pre> element.
 *
 * @param preElement The <pre> element we want to display results in
 */
const PreResultsPane = function(preElement) {

    /**
     * Clears out the current contents of the result pane.
     */
    function clear() {
        preElement.innerText = '';
    }

    /**
     * Execution was performed on the server (successfully or not)
     * @param a deserialized EvaluationResponse sent by the server
     */
    function normally(result) {
        preElement.innerText = result.output;
        preElement.parentNode.classList.toggle('completed-with-error', result.error)
    }

   /**
    * The server did not respond in the expected format.
    * @param text The server's response as text
    * @param code The HTTP status code returned by the server
    */
   function serverError(text, code) {
        preElement.innerText = "Unexpected response " + code + ", server said: " + text;
        preElement.parentNode.classList.add('completed-with-error')
   }

   /**
    * Network code threw an error while submitting the evaluation request.
    * @param err The error that was thrown.
    */
   function networkError(err) {
        preElement.innerText = "Network error submitting query to server!\n" + err;
        preElement.parentNode.classList.add('completed-with-error')
   }


    return {
        clear: clear,
        normally: normally,
        serverError : serverError,
        networkError : networkError
    }

}