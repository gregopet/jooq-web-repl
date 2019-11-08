package co.petrin.response;

import co.petrin.EvaluationResponse;

/**
 * Script evaluation resulted in an error.
 */
public class EvaluationError implements Error {
    public final String output;
    public final long durationInMs;

    public EvaluationError(String output, long durationInMs) {
        this.output = output;
        this.durationInMs = durationInMs;
    }

    @Override
    public Status getEvaluationStatus() {
        return Status.EVALUATION_ERROR;
    }

    @Override
    public String getError() {
        return output;
    }
}
