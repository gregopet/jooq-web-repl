package co.petrin;


import org.apache.commons.lang3.exception.ExceptionUtils;

/**
 * The result of an evaluation.
 */
public class EvaluationResponse {

    private String output;
    private String errorOutput;
    private boolean isError;
    private Integer durationInMs;

    private EvaluationResponse(String output, String errorOut, boolean isError, Integer durationInMs) {
        this.output = output;
        this.errorOutput = errorOut;
        this.isError = isError;
        this.durationInMs = durationInMs;
    }

    public static EvaluationResponse setupError(String error) {
        return new EvaluationResponse(error, null,true, null);
    }

    public static EvaluationResponse jshellError(Throwable t) {
        return new EvaluationResponse("Script evaluator failed!\n" + ExceptionUtils.getMessage(t) + " " + ExceptionUtils.getStackTrace(t), null, true, null);
    }

    public static EvaluationResponse parseError(String error) { return new EvaluationResponse(error, null, true, null); }

    public static EvaluationResponse success(String output, String errorOutput, long startedAtMillis) {
        int durationInMs = (int)(System.currentTimeMillis() - startedAtMillis);
        return new EvaluationResponse(output, errorOutput, false, durationInMs);
    }

    public static EvaluationResponse error(String output, long startedAtMillis) {
        int durationInMs = (int)(System.currentTimeMillis() - startedAtMillis);
        return new EvaluationResponse(output, null, true, durationInMs);
    }

    // getters & setters.. sigh why exactly didn't I use Kotlin ?!?

    /**
     * The result of the evaluation as String.
     */
    public String getOutput() {
        return output;
    }

    public void setOutput(String output) {
        this.output = output;
    }

    /**
     * Things printed into the error output during evaluation.
     */
    public String getErrorOutput() {
        return errorOutput;
    }

    public void setErrorOutput(String errorOutput) {
        this.errorOutput = errorOutput;
    }

    /**
     * Did an error occur during processing?
     */
    public boolean isError() {
        return isError;
    }

    public void setError(boolean error) {
        isError = error;
    }

    /**
     * How long did the execution last? This is an approximate number, no effort is given to providing a truly
     * exact measurement of the execution itself.
     */
    public Integer getDurationInMs() {
        return durationInMs;
    }

    public void setDurationInMs(int durationInMs) {
        this.durationInMs = durationInMs;
    }
}
