package co.petrin;

import jdk.jshell.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.apache.commons.text.StringEscapeUtils;
import static co.petrin.EvaluationResponse.*;
import static java.util.stream.Collectors.toList;

/**
 * A class that evaluates user submitted scripts with some pre-prepared variables, such as
 * a jOOQ connection.
 *
 * Evaluator instances are not thread safe.
 */
public class Evaluator {

    private static final String NO_OUTPUT_TEXT = "The execution finished without results.";

    /**
     * The mode for creating the execution engine, see
     * https://docs.oracle.com/javase/9/docs/api/jdk/jshell/spi/package-summary.html
     */
    private final String mode;

    /**
     * The extra classpath entries to provide remote evaluation engines with.
     */
    private final List<String> extraClasspath;

    /**
     * The currently active shell. Usage of this variable makes the class non thread safe.
     */
    private JShell activeShell;

    /**
     * Creates an evaluator that runs in the same process as the calling code. This makes it possible to access
     * shared variables and share the same classpath.
     */
    public static Evaluator local() {
        return new Evaluator("local", null);
    }

    /**
     * Spawns an extra process to run the evaluation in, closing the process after evaluation finishes.
     *
     * Alternate classpaths can be provided to these processes. They are isolated from the launching process which
     * helps protect them against malicious scripts.
     *
     * External evaluators are potentially also easier to kill, should they block, as the whole process can be
     * terminated.
     *
     * @param extraClasspath Directories containing classes and JAR files to add to the spawned process' classpath.
     */
    public static Evaluator spawn(List<String> extraClasspath) {
        // Copied from JShell class
        String spec = "jdi:launch(true)";

        return new Evaluator(spec, extraClasspath);
    }

    private Evaluator(String mode, List<String> extraClasspath) {
        this.mode = mode;
        this.extraClasspath = extraClasspath;
    }

    /**
     * Builds a new evaluator and evaluates the script.
     * @param db The database to run the script against
     * @param request The script to evaluateUnnamed
     * @return The evaluation result
     */
    public EvaluationResponse evaluate(Database db, EvaluationRequest request) {
        var outputStorage = new ByteArrayOutputStream();
        var errorStorage = new ByteArrayOutputStream();
        try (
            var ps = new PrintStream(outputStorage, true, StandardCharsets.UTF_8);
            var eps = new PrintStream(errorStorage, true, StandardCharsets.UTF_8)
        ) {
            activeShell = buildJShell(ps, eps);

            addImports(activeShell, db);

            // jooq connection
            if (db != null) {
                var connectionEvent = runSingleSnippet(activeShell, String.format(
                        "var jooq = org.jooq.impl.DSL.using(%s, %s, %s);",
                        javaString(db.connectionString),
                        javaString(db.user),
                        javaString(db.password)
                ));

                if (connectionEvent.status() != Snippet.Status.VALID) {
                    return setupError("Error creating a database object:\n" + formatParsingError(0, activeShell, connectionEvent));
                } else if (connectionEvent.exception() != null) {
                    return setupError("An exception occurred connecting to the database: " +  printEvalException(connectionEvent));
                }
            }

            long startTime = System.currentTimeMillis();

            int humanNewlinesProcessed = 0;
            SourceCodeAnalysis.CompletionInfo completionInfo = null;

            while (completionInfo == null || !isProcessingComplete(completionInfo)) {
                final SnippetEvent event;
                try {
                    String toEvaluate = completionInfo == null ? request.getScript() : completionInfo.remaining();
                    completionInfo = activeShell.sourceCodeAnalysis().analyzeCompletion(toEvaluate);
                    event = runSingleSnippet(activeShell, completionInfo.source());
                } catch (Throwable t) {
                    return jshellError(t);
                }

                if (event != null) {
                    switch (event.status()) {
                        case VALID:
                            if (event.exception() != null) {
                                return error(printEvalException(event), startTime);
                            } else {
                                if (isProcessingComplete(completionInfo)) {
                                    return success(createOutput(activeShell, event, outputStorage), new String(errorStorage.toByteArray(), StandardCharsets.UTF_8), startTime);
                                } else {
                                    humanNewlinesProcessed += newlinesInString(completionInfo.source());
                                    break;
                                }
                            }
                        case REJECTED:
                            return parseError(formatParsingError(humanNewlinesProcessed, activeShell, event));
                        default:
                            throw new IllegalStateException("This state was not programmed for, blame the programmer!");
                    }
                }
            }

            // If we didn't return anything by the time we got here, just return this..
            return success(createOutput(activeShell, null, outputStorage), new String(errorStorage.toByteArray()), startTime);
        } finally {
          if (activeShell != null) {
              activeShell.close();
              activeShell = null;
          }
        }
    }

    private static boolean isProcessingComplete(SourceCodeAnalysis.CompletionInfo completionInfo) {
        return completionInfo.remaining() == null || completionInfo.remaining().isBlank();
    }

