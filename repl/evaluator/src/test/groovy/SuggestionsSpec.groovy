import co.petrin.EvaluationRequest
import co.petrin.Evaluator
import spock.lang.Specification
import spock.lang.Subject


class SuggestionsSpec extends Specification {

    @Subject Evaluator evaluator = Evaluator.local()

    def "Methods are suggested"() {
        when:
        def suggestions = evaluator.suggest(null, new EvaluationRequest('"abc".su', 8))

        then: 'the current cursor position is reported back to the calling code'
        suggestions.cursor == 8

        and: 'the replacement anchor is returned so we know from where to replace text'
        suggestions.anchor == 6

        and: 'the suggestions are correct'
        suggestions.suggestions.find { it.continuation == "substring(" }
    }

    def "Imports are suggested"() {
        when:
        def suggestions = evaluator.suggest(null, new EvaluationRequest('import java.io.Fil', 18))

        then: 'the current cursor position is reported back to the calling code'
        suggestions.cursor == 18

        and: 'the replacement anchor is returned so we know from where to replace text'
        suggestions.anchor == 15

        and: 'the suggestions are correct'
        suggestions.suggestions.find { it.continuation == "File" }
    }

    def "Suggestions work even if there are imports in the script"() {
        given: 'a complicated script'
        def script = """
            import java.io.File;
            1 + 2 == 3
            import java.util.Collection;
            "abc".su"""

        when: 'asking for suggestions for that script'
        def suggestions = evaluator.suggest(null, new EvaluationRequest(script, script.length()))

        then: 'suggestions are given'
        suggestions.suggestions.find { it.continuation == "substring(" }
    }

}