import co.petrin.EvaluationRequest
import co.petrin.Evaluator
import spock.lang.Specification


class NativeEvaluatorSpec extends Specification {
    def "Simple expressions can be evaluated"() {
        given:
        def eval = Evaluator.local()

        when:
        def result = eval.evaluate(null, new EvaluationRequest("1 + 1", 0))

        then:
        !result.error
        result.output == "2"
    }

    def "Evaluation errors are reported correctly and do not crash the process"() {
        given:
        def eval = Evaluator.local()

        when:
        def result = eval.evaluate(null, new EvaluationRequest("var x = 1 / 0", 0))

        then:
        result.error
        result.output == "java.lang.ArithmeticException: / by zero"
    }

    def "Code inside local evaluators has access to the same classpath as the code that created the evaluator"() {
        expect:
        !Evaluator.local().evaluate(null, new EvaluationRequest("spock.lang.Specification.class", 0)).error
    }
}