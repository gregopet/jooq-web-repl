package co.petrin;

import jdk.jshell.*;
import jdk.jshell.Snippet.Status;

import java.util.List;

public class Evaluator {

    public String evaluate(Database db, String scriptToEvaluate) {

        //https://docs.oracle.com/javase/9/docs/api/jdk/jshell/package-summary.html
        try (var js = JShell.create()) {
            List<SnippetEvent> events = js.eval(scriptToEvaluate);
            if (events.size() == 0) {
                return "";
            }
            else if (events.size() > 1) {
                throw new IllegalStateException("Silly programmer didn't know he could get more than 1 event!");
            }

            var event = events.get(0);
            switch(event.status()) {
                case VALID:
                    return event.value();
                case REJECTED:
                    if (event.exception() != null) {
                        return event.exception().getMessage();
                    } else {
                        return event.snippet().toString();
                    }
                default:
                    throw new IllegalStateException("This state was not programmed for, blame the programmer!");
            }
        }
    }
    
}
