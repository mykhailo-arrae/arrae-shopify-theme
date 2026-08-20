# How to target HTML containers

## Why we should use traversals instead of querySelectors

Using the traversals we have created will return an instance of `HTMLElement` instead of an `Element`.

To target a container, add a class with a `js` prefix to the HTML element.
This way we indicate that there is functionality associated with this element.

We should avoid using IDs and targeting containers by ID.
The only valid use of IDs should be for accessibility and HTML validations (like label/input/aria-labelledby/etc).

## Different traversals

### Target single HTMLElement => HTMLElement[] | undefined

```ts
// Wrong
const section = section.querySelector('.js-section');

// Correct
const section = findOneElement(section, '.js-section');
```

### Target multiple elements => HTMLElement[]

```ts
// Wrong
const sections = section.querySelectorAll('.js-section');

// Correct
const sections = findElements(section, '.js-section');
```

### Target sibling elements => HTMLElement[]

#### Target all siblings of target element:

```ts
const section = findOneElement(section, '.js-section')
const siblings = findSiblings(section)

// this will target all of the sibling elements of the `.js-section`
```

#### Target siblings with given selector => HTMLElement[]

```ts
const section = findOneElement(section, '.js-section')
const siblings = findSiblings(section, '.js-element')

// this will target all of the sibling elements of the `.js-section` containing the class '.js-element'
```

An example of where siblings come in handy:

```ts
const TAB_BUTTON_SELECTOR = '.js-tab-button';
const tabButtons = findElements(section, TAB_BUTTON_SELECTOR);

namespace.addDelegatedEventListener(
  section,
  TAB_BUTTON_SELECTOR,
  'click',
  (trigger, evt) => {
    evt.preventDefault();

    tabButtons.forEach((button) => {
      button.classList.remove('active');
    });

    trigger.classList.add('active');
  }
);
```

Could be refactored to:

```ts
namespace.addDelegatedEventListener(
  section,
  '.js-tab-button',
  'click',
  (trigger, evt) => {
    evt.preventDefault();

    const siblings = findSiblings(trigger);

    siblings.forEach((sibling) => {
      sibling.classList.remove('active');
    });

    trigger.classList.add('active');
  }
);
```

There is no need to cache all the tab buttons, and we are not removing and adding functionality to the target selector.
