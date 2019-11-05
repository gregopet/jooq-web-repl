package co.petrin.augmentation;

import co.petrin.AugmentedOutput;
import co.petrin.Evaluator;
import jdk.jshell.JShell;
import jdk.jshell.SnippetEvent;
import jdk.jshell.VarSnippet;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.text.StringEscapeUtils;
import org.jooq.Result;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

/**
 * An output augmentation for jOOQ results, calls their formatJSON function.
 */
public class JooqGrid implements AugmentedOutput {

    private String output;

    @Override
    public String getType() {
        return "json/jooq-grid";
    }

    @Override
    public String getName() {
        return "Grid";
    }

    @Override
    public String getOutput() {
        return this.output;
    }

    private JooqGrid(String output) {
        this.output = output;
    }

    public static JooqGrid augment(JShell shell, SnippetEvent event, ByteArrayOutputStream outputStorage) {
        switch(event.snippet().kind()) {
            case VAR: return augmentVarSnippet(shell, (VarSnippet)event.snippet(), outputStorage);
        }
        return null;
    }

    private static JooqGrid augmentVarSnippet(JShell shell, VarSnippet snippet, ByteArrayOutputStream outputStorage) {
        if (snippet.typeName() != null && snippet.typeName().startsWith("org.jooq")) {
            // this can fail because of generics and classes only loaded into the evaluator!
            // Class outputClass = Class.forName(snippet.typeName());
            if (snippet.typeName().startsWith("org.jooq.Result")) {
                outputStorage.reset();
                var event = Evaluator.runSingleSnippet(shell, "System.out.println(" + snippet.name() + ".formatJSON());");
                var eventValue = new String(outputStorage.toByteArray(), StandardCharsets.UTF_8);
                return new JooqGrid(eventValue);
            }
        }
        return null;
    }
}
