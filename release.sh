#!/bin/bash

set -x -e

# Requires the current buildx builder to support multi-platform builds (e.g. a
# docker-container builder, or the docker driver with the containerd image store).

if [ -n "${IMAGE_NAMESPACE}" ]; then
    IMAGE_PREFIX="${IMAGE_NAMESPACE}/"
fi

# Multi-arch images cannot be loaded into the local docker image store, so
# they are pushed directly to the registry. Otherwise, build a single platform
# (the builder's native one, unless PLATFORMS is set) and load it locally.
if [ "${DOCKER_PUSH}" = "true" ]; then
    PLATFORMS=${PLATFORMS:-linux/amd64,linux/arm64}
    OUTPUT_ARGS=(--push)
else
    OUTPUT_ARGS=(--load)
fi

PLATFORM_ARGS=()
if [ -n "${PLATFORMS}" ]; then
    PLATFORM_ARGS=(--platform "${PLATFORMS}")
fi

build_image() {
    local tag=$1
    shift
    docker buildx build \
        "${PLATFORM_ARGS[@]}" \
        "$@" \
        -t "${IMAGE_PREFIX}rollouts-demo:${tag}" \
        "${OUTPUT_ARGS[@]}" \
        .
}

strings=(
    "red"
    "orange"
    "yellow"
    "green"
    "blue"
    "purple"
)

for color in "${strings[@]}"; do
    build_image "${color}" --build-arg COLOR=${color}
    build_image "bad-${color}" --build-arg COLOR=${color} --build-arg ERROR_RATE=15
    build_image "slow-${color}" --build-arg COLOR=${color} --build-arg LATENCY=2
done
