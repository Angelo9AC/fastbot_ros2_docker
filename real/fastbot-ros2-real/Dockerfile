FROM arm64v8/ros:humble-ros-base

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /root/ros2_ws

RUN apt-get update && apt-get install -y \
    libboost-all-dev \
    libpcl-dev \
    libpcap-dev \
    ros-humble-pcl-ros \
    ros-humble-diagnostic-updater \
    ros-humble-xacro \
    ros-humble-robot-state-publisher \
    ros-humble-joint-state-publisher \
    ros-humble-rosbridge-server \
    ros-humble-rviz2 \
    ros-humble-v4l2-camera \
    ros-humble-rmw-cyclonedds-cpp \    
    python3-colcon-common-extensions \
    python3-serial \
    && rm -rf /var/lib/apt/lists/*

CMD bash