    /**
     * Returns code completion suggestions.
     * @param request The script we wanted completion for.
     */
    public SuggestionResponse suggest(Database db, EvaluationRequest request) {
        if (request.getCursorPosition() == null) {
            throw new IllegalArgumentException("Cursor position required to trigger completion!");
        }

        try {
            activeShell = buildJShell(null, null);
            addImports(activeShell, db);
            if (db != null) {
                runSingleSnippet(activeShell, String.format(
                    "var jooq = org.jooq.impl.DSL.using(%s, %s, %s);",
                    javaString(db.connectionString),
                    javaString(db.user),
                    javaString(db.password)
                ));
            }
            int[] anchor = new int[1];
            var amendedRequest = trimEvaluationRequest(activeShell, request);
            var anchorOffset = request.getCursorPosition() - amendedRequest.getCursorPosition();
            var suggestions = activeShell.sourceCodeAnalysis().completionSuggestions(amendedRequest.getScript(), amendedRequest.getCursorPosition(), anchor);
            return new SuggestionResponse(request.getCursorPosition(), anchor[0] + anchorOffset, suggestions);
        } finally {
            if (activeShell != null) {
                activeShell.close();
                activeShell = null;
            }
        }
    }


    /**
     * Returns javadoc for the selected code.
     * @param request The script we want javadocs for.
     */
    public List<DocumentationResponse> javadoc(Database db, EvaluationRequest request) {
        if (request.getCursorPosition() == null) {
            throw new IllegalArgumentException("Cursor position required to trigger completion!");
        }
        try {
            activeShell = buildJShell(null, null);
            addImports(activeShell, db);
            if (db != null) {
                runSingleSnippet(activeShell, String.format(
                        "var jooq = org.jooq.impl.DSL.using(%s, %s, %s);",
                        javaString(db.connectionString),
                        javaString(db.user),
                        javaString(db.password)
                ));
            }
            var amendedRequest = trimEvaluationRequest(activeShell, request);
            var javadocs = activeShell.sourceCodeAnalysis().documentation(amendedRequest.getScript(), amendedRequest.getCursorPosition(), true);
            if (javadocs.isEmpty()) {
                // try to get the documentation for the class the expression had resolved to
                var resolvedClass = activeShell.sourceCodeAnalysis().analyzeType(amendedRequest.getScript(), amendedRequest.getCursorPosition());
                if (resolvedClass != null && !resolvedClass.isBlank()) {
                    javadocs = activeShell.sourceCodeAnalysis().documentation(resolvedClass, resolvedClass.length(), true);
                }
            }

            return javadocs.stream().map(DocumentationResponse::new).collect(toList());
        } finally {
            if (activeShell != null) {
                activeShell.close();
                activeShell = null;
            }
        }
    }

    /**
     * Tries to stop the currently active calculation. Whether stopping will succeed depends on the code being run
     * and the underlying evaluator.
     */
    public void stop() {
        JShell js = activeShell;
        if (js != null) {
            js.stop();
        }
    }

    /**
     * Prepares the output to return to the caller after an evaluation is done.
     * @param js The JShell instance in which the script was being evaluated
     * @param finalEvent The last processed event or null if there were no events
     * @param executionOutput The captured output streams
     * @return The compiled output
     */
    private String createOutput(JShell js, SnippetEvent finalEvent, ByteArrayOutputStream executionOutput) {
        var output = StringUtils.defaultIfBlank(executionOutput.toString(StandardCharsets.UTF_8), "");
        var eventValue = StringUtils.defaultIfBlank(finalEvent == null ? null : finalEvent.value(), "");

        // unquote plain strings - we are much more interested in plain results than in knowing the last variable
        // was _exactly_ a String (esp. since this doesn't even trigger for any other CharSequence).
        if (eventValue.startsWith("\"") && eventValue.endsWith("\"") && eventValue.length() > 1 && finalEvent.snippet() != null) {
            String lastType = null;
            if (finalEvent.snippet().kind() == Snippet.Kind.VAR) {
                lastType = ((VarSnippet)finalEvent.snippet()).typeName();
            }
            if (finalEvent.snippet().kind() == Snippet.Kind.EXPRESSION) {
                lastType = ((ExpressionSnippet)finalEvent.snippet()).typeName();
            }

            if ("String".equals(lastType)) {
                eventValue = StringEscapeUtils.unescapeJava(eventValue.substring(1, eventValue.length() - 1));
            }
        }

        return StringUtils.defaultIfBlank(output + eventValue, NO_OUTPUT_TEXT);
    }


    /**
     * Create a human readable error description.
     * @param newlinesAlreadyProcessed Number of newlines processed in previous snippets
     * @param event The event that took place
     * @param diag The diagnostics objects.
     * @return A human readable representation of the error.
     */
    private static String getErrorMessage(int newlinesAlreadyProcessed, SnippetEvent event, Diag diag) {
        String snippetText = event.snippet().source();
        int position = (int)diag.getPosition(); // long-sized snippet bodies? Nah...
        String textBeforeError = snippetText.substring(0, position);
        int newlinesBefore = newlinesInString(textBeforeError);
        int charactersAfterError = position - textBeforeError.length();
        return diag.getMessage(Locale.US) + " (row " + (newlinesAlreadyProcessed + newlinesBefore + 1) + ", character " + charactersAfterError + ")";
    }

