FROM ros:humble-ros-base
SHELL ["/bin/bash", "-c"]

RUN apt-get update && apt-get install -y \
    python3-colcon-common-extensions \
    ros-humble-gazebo-ros-pkgs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /ros2_ws

RUN git clone https://github.com/Angelo9AC/docker_fastbot.git src/fastbot

# Construir workspace
RUN bash -c "source /opt/ros/humble/setup.bash && \
    colcon build"

ENV GAZEBO_MODEL_PATH=/ros2_ws/install/fastbot_description/share/fastbot_description:$GAZEBO_MODEL_PATH

# Source automático al abrir el contenedor
RUN echo 'source /opt/ros/humble/setup.bash' >> /root/.bashrc && \
    echo 'source /ros2_ws/install/setup.bash' >> /root/.bashrc

CMD ["bash"]
