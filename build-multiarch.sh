#!/bin/bash

REGISTRY=$1
IMAGE_NAME=$2
PUSH=$3  # true/false
REGISTRY_USER=$4

# Debug
echo "Debug info:"
echo "REGISTRY: ${REGISTRY}"
echo "IMAGE_NAME: ${IMAGE_NAME}"
echo "PUSH: ${PUSH}"

TAGS=("slow-purple" "bad-purple" "purple" "slow-blue" "bad-blue" "blue" "slow-green" "bad-green" "green" "slow-yellow")

for TAG in "${TAGS[@]}"; do
    # Extract color and params
    if [[ $TAG == slow-* ]]; then
        COLOR=${TAG#slow-}
        LATENCY="5000"
        ERROR_RATE="0"
    elif [[ $TAG == bad-* ]]; then
        COLOR=${TAG#bad-}
        LATENCY="0"
        ERROR_RATE="50"
    else
        COLOR=$TAG
        LATENCY="0"
        ERROR_RATE="0"
    fi
    
    # Debug
    FULL_TAG="${REGISTRY}/${IMAGE_NAME}:${TAG}"
    echo "Building tag: ${FULL_TAG}"
    
    # Build and push
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --build-arg COLOR=$COLOR \
        --build-arg LATENCY=$LATENCY \
        --build-arg ERROR_RATE=$ERROR_RATE \
        -t ${FULL_TAG} \
        ${PUSH:+"--push"} \
        .
done
