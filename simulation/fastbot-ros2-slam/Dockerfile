FROM ros:humble-ros-base
SHELL ["/bin/bash", "-c"]

RUN apt-get update && apt-get install -y \
    python3-colcon-common-extensions \
    ros-humble-navigation2 \
    ros-humble-cartographer \
    ros-humble-cartographer-ros \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /ros2_ws

RUN git clone https://github.com/Angelo9AC/docker_fastbot.git src/fastbot

# Construir workspace
RUN bash -c "source /opt/ros/humble/setup.bash && \
    colcon build"

# Source automático al abrir el contenedor
RUN echo 'source /opt/ros/humble/setup.bash' >> /root/.bashrc && \
    echo 'source /ros2_ws/install/setup.bash' >> /root/.bashrc

CMD ["bash"]
