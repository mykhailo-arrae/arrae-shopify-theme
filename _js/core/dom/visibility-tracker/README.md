# Visibility Tracker Module

Visibility Trackers is our internal wrapper on the IntersectionObserver API similar to FIndElements is our wrapper on querySelectorAll.

## Setup

Creating a visibilityTracker is very similar to creating an IntersectionObserver. The instantiation function accepts the same root, threshold, and rootMargin arguments as you would expect from the IntersectionObserver API [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API).

```typescript
// Default. Root element is the viewport; threshold is [0.25] (Fires when element is 25% visbile in the viewport).
const visibilityTracker = makeVisibilityTracker()

// Fires when a margin of 4px outside of the elements container is halfway visible inside of the myScrollContainer element.
const myScrollContainer = findOneElement(...)
const visibilityTracker = makeVisibilityTracker({
  threshold: [0.5],
  root: { type: "element", element: myScrollContainer},
  rootMargin: "4px"
})
```

## Usage

Each visibilityTracker callback fires when the element or elements tracked by the `visibilityTracker.track()` method enter or exit the viewport while fulfilling the threshold, root, and rootMargin values supplied to the `makeVisibilityTracker` function.

The `track()` method returns an `untrack()` method in case you wish to manually clean up an element or remove it from tracking without destroying the `visibilityTracker`.

Finally, `visibilityTracker.destroy()` should be called in all `snippet.unload()`, `section.unload()`, or other Garbage Collection methods to unset the observer and clean up its callbacks.

### Basic Example

```typescript
// Basic example: Do something when element becomes visible. Do something when it goes away.

const {untrack} = visibilityTracker.track(watchedElement, ({ isVisible }) => {
  if (isVisible) {
    // Response to watchedElement becoming "visible" as defined by the initial arguments
    // passed to makeVisibilityTracker
  } else {
    // Response to watchedElement leaving the rootElement / becoming invisible in the
    // rootElement as defined by the initial arguments passed to makeVisibilityTracker.
  }
})
```

### Complex Example

The following example demonstrates lazyLoading in a site built with islands architecture. It demos a use case for the `untrack()` method returned by `visibilityTracker.track()`.

```TypeScript
islands.forEach((island) => {
  let loadedState: 'initialized' | 'loading' | null = null
  const { untrack } = visibilityTracker.track(island, ({ isVisible }) => {
    if (!isVisible || loadedState !== null) {
      return
    }

    loadedState = 'loading'
    const importMapEntries = initMyElement(island)

    loadIslandJSFor(importMapEntries)
      .then(() => {
        loadedState = 'initialized'
        untrack()
      })
      .catch((e: unknown) => {
        loadedState = null
        console.error(e)
      })
  })
})

return {
  unload: () => {
    visibilityTracker.destroy()
  }
}
```
