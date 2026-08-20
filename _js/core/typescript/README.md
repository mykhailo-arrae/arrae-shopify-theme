# How to use guards

## Why we should use guards

We should not be using type assertions.
To avoid this, we can use guards.
The guard will typically return a boolean whether the element is of the required type or not.

### Examples of type asertions that we should avoid

:x: Wrong:
```ts
// We don't know if the event target is an HTMLElement. So we should not tell Typescript that it will always be an HTMLElement, so it stops caring what the type is.
const element = event.currentTarget as HTMLElement

// This can also be taken as a type assertion.
const video = section.querySelector<HTMLVideoElement>('video')
```

## How to use guards

### Simple guards

Check directly with the `instanceof` operator.

```ts
if (element instanceof HTMLButtonElement) {
  // Do magic
}
```

### Complex guards

These are usually found in the guards folder - `_js/core/typescript/`.
If the guard is more complex, it may be separated as a separate file.
More common ones can be found in the `guards.ts` file.
It is up to the developer to choose which to use, a function guard or the simple ones.

An example of a guard for an element that is not `undefined` or `null` is:

```ts
export const isPresent = <T>(t: T | undefined | null | void): t is T => {
  return t !== undefined && t !== null;
};

// Usage
const targets = input.cart.lines
  .map((line) => {
    const { merchandise } = line;

    if (merchandise.__typename !== 'ProductVariant') {
      return null;
    }

    if (merchandise.__typename !== 'CustomProduct') {
      return undefined;
    }

    return {
      productVariant: {
        id: merchandise.id,
      },
    };
  })
  .filter(isPresent);

// This will remove the targets that are null or undefined.
```

An example guard for [HTMLIframeElement](/_js/core/dom/guards.ts)

```ts
export const isHTMLIFrameElement = (
  t: Element | null
): t is HTMLIFrameElement => {
  return t instanceof HTMLIFrameElement;
};

// Usage
const video = findOneElement(section, '.js-video');

if (isHTMLIFrameElement(video)) {
  // we have a video element and it is an HTMLIframeElement instance
}
```
