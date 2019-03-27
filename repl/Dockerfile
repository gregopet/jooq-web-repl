FROM azul/zulu-openjdk-alpine:11
WORKDIR /usr/src/webapp
COPY gradle ./gradle
COPY gradlew ./
RUN ["./gradlew", "--no-daemon"]
COPY extra-libs ./extra-libs
COPY extra-source-files ./extra-source-files
COPY build.gradle gradle.properties settings.gradle ./
COPY evaluator ./evaluator
COPY src ./src
COPY build_and_run_as_guest.sh ./
ENV EVALUATOR_CLASSPATH "/usr/src/webapp/extra-libs /usr/src/webapp/build/evaluatorRuntime"
CMD ["./build_and_run_as_guest.sh"]
