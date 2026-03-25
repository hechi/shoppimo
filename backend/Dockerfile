# Development Dockerfile for Kotlin backend
FROM openjdk:17-jdk-alpine

WORKDIR /app

# Copy Gradle wrapper and configuration files
COPY gradlew gradlew.bat ./
COPY gradle ./gradle
COPY build.gradle.kts settings.gradle.kts gradle.properties ./

# Make gradlew executable
RUN chmod +x ./gradlew

# Download dependencies
RUN ./gradlew dependencies --no-daemon

# Copy source code
COPY src ./src

# Expose port
EXPOSE 8080

# Start application
CMD ["./gradlew", "run", "--no-daemon"]