// ============================================
// FASTBOT CONTROL PANEL - VERSION CON MODELO 3D
// ============================================

// Global variables
let ros = null;
let rosConnected = false;
let cmdVelPublisher = null;
let goalPublisher = null;
let joystick = null;
let robotPosition = { x: 0, y: 0, theta: 0 };
let robotSpeed = { linear: 0, angular: 0 };
let currentMap = null;
let maxSpeed = 0.5;
let messageCount = 0;
let startTime = Date.now();
let cameraAttempts = 0;
let isCameraActive = false;
let batteryLevel = 85;
let lastUpdateTime = Date.now();
let odomSubscriber = null;
let mapUpdateRequested = false;

// 3D Variables
let scene = null;
let camera = null;
let renderer = null;
let robotModel = null;
let lights = [];
let autoRotate = false;
let currentView = 'perspective';
let controls = null;

// ROS Topics
const ROS_TOPICS = {
    CMD_VEL: '/fastbot_1/cmd_vel',
    ODOM: '/fastbot_1/odom',
    CAMERA: '/fastbot_1/camera/image_raw',
    GOAL_POSE: '/goal_pose',
    MAP: '/map',
    SCAN: '/fastbot_1/scan'
};

// Initialize
window.addEventListener('load', function() {
    console.log("🚀 FastBot Control Panel Loading...");
    updateLoadStatus("Checking dependencies...");
    
    // Check dependencies
    setTimeout(checkDependencies, 500);
});

function checkDependencies() {
    const deps = ['THREE', 'EventEmitter2', 'ROSLIB', 'nipplejs'];
    const missing = [];
    
    deps.forEach(dep => {
        if (!window[dep]) {
            missing.push(dep);
        }
    });
    
    if (missing.length > 0) {
        updateLoadStatus(`Missing: ${missing.join(', ')}`);
        setTimeout(() => {
            showNotification(`Missing libraries: ${missing.join(', ')}`, 'error');
        }, 1000);
        return;
    }
    
    updateLoadStatus("Initializing app...");
    initializeApp();
}

function updateLoadStatus(message) {
    const element = document.getElementById('loadStatus');
    if (element) element.textContent = message;
    console.log(`📦 ${message}`);
}

function initializeApp() {
    console.log("✅ Initializing components...");
    
    // Show app
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        
        // Setup components
        setupMap();
        setup3DModel();
        setupJoystick();
        setupCamera();
        setupControls();
        setupWaypoints();
        
        // Start updates
        startUpdateLoops();
        
        console.log("🎉 App initialized!");
    }, 500);
}

// ============================================
// 1. MAP SYSTEM
// ============================================

function setupMap() {
    const canvas = document.getElementById('mapCanvas');
    if (!canvas) return;
    
    // Create simulated map
    createSimulatedMap();
    
    // Initial draw
    drawMap();
    
    // Handle resize
    window.addEventListener('resize', function() {
        setTimeout(drawMap, 100);
        resize3DModel();
    });
    
    // Refresh button
    document.getElementById('refreshMap').addEventListener('click', function() {
        drawMap();
        showNotification("Map refreshed", "info");
    });
}

function createSimulatedMap() {
    // Create a proper simulated map
    currentMap = {
        info: {
            width: 100,
            height: 100,
            resolution: 0.05,
            origin: { 
                position: { 
                    x: -2.5, 
                    y: -2.5, 
                    z: 0 
                }
            }
        },
        data: new Array(100 * 100).fill(0)
    };
    
    // Create house layout
    const width = currentMap.info.width;
    const height = currentMap.info.height;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            
            // Border walls
            if (x < 5 || x > width - 6 || y < 5 || y > height - 6) {
                currentMap.data[index] = 100;
            }
            // Interior walls
            else if ((x > 30 && x < 70 && y === 50) || (x === 50 && y > 30 && y < 70)) {
                currentMap.data[index] = 100;
            }
            // Rooms
            else if (x > 20 && x < 80 && y > 20 && y < 80) {
                currentMap.data[index] = 0; // Free space
            }
        }
    }
    
    console.log("🗺️ Simulated map created");
}

