# Argo Rollouts Demo Application

This application demonstrates implementation of various deployment strategies using Argo Rollouts. Demo includes a
sample application and example rollout manifests which demonstrates various Argo Rollouts features.

Instructions using Argo CD:

1. Create the Argo CD application using one of the examples:

```
argocd app create rollouts-demo \
  --repo https://github.com/argoproj/rollouts-demo \
  --path examples/canary \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace rollouts-demo
```

2. Visit app at http://rollouts-demo.apps.argoproj.io

![img](./demo.png)

3. Upgrade app by changing image tag to another color and resyncing app
