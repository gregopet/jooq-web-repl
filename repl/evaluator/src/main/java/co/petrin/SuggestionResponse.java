package co.petrin;

import jdk.jshell.SourceCodeAnalysis;

import java.util.List;
import java.util.stream.Collectors;

/** A response to a code completion request */
public class SuggestionResponse {
    final private int cursor;
    final private int anchor;
    final private List<Suggestion> suggestions;


    /** A bean-type suggestion version so Jackson can deserialize it without extra code */
    public static class Suggestion {
        private String continuation;
        private boolean matchesType;

        public Suggestion(SourceCodeAnalysis.Suggestion suggestion) {
            this.continuation = suggestion.continuation();
            this.matchesType = suggestion.matchesType();
        }

        public String getContinuation() {
            return continuation;
        }

        public boolean isMatchesType() {
            return matchesType;
        }
    }

    public SuggestionResponse(int cursor, int anchor, List<SourceCodeAnalysis.Suggestion> suggestions) {
        this.cursor = cursor;
        this.anchor = anchor;
        this.suggestions = suggestions.stream().map(Suggestion::new).collect(Collectors.toList());
    }

    /** The cursor position from which the text should be replaced */
    public int getAnchor() {
        return anchor;
    }

    /** The suggestions that can be applied */
    public List<Suggestion> getSuggestions() {
        return suggestions;
    }

    /** The position of the cursor completion was invoked from */
    public int getCursor() {
        return cursor;
    }
}
