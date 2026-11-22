val ktor_version = project.property("ktor_version") as String
val kotlin_version = project.property("kotlin_version") as String
val logback_version = project.property("logback_version") as String
val exposed_version = project.property("exposed_version") as String
val hikaricp_version = project.property("hikaricp_version") as String
val postgresql_version = project.property("postgresql_version") as String
val flyway_version = project.property("flyway_version") as String

plugins {
    kotlin("jvm") version "2.4.21"
    id("io.ktor.plugin") version "3.6.1"
    id("org.jetbrains.kotlin.plugin.serialization") version "2.4.21"
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

group = "com.shoppimo"
version = "5.0.0"

application {
    mainClass.set("com.shoppinglist.ApplicationKt")

    val isDevelopment: Boolean = project.ext.has("development")
    applicationDefaultJvmArgs = listOf("-Dio.ktor.development=$isDevelopment")
}

kotlin {
    compilerOptions {
        // OpenAPI route annotations (Route.describe) are experimental in Ktor
        optIn.add("io.ktor.utils.io.ExperimentalKtorApi")
    }
}
repositories {
    mavenCentral()
}

dependencies {
    // Ktor Server
    implementation("io.ktor:ktor-server-core")
    implementation("io.ktor:ktor-server-websockets")
    implementation("io.ktor:ktor-server-content-negotiation")
    implementation("io.ktor:ktor-serialization-kotlinx-json")
    implementation("io.ktor:ktor-server-cors")
    implementation("io.ktor:ktor-server-netty")
    implementation("io.ktor:ktor-server-config-yaml")
    implementation("io.ktor:ktor-server-sse")
    // OpenAPI specification + Swagger UI
    implementation("io.ktor:ktor-server-routing-openapi")
    implementation("io.ktor:ktor-server-swagger")

    // Database
    implementation("org.jetbrains.exposed:exposed-core:$exposed_version")
    implementation("org.jetbrains.exposed:exposed-dao:$exposed_version")
    implementation("org.jetbrains.exposed:exposed-jdbc:$exposed_version")
    implementation("org.jetbrains.exposed:exposed-java-time:$exposed_version")
    implementation("com.zaxxer:HikariCP:$hikaricp_version")
    implementation("org.postgresql:postgresql:$postgresql_version")
    implementation("org.flywaydb:flyway-core:$flyway_version")
    implementation("org.flywaydb:flyway-database-postgresql:$flyway_version")

    // MCP (Model Context Protocol)
    implementation("io.modelcontextprotocol:kotlin-sdk:0.16.0")

    // Metrics
    implementation("io.ktor:ktor-server-metrics-micrometer")
    implementation("io.micrometer:micrometer-registry-prometheus:1.18.0")

    // Logging
    implementation("ch.qos.logback:logback-classic:$logback_version")

    // Push notifications
    implementation("com.interaso:webpush:1.3.0")

    // Testing
    testImplementation("io.ktor:ktor-server-test-host")
    testImplementation("org.jetbrains.kotlin:kotlin-test:$kotlin_version")
    testImplementation("org.testcontainers:testcontainers:2.0.5")
    testImplementation("org.testcontainers:testcontainers-postgresql:2.0.5")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter:2.0.5")
    testImplementation("org.junit.jupiter:junit-jupiter:6.1.3")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher:6.1.3")
    testImplementation("org.mockito.kotlin:mockito-kotlin:6.4.0")
}

tasks.test {
    useJUnitPlatform()
    maxParallelForks = 1
}
