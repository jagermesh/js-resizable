const COMPONENT_CLASS = 'resizable';
const STYLE_CLASS = `${COMPONENT_CLASS}-styles`;
const HANDLE_DIRECTION_ATTR = 'data-resizable-direction';

const DIRECTION_CURSORS = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};

const STYLE_CSS = `
  .${COMPONENT_CLASS}-handle {
    position: absolute;
    z-index: 1;
    touch-action: none;
  }
  .${COMPONENT_CLASS}-handle-n,
  .${COMPONENT_CLASS}-handle-s {
    left: 0;
    right: 0;
    height: 7px;
  }
  .${COMPONENT_CLASS}-handle-e,
  .${COMPONENT_CLASS}-handle-w {
    top: 0;
    bottom: 0;
    width: 7px;
  }
  .${COMPONENT_CLASS}-handle-n { top: 0; }
  .${COMPONENT_CLASS}-handle-s { bottom: 0; }
  .${COMPONENT_CLASS}-handle-e { right: 0; }
  .${COMPONENT_CLASS}-handle-w { left: 0; }
  .${COMPONENT_CLASS}-handle-ne,
  .${COMPONENT_CLASS}-handle-nw,
  .${COMPONENT_CLASS}-handle-se,
  .${COMPONENT_CLASS}-handle-sw {
    z-index: 2;
    width: 16px;
    height: 16px;
  }
  .${COMPONENT_CLASS}-handle-ne { top: 0; right: 0; }
  .${COMPONENT_CLASS}-handle-nw { top: 0; left: 0; }
  .${COMPONENT_CLASS}-handle-se { bottom: 0; right: 0; }
  .${COMPONENT_CLASS}-handle-sw { bottom: 0; left: 0; }
  .${COMPONENT_CLASS}-handle-se::before,
  .${COMPONENT_CLASS}-handle-sw::before,
  .${COMPONENT_CLASS}-handle-ne::before,
  .${COMPONENT_CLASS}-handle-nw::before {
    content: '';
    position: absolute;
    width: 7px;
    height: 7px;
    opacity: 0.6;
  }
  .${COMPONENT_CLASS}-handle-se::before { right: 4px; bottom: 4px; border-right: 2px solid currentcolor; border-bottom: 2px solid currentcolor; }
  .${COMPONENT_CLASS}-handle-sw::before { left: 4px; bottom: 4px; border-left: 2px solid currentcolor; border-bottom: 2px solid currentcolor; }
  .${COMPONENT_CLASS}-handle-ne::before { right: 4px; top: 4px; border-right: 2px solid currentcolor; border-top: 2px solid currentcolor; }
  .${COMPONENT_CLASS}-handle-nw::before { left: 4px; top: 4px; border-left: 2px solid currentcolor; border-top: 2px solid currentcolor; }
  .${COMPONENT_CLASS}-is-resizing {
    -webkit-user-select: none;
    -moz-user-select: none;
    user-select: none;
  }
`;

class Resizable {
  #ctrl;

  #options;

  #handles = [];

  #generatedHandles = [];

  #resizeState = null;

  #previousBodyCursor = null;

