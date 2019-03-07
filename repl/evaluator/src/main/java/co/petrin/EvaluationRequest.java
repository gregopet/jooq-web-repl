package co.petrin;

/**
 * All the information required to send a script to the evaluator.
 */
public class EvaluationRequest {
    private String script;
    private Integer cursorPosition;

    /** The script to execute */
    public String getScript() {
        return script;
    }

    public void setScript(String script) {
        this.script = script;
    }

    /** Gets where the cursor was when user invoked the action */
    public Integer getCursorPosition() {
        return cursorPosition;
    }

    public void setCursorPosition(Integer cursorPosition) {
        this.cursorPosition = cursorPosition;
    }

    public EvaluationRequest(String script, Integer cursorPosition) {
        this.script = script;
        this.cursorPosition = cursorPosition;
    }

    public EvaluationRequest() {
    }
}
