# Deployment
The easiest way to deploy the executioner is to run it inside Kubernetes alongside the order matching engine.

This way the executioner never needs to be exposed to the public and is only exposed internally.

First, create a configmap using a env file using `kubectl create configmap executioner-env --from-env-file=.env`. Next, To deploy an instance of the executioner, run `kubectl apply -f deploy.yaml`. Finally expose this internally to the cluster using `kubectl apply -f service.yaml`. You will then want to use the IP of the NodePort service created using the last command and pass this in to the order matching engine as part of its env file. This way the OME can communicate internally to the executioner.