  constructor(ctrl, options) {
    let stylesContainer = document.head.querySelectorAll(`style.${STYLE_CLASS}`);

    if (stylesContainer.length === 0) {
      stylesContainer = document.createElement('style');
      stylesContainer.className = STYLE_CLASS;
      stylesContainer.textContent = STYLE_CSS;
      document.head.append(stylesContainer);
    }

    this.#ctrl = ctrl;

    this.#options = Object.assign({
      handleSelector: null,
      handleDirectionAttr: HANDLE_DIRECTION_ATTR,
      handles: ['n', 's', 'e', 'w', 'se'],
      minWidth: 0,
      minHeight: 0,
      maxWidth: () => Infinity,
      maxHeight: () => Infinity,
      containWithinWindow: true,
      onResizeStart: null,
      onResize: null,
      onResizeEnd: null,
    }, options);

    this.#handles = this.#prepareHandles();

    for (const handle of this.#handles) {
      handle.el.addEventListener('mousedown', (event) => this.#startResize(event, handle.direction));
      handle.el.addEventListener('touchstart', (event) => this.#startResize(event, handle.direction), {
        passive: false,
      });
    }
  }

  destroy() {
    this.#stopResize();
    for (const handle of this.#generatedHandles) {
      handle.remove();
    }
    this.#handles = [];
    this.#generatedHandles = [];
  }

  #prepareHandles() {
    let handles = [];

    if (this.#options.handleSelector) {
      for (const el of this.#ctrl.querySelectorAll(this.#options.handleSelector)) {
        const direction = (el.getAttribute(this.#options.handleDirectionAttr) || '').toLowerCase();
        if (direction) {
          handles.push({
            el,
            direction,
          });
        }
      }
    }

    if (!handles.length && this.#options.handles && this.#options.handles.length) {
      this.#ensurePositioned();

      const directions = Array.isArray(this.#options.handles) ?
        this.#options.handles :
        String(this.#options.handles).split(',').map((item) => item.trim()).filter(Boolean);

      for (const direction of directions) {
        const el = this.#createHandle(direction);
        this.#ctrl.appendChild(el);
        this.#generatedHandles.push(el);
        handles.push({
          el,
          direction,
        });
      }
    }

    return handles;
  }

  #ensurePositioned() {
    if (window.getComputedStyle(this.#ctrl).position === 'static') {
      this.#ctrl.style.position = 'relative';
    }
  }

  #createHandle(direction) {
    const el = document.createElement('div');

    el.className = `${COMPONENT_CLASS}-handle ${COMPONENT_CLASS}-handle-${direction}`;
    el.style.cursor = DIRECTION_CURSORS[direction] || 'default';

    return el;
  }

  #resolveLimit(limit, fallback) {
    const value = typeof limit === 'function' ? limit() : limit;
    return (typeof value === 'number' && !Number.isNaN(value)) ? value : fallback;
  }

  #clampSize(width, height) {
    const minWidth = this.#resolveLimit(this.#options.minWidth, 0);
    const minHeight = this.#resolveLimit(this.#options.minHeight, 0);
    const maxWidth = this.#resolveLimit(this.#options.maxWidth, Infinity);
    const maxHeight = this.#resolveLimit(this.#options.maxHeight, Infinity);

    return {
      width: Math.min(Math.max(width, minWidth), Math.max(minWidth, maxWidth)),
      height: Math.min(Math.max(height, minHeight), Math.max(minHeight, maxHeight)),
    };
  }

  #ensureFixedPosition() {
    const ctrl = this.#ctrl;

    if ((ctrl.style.position === 'fixed') && ctrl.style.left && ctrl.style.top) {
      return;
    }

    const rect = ctrl.getBoundingClientRect();

    ctrl.style.position = 'fixed';
    ctrl.style.left = `${rect.left}px`;
    ctrl.style.top = `${rect.top}px`;
    ctrl.style.right = '';
    ctrl.style.bottom = '';
    ctrl.style.marginTop = '0px';
    ctrl.style.marginLeft = '0px';
  }

  #startResize(event, direction) {
    if ((event.type === 'mousedown') && (event.button !== 0)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.#ensureFixedPosition();

    const rect = this.#ctrl.getBoundingClientRect();
    const point = event.type === 'touchstart' ? event.touches[0] : event;

    this.#resizeState = {
      direction,
      startX: point.clientX,
      startY: point.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startLeft: rect.left,
      startTop: rect.top,
    };

    this.#ctrl.classList.add(`${COMPONENT_CLASS}-is-resizing`);
    this.#previousBodyCursor = document.body.style.cursor;
    document.body.style.cursor = DIRECTION_CURSORS[direction] || 'default';

    if (typeof this.#options.onResizeStart === 'function') {
      this.#options.onResizeStart(this.#resizeState, event);
    }

    window.addEventListener('mousemove', this.#onPointerMove);
    window.addEventListener('mouseup', this.#stopResize);
    window.addEventListener('touchmove', this.#onPointerMove, {
      passive: false,
    });
    window.addEventListener('touchend', this.#stopResize);
  }

  #onPointerMove = (event) => {
    if (!this.#resizeState) {
      return;
    }

    const point = event.type === 'touchmove' ? event.touches[0] : event;
    const {
      direction, startX, startY, startWidth, startHeight, startLeft, startTop,
    } = this.#resizeState;

    let nextWidth = startWidth;
    let nextHeight = startHeight;

    if (direction.includes('e')) {
      nextWidth = startWidth + (point.clientX - startX);
    } else if (direction.includes('w')) {
      nextWidth = startWidth + (startX - point.clientX);
    }

    if (direction.includes('s')) {
      nextHeight = startHeight + (point.clientY - startY);
    } else if (direction.includes('n')) {
      nextHeight = startHeight + (startY - point.clientY);
    }

    const clamped = this.#clampSize(nextWidth, nextHeight);

    let nextLeft = startLeft;
    let nextTop = startTop;

    if (direction.includes('w')) {
      nextLeft = startLeft + (startWidth - clamped.width);
    }
    if (direction.includes('n')) {
      nextTop = startTop + (startHeight - clamped.height);
    }

    if (this.#options.containWithinWindow) {
      nextLeft = Math.max(0, Math.min(nextLeft, window.innerWidth - clamped.width));
      nextTop = Math.max(0, Math.min(nextTop, window.innerHeight - clamped.height));
    }

    this.#ctrl.style.width = `${clamped.width}px`;
    this.#ctrl.style.height = `${clamped.height}px`;
    this.#ctrl.style.left = `${nextLeft}px`;
    this.#ctrl.style.top = `${nextTop}px`;
    this.#ctrl.style.right = '';
    this.#ctrl.style.bottom = '';

    event.preventDefault();

    if (typeof this.#options.onResize === 'function') {
      this.#options.onResize({
        width: clamped.width,
        height: clamped.height,
        left: nextLeft,
        top: nextTop,
      }, event);
    }
  };

  #stopResize = (event) => {
    if (!this.#resizeState) {
      return;
    }

    this.#resizeState = null;
    this.#ctrl.classList.remove(`${COMPONENT_CLASS}-is-resizing`);
    document.body.style.cursor = this.#previousBodyCursor || '';

    window.removeEventListener('mousemove', this.#onPointerMove);
    window.removeEventListener('mouseup', this.#stopResize);
    window.removeEventListener('touchmove', this.#onPointerMove);
    window.removeEventListener('touchend', this.#stopResize);

    if (typeof this.#options.onResizeEnd === 'function') {
      const rect = this.#ctrl.getBoundingClientRect();
      this.#options.onResizeEnd({
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
      }, event);
    }
  };
}

export default Resizable;
