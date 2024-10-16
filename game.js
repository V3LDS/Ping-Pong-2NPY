let canvas, ctx;
let player1, player2, ball;
let player1Score = 0; // Initialize Player 1 score
let player2Score = 0; // Initialize Player 2 score;
let gameState = 'title';
let countdown = null;
let myPeerId;
let isHost = false;
let peer;
let conn;
let particles = [];
let isLocalMultiplayer = false;
let ballHistory = []; // Store previous ball states
const MAX_HISTORY = 10; // Number of states to keep for interpolation

const paddleWidth = 10;
const paddleHeight = 60;
const ballRadius = 5;
const paddleSpeed = 5;
const WINNING_SCORE = 5;

function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 400;

    resetGameObjects();
    addEventListeners();
    gameLoop();
}

function resetGameObjects() {
    player1 = {
        x: 10,
        y: canvas.height / 2 - paddleHeight / 2,
        width: paddleWidth,
        height: paddleHeight,
        dy: 0
    };

    player2 = {
        x: canvas.width - paddleWidth - 10,
        y: canvas.height / 2 - paddleHeight / 2,
        width: paddleWidth,
        height: paddleHeight,
        dy: 0
    };

    ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: ballRadius,
        dx: 5,
        dy: 5
    };

    player1Score = 0;
    player2Score = 0;
    particles = [];
}

