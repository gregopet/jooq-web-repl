package co.petrin;

/**
 * All the information required to send a script to the evaluator.
 */
public class EvaluationRequest {
    private String script;

    /** The script to execute */
    public String getScript() {
        return script;
    }

    public void setScript(String script) {
        this.script = script;
    }
}
