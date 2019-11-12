import co.petrin.EvaluationRequest
import co.petrin.EvaluationResponse
import co.petrin.Evaluator
import spock.lang.Specification


class SandboxedEvaluatorSpec extends Specification {
    def NETWORK_TEST_SCRIPT = """
    var client = java.net.http.HttpClient.newHttpClient();
    var request = java.net.http.HttpRequest.newBuilder(java.net.URI.create("https://example.com")).build();
    client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString()).body();
    """

    def PROCESS_TEST_SCRIPT = """
    var process = new java.lang.ProcessBuilder("echo", "-n", "this works").start();
    var is = process.getInputStream();
    var isr = new java.io.InputStreamReader(is);
    var br = new java.io.BufferedReader(isr);
    br.readLine()
    """

    private static EvaluationResponse run(String script) {
        Evaluator.spawn(null, true).evaluate(null, new EvaluationRequest(script), null)
    }

    def "Sandboxed evaluator can evaluate basic code"() {
        expect:
        run("1").output == "1"
    }

    def "Sandboxed evaluator cannot make network calls"() {
        when:
        def result = run(NETWORK_TEST_SCRIPT)

        then:
        result.error.contains "java.security.AccessControlException: access denied"
    }

    def "Sandboxed evaluator cannot execute commands on the machine it's running on"() {
        when:
        def result = run(PROCESS_TEST_SCRIPT)

        then:
        result.error.contains "java.security.AccessControlException: access denied"
    }

    def "Sandboxed evaluator cannot access files on the machine it's running on"() {
        when:
        def result = run('new java.io.File("/").isDirectory()')

        then:
        result.error.contains "java.security.AccessControlException: access denied"
    }
}