# How To Use Event Namespaces

## Why should we use namespaces

- Namespaces simplify the way we think for attaching functionality to elements.
- Namespaces delegate the event to a parent (typically the section), which is rarely dynamic, so there is no need to reattach all the listeners if the section content changes.
- Namespaces remove all events attached to the namespace when we unload the section. No need for complex loops, caching functions, then looping them all again to remove the listeners on unload.

## How to use namespaces

### Delegated events - (the most common case)

:x: Wrong:

```ts
const buttons = section.querySelectorAll('.js-button')

buttons.forEach((button) => {
  button.addEventListener('click', (evt) => {
    // Do some magic
  })
})

// 99% of the time we forget to remove the event listener when we unload the section.
// This is a bad practice.
```

:white_check_mark: Correct:

```ts
namespace.addDelegatedEventListener(
  section,
  '.js-button',
  'click',
  (trigger, evt) => {
    // Do some magic
  }
)
```

### Direct events - used rarely where the event cannot be delegated

Currently we've discovered that 'timeupdate' and 'ended' on the audio tag cannot be delegated and need to be added as direct listeners.

```ts
const handleCardAudio = (
  card: HTMLElement,
  namespace: EventNamespace
) => {
  const audio = findOneElement(card, '.js-audio')

  if (!isHTMLAudioElement(audio)) {
    return
  }

  namespace.addDirectEventListener(
    audio,
    'timeupdate',
    (element, evt) => {
      // Do the magic here
    }
  )
}

initSection('.js-basic-hero-section', (section) => {
  const namespace = makeEventNamespace()
  const cards = findElements(section, '.js-card')

  cards.map((card) => {
    handleCardAudio(card, namespace)
  })

  return {
    unload: () => {
      namespace.destroy()
    }
  }
})
```

### Document events

Typically used for global functions such as closing modal on escape click

```ts
namespace.addDocumentEventListener('keyup', (evt) => {
  if (evt.key === 'Escape') {
    // Do the magic here
  }
});
```

## Code Snippets

Snippets for expanding namespace events

```json
"Namespace delegate": {
  "scope": "javascript,typescript,typescriptreact",
  "prefix": "name",
  "body": [
    "namespace.addDelegatedEventListener(",
    "\tsection,",
    "\t'.js-$1',",
    "\t'click',",
    "\t(trigger, evt) => {",
    "\t\tevt.preventDefault()",
    "\t\t$0",
    "\t}",
    ")"
  ],
  "description": "Delegated click event"
},
"Namespace direct": {
  "scope": "javascript,typescript,typescriptreact",
  "prefix": "name",
  "body": [
    "namespace.addDirectEventListener(",
    "\t$1,",
    "\t'click',",
    "\t(trigger, evt) => {",
    "\t\tevt.preventDefault()",
    "\t\t$0",
    "\t}",
    ")"
  ],
  "description": "Direct click event"
},
"Namespace document": {
  "scope": "javascript,typescript,typescriptreact",
  "prefix": "name",
  "body": [
    "namespace.addDocumentEventListener(",
    "\t'$1',",
    "\t(evt) => {",
    "\t\tif (evt.key === 'Escape') {",
    "\t\t\t$0",
    "\t\t}",
    "\t}",
    ")"
  ],
  "description": "Direct click event"
}
```
