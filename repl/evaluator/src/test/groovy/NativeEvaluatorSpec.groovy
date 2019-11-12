import co.petrin.EvaluationRequest
import co.petrin.EvaluationResponse
import co.petrin.Evaluator
import co.petrin.response.Success
import spock.lang.Specification
import spock.lang.Timeout


class NativeEvaluatorSpec extends Specification {
    def "Simple expressions can be evaluated"() {
        given:
        def eval = Evaluator.local()

        when:
        def result = eval.evaluate(null, new EvaluationRequest("1 + 1"), null)

        then:
        result.evaluationStatus == EvaluationResponse.Status.SUCCESS
        result.output == "2"
    }

    def "Evaluation errors are reported correctly and do not crash the process"() {
        given:
        def eval = Evaluator.local()

        when:
        def result = eval.evaluate(null, new EvaluationRequest("var x = 1 / 0"), null)

        then:
        result.evaluationStatus == EvaluationResponse.Status.EVALUATION_ERROR
        result.output == "java.lang.ArithmeticException: / by zero"
    }

    def "Code inside local evaluators has access to the same classpath as the code that created the evaluator"() {
        expect:
        Evaluator.local().evaluate(null, new EvaluationRequest("spock.lang.Specification.class"), null).evaluationStatus == EvaluationResponse.Status.SUCCESS
    }

    def "Local evaluator captures standard & error outputs"() {
        given:
        def result = (Success)Evaluator.local().evaluate(null, new EvaluationRequest("""
            System.out.print("a box");
            System.err.print("a tree");
        """), null)

        expect: 'neither standard output nor standard error to be captured'
        result.errorOutput == "a tree"
        result.output == "a box"
    }

    @Timeout(10)
    def "Evaluation can be stopped"() {
        given: 'an evaluator that will get closed after 5 seconds'
        def eval = Evaluator.local()
        Thread.start {
            Thread.sleep(5000)
            eval.stop()
        }

        when: 'running an infite loop in the evaluator'
        eval.evaluate(null, new EvaluationRequest("while(true) { java.lang.Thread.sleep(1000); }"), null)

        then: 'evaluation is interrupted'
        true

        and: 'calling stop again does not break anything'
        eval.stop()
    }
}