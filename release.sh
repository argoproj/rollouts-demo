#!/bin/bash

IMAGE_NAMESPACE=docker.artifactory.a.intuit.com/sandbox/sandbox/asimhon-jul-02/service
DOCKER_PUSH=true
set -x -e

strings=(
    "red"
    "orange"
    "yellow"
    "green"
    "blue"
    "purple"
)

for color in "${strings[@]}"; do
    make image COLOR=${color} DOCKER_PUSH=${DOCKER_PUSH} IMAGE_NAMESPACE=${IMAGE_NAMESPACE}
    make image COLOR=${color} ERROR_RATE=15 DOCKER_PUSH=${DOCKER_PUSH} IMAGE_NAMESPACE=${IMAGE_NAMESPACE}
    make image COLOR=${color} LATENCY=2 DOCKER_PUSH=${DOCKER_PUSH} IMAGE_NAMESPACE=${IMAGE_NAMESPACE}
done
