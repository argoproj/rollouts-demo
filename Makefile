COLOR?=
IMAGE_NAMESPACE?=
ERROR_RATE?=
IMAGE_TAG?=latest

ifneq (${COLOR},)
IMAGE_TAG=${COLOR}
endif
ifneq (${LATENCY},)
IMAGE_TAG=slow-${COLOR}
endif
ifneq (${ERROR_RATE},)
IMAGE_TAG=bad-${COLOR}
endif

ifdef IMAGE_NAMESPACE
IMAGE_PREFIX=${IMAGE_NAMESPACE}/
endif

.PHONY: all
all: build

.PHONY: build
build:
	CGO_ENABLED=0 go build

.PHONY: image
image:
	docker build --build-arg COLOR=${COLOR} --build-arg ERROR_RATE=${ERROR_RATE} --build-arg LATENCY=${LATENCY} -t $(IMAGE_PREFIX)rollouts-demo:${IMAGE_TAG} .
	@if [ "$(DOCKER_PUSH)" = "true" ] ; then docker push $(IMAGE_PREFIX)rollouts-demo:$(IMAGE_TAG) ; fi

.PHONY: load-tester-image
load-tester-image:
	cd load-tester
	docker build -t $(IMAGE_PREFIX)load-tester:latest load-tester
	@if [ "$(DOCKER_PUSH)" = "true" ] ; then docker push $(IMAGE_PREFIX)load-tester:latest ; fi

.PHONY: run
run:
	go run main.go

.PHONY: lint
lint:
	golangci-lint run --fix

.PHONY: release
release:
	./release.sh DOCKER_PUSH=${DOCKER_PUSH} IMAGE_NAMESPACE=${IMAGE_NAMESPACE}

.PHONY: clean
clean:
	rm -f rollouts-demo
