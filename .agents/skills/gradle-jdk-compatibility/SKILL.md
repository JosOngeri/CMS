---
name: gradle-jdk-compatibility
description: Diagnose Gradle failures caused by an unsupported Java class-file version and select a compatible JDK.
---

# Gradle JDK Compatibility

1. Determine the JDK major version from the reported class-file major version.
2. Inspect the project's Gradle wrapper and Android Gradle Plugin versions.
3. Prefer an LTS JDK supported by the wrapper and plugin; use JDK 21 when Gradle 8.14 is involved unless the project explicitly requires another version.
4. Configure the IDE and Gradle daemon to use that JDK, then stop existing daemons and re-sync.
5. Do not modify application source files when the failure is caused solely by the runtime JDK.
