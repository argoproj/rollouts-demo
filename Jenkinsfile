pipeline {
  agent {
    kubernetes {
      label 'jenkins-slave'
      defaultContainer 'jnlp'
      yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: dind
    image: docker:18.09-dind
    securityContext:
      privileged: true
  - name: docker
    env:
    - name: DOCKER_HOST
      value: 127.0.0.1
    image: docker:18.09
    command:
    - cat
    tty: true
  - name: tools
    image: argoproj/argo-cd-ci-builder:v0.13.1
    command:
    - cat
    tty: true
"""
    }
  }
  stages {

    stage('Build') {
      environment {
        DOCKERHUB_CREDS = credentials('dockerhub')
      }
      steps {
        container('docker') {
          // Build new image
          sh "until docker ps; do sleep 3; done && docker build -t alexmt/rollouts-demo:${env.GIT_COMMIT} ."
          // Publish new image
          sh "docker login --username $DOCKERHUB_CREDS_USR --password $DOCKERHUB_CREDS_PSW && docker push alexmt/rollouts-demo:${env.GIT_COMMIT}"
        }
      }
    }

    stage('Deploy Canary') {
      environment {
        GIT_CREDS = credentials('git')
        ARGOCD_TOKEN = credentials('argocd-token')
        ARGOCD_OPTS = "--auth-token $ARGOCD_TOKEN --server cd.apps.argoproj.io --grpc-web"
        USER = 'argocd'
      }
      steps {
        container('tools') {
          // Prepare tools: configure git and download argocd cli
          sh "git clone https://$GIT_CREDS_USR:$GIT_CREDS_PSW@github.com/alexmt/rollouts-demo-deployment.git"
          sh "git config --global user.email 'ci@ci.com'"
          sh "curl https://cd.apps.argoproj.io/download/argocd-linux-amd64 > ./rollouts-demo-deployment/argocd && chmod +x ./rollouts-demo-deployment/argocd"

          dir("rollouts-demo-deployment") {
            // Push changes to deployment repo
            sh "kustomize edit set image alexmt/rollouts-demo:${env.GIT_COMMIT}"
            sh "git commit -am 'Publish new version' && git push || echo 'no changes'"

            // Wait until first canary step is completed
            sh "./argocd app wait rollouts-demo --suspended --sync"

            // Verify canary and confirm promoting it.
            input message:'Promote canary?'

            // Trigger app syncronization and make sure first canary step is completed
            sh "./argocd app actions run rollouts-demo resume --kind Rollout"
          }
        }
      }
    }
  }
}