    /**
     * Turn the diagnostics into a human-readable error message.
     * @param newlinesAlreadyProcessed Number of newlines processed in previous snippets
     * @param js The JShell instance.
     * @param event The event
     * @return The human readable error message.
     */
    private static String formatParsingError(int newlinesAlreadyProcessed, JShell js, SnippetEvent event) {
        return js
            .diagnostics(event.snippet())
            .map( d -> getErrorMessage(newlinesAlreadyProcessed, event, d))
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
        } else {
            var originalEvents = events.stream().filter(ev -> ev.causeSnippet() == null).collect(toList());
            if (originalEvents.size() > 1) {
                throw new IllegalStateException("Silly programmer didn't know he could get more than 1 original event!");
            }
        }
        return events.get(0);
    }

    private JShell buildJShell(PrintStream outputStream, PrintStream errorStream) {
        var builder = JShell.builder()
        .executionEngine(mode);

        if (outputStream != null) {
            builder.out(outputStream);
        }
        if (errorStream != null) {
            builder.err(errorStream);
        }

        var shell = builder.build();
        if (extraClasspath != null) {
            for (String cp : extraClasspath) {
                shell.addToClasspath(cp);
                if (Files.isDirectory(Path.of(cp))) {
                    try {
                        // Note: this code does not currently handle JAR files in subdirectories!
                        Files
                            .list(Path.of(cp))
                            .map(Object::toString)
                            .filter(p -> p.endsWith(".jar"))
                            .forEach(shell::addToClasspath);
                    } catch (IOException ex) {
                        // proper log? can we expect this? it's probably not very likely..?
                        System.out.println("An exception occured scanning the classpath: " + ExceptionUtils.getMessage(ex));
                    }
                }
            }
        }
        return shell;
    }

    /**
     * Tries to get a good error description from a snippet event containing an error.
     */
    private static String printEvalException(SnippetEvent ev) {
        if (ev.exception() == null) throw new IllegalArgumentException("Snippet contained no error!");
        var ex = ev.exception().getCause() != null ? ev.exception().getCause() : ev.exception();

        if (ex instanceof EvalException) {
            return ((EvalException) ex).getExceptionClassName() + ": " + ex.getMessage();
        } else {
            return ex.getClass().getName() + ": " + ex.getMessage();
        }
    }

    /**
     * Add the imports required for the code to run.
     * @param js The JShell instance.
     */
    private static void addImports(JShell js, Database db) {
        if (db == null) {
            return;
        }
        if (StringUtils.isBlank(db.scriptPrefix)) {
            js.eval("import org.jooq.impl.DSL;");
            js.eval("import static org.jooq.impl.DSL.*;");
        } else {
            var toEval = js.sourceCodeAnalysis().analyzeCompletion(db.scriptPrefix);
            while(toEval.source() != null && !toEval.source().isBlank()) {
                js.eval(toEval.source());
                toEval = js.sourceCodeAnalysis().analyzeCompletion(toEval.remaining());
            }
        }
    }

    /** Escapes and quotes a Java string, unless it was null in which case a simple null is emitted */
    private static String javaString(String input) {
        if (input == null) {
            return "null";
        } else {
            return "\"" + StringEscapeUtils.escapeJava(input) + "\"";
        }
    }

    /**
     * Trims an evaluation request by running any import snippets before the current cursor position, thus making
     * suggestions and javadocs work even if there are imports all over the place in the code.
     * Returns the amended request or returns null if an exception had occured.
     */
    private static EvaluationRequest trimEvaluationRequest(JShell js, EvaluationRequest req) {
        int sizeOfEvaluated = 0;
        StringBuilder unevaluated = new StringBuilder();


        var completionAnalysis = js.sourceCodeAnalysis().analyzeCompletion(req.getScript());
        while(completionAnalysis.source() != null && !completionAnalysis.source().isEmpty()) {
            if (completionAnalysis.source().length() + unevaluated.length() + sizeOfEvaluated >= req.getCursorPosition()) {
                unevaluated.append(completionAnalysis.source());
                return new EvaluationRequest(unevaluated.toString(), req.getCursorPosition() - sizeOfEvaluated);
            }
            else if (completionAnalysis.source().trim().startsWith("import")) {
                js.eval(completionAnalysis.source());
                sizeOfEvaluated += completionAnalysis.source().length();
            }
            else {
               unevaluated.append(completionAnalysis.source());
            }
            completionAnalysis = js.sourceCodeAnalysis().analyzeCompletion(completionAnalysis.remaining());
        }

        if (completionAnalysis.remaining() != null) {
            unevaluated.append(completionAnalysis.remaining());
            return new EvaluationRequest(unevaluated.toString(), req.getCursorPosition() - sizeOfEvaluated);
        } else {
            return req;
        }
    }
}
