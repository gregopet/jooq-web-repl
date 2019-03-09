import co.petrin.EvaluationRequest
import co.petrin.Evaluator
import spock.lang.*

class SpawnedEvaluatorSpec extends Specification {

    def "Simple expressions can be evaluated"() {
        given:
        def eval = Evaluator.spawn(null)

        when:
        def result = eval.evaluate(null, new EvaluationRequest("1 + 1", 0))

        then:
        !result.error
        result.output == "2"
    }

    def "Evaluation errors are reported correctly and do not crash the process"() {
        given:
        def eval = Evaluator.spawn(null)

        when:
        def result = eval.evaluate(null, new EvaluationRequest("var x = 1 / 0", 0))

        then:
        result.error
        result.output == "java.lang.ArithmeticException: / by zero"
    }

    def "Additional JARs can be provided to the evaluator"() {
        given: 'a command requiring an external JAR'
        def command = new EvaluationRequest('com.github.ricksbrown.cowsay.Cowsay.say(new String[] {"I\'m not indigenous"});', 0)
        def cowjar = getClass().classLoader.getResource("cowsay-1.0.3.jar").file

        expect: 'the JAR to be available to tests'
        new File(cowjar).exists()

        when: 'we dont provide the JAR to the evaluator'
        def cowlessEvaluator = Evaluator.spawn(null)

        then: 'evaluation will fail'
        cowlessEvaluator.evaluate(null, command).error

        when: 'we do provide the JAR to the evaluator'
        def cowfulEvaluator = Evaluator.spawn([cowjar])

        then: 'the command works'
        !cowfulEvaluator.evaluate(null, command).error
        cowfulEvaluator.evaluate(null, command).output.contains('indigenous')
    }

    def "Code inside spawned JARs does not have access to the same classpath as the spawning code"() {
        expect:
        Evaluator.spawn(null).evaluate(null, new EvaluationRequest("spock.lang.Specification.class", 0)).error
    }
}