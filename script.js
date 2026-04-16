/**
 * Magic Wand - Hand Tracking Interactive UI
 * Core Script - Sparkle Ray Version
 */

class Sparkle {
    constructor(x, y, color, isTrail = true) {
        this.x = x;
        this.y = y;
        this.baseSize = isTrail ? Math.random() * 2 + 1 : Math.random() * 4 + 2;
        this.size = this.baseSize;
        
        // Particles move slightly for a "shimmer" effect
        this.vz = Math.random() * 0.5 + 0.1; 
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = (Math.random() - 0.5) * 1;
        
        this.color = color;
        this.alpha = 1;
        this.decay = isTrail ? 0.03 : 0.05;
        this.twinkle = Math.random() * 0.1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        // Twinkle effect (size pulsation)
        this.size = this.baseSize * (1 + Math.sin(Date.now() * this.twinkle) * 0.5);
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        
        // Star shape or diamond for sparkles
        const spikes = 4;
        const outerRadius = this.size;
        const innerRadius = this.size / 2;
        let rot = Math.PI / 2 * 3;
        let cx = this.x;
        let cy = this.y;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

class SparkleRayEffect {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.sparkles = [];
        this.color = '#C084FC'; // Sparkly Light Purple
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    addRaySegment(x1, y1, x2, y2) {
        // Create a line of sparkles between the previous and current position
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const density = 0.5; // sparkles per pixel
        const count = Math.max(1, Math.floor(dist * density));

        for (let i = 0; i < count; i++) {
            const t = i / count;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;
            
            // Add slight jitter to keep it "sparkly"
            const jitterX = (Math.random() - 0.5) * 5;
            const jitterY = (Math.random() - 0.5) * 5;
            
            this.sparkles.push(new Sparkle(px + jitterX, py + jitterY, this.color, true));
        }
    }

    addBurst(x, y) {
        for (let i = 0; i < 30; i++) {
            const s = new Sparkle(x, y, '#fff', false);
            s.vx = (Math.random() - 0.5) * 15;
            s.vy = (Math.random() - 0.5) * 15;
            this.sparkles.push(s);
        }
    }

    update() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw all sparkles
        for (let i = this.sparkles.length - 1; i >= 0; i--) {
            this.sparkles[i].update();
            this.sparkles[i].draw(this.ctx);
            if (this.sparkles[i].alpha <= 0) {
                this.sparkles.splice(i, 1);
            }
        }
    }
}

class MagicCursor {
    constructor() {
        this.video = document.getElementById('video-element');
        this.guideCanvas = document.getElementById('guide-canvas');
        this.guideCtx = this.guideCanvas.getContext('2d');
        this.effect = new SparkleRayEffect('particle-canvas');
        
        this.statusDot = document.getElementById('status-dot');
        this.statusText = document.getElementById('status-text');
        this.loader = document.getElementById('loader');
        this.startBtn = document.getElementById('start-btn');
        this.startPrompt = document.getElementById('start-prompt');
        this.loaderText = document.getElementById('loader-text');

        // State
        this.cursorX = window.innerWidth / 2;
        this.cursorY = window.innerHeight / 2;
        this.prevX = this.cursorX;
        this.prevY = this.cursorY;
        this.targetX = this.cursorX;
        this.targetY = this.cursorY;
        
        this.isPinching = false;
        this.pinchThreshold = 0.05;
        this.smoothing = 0.25; 
        this.isActive = false;

        this.init();
    }

    async init() {
        this.startBtn.addEventListener('click', () => this.startCamera());

        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });

        this.hands.onResults((results) => this.onResults(results));

        setTimeout(() => {
            if (this.loaderText) this.loaderText.style.display = 'none';
            const spinner = document.querySelector('.loader-spinner');
            if (spinner) spinner.style.display = 'none';
            if (this.startPrompt) this.startPrompt.style.display = 'block';
        }, 1000);

        this.animate();
    }

    async startCamera() {
        if (this.loader) this.loader.style.opacity = '0';
        setTimeout(() => { if (this.loader) this.loader.style.display = 'none'; }, 500);

        const camera = new Camera(this.video, {
            onFrame: async () => {
                await this.hands.send({ image: this.video });
            },
            width: 640,
            height: 480
        });
        camera.start();
        this.isActive = true;
        if (this.statusDot) this.statusDot.classList.add('active');
        if (this.statusText) this.statusText.innerText = 'Connected';
    }

    onResults(results) {
        this.guideCtx.clearRect(0, 0, this.guideCanvas.width, this.guideCanvas.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];

            this.targetX = (1 - indexTip.x) * window.innerWidth;
            this.targetY = indexTip.y * window.innerHeight;

            const distance = Math.hypot(
                indexTip.x - thumbTip.x,
                indexTip.y - thumbTip.y
            );

            if (distance < this.pinchThreshold) {
                if (!this.isPinching) {
                    this.onPinch(this.cursorX, this.cursorY);
                }
                this.isPinching = true;
            } else {
                this.isPinching = false;
            }

            drawConnectors(this.guideCtx, landmarks, HAND_CONNECTIONS, { color: '#C084FC', lineWidth: 2 });
            drawLandmarks(this.guideCtx, landmarks, { color: '#fff', lineWidth: 1, radius: 2 });
        }
    }

    onPinch(x, y) {
        const burst = document.createElement('div');
        burst.className = 'click-feedback';
        burst.style.left = `${x}px`;
        burst.style.top = `${y}px`;
        burst.style.boxShadow = '0 0 40px #C084FC';
        document.body.appendChild(burst);
        setTimeout(() => burst.remove(), 500);

        this.effect.addBurst(x, y);
    }

    animate() {
        // Store previous position
        this.prevX = this.cursorX;
        this.prevY = this.cursorY;

        // Smooth update
        this.cursorX += (this.targetX - this.cursorX) * this.smoothing;
        this.cursorY += (this.targetY - this.cursorY) * this.smoothing;

        if (this.isActive) {
            // Fill the path between previous and current with sparkles to form a "ray"
            this.effect.addRaySegment(this.prevX, this.prevY, this.cursorX, this.cursorY);
        }

        this.effect.update();
        requestAnimationFrame(() => this.animate());
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new MagicCursor();
});
