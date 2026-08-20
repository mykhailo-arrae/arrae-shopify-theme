# Change Items Epic - Mixed Operations

The `change-items` epic now supports mixed operations, allowing you to combine different types of cart item changes in a single request.

## Usage Examples

### Mixed Operations Example

```typescript
import { makeChangeItemsEpic } from './index.js'

// Create the epic
const changeItemsEpic = makeChangeItemsEpic(/* ... */)

// Example: Change multiple items with different operation types
const mixedPayload = {
  operations: [
    // Change quantity for one item
    {
      type: 'changeItemQuantity',
      payload: {
        items: [
          {
            lineItemKey: 'item-123',
            quantity: 3
          }
        ]
      }
    },
    // Change properties for another item
    {
      type: 'changeItemProperties',
      payload: {
        items: [
          {
            lineItemKey: 'item-456',
            properties: {
              color: 'red',
              size: 'large',
              customization: 'engraved'
            }
          }
        ]
      }
    },
    // Change selling plan for a third item
    {
      type: 'changeItemSellingPlan',
      payload: {
        items: [
          {
            lineItemKey: 'item-789',
            sellingPlan: 12345,
            quantity: 2 // Optional quantity override
          }
        ]
      }
    }
  ]
}

// Execute the epic
const result = await changeItemsEpic({
  type: 'ChangeItems',
  payload: mixedPayload
})
```

### Single Operation Type Examples

```typescript
// Only change quantities
const quantityOnlyPayload = {
  operations: [
    {
      type: 'changeItemQuantity',
      payload: {
        items: [
          { lineItemKey: 'item-123', quantity: 5 },
          { lineItemKey: 'item-456', quantity: 0 } // Remove item
        ]
      }
    }
  ]
}

// Only change properties
const propertiesOnlyPayload = {
  operations: [
    {
      type: 'changeItemProperties',
      payload: {
        items: [
          {
            lineItemKey: 'item-123',
            properties: {
              gift_message: 'Happy Birthday!'
            }
          }
        ]
      }
    }
  ]
}

// Only change selling plans
const sellingPlanOnlyPayload = {
  operations: [
    {
      type: 'changeItemSellingPlan',
      payload: {
        items: [
          {
            lineItemKey: 'item-123',
            sellingPlan: null // Remove selling plan
          }
        ]
      }
    }
  ]
}
```

## Operation Processing

- Operations are processed **sequentially** in the order they appear in the `operations` array
- Each operation type calls its corresponding cart operation:
  - `changeItemQuantity` → `changeItemQuantity` operation
  - `changeItemProperties` → `changeItemProperties` operation
  - `changeItemSellingPlan` → `changeItemSellingPlan` operation
- After all operations complete, the cart is post-processed and returned

## Benefits

1. **Atomic Updates**: All changes are made in a single cart session
2. **Reduced Network Requests**: Multiple changes in one API call
3. **Flexible Ordering**: Control the sequence of operations
4. **Type Safety**: Full TypeScript support for all operation types

## Migration from Legacy API

The new mixed payload replaces the previous single-operation approach. Update your code from:

```typescript
// OLD: Single operation only
const event = {
  type: 'ChangeItems',
  payload: {
    items: [{ lineItemKey: 'item-123', quantity: 2 }]
  }
}
```

To:

```typescript
// NEW: Mixed operations
const event = {
  type: 'ChangeItems',
  payload: {
    operations: [
      {
        type: 'changeItemQuantity',
        payload: {
          items: [{ lineItemKey: 'item-123', quantity: 2 }]
        }
      }
    ]
  }
}
```