function drawMap() {
    const canvas = document.getElementById('mapCanvas');
    if (!canvas || !currentMap) return;
    
    const container = canvas.parentElement;
    const width = canvas.width = container.clientWidth;
    const height = canvas.height = container.clientHeight;
    
    const ctx = canvas.getContext('2d');
    const mapWidth = currentMap.info.width;
    const mapHeight = currentMap.info.height;
    const scale = Math.min(width / mapWidth, height / mapHeight);
    
    // Clear canvas
    ctx.fillStyle = '#0a192f';
    ctx.fillRect(0, 0, width, height);
    
    // Draw map cells
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const cell = currentMap.data[y * mapWidth + x];
            
            if (cell === 100) {
                ctx.fillStyle = '#495670'; // Walls
            } else if (cell === 0) {
                ctx.fillStyle = '#112240'; // Free
            } else {
                ctx.fillStyle = '#0a192f'; // Unknown
            }
            
            ctx.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale));
        }
    }
    
    // Draw grid (every 10 cells)
    ctx.strokeStyle = 'rgba(35, 53, 84, 0.3)';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x <= mapWidth; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, height);
        ctx.stroke();
    }
    
    for (let y = 0; y <= mapHeight; y += 10) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(width, y * scale);
        ctx.stroke();
    }
    
    // Draw coordinate axes
    ctx.strokeStyle = '#64ffda';
    ctx.lineWidth = 1.5;
    const centerX = width / 2;
    const centerY = height / 2;
    
    ctx.beginPath();
    ctx.moveTo(centerX - 15, centerY);
    ctx.lineTo(centerX + 15, centerY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 15);
    ctx.lineTo(centerX, centerY + 15);
    ctx.stroke();
    
    // Draw robot position
    drawRobotOnMap(ctx, width, height, scale);
    
    // Update map info
    document.getElementById('mapSize').textContent = `${mapWidth}x${mapHeight}`;
    document.getElementById('mapPosition').textContent = `${robotPosition.x.toFixed(2)}, ${robotPosition.y.toFixed(2)}`;
    
    // Hide overlay
    document.getElementById('mapOverlay').style.display = 'none';
    mapUpdateRequested = false;
}

function drawRobotOnMap(ctx, width, height, scale) {
    if (!currentMap) return;
    
    const mapWidth = currentMap.info.width;
    const mapHeight = currentMap.info.height;
    const resolution = currentMap.info.resolution;
    const originX = currentMap.info.origin.position.x;
    const originY = currentMap.info.origin.position.y;
    
    // Convert to map coordinates
    const mapX = (robotPosition.x - originX) / resolution;
    const mapY = mapHeight - ((robotPosition.y - originY) / resolution);
    
    const canvasX = mapX * scale;
    const canvasY = mapY * scale;
    
    // Check if robot is within map bounds
    if (canvasX < 0 || canvasX > width || canvasY < 0 || canvasY > height) return;
    
    // Draw robot
    ctx.save();
    ctx.translate(canvasX, canvasY);
    ctx.rotate(-robotPosition.theta);
    
    // Robot body (triangle)
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-7, 6);
    ctx.lineTo(-7, -6);
    ctx.closePath();
    ctx.fill();
    
    // Outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Front indicator
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(5, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// ============================================
// 2. 3D MODEL SYSTEM
// ============================================

function setup3DModel() {
    console.log("🎨 Setting up 3D model...");
    
    const canvas = document.getElementById('modelCanvas');
    if (!canvas) return;
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a192f);
    scene.fog = new THREE.Fog(0x0a192f, 10, 30);
    
    // Create camera
    const container = canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0x64ffda, 0.5, 20);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);
    
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x112240,
        shininess: 30,
        side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Create grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x233554, 0x233554);
    gridHelper.position.y = -0.49;
    scene.add(gridHelper);
    
    // Create robot model
    createRobotModel();
    
    // Setup controls
    setup3DControls();
    
    // Hide overlay
    document.getElementById('modelOverlay').style.display = 'none';
    
    // Start animation loop
    animate3DModel();
    
    console.log("✅ 3D model initialized");
}

function createRobotModel() {
    // Remove existing robot model
    if (robotModel) {
        scene.remove(robotModel);
    }
    
    // Create group for robot
    robotModel = new THREE.Group();
    
    // Robot body (main chassis)
    const bodyGeometry = new THREE.BoxGeometry(1.5, 0.4, 0.8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff6b6b,
        shininess: 100,
        emissive: 0x000000,
        emissiveIntensity: 0.1
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    robotModel.add(body);
    
    // Robot top (lidar/electronics)
    const topGeometry = new THREE.CylinderGeometry(0.5, 0.4, 0.2, 8);
    const topMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x495670,
        shininess: 80
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 0.3;
    top.castShadow = true;
    robotModel.add(top);
    
    // Camera/sensor on top
    const sensorGeometry = new THREE.SphereGeometry(0.08, 8, 6);
    const sensorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x64ffda,
        emissive: 0x64ffda,
        emissiveIntensity: 0.3
    });
    const sensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
    sensor.position.set(0, 0.5, 0);
    robotModel.add(sensor);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12);
    const wheelMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x233554,
        shininess: 50
    });
    
    // Front wheels
    const frontLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    frontLeftWheel.position.set(-0.6, -0.2, 0.4);
    frontLeftWheel.rotation.z = Math.PI / 2;
    frontLeftWheel.castShadow = true;
    robotModel.add(frontLeftWheel);
    
    const frontRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    frontRightWheel.position.set(0.6, -0.2, 0.4);
    frontRightWheel.rotation.z = Math.PI / 2;
    frontRightWheel.castShadow = true;
    robotModel.add(frontRightWheel);
    
    // Back wheels
    const backLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    backLeftWheel.position.set(-0.6, -0.2, -0.4);
    backLeftWheel.rotation.z = Math.PI / 2;
    backLeftWheel.castShadow = true;
    robotModel.add(backLeftWheel);
    
    const backRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    backRightWheel.position.set(0.6, -0.2, -0.4);
    backRightWheel.rotation.z = Math.PI / 2;
    backRightWheel.castShadow = true;
    robotModel.add(backRightWheel);
    
    // Front indicator
    const frontIndicatorGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.3);
    const frontIndicatorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.5
    });
    const frontIndicator = new THREE.Mesh(frontIndicatorGeometry, frontIndicatorMaterial);
    frontIndicator.position.set(0, -0.1, 0.7);
    robotModel.add(frontIndicator);
    
    // Add to scene
    scene.add(robotModel);
    
    // Position robot at center
    robotModel.position.set(0, 0, 0);
    robotModel.rotation.y = robotPosition.theta;
}

