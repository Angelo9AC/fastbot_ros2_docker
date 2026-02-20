#!/bin/bash

echo "Deteniendo contenedores anteriores..."
docker compose down

echo "Construyendo imágenes Docker..."
cd ~/ros2_ws/src/fastbot_ros2_docker/real
docker compose build --no-cache

echo "Iniciando contenedores..."
docker compose up -d

echo "Verificando contenedores en ejecución:"
docker ps

echo "Mostrando tópicos de ROS2 (espera 5 segundos)..."
sleep 5
docker exec fastbot-ros2-real bash -c "source /root/ros2_ws/install/setup.bash && ros2 topic list"