function addEventListeners() {
    document.getElementById('singlePlayerBtn').addEventListener('click', startSinglePlayerGame);
    document.getElementById('localMultiplayerBtn').addEventListener('click', startLocalMultiplayerGame);
    document.getElementById('onlinePlayBtn').addEventListener('click', startOnlinePlay);
    document.getElementById('quitBtn').addEventListener('click', () => window.close());
    document.getElementById('connectBtn').addEventListener('click', connectToPeer);
    document.getElementById('backBtn').addEventListener('click', returnToMainMenu);
    document.getElementById('playAgainBtn').addEventListener('click', playAgain);
    document.getElementById('mainMenuBtn').addEventListener('click', returnToMainMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
}

function startSinglePlayerGame() {
    console.log("Starting single player game");
    isLocalMultiplayer = false;
    startLocalPlay();
}

function startLocalMultiplayerGame() {
    console.log("Starting local multiplayer game");
    isLocalMultiplayer = true;
    startLocalPlay();
}

function startLocalPlay() {
    console.log("Starting local play");
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    gameState = 'playing';
    resetGameObjects();
    startCountdown();
}

function startOnlinePlay() {
    gameState = 'connecting';
    document.getElementById('menu').style.display = 'none';
    document.getElementById('online-menu').style.display = 'flex';
    document.getElementById('peerIdDisplay').style.display = 'block';

    const id = generateConsistentId();
    peer = new Peer(id, {
        debug: 2
    });

    peer.on('open', (id) => {
        myPeerId = id;
        document.getElementById('connectionId').textContent = id;
        console.log('My peer ID is: ' + id);
    });

    peer.on('error', (error) => {
        console.error('Failed to create peer:', error);
        showError("Failed to create a connection. Please try again.");
    });

    peer.on('connection', (connection) => {
        conn = connection;
        setupConnection();
    });
}

function connectToPeer() {
    console.log("Connecting to peer");
    const peerId = document.getElementById('peerIdInput').value.toUpperCase();
    if (peerId && peerId !== myPeerId && peerId.length === 3) {
        conn = peer.connect(peerId);
        setupConnection();
    } else {
        showError("Invalid Connection ID. Please enter a 3-character ID.");
    }
}

function setupConnection() {
    conn.on('open', () => {
        isHost = true; // Set the host
        startGame();
    });

    conn.on('data', (data) => {
        handlePeerMessage(JSON.parse(data)); // Handle incoming messages
    });

    conn.on('close', () => {
        returnToMainMenu();
    });
}

function startGame() {
    document.getElementById('online-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    gameState = 'playing';
    resetGameObjects();
    startCountdown();
}

function returnToMainMenu() {
    console.log("Returning to main menu");
    gameState = 'title';
    document.getElementById('menu').style.display = 'flex';
    document.getElementById('online-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('peerIdDisplay').style.display = 'none';
    document.getElementById('game-over-menu').style.display = 'none';
    if (peer) {
        peer.destroy();
        peer = null;
    }
    resetGameObjects();
}

function handleKeyDown(e) {
    if (gameState === 'playing') {
        // Player 1 (left) controls
        if (e.key === 'w') {
            player1.dy = -paddleSpeed;
        } else if (e.key === 's') {
            player1.dy = paddleSpeed;
        }
        // Player 2 (right) controls
        if (e.key === 'ArrowUp') {
            player2.dy = -paddleSpeed;
        } else if (e.key === 'ArrowDown') {
            player2.dy = paddleSpeed;
        }
    }
}

function handleKeyUp(e) {
    if (gameState === 'playing') {
        // Player 1 (left) controls
        if (e.key === 'w' || e.key === 's') {
            player1.dy = 0;
        }
        // Player 2 (right) controls
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            player2.dy = 0;
        }
    }
}

function update() {
    if (gameState === 'playing') {
        if (countdown === null) {
            updatePaddles();
            updateBall();
            checkCollisions();
            checkScore();
        }
    } else if (gameState === 'gameOver') {
        updateParticles();
    }
}

function updatePaddles() {
    player1.y += player1.dy;
    player1.y = Math.max(Math.min(player1.y, canvas.height - paddleHeight), 0);

    player2.y += player2.dy;
    player2.y = Math.max(Math.min(player2.y, canvas.height - paddleHeight), 0);
}

function updateBall() {
    // Update ball position based on its velocity
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Store the current ball state
    ballHistory.push({ x: ball.x, y: ball.y, timestamp: Date.now() });

    // Limit the history size
    if (ballHistory.length > MAX_HISTORY) {
        ballHistory.shift(); // Remove the oldest state
    }
}

function checkCollisions() {
    // Ball collision with top and bottom walls
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.dy *= -1;
    }

    // Ball collision with paddles
    if (
        (ball.x - ball.radius < player1.x + player1.width && ball.y > player1.y && ball.y < player1.y + player1.height) ||
        (ball.x + ball.radius > player2.x && ball.y > player2.y && ball.y < player2.y + player2.height)
    ) {
        ball.dx *= -1;
    }
}

function checkScore() {
    if (ball.x - ball.radius < 0) {
        player2Score++;
        sendScoreUpdate(); // Send score update to the other player
        resetBall();
    } else if (ball.x + ball.radius > canvas.width) {
        player1Score++;
        sendScoreUpdate(); // Send score update to the other player
        resetBall();
    }

    // Ensure scores are not negative
    player1Score = Math.max(player1Score, 0);
    player2Score = Math.max(player2Score, 0);

    if (player1Score >= WINNING_SCORE || player2Score >= WINNING_SCORE) {
        gameState = 'gameOver';
        createParticles();
        document.getElementById('game-over-menu').style.display = 'block';
    }
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = Math.random() > 0.5 ? 5 : -5;
    ball.dy = Math.random() > 0.5 ? 5 : -5;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'title') {
        drawTitle();
    } else if (gameState === 'playing') {
        drawGame();
    } else if (gameState === 'gameOver') {
        drawGameOver();
        drawParticles();
    }
}

function drawTitle() {
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Online Pong', canvas.width / 2, canvas.height / 2);
}

function drawGame() {
    // Draw paddles
    ctx.fillStyle = 'white';
    ctx.fillRect(player1.x, player1.y, player1.width, player1.height);
    ctx.fillRect(player2.x, player2.y, player2.width, player2.height);

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.closePath();

    // Draw scores with correct font
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(player1Score, canvas.width / 4, 30);
    ctx.fillText(player2Score, 3 * canvas.width / 4, 30);

    // Draw countdown
    if (countdown !== null) {
        ctx.font = '48px Arial';
        ctx.fillText(countdown, canvas.width / 2, canvas.height / 2);
    }
}