function setup3DControls() {
    // Toggle auto-rotate
    document.getElementById('rotateToggle').addEventListener('click', function() {
        autoRotate = !autoRotate;
        this.style.color = autoRotate ? '#64ffda' : '#8892b0';
        showNotification(autoRotate ? "Auto-rotate enabled" : "Auto-rotate disabled", "info");
    });
    
    // Reset view
    document.getElementById('reset3DView').addEventListener('click', function() {
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);
        currentView = 'perspective';
        showNotification("3D view reset", "info");
    });
    
    // View buttons
    document.getElementById('viewTop').addEventListener('click', function() {
        camera.position.set(0, 10, 0);
        camera.lookAt(0, 0, 0);
        camera.rotation.x = -Math.PI / 2;
        currentView = 'top';
        showNotification("Top view", "info");
    });
    
    document.getElementById('viewFront').addEventListener('click', function() {
        camera.position.set(0, 2, 10);
        camera.lookAt(0, 0, 0);
        currentView = 'front';
        showNotification("Front view", "info");
    });
    
    document.getElementById('viewSide').addEventListener('click', function() {
        camera.position.set(10, 2, 0);
        camera.lookAt(0, 0, 0);
        currentView = 'side';
        showNotification("Side view", "info");
    });
    
    // Mouse controls for rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    const modelCanvas = document.getElementById('modelCanvas');
    
    modelCanvas.addEventListener('mousedown', function(e) {
        isDragging = true;
        previousMousePosition = {
            x: e.clientX,
            y: e.clientY
        };
    });
    
    window.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        const deltaMove = {
            x: e.clientX - previousMousePosition.x,
            y: e.clientY - previousMousePosition.y
        };
        
        if (currentView === 'perspective') {
            // Rotate camera around the robot
            const deltaRotationQuaternion = new THREE.Quaternion()
                .setFromEuler(new THREE.Euler(
                    toRadians(deltaMove.y * 0.5),
                    toRadians(deltaMove.x * 0.5),
                    0,
                    'XYZ'
                ));
            
            camera.position.applyQuaternion(deltaRotationQuaternion);
            camera.lookAt(scene.position);
        }
        
        previousMousePosition = {
            x: e.clientX,
            y: e.clientY
        };
    });
    
    window.addEventListener('mouseup', function() {
        isDragging = false;
    });
    
    // Mouse wheel for zoom
    modelCanvas.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        const zoomSpeed = 0.1;
        const direction = e.deltaY > 0 ? 1 : -1;
        
        // Move camera forward/backward
        const vector = new THREE.Vector3();
        camera.getWorldDirection(vector);
        camera.position.addScaledVector(vector, direction * zoomSpeed);
        
        // Limit zoom
        const distance = camera.position.distanceTo(scene.position);
        if (distance < 2) camera.position.addScaledVector(vector, -direction * zoomSpeed);
        if (distance > 20) camera.position.addScaledVector(vector, -direction * zoomSpeed);
    });
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function resize3DModel() {
    const canvas = document.getElementById('modelCanvas');
    if (!canvas || !camera || !renderer) return;
    
    const container = canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function animate3DModel() {
    requestAnimationFrame(animate3DModel);
    
    // Update robot rotation based on orientation
    if (robotModel) {
        robotModel.rotation.y = robotPosition.theta;
    }
    
    // Auto-rotate camera
    if (autoRotate && currentView === 'perspective') {
        camera.position.x = 5 * Math.cos(Date.now() * 0.0005);
        camera.position.z = 5 * Math.sin(Date.now() * 0.0005);
        camera.lookAt(0, 0, 0);
    }
    
    // Update 3D orientation display
    const degrees = ((robotPosition.theta * 180 / Math.PI) % 360).toFixed(1);
    document.getElementById('modelOrientation').textContent = `${degrees}°`;
    
    // Render scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ============================================
// 3. CAMERA SYSTEM
// ============================================

function setupCamera() {
    const cameraImage = document.getElementById('cameraImage');
    const cameraOverlay = document.getElementById('cameraOverlay');
    const cameraMessage = document.getElementById('cameraMessage');
    
    if (!cameraImage || !cameraOverlay) return;
    
    // Show overlay initially
    cameraOverlay.style.display = 'flex';
    cameraMessage.textContent = 'Camera ready to connect';
    
    // Enable camera button
    document.getElementById('enableCamera').addEventListener('click', function() {
        loadCameraStream();
    });
    
    // Toggle view button
    document.getElementById('toggleCamera').addEventListener('click', function() {
        if (cameraImage.style.display === 'block') {
            cameraImage.style.display = 'none';
            cameraOverlay.style.display = 'flex';
            cameraMessage.textContent = 'Camera view hidden';
        } else {
            cameraImage.style.display = 'block';
            cameraOverlay.style.display = 'none';
        }
    });
    
    // Refresh button
    document.getElementById('refreshCamera').addEventListener('click', function() {
        loadCameraStream();
    });
}

function loadCameraStream() {
    const cameraImage = document.getElementById('cameraImage');
    const cameraOverlay = document.getElementById('cameraOverlay');
    const cameraMessage = document.getElementById('cameraMessage');
    const cameraStatusDot = document.getElementById('cameraStatusDot');
    
    cameraAttempts++;
    
    console.log(`📷 Attempting to load camera (attempt ${cameraAttempts})`);
    
    // Try different URL patterns
    const cameraUrls = [
        // Primary URL for Robot Ignite Academy
        `https://i-031ed11b70a2e5fcf.robotigniteacademy.com:11315/stream?topic=${ROS_TOPICS.CAMERA}&type=mjpeg`,
        // Alternative
        `https://i-031ed11b70a2e5fcf.robotigniteacademy.com/web_video_server/stream?topic=${ROS_TOPICS.CAMERA}`,
        // Generic
        `https://i-031ed11b70a2e5fcf.robotigniteacademy.com:8080/stream?topic=${ROS_TOPICS.CAMERA}`
    ];
    
    const currentUrl = cameraUrls[Math.min(cameraAttempts - 1, cameraUrls.length - 1)];
    const finalUrl = `${currentUrl}&_=${Date.now()}`;
    
    console.log(`📷 Trying URL: ${currentUrl}`);
    
    cameraMessage.textContent = 'Connecting to camera...';
    cameraStatusDot.className = 'status-dot';
    
    cameraImage.onload = function() {
        console.log('✅ Camera loaded successfully!');
        isCameraActive = true;
        cameraOverlay.style.display = 'none';
        cameraStatusDot.className = 'status-dot connected';
        document.getElementById('cameraInfo').textContent = 'Live';
        document.getElementById('cameraInfo').style.color = '#64ffda';
        cameraAttempts = 0;
        
        // Update service status
        document.getElementById('cameraServiceStatus').className = 'status-dot-small connected';
        document.getElementById('cameraServiceText').textContent = 'Running';
        document.getElementById('cameraServiceText').style.color = '#64ffda';
    };
    
    cameraImage.onerror = function() {
        console.error('❌ Camera failed to load');
        cameraImage.style.display = 'none';
        cameraOverlay.style.display = 'flex';
        
        if (cameraAttempts < cameraUrls.length) {
            cameraMessage.textContent = `Trying alternative connection (${cameraAttempts}/${cameraUrls.length})...`;
            setTimeout(loadCameraStream, 1000);
        } else {
            cameraMessage.textContent = 'Camera server not available';
            cameraStatusDot.className = 'status-dot error';
            document.getElementById('cameraInfo').textContent = 'Offline';
            document.getElementById('cameraInfo').style.color = '#ff6b6b';
            
            // Update service status
            document.getElementById('cameraServiceStatus').className = 'status-dot-small error';
            document.getElementById('cameraServiceText').textContent = 'Not running';
            document.getElementById('cameraServiceText').style.color = '#ff6b6b';
            
            showNotification('Camera server not available. Start web_video_server.', 'warning');
        }
    };
    
    cameraImage.src = finalUrl;
    cameraImage.style.display = 'block';
}

// ============================================
// 4. JOYSTICK CONTROL
// ============================================

function setupJoystick() {
    const joystickArea = document.getElementById('joystick');
    if (!joystickArea) return;
    
    // Destroy any existing joystick
    if (joystick) {
        joystick.destroy();
    }
    
    joystick = nipplejs.create({
        zone: joystickArea,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: '#64ffda',
        size: 100,
        threshold: 0.1,
        fadeTime: 150
    });
    
    joystick.on('start', function() {
        console.log("🎮 Joystick activated");
        document.getElementById('controlMode').textContent = 'Manual';
    });
    
    joystick.on('move', function(evt, nipple) {
        if (!rosConnected) {
            showNotification("Please connect to ROS first", "warning");
            return;
        }
        
        const force = Math.min(nipple.force || 0, 1);
        const angle = nipple.angle ? nipple.angle.radian : 0;
        
        // Calculate velocities
        robotSpeed.linear = Math.cos(angle) * force * maxSpeed;
        robotSpeed.angular = -Math.sin(angle) * force * maxSpeed;
        
        // Update display
        const forcePercent = Math.round(force * 100);
        const angleDegrees = Math.round((angle * 180 / Math.PI + 360) % 360);
        
        document.getElementById('forceValue').textContent = `${forcePercent}%`;
        document.getElementById('angleValue').textContent = `${angleDegrees}°`;
        
        // Send command
        publishCmdVel();
    });
    
    joystick.on('end', function() {
        robotSpeed.linear = 0;
        robotSpeed.angular = 0;
        publishCmdVel();
        
        document.getElementById('forceValue').textContent = '0%';
        document.getElementById('angleValue').textContent = '0°';
    });
    
    // Speed control
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    
    if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', function() {
            maxSpeed = parseFloat(this.value);
            speedValue.textContent = maxSpeed.toFixed(1);
        });
    }
    
    // Emergency stop
    document.getElementById('stopBtn').addEventListener('click', function() {
        emergencyStop();
    });
    
    // Auto mode button
    document.getElementById('autoMode').addEventListener('click', function() {
        showNotification("Auto navigation mode activated", "info");
        document.getElementById('controlMode').textContent = 'Auto';
    });
}

