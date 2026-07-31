FROM eclipse-temurin:21-jre

WORKDIR /app

ARG JAR_FILE=build/libs/backend-0.0.1-SNAPSHOT.jar
ARG GIT_COMMIT=unknown

COPY ${JAR_FILE} app.jar

LABEL org.opencontainers.image.revision="${GIT_COMMIT}"

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
