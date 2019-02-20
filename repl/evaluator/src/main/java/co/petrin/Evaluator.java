package co.petrin;

import jdk.jshell.*;
import org.jooq.tools.StringUtils;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import org.apache.commons.text.StringEscapeUtils;

/**
 * A class that evaluates user submitted scripts with some pre-prepared variables, such as
 * a jOOQ connection.
 */
public class Evaluator {

    /**
     * Builds a new evaluator and evaluates the script.
     * @param db The database to run the script against
     * @param scriptToEvaluate The script to evaluate
     * @return The evaluation result
     */
    public String evaluate(Database db, String scriptToEvaluate) {
        try (var js = buildJShell()) {

            // imports - we shall make them configurable & browsable one day!
            js.eval("import org.jooq.impl.DSL;");
            js.eval("import static org.jooq.impl.DSL.*;");
            js.eval("import static sakila.Tables.*;");

            // jooq connection
            var connectionEvent = runSingleSnippet(js, String.format(
                "var jooq = DSL.using(%s, %s, %s);",
                javaString(db.connectionString),
                javaString(db.user),
                javaString(db.password)
            ));

            if (connectionEvent.status() != Snippet.Status.VALID) {
                return "Error creating a database object:\n" + formatParsingError(js, connectionEvent);
            }
            else if (connectionEvent.exception() != null) {
                return "An exception occured connecting to the database: " + connectionEvent.exception().getMessage();
            }

            var event = runSingleSnippet(js, scriptToEvaluate);
            switch (event.status()) {
                case VALID:
                    if (event.exception() != null) {
                        if (event.exception() instanceof EvalException) {
                            return ((EvalException) event.exception()).getExceptionClassName() + ": " + event.exception().getMessage();
                        } else {
                            return event.exception().getClass().getName() + ": " + event.exception().getMessage();
                        }
                    } else {
                        return validSnippetValue(js, event);
                    }
                case REJECTED:
                    return formatParsingError(js, event);
                default:
                    throw new IllegalStateException("This state was not programmed for, blame the programmer!");
            }
        }
    }

    /**
     * Create a human readable error description.
     * @param event The event that took place
     * @param diag The diagnostics objects.
     * @return A human readable representation of the error.
     */
    private static String getErrorMessage(SnippetEvent event, Diag diag) {
        String snippetText = event.snippet().source();
        int position = (int)diag.getPosition(); // long-sized snippet bodies? Nah...
        String textBeforeError = snippetText.substring(0, position);
        int newlinesBefore = newlinesInString(textBeforeError);
        int charactersAfterError = position - textBeforeError.length();
        return diag.getMessage(Locale.US) + " (row " + (newlinesBefore + 1) + ", character " + charactersAfterError + ")";
    }

    /**
     * Turn the diagnostics into a human-readable error message.
     * @param js The JShell instance.
     * @param event The event
     * @return The human readable error message.
     */
    private static String formatParsingError(JShell js, SnippetEvent event) {
        return js
            .diagnostics(event.snippet())
            .map( d -> getErrorMessage(event, d))
            .collect(Collectors.joining("\n"));
    }

    /**
     * Counts the number of newlines in the String, attempting to ignore the various silly ways systems tend to
     * encode them
     */
    private static int newlinesInString(String str) {
        char[] chars = str.toCharArray();
        int newlines = 0;
        for (int pos = 0; pos < chars.length; pos++) {
            if (isNewline(chars[pos])) {
                newlines++;
                if (pos + 1 < chars.length && isNewline(chars[pos + 1]) && chars[pos] != chars[pos+1]) {
                    // ignore double-newline systems
                    pos++;
                }
            }
        }
        return newlines;
    }

    private static boolean isNewline(char c) {
        return c == '\n' || c == '\r';
    }

    private static SnippetEvent runSingleSnippet(JShell js, String input) {
        List<SnippetEvent> events = js.eval(input);
        if (events.size() == 0) {
            return null;
        } else if (events.size() > 1) {
            throw new IllegalStateException("Silly programmer didn't know he could get more than 1 event!");
        }
        return events.get(0);
    }

    /** Determines what value to return back to the user to provide feedback */
    private static String validSnippetValue(JShell js, SnippetEvent userSnippet) {
        if (userSnippet.value() != null) {
            return userSnippet.value();
        }

        if (userSnippet.snippet() instanceof VarSnippet) {
            // user finished off by defining a variable; let's display that variable to them!
            var lastVar = js.variables().reduce((first, last) -> last).orElse(null);
            if (lastVar != null) {
                var output = runSingleSnippet(js, lastVar.name());
                if (output != null && output.value() != null) {
                    return output.value();
                }

            }
        }

        return StringUtils.defaultString(userSnippet.value(), "<no result>");
    }

    private static JShell buildJShell() {
        return JShell.builder()
        .executionEngine("local") //https://docs.oracle.com/javase/9/docs/api/jdk/jshell/spi/package-summary.html
        .out(System.out) // wrong, right?
        .build();
    }

    /** Escapes and quotes a Java string, unless it was null in which case a simple null is emitted */
    private static String javaString(String input) {
        if (input == null) {
            return "null";
        } else {
            return "\"" + StringEscapeUtils.escapeJava(input) + "\"";
        }
    }
}
