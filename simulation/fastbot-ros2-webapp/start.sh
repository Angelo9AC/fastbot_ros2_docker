#!/bin/bash
set -e

source /opt/ros/humble/setup.bash

# Página web mínima
mkdir -p /var/www/html
cat <<EOF > /var/www/html/index.html
<!DOCTYPE html>
<html>
<head>
  <title>Fastbot WebApp</title>
</head>
<body>
  <h1>Fastbot WebApp is running</h1>
  <p>If you see this, the container works.</p>
  <p>rosbridge: ws://localhost:9090</p>
</body>
</html>
EOF

# Arrancar nginx
nginx

# Arrancar rosbridge
ros2 launch rosbridge_server rosbridge_websocket_launch.xml &

# Mantener vivo el contenedor
tail -f /dev/null
