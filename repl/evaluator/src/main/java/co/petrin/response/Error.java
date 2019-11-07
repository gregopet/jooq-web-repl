package co.petrin.response;

import co.petrin.EvaluationResponse;

public interface Error extends EvaluationResponse {
    String getError();
}
