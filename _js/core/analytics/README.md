# Analytics

## Initializing Google Analytics

To ensure that the Google Analytics events are recorded,
**render [`analytics-google` static section](/_js/sections/analytics-google/) in the layout file**,
then configure G-Tag ID in the section settings.

## Event Tracking In Sections

To add an event to a specific section, import the `sendGtagEvent` helper from
[core/analytics/google](/_js/core/analytics/),and then set up the event handler
on the section's `index.ts` file. Here's a basic example showing how to track a
"click" event:

```ts
import { sendGtagEvent } from '../../core/analytics/google.js'
import { makeEventNamespace } from '../../core/dom/events/index.js'

// …

const namespace = makeEventNamespace()

namespace.addDelegatedEventListener(section, '.js-my-element', 'click', () => {
  sendGtagEvent('event', 'element_cta_click', {
    Page_Path: window.location.pathname
  })
})
```

The helper can also be used within various functions to track dynamic events.
Here's an example showing how to track a "slide change" event in a Swiper carousel:

```ts
swiper.on('slideChange', function () {
  sendGtagEvent('event', 'home_swiper_interaction')
})
```
