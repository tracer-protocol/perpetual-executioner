# Deployment
The easiest way to deploy the executioner is to run it inside Kubernetes alongside the order matching engine.

This way the executioner never needs to be exposed to the public and is only exposed internally.

First, create a configmap using a env file using `kubectl create configmap executioner-env --from-env-file=.env`.

Next, To deploy an instance of the executioner, run `kubectl apply -f deploy.yaml`.

Finally expose this internally to the cluster using `kubectl apply -f service.yaml`.

To get the IP of the NodePort service, run `kubectl get all`. You will see a service named `service/executioner-service`. Copy the IP from the `CLUSTER-IP` column.

## Releasing a new version

Ensure that `deployment/setupRelease.sh` is executable with `chmod +x deployment/setupRelease.sh`

You may also need to install `jq`

Use the `deployment/setupRelease.sh` to help you to perform the following:

- update version in `package.json` via `yarn version`
  - this will also add a git tag to your local machine. [see more](https://classic.yarnpkg.com/en/docs/cli/version/)
- build a new version of the docker image tagged with the new version
- push the new docker image to gcr
- update the image in the Kubernetes deploy config

Now you can begin a rolling deploy by running `kubectl apply -f deploy.yaml`
