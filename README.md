# FastBot ROS2 Docker

This repository contains Docker configurations for running the FastBot
both in simulation and on the real robot.

## Clone the repository on the ~/ros2_ws/src/ directory

https://github.com/Angelo9AC/fastbot_ros2_docker.git

The username is Angelo9AC

## For the simulation

First of all, since Docker is not installed in this rosject, you should install it on the first terminal by typing the following commands:

sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo service docker start

Then, you can use docker without sudo with:

sudo usermod -aG docker $USER
newgrp docker

But if there is any issue, you can continue using sudo

Now, its time to pull the Docker images and start the required containers with the following command:

docker-compose up (or sudo docker-compose up)

It can take some time, so please be patient. Gazebo will be launched, but if there is an issue, please type ctrl+c and then type docker-compose up (or sudo docker-compose up) again.

When finish, verify that the containers are running on a second terminal with: docker ps (or sudo docker ps)

You should get the following result:

CONTAINER ID   IMAGE                            COMMAND                  CREATED         STATUS         PORTS                            NAMES
fd5d2a1c412a   simulation_fastbot-ros2-webapp   "/docker-entrypoint.…"   3 minutes ago   Up 3 minutes   0.0.0.0:8080->80/tcp, :::8080->80/tcp   fastbot-ros2-webapp
bf9c62c6e56b   simulation_fastbot-ros2-slam     "/ros_entrypoint.sh …"   3 minutes ago   Up 3 minutes                            fastbot-ros2-slam
676b5eb968be   simulation_fastbot-ros2-gazebo   "/ros_entrypoint.sh …"   3 minutes ago   Up 3 minutes                            fastbot-ros2-gazebo

An also verify with: docker images (or sudo docker images)
REPOSITORY                       TAG               IMAGE ID       CREATED          SIZE
simulation_fastbot-ros2-webapp   latest            fc345cc9c373   9 minutes ago    62.8MB
simulation_fastbot-ros2-slam     latest            91ba616cb278   10 minutes ago   3.89GB
simulation_fastbot-ros2-gazebo   latest            ce67a2ed4e78   17 minutes ago   2.96GB
ros                              humble-ros-base   540512ac3468   2 days ago       754MB
nginx                            alpine            b76de378d572   2 weeks ago      62.1MB


## For the real robot
For starting the docker containers, you need to follow the next steps:

First, you should connect to the robot via ssh. In my case is: ssh fastbot@fastbot

Then, type on the first terminal:

cd ros2_ws
colcon build
source install/setup.bash

If there is an error related to colcon build, you need to type on the root directory: sudo chown -R fastbot:fastbot ros2_ws
And then, go to the ros2_ws directory and type: 
rm -rf build install log
sudo rm -rf build install log
source /opt/ros/humble/setup.bash

If there is still an error, you need to do the following:
sudo apt update
sudo apt install -y ros-humble-rosidl-default-generators ros-humble-rosidl-default-runtime
sudo apt install -y python3-colcon-common-extensions


And then: 

cd ros2_ws
rm -rf build install log
colcon build
source install/setup.bash
docker ps

Then, you should navigate to ~/ros2_ws/src/fastbot_ros2_docker/real and you can check with the following command that the docker containers are ok:

docker ps:
CONTAINER ID   IMAGE                                   COMMAND                  CREATED             STATUS             PORTS     NAMES
15e7a70ad1a0   public.ecr.aws/theconstruct/rrl:arm64   "bash husarnet-docker"   About an hour ago   Up About an hour (healthy)             theconstruct.rrl
de8aa7bb39df   real-fastbot-ros2-slam-real             "/ros_entrypoint.sh …"   About an hour ago   Up 28 minutes                       fastbot-ros2-slam-real
d30757606b92   real-fastbot-ros2-real                  "/ros_entrypoint.sh …"   About an hour ago   Up 28 minutes                       fastbot-ros2-real

docker images:
REPOSITORY                        TAG       IMAGE ID       CREATED        SIZE
real-fastbot-ros2-real            latest    d8e287386689   3 hours ago    2.93GB
real-fastbot-ros2-slam-real       latest    99ab0f1452f5   2 days ago     2.6GB
public.ecr.aws/theconstruct/rrl   arm64     2d54442022ee   5 months ago   213MB

Then, you need to type the following command in order to run the containers: 
docker compose up

And you should get this result:
[+] Running 2/0
 ✔ Container fastbot-ros2-real       Running                                                                   0.0s
 ✔ Container fastbot-ros2-slam-real  Running                                                                   0.0s
Attaching to fastbot-ros2-real, fastbot-ros2-slam-real

The containers will start the programs automatically. So now, open a 2nd terminal and type:

source ~/ros2_ws/install/setup.bash
export ROS_DOMAIN_ID=30
ros2 topic list

Now, you will be able to see the following topics:

/clock
/diagnostics
/fastbot_1/camera_info
/fastbot_1/cmd_vel
/fastbot_1/encoder_vals
/fastbot_1/image_raw
/fastbot_1/joint_states
/fastbot_1/motor_vels
/fastbot_1/odom
/fastbot_1_robot_description
/lslidar_driver_node/transition_event
/lslidar_order
/parameter_events
/rosout
/scan
/tf
/tf_static

As you can see, a topic exists for the laser data, the camera data and for sending velocities to the robot.

Also, the containers start automatically when the robot is powered on.

You can also see the robot topics on an external computer, but you need to use ROS2 Humble, since the robot uses it. 

For the external computer, on a terminal you need to type the following commands:

source /opt/ros/humble/setup.bash
export ROS_DOMAIN_ID=30
ros2 topic list

And you also will be able to see the robot topics.
