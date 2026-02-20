FROM arm64v8/ros:humble-ros-base

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /root/ros2_ws

RUN apt-get update && apt-get install -y \
    ros-humble-slam-toolbox \
    ros-humble-navigation2 \
    ros-humble-nav2-bringup \
    ros-humble-xacro \
    ros-humble-robot-state-publisher \
    python3-colcon-common-extensions \
    && rm -rf /var/lib/apt/lists/*

CMD ["bash"]
