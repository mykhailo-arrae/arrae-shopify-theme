Cart Engine v2
==============

The cart engine is built as a state machine (using XState) to manage cart state and operations in a predictable and robust way. This ensures that operations like adding an item or applying a discount can only happen when the cart is in an appropriate state, preventing race conditions and unexpected behavior.

Getting Started
---------------

To interact with the cart, you first need to initialize it.

```typescript
import { initCart } from '../core/cart-v2'

const cart = initCart()
```

The `initCart()` can be run multiple times and will always return the same cart instance.

### Public API

The `cart` object provides a simple API to interact with the engine:

-   `sendAsync(event)`: Asynchronously sends an event to the state machine. It returns a promise that resolves when the operation is complete. This is the primary method for dispatching cart actions.
-   `send(event)`: Sends an event without waiting for completion (fire-and-forget).
-   `subscribe(observer)`: Subscribes to state changes. The observer function receives the latest `snapshot` of the cart state whenever it changes.
-   `getSnapshot()`: Returns the current state and context of the cart.
-   `canSend(event)`: Checks if a specific event can be sent in the current state.
-   `on(eventName)`: Subscribes to specific broadcasted cart events, like `'cart:items:added'`.

### Adding Items to the Cart

To add one or more items, send an `AddItems` event. This will return a promise that resolves to `'ok'` or `'busy'` if the cart cannot be updated at the moment.

```tsx
await cart.sendAsync({
  type: 'AddItems',
  payload: {
    items: [
      { id: 12345, quantity: 1 },
      { id: 67890, quantity: 2, properties: { custom: 'value' } }
    ]
  }
});
// => 'ok' | 'busy'
```

Before sending an event, you can check if the cart is ready for your action with `cart.canSend(YOUR_EVENT_OBJECT)`.

```tsx
const isReady = cart.canSend({ type: 'AddItems' })
```

### Changing Items in the Cart

The `ChangeItems` action is a powerful way to modify multiple items at once, supporting changes to quantity, properties, and selling plans in a single, atomic operation.

Operations are processed sequentially.

```tsx
await cart.sendAsync({
  type: 'ChangeItems',
  payload: {
    operations: [
      // 1. Change quantity for one item
      {
        type: 'changeItemQuantity',
        payload: { items: [{ lineItemKey: 'item-key-1', quantity: 3 }] }
      },
      // 2. Change properties for another item
      {
        type: 'changeItemProperties',
        payload: {
          items: [{ lineItemKey: 'item-key-2', properties: { engraving: 'Hello' } }]
        }
      },
      // 3. Change the selling plan
      {
        type: 'changeItemSellingPlan',
        payload: {
          items: [{ lineItemKey: 'item-key-3', sellingPlan: 98765 }]
        }
      }
    ]
  }
});
// => 'ok' | 'busy'
```

Custom Logic
------------

Place your custom cart transformation logic (free products, complex discounts, etc.) into [`operations/post-process-cart/index.ts`](./operations/post-process-cart/index.ts).

`postProcessCart` operation in included in every Epic and runs after any cart changes.

React
-----

The engine provides React hooks for easy integration into components.

### `useCartState()`

This hook subscribes to the cart state and returns the selected part of the state. Use a selector function to prevent unnecessary re-renders.

```tsx
import { useCartState } from '../core/cart-v2/react'

const CartCounter = () => {
  const itemCount = useCartState((context) => context.cart?.item_count ?? 0)
  return <span>Cart ({itemCount})</span>
}

const CartStatus = () => {
  const isBusy = useCartState((_, value) => value !== 'Ready')
  return <div>{isBusy ? 'Loading...' : 'Ready'}</div>
}
```

### `useCartActions()`

This hook returns the same cart instance as `initCart()`, allowing you to dispatch actions.

```tsx
import { useCartActions } from '../core/cart-v2/react'

const MyComponent = () => {
  const cart = useCartActions()

  useEffect(() => {
    cart.on('cart:items:added').do(({ details }) => {
      console.log('Items added:', details.items)
    })
  }, [])
}
```

Event Broadcasting
------------------

The cart broadcasts messages for key events, allowing different parts of your application to react to changes.

```tsx
// Listen for when items are added
cart.on('cart:items:added').do(({ details }) => {
  // Event payload is intentionally minimal, use cart.getSnapshot() to get the full cart state
  console.log('Items added:', details.items);
});

// Listen for when the cart is cleared
cart.on('cart:cleared').do(() => {
  console.log('The cart is now empty.');
});
```

Error Handling
--------------

The engine distinguishes between three types of errors:

-   `CartUserError`: An error caused by user input (e.g., trying to add an out-of-stock item). These are typically displayed as warnings to the user and do not put the cart into an error state.
-   `CartCommunicationError`: A network or API communication problem.
-   `CartImplementationError`: A developer error, such as an invalid payload or a logic issue.

Unhandled communication and implementation errors will move the cart into a `CartError` context state. You can get the engine out of this state by sending `Refresh` event.

Planned Improvements In The Future
----------------------------------

- [ ] Integrate Shipping Rates API
- [ ] Fetch augmented data from Liquid via Section API

Implementation Notes
--------------------

### Core Concepts

- **State Machine**: Manages the overall state of the cart (e.g., `Idle`, `Ready`, `AddingItems`, `Busy`).
- **Operations**: Low-level functions that directly interact with the Shopify API (e.g., `addItems`, `fetchCart`).
- **Epics**: Higher-level functions that orchestrate one or more Operations to fulfill a user action. They contain business logic, process payloads, and return the new cart context.
- **Blueprints**: Zod schemas that define the shape of data structures like the `Cart`, `CartItem`, and event payloads, ensuring type safety.

### Shopify API

- **Selling Plan Changes**: The Shopify API for changing a selling plan requires the line item's **index** (position in the cart), not its key. The `changeItemSellingPlan` operation handles this lookup for you.
