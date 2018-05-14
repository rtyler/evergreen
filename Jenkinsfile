pipeline {
    agent { label 'linux' }

    options {
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(daysToKeepStr: '10'))
    }

    triggers {
        pollSCM('H * * * *')
    }

    stages {
        stage('Prepare Workspace') {
            steps {
                sh 'make clean || true'
            }
        }

        stage('Lint code') {
          steps {
              sh 'make lint'
          }
        }

        stage('Verifications') {
            parallel {
                stage('Client') {
                    steps {
                        sh 'make -C client check'
                    }
                }
                stage('Services') {
                    steps {
                        sh 'make -C services check'
                    }
                }
            }
        }

        stage('Build jenkins/evergreen') {
            steps {
              sh 'make container'
            }
        }

        stage('Test jenkins/evergreen') {
            steps {
                sh 'make container-check'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'build/tests-logs*/**.log'
                }
            }
        }

        stage('Publish jenkins/evergreen') {
            when {
                expression { infra.isTrusted() }
            }

            steps {
                withCredentials([[$class: 'ZipFileBinding',
                           credentialsId: 'jenkins-dockerhub',
                                variable: 'DOCKER_CONFIG']]) {
                    sh 'make publish'
                }
            }
        }

    }
}

// vim: ft=groovy