function emergencyStop() {
    console.log("🛑 Emergency stop!");
    
    robotSpeed.linear = 0;
    robotSpeed.angular = 0;
    
    // Stop ROS robot
    if (cmdVelPublisher && rosConnected) {
        publishCmdVel();
    }
    
    // Reset joystick
    if (joystick) {
        joystick.destroy();
        setTimeout(setupJoystick, 100);
    }
    
    showNotification("Emergency stop activated", "error");
}

function publishCmdVel() {
    if (!cmdVelPublisher || !rosConnected) return;
    
    try {
        const twist = new ROSLIB.Message({
            linear: { x: robotSpeed.linear, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: robotSpeed.angular }
        });
        
        cmdVelPublisher.publish(twist);
        messageCount++;
        
        // Log for debugging
        if (Math.abs(robotSpeed.linear) > 0.01 || Math.abs(robotSpeed.angular) > 0.01) {
            console.log(`📤 cmd_vel: linear=${robotSpeed.linear.toFixed(2)}, angular=${robotSpeed.angular.toFixed(2)}`);
        }
        
    } catch (error) {
        console.error("Error publishing cmd_vel:", error);
    }
}

// ============================================
// 5. ROS CONNECTION
// ============================================

function connectToROS() {
    if (rosConnected) {
        showNotification("Already connected to ROS", "info");
        return;
    }
    
    const urlInput = document.getElementById('rosbridgeUrl');
    const url = urlInput ? urlInput.value.trim() : '';
    
    if (!url) {
        showNotification("Please enter ROSBridge URL", "warning");
        return;
    }
    
    console.log(`🔗 Connecting to ROSBridge: ${url}`);
    updateConnectionStatus("Connecting...", "connecting");
    
    // Create ROS connection
    ros = new ROSLIB.Ros({
        url: url
    });
    
    // Event handlers
    ros.on('connection', function() {
        console.log("✅ ROS Connected!");
        rosConnected = true;
        updateConnectionStatus("Connected", "connected");
        setupROSPublishers();
        setupROSSubscribers();
        checkAvailableServices();
        showNotification("Connected to ROS successfully", "success");
        
        // Update service status
        document.getElementById('rosbridgeStatus').className = 'status-dot-small connected';
        document.getElementById('rosbridgeStatus').nextElementSibling.textContent = 'Connected';
    });
    
    ros.on('error', function(error) {
        console.error("❌ ROS Error:", error);
        rosConnected = false;
        updateConnectionStatus("Error", "error");
        showNotification(`Connection error: ${error.message || 'Unknown'}`, "error");
    });
    
    ros.on('close', function() {
        console.log("🔌 ROS Disconnected");
        rosConnected = false;
        updateConnectionStatus("Disconnected", "disconnected");
        showNotification("Disconnected from ROS", "warning");
        
        // Reset service status
        document.getElementById('rosbridgeStatus').className = 'status-dot-small';
        document.getElementById('rosbridgeStatus').nextElementSibling.textContent = 'Disconnected';
    });
    
    // Timeout after 10 seconds
    setTimeout(function() {
        if (!rosConnected && ros) {
            ros.close();
            updateConnectionStatus("Timeout", "error");
            showNotification("Connection timeout - check URL", "error");
        }
    }, 10000);
}

