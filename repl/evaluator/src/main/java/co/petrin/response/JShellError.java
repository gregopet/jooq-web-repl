package co.petrin.response;

import co.petrin.EvaluationResponse;

/**
 * JShell threw an error while evaluating the script.
 */
public class JShellError implements Error {

    public final Throwable error;

    public JShellError(Throwable error) {
        this.error = error;
    }

    @Override
    public Status getEvaluationStatus() {
        return Status.JSHELL_ERROR;
    }

    @Override
    public String getError() {
        return error != null ? error.getMessage() : null;
    }
}
