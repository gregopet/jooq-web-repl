package co.petrin.response;

import co.petrin.EvaluationResponse;

/**
 * JShell threw an error while evaluating the script.
 */
public class JShellError implements EvaluationResponse {

    public final Throwable error;

    public JShellError(Throwable error) {
        this.error = error;
    }

    @Override
    public Status getEvaluationStatus() {
        return Status.JSHELL_ERROR;
    }
}