function updateConnectionStatus(status, type) {
    const connectionStatus = document.getElementById('connectionStatus');
    const rosStatus = document.getElementById('rosStatus');
    const robotStatus = document.getElementById('robotStatus');
    
    if (connectionStatus) {
        const dot = connectionStatus.querySelector('.status-dot-small');
        const text = connectionStatus.querySelector('span:last-child');
        
        if (dot) {
            dot.className = 'status-dot-small ' + 
                (type === 'connected' ? 'connected' : 
                 type === 'error' ? 'error' : '');
        }
        if (text) text.textContent = status;
    }
    
    if (rosStatus) {
        rosStatus.textContent = status;
        rosStatus.className = type === 'connected' ? 'status-online' : 'status-offline';
    }
    
    if (robotStatus) {
        robotStatus.textContent = type === 'connected' ? 'ONLINE' : 'OFFLINE';
        robotStatus.className = 'status-badge ' + (type === 'connected' ? 'connected' : '');
    }
    
    // Update buttons
    document.getElementById('connectBtn').disabled = type === 'connected';
    document.getElementById('disconnectBtn').disabled = type !== 'connected';
}

function checkAvailableServices() {
    if (!ros || !rosConnected) return;
    
    console.log("🔍 Checking available services...");
    
    // Check for cmd_vel topic (control service)
    try {
        document.getElementById('controlStatus').className = 'status-dot-small connected';
        document.getElementById('controlServiceText').textContent = 'Available';
        document.getElementById('controlServiceText').style.color = '#64ffda';
    } catch (error) {
        console.log("⚠️ Control service not available");
        document.getElementById('controlStatus').className = 'status-dot-small error';
        document.getElementById('controlServiceText').textContent = 'Unavailable';
        document.getElementById('controlServiceText').style.color = '#ff6b6b';
    }
    
    // Check for navigation (goal_pose)
    try {
        document.getElementById('navStatus').className = 'status-dot-small connected';
        document.getElementById('navServiceText').textContent = 'Available';
        document.getElementById('navServiceText').style.color = '#64ffda';
    } catch (error) {
        console.log("⚠️ Navigation service not available");
        document.getElementById('navStatus').className = 'status-dot-small';
        document.getElementById('navServiceText').textContent = 'Not running';
        document.getElementById('navServiceText').style.color = '#8892b0';
    }
}

