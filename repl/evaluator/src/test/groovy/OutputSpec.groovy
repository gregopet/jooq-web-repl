import co.petrin.EvaluationRequest
import co.petrin.Evaluator
import spock.lang.Specification
import spock.lang.Subject


class OutputSpec extends Specification {

    @Subject Evaluator evaluator = Evaluator.local()

    def "Value of evaluated expression is turned into string and returned"() {
        when: 'expression is run standalone'
        def result = evaluator.evaluate(null, new EvaluationRequest(input, 0))

        then: 'output should be as expected'
        result.output == expectedOutput
        !result.error

        when: 'expression is assigned to a variable'
        result = evaluator.evaluate(null, new EvaluationRequest('var x = ' + input, 0))

        then: 'the output is still the same'
        result.output == expectedOutput
        !result.error

        when: 'expression is assigned to a variable and that variable is then evaled'
        result = evaluator.evaluate(null, new EvaluationRequest('var x = ' + input + '; x;', 0))

        then: 'the output is still the same'
        result.output == expectedOutput
        !result.error

        where:
        input                                 | expectedOutput
        '1'                                   | '1'
        '1 + 2'                               | '3'
        'true'                                | 'true'
        'true | false'                        | 'true'
        '"lol".substring(0)'                  | 'lol'
        'new java.io.File("yolo")'            | 'yolo'
        'new java.io.File("\\"yolo\\"")'      | '"yolo"'
        '"haha"'                              | 'haha'
        'new java.lang.StringBuilder("haha")' | 'haha'
        '"\\"haha\\""'                        | '"haha"'
        '"ha\\nha"'                           | 'ha\nha'
    }

    def "Only value of last expression is returned"() {
        expect:
        evaluator.evaluate(null, new EvaluationRequest("1 + 2; 3 + 4", 0)).output == "7"
    }

    def "Parsing exceptions are reported back with line & column information"() {
        when:
        def result = evaluator.evaluate(null, new EvaluationRequest(input, 0))

        then:
        result.output == expectedOutput
        result.error

        where:
        input          | expectedOutput
        '"asd'         | 'unclosed string literal (row 1, character 0)\nreached end of file while parsing (row 1, character 0)'
        '123;\n"asd'   | 'unclosed string literal (row 2, character 0)\nmissing return statement (row 2, character 0)'
    }

    def "Runtime exceptions are reported back with line & column information"() {
        when:
        def result = evaluator.evaluate(null, new EvaluationRequest(input, 0))

        then:
        result.output == expectedOutput
        result.error

        where:
        input               | expectedOutput
        '1 / 0'             | 'java.lang.ArithmeticException: / by zero'
    }

    def "Exceptions are reported with correct line & column information even when preceeded by imports"() {
        given: 'a script with leading imports'
        def script = """\
        import java.io.File;
        var x = 5;
        import java.util.Collection;
        "ab
        """.stripIndent()

        expect: 'error to be reported in the correct place'
        evaluator.evaluate(null, new EvaluationRequest(script, 0)).output == 'unclosed string literal (row 4, character 0)'
    }
}
