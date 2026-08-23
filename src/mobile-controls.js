export class MobileControls {
  constructor(input) {
    this.input = input;
    this.movePad = document.getElementById('movePad');
    this.moveKnob = document.getElementById('moveKnob');
    this.fireButton = document.getElementById('fireButton');
    this.reloadButton = document.getElementById('reloadButton');
    this.interactButton = document.getElementById('interactButton');

    this.movePointerId = null;
    this.firePointers = new Set();
    this.usingPointerEvents = 'PointerEvent' in window;

    if (this.usingPointerEvents) {
      this.bindPointerJoystick();
      this.bindPointerActions();
    } else {
      // Fallback for older iOS Safari versions that do not expose Pointer Events.
      this.bindTouchJoystick();
      this.bindTouchActions();
    }
  }

  updateJoystick(clientX, clientY) {
    const rect = this.movePad.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = Math.max(1, rect.width * 0.32);

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const length = Math.hypot(dx, dy);

    if (length > maxRadius) {
      dx = (dx / length) * maxRadius;
      dy = (dy / length) * maxRadius;
    }

    this.input.moveVector.x = dx / maxRadius;
    this.input.moveVector.y = dy / maxRadius;
    this.moveKnob.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  }

  releaseJoystick() {
    this.movePointerId = null;
    this.input.moveVector.x = 0;
    this.input.moveVector.y = 0;
    this.moveKnob.style.transform = 'translate3d(0, 0, 0)';
  }

  bindPointerJoystick() {
    this.movePad.addEventListener('pointerdown', event => {
      event.preventDefault();
      if (this.movePointerId !== null) return;

      this.movePointerId = event.pointerId;
      try { this.movePad.setPointerCapture(event.pointerId); } catch {}
      this.updateJoystick(event.clientX, event.clientY);
    }, { passive: false });

    this.movePad.addEventListener('pointermove', event => {
      if (event.pointerId !== this.movePointerId) return;
      event.preventDefault();
      this.updateJoystick(event.clientX, event.clientY);
    }, { passive: false });

    const end = event => {
      if (event.pointerId !== this.movePointerId) return;
      event.preventDefault?.();
      this.releaseJoystick();
    };

    this.movePad.addEventListener('pointerup', end, { passive: false });
    this.movePad.addEventListener('pointercancel', end, { passive: false });
    this.movePad.addEventListener('lostpointercapture', end, { passive: false });
  }

  bindPointerActions() {
    this.fireButton.addEventListener('pointerdown', event => {
      event.preventDefault();
      this.firePointers.add(event.pointerId);
      this.input.fireHeld = true;
      this.fireButton.classList.add('pressed');
      try { this.fireButton.setPointerCapture(event.pointerId); } catch {}
    }, { passive: false });

    const stopFire = event => {
      event.preventDefault?.();
      this.firePointers.delete(event.pointerId);
      if (this.firePointers.size === 0) {
        this.input.fireHeld = false;
        this.fireButton.classList.remove('pressed');
      }
    };

    this.fireButton.addEventListener('pointerup', stopFire, { passive: false });
    this.fireButton.addEventListener('pointercancel', stopFire, { passive: false });
    this.fireButton.addEventListener('lostpointercapture', stopFire, { passive: false });

    this.reloadButton.addEventListener('pointerdown', event => {
      event.preventDefault();
      this.input.reloadQueued = true;
    }, { passive: false });

    this.interactButton.addEventListener('pointerdown', event => {
      event.preventDefault();
      this.input.interactQueued = true;
    }, { passive: false });
  }

  findTouchById(touchList, id) {
    for (let i = 0; i < touchList.length; i++) {
      if (touchList[i].identifier === id) return touchList[i];
    }
    return null;
  }

  bindTouchJoystick() {
    this.movePad.addEventListener('touchstart', event => {
      event.preventDefault();
      if (this.movePointerId !== null || event.changedTouches.length === 0) return;

      const touch = event.changedTouches[0];
      this.movePointerId = touch.identifier;
      this.updateJoystick(touch.clientX, touch.clientY);
    }, { passive: false });

    this.movePad.addEventListener('touchmove', event => {
      const touch = this.findTouchById(event.touches, this.movePointerId);
      if (!touch) return;
      event.preventDefault();
      this.updateJoystick(touch.clientX, touch.clientY);
    }, { passive: false });

    const end = event => {
      const touch = this.findTouchById(event.changedTouches, this.movePointerId);
      if (!touch) return;
      event.preventDefault();
      this.releaseJoystick();
    };

    this.movePad.addEventListener('touchend', end, { passive: false });
    this.movePad.addEventListener('touchcancel', end, { passive: false });
  }

  bindTouchActions() {
    this.fireButton.addEventListener('touchstart', event => {
      event.preventDefault();
      for (const touch of event.changedTouches) this.firePointers.add(touch.identifier);
      this.input.fireHeld = true;
      this.fireButton.classList.add('pressed');
    }, { passive: false });

    const stopFire = event => {
      event.preventDefault();
      for (const touch of event.changedTouches) this.firePointers.delete(touch.identifier);
      if (this.firePointers.size === 0) {
        this.input.fireHeld = false;
        this.fireButton.classList.remove('pressed');
      }
    };

    this.fireButton.addEventListener('touchend', stopFire, { passive: false });
    this.fireButton.addEventListener('touchcancel', stopFire, { passive: false });

    this.reloadButton.addEventListener('touchstart', event => {
      event.preventDefault();
      this.input.reloadQueued = true;
    }, { passive: false });

    this.interactButton.addEventListener('touchstart', event => {
      event.preventDefault();
      this.input.interactQueued = true;
    }, { passive: false });
  }

  reset() {
    this.movePointerId = null;
    this.firePointers.clear();
    this.input.moveVector.x = 0;
    this.input.moveVector.y = 0;
    this.input.fireHeld = false;
    this.moveKnob.style.transform = 'translate3d(0, 0, 0)';
    this.fireButton.classList.remove('pressed');
  }
}
