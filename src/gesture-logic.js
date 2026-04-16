/**
 * Gesture Detection Logic
 * Based on hand landmarks from MediaPipe
 */

// Landmarks mapping
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;

const INDEX_MCP = 5;
const MIDDLE_MCP = 9;
const RING_MCP = 13;
const PINKY_MCP = 17;

/**
 * Detects if the hand is in an open palm position
 */
export function isOpenPalm(landmarks) {
  // Check if tips of all 4 fingers are above their MCP joints
  // (In image coordinates, Y decreases as you go up)
  return (
    landmarks[INDEX_TIP].y < landmarks[INDEX_MCP].y &&
    landmarks[MIDDLE_TIP].y < landmarks[MIDDLE_MCP].y &&
    landmarks[RING_TIP].y < landmarks[RING_MCP].y &&
    landmarks[PINKY_TIP].y < landmarks[PINKY_MCP].y
  );
}

/**
 * Detects if the hand is in a closed fist position
 */
export function isClosedFist(landmarks) {
  return (
    landmarks[INDEX_TIP].y > landmarks[INDEX_MCP].y &&
    landmarks[MIDDLE_TIP].y > landmarks[MIDDLE_MCP].y &&
    landmarks[RING_TIP].y > landmarks[RING_MCP].y &&
    landmarks[PINKY_TIP].y > landmarks[PINKY_MCP].y
  );
}

/**
 * Detects swipe gestures by tracking hand movement over time
 */
export class SwipeDetector {
  constructor(threshold = 0.15, timeLimit = 300) {
    this.history = [];
    this.threshold = threshold; // Percentage of screen width
    this.timeLimit = timeLimit; // ms
  }

  addPosition(point, timestamp) {
    this.history.push({ x: point.x, timestamp });
    
    // Cleanup old history
    const limit = timestamp - this.timeLimit;
    while (this.history.length > 0 && this.history[0].timestamp < limit) {
      this.history.shift();
    }

    if (this.history.length < 2) return null;

    const start = this.history[0];
    const end = this.history[this.history.length - 1];
    const dx = end.x - start.x;

    if (Math.abs(dx) > this.threshold) {
      this.history = []; // Reset after detection to prevent double triggers
      return dx > 0 ? 'RIGHT' : 'LEFT';
    }

    return null;
  }
}
