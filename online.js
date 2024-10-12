const SimplePeer = require('simple-peer');

let peer;
let connectionId;
let isHost = false;

document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connectBtn');
    const backBtn = document.getElementById('backBtn');
    const gameContainer = document.getElementById('game-container');
    const connectionInfo = document.getElementById('connection-info');

    connectionId = Math.random().toString(36).substr(2, 9);
    document.getElementById('connectionId').textContent = connectionId;

    connectBtn.addEventListener('click', connectToPeer);
    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    function connectToPeer() {
        const peerId = document.getElementById('peerIdInput').value;
        initializePeerConnection(false, peerId);
    }

    function initializePeerConnection(host, peerId = null) {
        isHost = host;
        peer = new SimplePeer({
            initiator: isHost,
            trickle: false
        });

        peer.on('signal', data => {
            console.log('Generated signal data:', JSON.stringify(data));
            // In a real app, you'd send this data to the other peer via a signaling server
        });

        peer.on('connect', () => {
            console.log('Peer connection established');
            connectionInfo.style.display = 'none';
            gameContainer.style.display = 'block';
            startOnlineGame();
        });

        peer.on('data', data => {
            const message = JSON.parse(data);
            handlePeerMessage(message);
        });

        if (!isHost && peerId) {
            // In a real app, you'd receive this signal data from the other peer via a signaling server
            peer.signal(JSON.parse(peerId));
        }
    }

    function handlePeerMessage(message) {
        if (message.type === 'paddleMove') {
            // Update opponent's paddle position
            player2.y = message.position; // Update player2's position
        } else if (message.type === 'ballUpdate' && !isHost) {
            // Update ball position if you're not the host
            ball.x = message.x;
            ball.y = message.y;
        }
    }

    function startOnlineGame() {
        // Initialize your existing game setup here
        // Then start the game loop
        gameLoop();
    }

    function gameLoop() {
        update();
        render();
        sendGameState();
        requestAnimationFrame(gameLoop);
    }

    function sendGameState() {
        if (peer && peer.connected) {
            const gameState = {
                type: 'paddleMove',
                position: playerPaddleY // Assuming playerPaddleY is your local paddle's Y position
            };
            peer.send(JSON.stringify(gameState));

            if (isHost) {
                const ballState = {
                    type: 'ballUpdate',
                    x: ballX,
                    y: ballY
                };
                peer.send(JSON.stringify(ballState));
            }
        }
    }

    // Add your existing game functions here
    // Make sure to modify them to work with the online play as needed
});
