import '../style.css';
import { isOpenPalm, isClosedFist, SwipeDetector } from './gesture-logic';

// Helper to wait for globals
const waitForGlobal = (name) => {
  return new Promise((resolve) => {
    if (window[name]) return resolve(window[name]);
    const interval = setInterval(() => {
      if (window[name]) {
        clearInterval(interval);
        resolve(window[name]);
      }
    }, 100);
  });
};

async function initApp() {
  const loadingOverlay = document.getElementById('loading-overlay');
  const forceStartBtn = document.getElementById('force-start');
  const videoElement = document.getElementById('input-video');
  const canvasElement = document.getElementById('output-canvas');
  const canvasCtx = canvasElement.getContext('2d');
  const gestureIndicator = document.getElementById('gesture-indicator');
  const toggleBtn = document.getElementById('toggle-camera');
  const toast = document.getElementById('toast');
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');

  let currentSlide = 0;
  let isCameraOn = true;
  let lastGesture = null;
  let audioCtx = null;
  const swipeDetector = new SwipeDetector(0.2, 500);

  // Setup UI functions
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
  };

  const goToSlide = (index) => {
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    currentSlide = (index + slides.length) % slides.length;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
  };

  const updateUI = (gesture) => {
    if (gesture === lastGesture && !gesture.includes('SWIPE')) return;
    gestureIndicator.textContent = gesture || 'Waiting...';
    gestureIndicator.className = gesture ? 'active' : 'idle';
    if (gesture) {
      gestureIndicator.classList.add('detect-pulse');
      setTimeout(() => gestureIndicator.classList.remove('detect-pulse'), 500);
    }
    lastGesture = gesture;
  };

  // Listeners
  forceStartBtn.onclick = () => loadingOverlay.style.display = 'none';

  try {
    const Hands = await waitForGlobal('Hands');
    const Camera = await waitForGlobal('Camera');
    
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`
    });

    hands.setOptions({ maxNumHands: 1, modelComplexity: 0 });
    hands.onResults((results) => {
      loadingOverlay.style.display = 'none';
      canvasCtx.clearRect(0, 0, 640, 480);
      canvasCtx.drawImage(results.image, 0, 0, 640, 480);

      if (results.multiHandLandmarks && results.multiHandLandmarks[0]) {
        const landmarks = results.multiHandLandmarks[0];
        window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: '#6366f1' });
        
        if (isOpenPalm(landmarks)) updateUI('HELLO');
        else if (isClosedFist(landmarks)) updateUI('PAUSE');

        const swipe = swipeDetector.addPosition(landmarks[8], Date.now());
        if (swipe) {
          if (swipe === 'LEFT') { goToSlide(currentSlide + 1); updateUI('SWIPE LEFT'); }
          else { goToSlide(currentSlide - 1); updateUI('SWIPE RIGHT'); }
        }
      }
    });

    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    videoElement.srcObject = stream;
    await videoElement.play();

    const process = async () => {
      if (isCameraOn) await hands.send({ image: videoElement });
      requestAnimationFrame(process);
    };
    process();

  } catch (err) {
    console.error(err);
    alert('Something went wrong. Check console.');
  }
}

initApp();
