COLOR?=
IMAGE_NAMESPACE?=
IMAGE_TAG?=latest

ifneq (${COLOR},)
IMAGE_TAG=${COLOR}
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
	docker build --build-arg COLOR=${COLOR} -t $(IMAGE_PREFIX)rollouts-demo:${IMAGE_TAG} .
	@if [ "$(DOCKER_PUSH)" = "true" ] ; then docker push $(IMAGE_PREFIX)rollouts-demo:$(IMAGE_TAG) ; fi

.PHONY: run
run:
	go run main.go

.PHONY: clean
clean:
	rm -f rollouts-demo
