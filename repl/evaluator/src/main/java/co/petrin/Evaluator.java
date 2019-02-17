package co.petrin;

import jdk.jshell.*;
import jdk.jshell.Snippet.Status;
import org.jooq.tools.StringUtils;

import java.util.List;
import java.util.Locale;

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
            switch (event.status()) {
                case VALID:
                    return StringUtils.defaultString(event.value(), "");
                case REJECTED:
                    if (event.exception() != null) {
                        return event.exception().getMessage();
                    } else {
                        return js.diagnostics(event.snippet())
                            .map( d -> getErrorMessage(event, d))
                            .collect(Collectors.joining("\n"));
                    }
                default:
                    throw new IllegalStateException("This state was not programmed for, blame the programmer!");
            }
        }
    private static String getErrorMessage(SnippetEvent event, Diag diag) {
        String snippetText = event.snippet().source();
        int position = (int)diag.getPosition(); // long-sizes snippets? Nah...
        String textBeforeError = snippetText.substring(0, position);
        int newlinesBefore = newlinesInString(textBeforeError);
        int charactersAfterError = position - textBeforeError.length();
        return diag.getMessage(Locale.US) + " (row " + (newlinesBefore + 1) + ", character " + charactersAfterError + ")";

    }

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
}
