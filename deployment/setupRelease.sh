#!/bin/sh

yarn version

version=$(cat package.json | jq -r '.version')
docker_image="gcr.io/tracer-protocol-testing/executioner"

read -p "create new docker image with tag $docker_image:$version? (y/n): " confirm_version

if [ $confirm_version != "y" ]
then
  echo "exiting"
  exit 1
fi

echo "running docker build . -t $docker_image:$version"
docker build . -t $docker_image:$version

echo "running docker push $docker_image:$version"
docker push $docker_image:$version

echo "built and pushed $docker_image:$version"

read -p "Update k8s deployment config with new image tag? (y/n): " update_kubernetes

if [ $update_kubernetes != "y" ]
then
  echo "exiting"
  exit 1
fi

# update the deploy.yaml file
sed -i -e "s|$docker_image:[0-9].[0-9].[0-9]|$docker_image:$version|g" deployment/deploy.yaml

echo "updated k8s deployment config with new image"