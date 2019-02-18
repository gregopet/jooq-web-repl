FROM azul/zulu-openjdk-alpine:11
WORKDIR /usr/src/webapp
COPY gradle ./gradle
COPY extra-libs ./extra-libs
COPY build.gradle gradle.properties gradlew settings.gradle ./
RUN ["./gradlew", "--no-daemon"]
COPY evaluator ./evaluator
COPY src ./src
RUN ["./gradlew", "--no-daemon", "shadowJar"]
CMD ["java", "-cp", "extra-libs/*:build/libs/webapp-fat.jar", "co.petrin.WebInterface"]