function drawGameOver() {
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '24px Arial';
    ctx.fillText(`Player 1: ${player1Score} | Player 2: ${player2Score}`, canvas.width / 2, canvas.height / 2);
    drawParticles();
}

function startCountdown() {
    countdown = 3;
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown === 0) {
            clearInterval(countdownInterval);
            countdown = null;
        }
    }, 1000);
}

function createParticles() {
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            radius: Math.random() * 3 + 1,
            color: `hsl(${Math.random() * 360}, 50%, 50%)`,
            velocity: {
                x: (Math.random() - 0.5) * 5,
                y: (Math.random() - 0.5) * 5
            }
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].x += particles[i].velocity.x;
        particles[i].y += particles[i].velocity.y;
        particles[i].velocity.y += 0.1; // gravity
        particles[i].radius -= 0.02;

        if (particles[i].radius <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
    });
}

function gameLoop() {
    update();
    interpolateBall(); // Call interpolation
    draw();
    sendPeerData(); // Send paddle and ball data
    requestAnimationFrame(gameLoop);
}

function handlePeerMessage(data) {
    if (data.type === 'paddleMove') {
        // Update opponent's paddle position
        player2.y = data.position; // Update player2's position
    } else if (data.type === 'ballUpdate') {
        // Update ball position if you're not the host
        ball.x = data.x;
        ball.y = data.y;

        // Store the received ball state
        ballHistory.push({ x: ball.x, y: ball.y, timestamp: Date.now() });

        // Limit the history size
        if (ballHistory.length > MAX_HISTORY) {
            ballHistory.shift(); // Remove the oldest state
        }
    } else if (data.type === 'scoreUpdate') {
        // Update scores from the other player
        player1Score = data.player1Score;
        player2Score = data.player2Score;
    }
}

function sendPeerData() {
    if (conn && conn.open) {
        // Send paddle position
        const paddleData = {
            type: 'paddleMove',
            position: player1.y // Send player1's paddle position
        };
        conn.send(JSON.stringify(paddleData));

        // Send ball position if host
        if (isHost) {
            const ballData = {
                type: 'ballUpdate',
                x: ball.x,
                y: ball.y
            };
            conn.send(JSON.stringify(ballData));
        }
    }
}

function showError(message) {
    // Implement error display logic
    console.error(message);
}

function playAgain() {
    resetGameObjects();
    gameState = 'playing';
    document.getElementById('game-over-menu').style.display = 'none';
    startCountdown();
}

// Initialize the game when the page loads
window.onload = initGame;

function generateConsistentId() {
    // Get a unique identifier for the user's browser
    let uniqueId = navigator.userAgent + navigator.language + screen.width + screen.height;
    
    // Use a simple hash function to convert the uniqueId to a number
    let hash = 0;
    for (let i = 0; i < uniqueId.length; i++) {
        const char = uniqueId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert the hash to a 3-character string
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 3; i++) {
        result += characters.charAt(Math.abs(hash) % characters.length);
        hash = Math.floor(hash / characters.length);
    }
    
    return result;
}

function sendScoreUpdate() {
    if (conn && conn.open) {
        const scoreData = {
            type: 'scoreUpdate',
            player1Score: player1Score,
            player2Score: player2Score
        };
        conn.send(JSON.stringify(scoreData));
    }
}

function interpolateBall() {
    if (ballHistory.length > 1) {
        const now = Date.now();
        const lastState = ballHistory[ballHistory.length - 1];
        const previousState = ballHistory[ballHistory.length - 2];

        // Calculate the time difference
        const timeDiff = now - previousState.timestamp;
        const totalDiff = lastState.timestamp - previousState.timestamp;

        // Calculate interpolation factor
        const t = timeDiff / totalDiff;

        // Interpolate ball position
        ball.x = previousState.x + (lastState.x - previousState.x) * t;
        ball.y = previousState.y + (lastState.y - previousState.y) * t;
    }
}
