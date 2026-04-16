import '../style.css';

/**
 * Magic Wand - Hand Tracking Interactive UI
 * Version with Debugging and Resilience
 */

// --- Global Error Logger for Deployed Debugging ---
window.onerror = function (msg, url, lineNo, columnNo, error) {
    const errorBox = document.createElement('div');
    errorBox.style.cssText = 'position:fixed; bottom:10px; left:10px; background:rgba(255,0,0,0.8); color:white; padding:10px; z-index:9999; font-family:monospace; font-size:12px; max-width:90%; border-radius:8px;';
    errorBox.innerHTML = `Error: ${msg}<br>at ${lineNo}:${columnNo}`;
    document.body.appendChild(errorBox);
    return false;
};

class Sparkle {
    constructor(x, y, color, isTrail = true) {
        this.x = x;
        this.y = y;
        this.baseSize = isTrail ? Math.random() * 2.5 + 1.5 : Math.random() * 5 + 3;
        this.size = this.baseSize;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.color = color;
        this.alpha = 1;
        this.decay = isTrail ? 0.025 : 0.04;
        this.twinkleFactor = Math.random() * 0.2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        this.size = this.baseSize * (0.8 + Math.sin(Date.now() * 0.02 + this.twinkleFactor * 100) * 0.4);
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        
        const spikes = 4;
        const outerRadius = Math.max(0.1, this.size);
        const innerRadius = outerRadius * 0.4;
        let rot = Math.PI / 2 * 3;
        let cx = this.x;
        let cy = this.y;
        let step = Math.PI / spikes;

        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
            rot += step;
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = "#fff";
        ctx.globalAlpha = this.alpha * 0.8;
        ctx.beginPath();
        ctx.arc(cx, cy, outerRadius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

class SparkleRayEffect {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.sparkles = [];
        this.color = '#C084FC'; 
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    addRaySegment(x1, y1, x2, y2) {
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const density = 0.8;
        const count = Math.max(1, Math.floor(dist * density));
        
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;
            const jitterX = (Math.random() - 0.5) * 4;
            const jitterY = (Math.random() - 0.5) * 4;
            this.sparkles.push(new Sparkle(px + jitterX, py + jitterY, this.color, true));
        }
    }

    addBurst(x, y) {
        for (let i = 0; i < 40; i++) {
            const s = new Sparkle(x, y, '#fff', false);
            const angle = Math.random() * Math.PI * 2;
            const force = Math.random() * 15 + 5;
            s.vx = Math.cos(angle) * force;
            s.vy = Math.sin(angle) * force;
            this.sparkles.push(s);
        }
    }

    update() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = 'lighter';
        for (let i = this.sparkles.length - 1; i >= 0; i--) {
            this.sparkles[i].update();
            this.sparkles[i].draw(this.ctx);
            if (this.sparkles[i].alpha <= 0) {
                this.sparkles.splice(i, 1);
            }
        }
        this.ctx.globalCompositeOperation = 'source-over';
    }
}

class MagicCursor {
    constructor() {
        this.video = document.getElementById('video-element');
        this.guideCanvas = document.getElementById('guide-canvas');
        this.effect = new SparkleRayEffect('particle-canvas');
        
        this.statusDot = document.getElementById('status-dot');
        this.statusText = document.getElementById('status-text');
        this.loader = document.getElementById('loader');
        this.startBtn = document.getElementById('start-btn');
        this.startPrompt = document.getElementById('start-prompt');

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

    init() {
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.startCamera());
        }

        // Show prompt after a short delay
        setTimeout(() => {
            console.log("Forcing loader hide...");
            const spinner = document.querySelector('.loader-spinner');
            const loaderText = document.getElementById('loader-text');
            if (loaderText) loaderText.style.display = 'none';
            if (spinner) spinner.style.display = 'none';
            if (this.startPrompt) {
                this.startPrompt.style.display = 'block';
                this.startPrompt.style.opacity = '1';
            }
        }, 1500);

        this.animate();
    }

    async startCamera() {
        if (this.loader) {
            this.loader.style.opacity = '0';
            setTimeout(() => this.loader.style.display = 'none', 500);
        }

        try {
            // Check for globals
            if (typeof window.Hands === 'undefined' || typeof window.Camera === 'undefined') {
                throw new Error("MediaPipe libraries failed to load from CDN. Please check your network.");
            }

            const hands = new window.Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.7
            });

            hands.onResults((results) => {
                if (this.guideCanvas) {
                    const ctx = this.guideCanvas.getContext('2d');
                    ctx.clearRect(0, 0, this.guideCanvas.width, this.guideCanvas.height);
                    
                    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                        const landmarks = results.multiHandLandmarks[0];
                        const indexTip = landmarks[8];
                        const thumbTip = landmarks[4];

                        this.targetX = (1 - indexTip.x) * window.innerWidth;
                        this.targetY = indexTip.y * window.innerHeight;

                        const distance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
                        if (distance < this.pinchThreshold) {
                            if (!this.isPinching) this.onPinch(this.cursorX, this.cursorY);
                            this.isPinching = true;
                        } else {
                            this.isPinching = false;
                        }

                        if (window.drawConnectors) {
                            window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: '#C084FC', lineWidth: 2 });
                        }
                    }
                }
            });

            const camera = new window.Camera(this.video, {
                onFrame: async () => {
                    await hands.send({ image: this.video });
                },
                width: 6400 / 10, // Avoid large resolution issues
                height: 480
            });
            
            await camera.start();
            this.isActive = true;
            if (this.statusDot) this.statusDot.classList.add('active');
            if (this.statusText) this.statusText.innerText = 'Connected';

        } catch (error) {
            console.error(error);
            alert(`Startup Error: ${error.message}`);
        }
    }

    onPinch(x, y) {
        const burst = document.createElement('div');
        burst.className = 'click-feedback';
        burst.style.left = `${x}px`;
        burst.style.top = `${y}px`;
        document.body.appendChild(burst);
        setTimeout(() => burst.remove(), 500);
        if (this.effect) this.effect.addBurst(x, y);
    }

    animate() {
        this.prevX = this.cursorX;
        this.prevY = this.cursorY;
        this.cursorX += (this.targetX - this.cursorX) * this.smoothing;
        this.cursorY += (this.targetY - this.cursorY) * this.smoothing;

        if (this.isActive && this.effect) {
            this.effect.addRaySegment(this.prevX, this.prevY, this.cursorX, this.cursorY);
        }

        if (this.effect) this.effect.update();
        requestAnimationFrame(() => this.animate());
    }
}

// Global instance to prevent GC
window.magicCursorInstance = new MagicCursor();
