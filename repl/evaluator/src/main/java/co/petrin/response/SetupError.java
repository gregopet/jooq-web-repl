package co.petrin.response;

import co.petrin.EvaluationResponse;

/**
 * An error occured setting up the evaluator.
 */
public class SetupError implements Error {

    public final String error;

    public SetupError(String error) {
        this.error = error;
    }

    @Override
    public Status getEvaluationStatus() {
        return Status.SETUP_ERROR;
    }

    @Override
    public String getError() {
        return error;
    }
}
