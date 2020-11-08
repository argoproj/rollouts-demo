
pipeline {
    agent {
        kubernetes {
            label 'kaniko-golang'
            yamlFile "jenkins-pod.yaml"
        }
    }
    environment{
        REGISTRY = "harbor.178-128-53-137.nip.io"
        PATH        = "/busybox:$PATH"
        REPOSITORY = "app"
        IMAGE = "rollouts-demo"
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Docker build') {
            steps {
                container(name: 'kaniko', shell: '/busybox/sh') {
                    sh '''#!/busybox/sh
                    /kaniko/executor -f `pwd`/Dockerfile -c `pwd` --cache=true --destination=${REGISTRY}/${REPOSITORY}/${IMAGE}:${GIT_COMMIT}
                    '''
                }
            }
        }
        stage("Deploy to dev") {
            when {
                expression {
                    env.GIT_BRANCH == "master"
                }
            }
            steps {
                echo "deploy in the future"
            }
        }
    }
}