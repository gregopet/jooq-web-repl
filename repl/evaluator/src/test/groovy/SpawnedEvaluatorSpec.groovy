import co.petrin.EvaluationRequest
import co.petrin.EvaluationResponse
import co.petrin.Evaluator
import co.petrin.response.Success
import spock.lang.*

class SpawnedEvaluatorSpec extends Specification {

    def "Simple expressions can be evaluated"() {
        given:
        def eval = Evaluator.spawn(null, false)

        when:
        def result = eval.evaluate(null, new EvaluationRequest("1 + 1"), null)

        then:
        result.evaluationStatus == EvaluationResponse.Status.SUCCESS
        result.output == "2"
    }

    def "Evaluation errors are reported correctly and do not crash the process"() {
        given:
        def eval = Evaluator.spawn(null, false)

        when:
        def result = eval.evaluate(null, new EvaluationRequest("var x = 1 / 0"), null)

        then:
        result.evaluationStatus == EvaluationResponse.Status.EVALUATION_ERROR
        result.output == "java.lang.ArithmeticException: / by zero"
    }

    def "Additional JARs can be provided to the evaluator"() {
        given: 'a command requiring an external JAR'
        def command = new EvaluationRequest('com.github.ricksbrown.cowsay.Cowsay.say(new String[] {"I\'m not indigenous"});')
        def cowjar = getClass().classLoader.getResource("cowsay-1.0.3.jar").file

        expect: 'the JAR to be available to tests'
        new File(cowjar).exists()

        when: 'we dont provide the JAR to the evaluator'
        def cowlessEvaluator = Evaluator.spawn(null, false)

        then: 'evaluation will fail'
        cowlessEvaluator.evaluate(null, command, null).error

        when: 'we do provide the JAR to the evaluator'
        def cowfulEvaluator = Evaluator.spawn([cowjar], false)

        then: 'the command works'
        cowfulEvaluator.evaluate(null, command, null).evaluationStatus == EvaluationResponse.Status.SUCCESS
        cowfulEvaluator.evaluate(null, command, null).output.contains('indigenous')
    }

    def "Code inside spawned evaluators does not have access to the same classpath as the code that created the evaluator"() {
        expect:
        Evaluator.spawn(null, false).evaluate(null, new EvaluationRequest("spock.lang.Specification.class"), null).evaluationStatus == EvaluationResponse.Status.EVALUATION_ERROR
    }

    def "Spawned evaluator captures standard & error outputs"() {
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
        def eval = Evaluator.spawn(null, false)
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