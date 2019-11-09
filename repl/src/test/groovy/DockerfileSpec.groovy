import co.petrin.EvaluationRequest
import io.vertx.core.Vertx
import io.vertx.ext.web.client.WebClient
import io.vertx.ext.web.client.WebClientOptions
import org.testcontainers.containers.GenericContainer
import org.testcontainers.images.builder.ImageFromDockerfile
import spock.lang.Specification
import spock.util.concurrent.AsyncConditions

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

/**
 * Test that the generated Docker image functions as documented.
 */
class DockerfileSpec extends Specification {

    Path getProjectDir() {
        Paths.get(System.getProperty("projectDir"))
    }

    ImageFromDockerfile getBasicImage() {
        def image = new ImageFromDockerfile()
            .withFileFromPath("Dockerfile", projectDir.resolve("Dockerfile"))
            .withFileFromPath("gradle", projectDir.resolve("gradle"))
            .withFileFromPath("gradlew", projectDir.resolve("gradlew"))
            .withFileFromPath("extra-libs", projectDir.resolve("extra-libs"))
            .withFileFromPath("extra-source-files", projectDir.resolve("extra-source-files"))
            .withFileFromPath("src", projectDir.resolve("src"))
            .withFileFromPath("evaluator", projectDir.resolve("evaluator"))
            .withFileFromPath("build.gradle", projectDir.resolve("build.gradle"))
            .withFileFromPath("typescript.gradle", projectDir.resolve("typescript.gradle"))
            .withFileFromPath("settings.gradle", projectDir.resolve("settings.gradle"))
            .withFileFromPath("gradle.properties", projectDir.resolve("gradle.properties"))
            .withFileFromPath("build_and_run_as_guest.sh", projectDir.resolve("build_and_run_as_guest.sh"))
        return image
    }

    GenericContainer fromImage(ImageFromDockerfile image) {
        new GenericContainer(basicImage).withExposedPorts(8080).withLogConsumer({
            println it.utf8String
        })
    }

    WebClient getHttpClient(GenericContainer container) {
        WebClient.create(Vertx.vertx(), new WebClientOptions().setSsl(false).setDefaultPort(container.firstMappedPort).setDefaultHost(container.containerIpAddress))
    }

    AsyncConditions checkScriptOutput(String script, GenericContainer container, Closure evalBlock) {
        def async = new AsyncConditions(1)
        getHttpClient(container).post("/databases/eval").sendJson(new EvaluationRequest(script)) { r ->
            async.evaluate { evalBlock(r.result()?.bodyAsJsonObject()?.getString("output"), r) }
        }
        return async
    }

    def "Assert test setup works"() {
        expect:
        Files.exists(projectDir)
    }

    def "Dockerfile can be run and commands evaluated"() {
        given: 'a vanilla docker image'
        def container = fromImage(basicImage)
        container.start()

        when: 'executing a basic script'
        def async = checkScriptOutput("1", container) { txt, response ->
            assert txt == "1"
        }

        then: 'the script is executed without errors'
        async.await(10.0)

        cleanup:
        container?.close()
    }

    def "Extra source files can be provided to the container"() {
        given: 'a container'
        def container = fromImage(basicImage)

        and: "a source code file"
        def tempSourceFile = Files.createTempFile("testSource", ".java")
        tempSourceFile.write("""
        package com.example;
        public class StaticFoobar {
            public static String foo() { return "foobar"; }
        }
        """)

        and: 'the source code file is mappedinto the correct location of the container'
        container.withFileSystemBind(tempSourceFile.toAbsolutePath().toString(), "/usr/src/webapp/extra-source-files/com/example/StaticFoobar.java")


        when: 'trying to execute a script using this extra file'
        container.start()
        def async = checkScriptOutput("com.example.StaticFoobar.foo()", container) { txt, response ->
            assert txt == "foobar"
        }

        then: 'the extra source file is available'
        async.await(10.0)

        cleanup:
        container?.close()
        Files.delete(tempSourceFile)
    }

    def "Extra JAR files can be provided to the container"() {
        given: 'a container'
        def container = fromImage(basicImage)

        and: 'a jar file is mounted into it'
        container.withFileSystemBind(projectDir.resolve("evaluator/src/test/resources/cowsay-1.0.3.jar").toString(), "/usr/src/webapp/extra-libs/cowsay-1.0.3.jar")

        when: 'trying to execute a script using this extra JAR file'
        container.start()
        def async = checkScriptOutput("com.github.ricksbrown.cowsay.Cowsay.class", container) { txt, response ->
            assert txt == "class com.github.ricksbrown.cowsay.Cowsay"
        }

        then: 'the extra source file is available'
        async.await(10.0)

        cleanup:
        container?.close()
    }

    def "Extra Gradle coordinates can be provided to the evaluator"() {
        given: 'a container'
        def container = fromImage(basicImage)

        and: 'extra Gradle/Maven coordinates are provided via environment variables'
        container.addEnv("REPL_COMPILE_DEPENDENCIES", "de.vandermeer:asciitable:0.3.2")

        and: 'we have a script using the pulled library'
        def script = "de.vandermeer.asciitable.AsciiTable.class"

        when: 'running a script using the pulled packages'
        container.start()
        def async = checkScriptOutput(script, container) { txt, response ->
            assert txt == """class de.vandermeer.asciitable.AsciiTable"""
        }

        then:
        async.await(10.0)

        cleanup:
        container?.close()
    }
}
