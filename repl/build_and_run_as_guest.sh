#!/bin/sh
./gradlew --no-daemon shadowJar
su guest -s /bin/sh -c "java -cp extra-libs/*:build/libs/webapp-fat.jar co.petrin.WebInterface"
