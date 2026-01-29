FROM ros:humble-ros-base
SHELL ["/bin/bash", "-c"]

RUN apt-get update && apt-get install -y \
    python3-colcon-common-extensions \
    ros-humble-gazebo-ros-pkgs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /ros2_ws

# COPIAMOS LOS PAQUETES ROS REALES
COPY src/fastbot /ros2_ws/src/fastbot

RUN source /opt/ros/humble/setup.bash && colcon build

CMD ["bash"]
