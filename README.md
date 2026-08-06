# Resizable

Simple, lightweight pure JavaScript component that adds resize handles to any element.

## Demo

Open `demo.html` from this repo directly in your browser (no build step required) to see it in action.

## Installation

### As an npm module

~~~
npm install @jagermesh/js-resizable
~~~

~~~js
import Resizable from '@jagermesh/js-resizable';

const resizable = new Resizable(document.querySelector('.box'));
~~~

### As a plain `<script>` tag

~~~html
<script src="https://cdn.jsdelivr.net/npm/@jagermesh/js-resizable/dist/resizable.min.js"></script>
<script>
  const resizable = new window.Resizable(document.querySelector('.box'));
</script>
~~~

(or use your own copy of `dist/resizable.min.js`). Either way, the component is exposed as
`window.Resizable`.

## Usage

1) Make sure the element you want to resize can be positioned (the component will switch it to
`position: fixed` for you the first time a resize starts, if it isn't already).

2) Create a `Resizable` instance:

~~~js
const resizable = new Resizable(document.querySelector('.box'));
~~~

By default this generates `n`, `s`, `e`, `w` and `se` drag handles as children of the element and
appends them to it.

3) Customize if needed:

~~~js
const resizable = new Resizable(document.querySelector('.box'), {
  handles: ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'], // which handles to generate
  minWidth: 120,
  minHeight: 80,
  maxWidth: () => window.innerWidth - 40,   // can be a number or a function
  maxHeight: 600,
  containWithinWindow: true,                // keep the element inside the viewport while resizing
  onResizeStart: (state, event) => {},
  onResize: (size, event) => {},            // size: { width, height, left, top }
  onResizeEnd: (size, event) => {},
});
~~~

4) Use your own handle elements instead of the generated ones, if you'd rather style/position them
yourself:

~~~html
<div class="box">
  <div class="my-handle" data-resizable-direction="se"></div>
</div>
~~~

~~~js
const resizable = new Resizable(document.querySelector('.box'), {
  handleSelector: '.my-handle',
  handleDirectionAttr: 'data-resizable-direction', // default shown, customizable if you need to
});
~~~

5) Clean up when you no longer need it (removes any handles the component generated for you and
stops any in-progress resize):

~~~js
resizable.destroy();
~~~

Available options:

- `handleSelector` (string, default `null`) - use your own handle elements matching this selector
  instead of generating them; each must carry a direction via `handleDirectionAttr`.
- `handleDirectionAttr` (string, default `'data-resizable-direction'`) - attribute read off custom
  handle elements (see `handleSelector`) to know which direction (`n`/`s`/`e`/`w`/`ne`/`nw`/`se`/`sw`)
  they resize.
- `handles` (array or comma-separated string, default `['n', 's', 'e', 'w', 'se']`) - which handles
  to auto-generate when `handleSelector` isn't used.
- `minWidth` / `minHeight` (number or function returning a number, default `0`).
- `maxWidth` / `maxHeight` (number or function returning a number, default unlimited).
- `containWithinWindow` (boolean, default `true`) - keep the element inside the browser viewport.
- `onResizeStart(state, event)` - called once when a resize begins.
- `onResize(size, event)` - called on every pointer move while resizing, with `{ width, height, left, top }`.
- `onResizeEnd(size, event)` - called once when a resize ends, with the final `{ width, height, left, top }`.

See `demo.html` for a runnable example of all the options above.

If you also want to drag the same element around, you can pair this with
[`@jagermesh/js-draggable`](https://cdn.jsdelivr.net/npm/@jagermesh/js-draggable/dist/draggable.min.js):

~~~html
<script src="https://cdn.jsdelivr.net/npm/@jagermesh/js-resizable/dist/resizable.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@jagermesh/js-draggable/dist/draggable.min.js"></script>
<script>
  const box = document.querySelector('.box');
  new window.Draggable(box, { handler: '.title-bar' });
  new window.Resizable(box);
</script>
~~~
