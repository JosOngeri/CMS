allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    // Only redirect projects on the same drive root as this project.
    // Pub-cache plugins may live on C: while this project is on D:, and
    // Gradle cannot relativize paths across drive roots ("this and base
    // files have different roots" when creating *UnitTestSources tasks).
    if (project.projectDir.toPath().root == rootProject.projectDir.toPath().root) {
        project.layout.buildDirectory.value(newSubprojectBuildDir)
    }
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

// Add Google Services plugin for Firebase
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.google.gms:google-services:4.4.0")
    }
}