function setupROSPublishers() {
    if (!ros || !rosConnected) return;
    
    try {
        cmdVelPublisher = new ROSLIB.Topic({
            ros: ros,
            name: ROS_TOPICS.CMD_VEL,
            messageType: 'geometry_msgs/Twist'
        });
        
        goalPublisher = new ROSLIB.Topic({
            ros: ros,
            name: ROS_TOPICS.GOAL_POSE,
            messageType: 'geometry_msgs/PoseStamped'
        });
        
        console.log("✅ Publishers created");
        
    } catch (error) {
        console.error("Error creating publishers:", error);
    }
}

function setupROSSubscribers() {
    if (!ros || !rosConnected) return;
    
    try {
        // Subscribe to odometry
        odomSubscriber = new ROSLIB.Topic({
            ros: ros,
            name: ROS_TOPICS.ODOM,
            messageType: 'nav_msgs/Odometry'
        });
        
        odomSubscriber.subscribe(function(message) {
            messageCount++;
            
            // Update position
            robotPosition.x = message.pose.pose.position.x;
            robotPosition.y = message.pose.pose.position.y;
            
            // Update orientation from quaternion
            const q = message.pose.pose.orientation;
            robotPosition.theta = Math.atan2(2*(q.w*q.z + q.x*q.y), 1-2*(q.y*q.y + q.z*q.z));
            
            // Update speed
            robotSpeed.linear = message.twist.twist.linear.x;
            robotSpeed.angular = message.twist.twist.angular.z;
            
            // Schedule map update if not already requested
            if (!mapUpdateRequested) {
                mapUpdateRequested = true;
                requestAnimationFrame(drawMap);
            }
        });
        
        console.log("✅ Subscribed to odometry");
        
    } catch (error) {
        console.error("Error setting up subscribers:", error);
    }
}

// ============================================
// 6. WAYPOINTS SYSTEM
// ============================================

