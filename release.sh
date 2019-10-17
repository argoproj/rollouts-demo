#!/bin/bash

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
done