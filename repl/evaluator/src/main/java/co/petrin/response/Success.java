package co.petrin.response;

import co.petrin.AugmentedOutput;
import co.petrin.EvaluationResponse;

import java.util.function.Supplier;

/**
 * Response of a successful evaluation.
 */
public class Success implements EvaluationResponse {
    public final String output;
    public final String errorOutput;
    public final long durationInMs;

    public final Supplier<AugmentedOutput> augmentedOutput;

    public Success(String output, String errorOutput, long durationInMs, Supplier<AugmentedOutput> augmentedOutputs) {
        this.output = output;
        this.errorOutput = errorOutput;
        this.durationInMs = durationInMs;
        this.augmentedOutput = augmentedOutputs;
    }

    @Override
    public Status getEvaluationStatus() {
        return Status.SUCCESS;
    }
}