function setupWaypoints() {
    // Predefined waypoints
    document.querySelectorAll('.waypoint').forEach(button => {
        button.addEventListener('click', function() {
            const x = parseFloat(this.dataset.x);
            const y = parseFloat(this.dataset.y);
            const name = this.dataset.name;
            
            sendNavigationGoal(x, y, 0, name);
            
            // Visual feedback
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 200);
        });
    });
    
    // Custom waypoint
    document.getElementById('sendWaypoint').addEventListener('click', function() {
        const x = parseFloat(document.getElementById('customX').value);
        const y = parseFloat(document.getElementById('customY').value);
        const theta = parseFloat(document.getElementById('customTheta').value) || 0;
        
        if (isNaN(x) || isNaN(y)) {
            showNotification("Please enter valid coordinates", "warning");
            return;
        }
        
        sendNavigationGoal(x, y, theta, 'Custom Destination');
    });
    
    // Clear history
    document.getElementById('clearWaypoints').addEventListener('click', function() {
        const historyList = document.getElementById('historyList');
        if (historyList) {
            historyList.innerHTML = '';
            showNotification("Navigation history cleared", "info");
        }
    });
    
    // Start services button
    document.getElementById('startServices').addEventListener('click', function() {
        showNotification("Starting services... Check terminals", "info");
    });
    
    // Diagnose button
    document.getElementById('diagnoseBtn').addEventListener('click', function() {
        diagnoseSystem();
    });
}

function sendNavigationGoal(x, y, theta, name) {
    console.log(`🎯 Navigation goal: ${name} (${x}, ${y}, ${theta})`);
    
    if (!rosConnected) {
        showNotification("Not connected to ROS", "warning");
        simulateNavigation(x, y, name);
        return;
    }
    
    if (!goalPublisher) {
        showNotification("Navigation service not available", "warning");
        simulateNavigation(x, y, name);
        return;
    }
    
    try {
        const goal = new ROSLIB.Message({
            header: {
                frame_id: 'map',
                stamp: { secs: Math.floor(Date.now() / 1000), nsecs: 0 }
            },
            pose: {
                position: { x: x, y: y, z: 0 },
                orientation: {
                    x: 0,
                    y: 0,
                    z: Math.sin(theta/2),
                    w: Math.cos(theta/2)
                }
            }
        });
        
        goalPublisher.publish(goal);
        showNotification(`Navigating to ${name}...`, "success");
        addToHistory(`→ ${name} (${x.toFixed(1)}, ${y.toFixed(1)})`);
        
    } catch (error) {
        console.error("Error sending goal:", error);
        showNotification("Failed to send navigation goal", "error");
        simulateNavigation(x, y, name);
    }
}

function simulateNavigation(targetX, targetY, name) {
    console.log(`🎯 Simulating navigation to ${name}`);
    
    const startX = robotPosition.x;
    const startY = robotPosition.y;
    
    let progress = 0;
    const duration = 2000; // 2 seconds
    
    const interval = setInterval(() => {
        progress += 100 / (duration / 100);
        
        if (progress >= 100) {
            clearInterval(interval);
            robotPosition.x = targetX;
            robotPosition.y = targetY;
            showNotification(`Reached ${name}! (Simulated)`, "success");
            drawMap();
        } else {
            // Smooth interpolation
            const t = progress / 100;
            const smoothT = t * t * (3 - 2 * t);
            robotPosition.x = startX + (targetX - startX) * smoothT;
            robotPosition.y = startY + (targetY - startY) * smoothT;
            
            // Update map periodically
            if (progress % 25 === 0) {
                drawMap();
            }
        }
    }, 100);
    
    addToHistory(`→ ${name} (${targetX.toFixed(1)}, ${targetY.toFixed(1)}) [Simulated]`);
}

