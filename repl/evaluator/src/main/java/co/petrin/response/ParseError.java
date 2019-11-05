package co.petrin.response;

import co.petrin.EvaluationResponse;

/**
 * An error occured parsing the script.
 */
public class ParseError implements EvaluationResponse {
    public final String error;

    public ParseError(String error) {
        this.error = error;
    }

    @Override
    public Status getEvaluationStatus() {
        return Status.PARSE_ERROR;
    }
}