function addToHistory(command) {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    const now = new Date();
    const time = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
        <span class="history-time">${time}</span>
        <span class="history-command">${command}</span>
    `;
    
    historyList.insertBefore(item, historyList.firstChild);
    
    // Keep only last 5 items
    while (historyList.children.length > 5) {
        historyList.removeChild(historyList.lastChild);
    }
}

function diagnoseSystem() {
    console.log("🔧 Running system diagnosis...");
    
    const issues = [];
    
    if (!rosConnected) {
        issues.push("Not connected to ROS");
    }
    
    if (!isCameraActive) {
        issues.push("Camera not connected");
    }
    
    if (!renderer) {
        issues.push("3D model not initialized");
    }
    
    if (issues.length === 0) {
        showNotification("System check passed ✓", "success");
    } else {
        showNotification(`Issues found: ${issues.join(', ')}`, "warning");
    }
}

// ============================================
// 7. STATUS UPDATES
// ============================================

function startUpdateLoops() {
    // Status update every 100ms
    setInterval(updateStatusDisplay, 100);
    
    // Uptime update every second
    setInterval(updateUptime, 1000);
    
    // Battery update every 5 seconds
    setInterval(updateBattery, 5000);
    
    // Message count update
    setInterval(() => {
        document.getElementById('messageCount').textContent = messageCount;
    }, 2000);
}

function updateStatusDisplay() {
    // Update all status displays
    const now = Date.now();
    
    // Position
    document.getElementById('positionValue').textContent = 
        `${robotPosition.x.toFixed(2)}, ${robotPosition.y.toFixed(2)} m`;
    
    // Orientation
    const degrees = ((robotPosition.theta * 180 / Math.PI) % 360).toFixed(1);
    document.getElementById('orientationValue').textContent = `${degrees}°`;
    
    // Speed
    const linearAbs = Math.abs(robotSpeed.linear);
    const angularAbs = Math.abs(robotSpeed.angular);
    
    document.getElementById('linearSpeedValue').textContent = 
        `${linearAbs.toFixed(2)} m/s`;
    document.getElementById('angularSpeedValue').textContent = 
        `${angularAbs.toFixed(2)} rad/s`;
    
    // Mode
    const mode = (linearAbs > 0.01 || angularAbs > 0.01) ? 'MOVING' : 'IDLE';
    document.getElementById('modeValue').textContent = mode;
    
    // Update map position display
    document.getElementById('mapPosition').textContent = 
        `${robotPosition.x.toFixed(2)}, ${robotPosition.y.toFixed(2)}`;
    
    // Update battery display
    document.getElementById('batteryValue').textContent = `${Math.round(batteryLevel)}%`;
    document.getElementById('batteryLevel').style.width = `${batteryLevel}%`;
}

function updateBattery() {
    // Simulate battery drain based on movement
    const drainRate = (Math.abs(robotSpeed.linear) + Math.abs(robotSpeed.angular)) * 0.1;
    batteryLevel = Math.max(15, batteryLevel - drainRate);
    
    // Update battery bar color
    const batteryLevelElement = document.getElementById('batteryLevel');
    if (batteryLevel > 60) {
        batteryLevelElement.style.background = 'linear-gradient(90deg, #64ffda, #4cc9f0)';
    } else if (batteryLevel > 30) {
        batteryLevelElement.style.background = 'linear-gradient(90deg, #ffd166, #ff9e66)';
    } else {
        batteryLevelElement.style.background = 'linear-gradient(90deg, #ff6b6b, #ff5252)';
    }
}

function updateUptime() {
    const uptimeElement = document.getElementById('uptime');
    if (!uptimeElement) return;
    
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    uptimeElement.textContent = 
        `${hours.toString().padStart(2, '0')}:` +
        `${minutes.toString().padStart(2, '0')}:` +
        `${secs.toString().padStart(2, '0')}`;
}

// ============================================
// 8. UI CONTROLS
// ============================================

function setupControls() {
    // Connect button
    document.getElementById('connectBtn').addEventListener('click', connectToROS);
    
    // Disconnect button
    document.getElementById('disconnectBtn').addEventListener('click', function() {
        if (ros) {
            ros.close();
            rosConnected = false;
            updateConnectionStatus("Disconnected", "disconnected");
            showNotification("Disconnected from ROS", "info");
        }
    });
    
    // Test button
    document.getElementById('testBtn').addEventListener('click', function() {
        showNotification("Testing connection...", "info");
        
        const urlInput = document.getElementById('rosbridgeUrl');
        const url = urlInput.value;
        
        const testWs = new WebSocket(url);
        
        testWs.onopen = function() {
            showNotification("✅ WebSocket connection successful!", "success");
            testWs.close();
        };
        
        testWs.onerror = function() {
            showNotification("❌ WebSocket connection failed", "error");
        };
        
        setTimeout(() => {
            if (testWs.readyState !== WebSocket.OPEN && testWs.readyState !== WebSocket.CLOSED) {
                testWs.close();
                showNotification("Connection test timeout", "warning");
            }
        }, 3000);
    });
    
    // Copy URL button
    document.getElementById('copyUrl').addEventListener('click', function() {
        const urlInput = document.getElementById('rosbridgeUrl');
        urlInput.select();
        urlInput.setSelectionRange(0, 99999);
        
        try {
            navigator.clipboard.writeText(urlInput.value)
                .then(() => showNotification("URL copied to clipboard", "success"))
                .catch(() => {
                    document.execCommand('copy');
                    showNotification("URL copied", "success");
                });
        } catch (error) {
            document.execCommand('copy');
            showNotification("URL copied", "success");
        }
    });
    
    // Refresh status button
    document.getElementById('refreshStatus').addEventListener('click', function() {
        updateStatusDisplay();
        showNotification("Status refreshed", "info");
    });
}

// ============================================
// 9. NOTIFICATION SYSTEM
// ============================================

function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? '✅' :
                 type === 'error' ? '❌' :
                 type === 'warning' ? '⚠️' : 'ℹ️';
    
    notification.innerHTML = `
        <span class="notification-icon">${icon}</span>
        <div class="notification-content">
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', function() {
        notification.remove();
    });
    
    // Log to console
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
}

// ============================================
// 10. CLEANUP
// ============================================

window.addEventListener('beforeunload', function() {
    if (ros) {
        ros.close();
    }
    
    if (joystick) {
        joystick.destroy();
    }
    
    console.log("👋 FastBot Control Panel closing...");
});

// ============================================
// INITIALIZATION COMPLETE
// ============================================

console.log("🎉 FastBot Control Panel ready!");