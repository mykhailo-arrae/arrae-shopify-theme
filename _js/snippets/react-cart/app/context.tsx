import React, {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
  useState
} from 'react'
import { type UseRewardsReturn, useRewards } from './hooks/use-rewards.js'
import type { CartDataProps } from './io.js'

type CartContextProps = {
  state: CartDataProps
  setState: React.Dispatch<React.SetStateAction<CartDataProps>>
}

const CartContext = createContext<CartContextProps | undefined>(undefined)

type CartProviderProps = {
  children: ReactNode
  initialState: CartDataProps
}

const CartProvider: React.FC<CartProviderProps> = ({
  children,
  initialState
}): ReactElement => {
  const [state, setState] = useState<CartDataProps>(initialState)

  const contextValue = useMemo(() => ({ state, setState }), [state])

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  )
}

const useCartContext = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCartContext must be used within a CartProvider')
  }
  return context
}

/** One `useRewards()` for the tree (CartApp + Rewards). Must sit inside CartProvider. */
const SharedRewardsContext = createContext<UseRewardsReturn | undefined>(
  undefined
)

const SharedRewardsProvider = ({
  children
}: {
  children: ReactNode
}): ReactElement => {
  const { state } = useCartContext()
  const { rewards } = state.data
  const value = useRewards({
    tiers: rewards.items,
    includeDiscountsInRewards: rewards.include_discounts_in_rewards
  })
  return (
    <SharedRewardsContext.Provider value={value}>
      {children}
    </SharedRewardsContext.Provider>
  )
}

const useSharedRewards = (): UseRewardsReturn => {
  const ctx = useContext(SharedRewardsContext)
  if (!ctx) {
    throw new Error(
      'useSharedRewards must be used within SharedRewardsProvider'
    )
  }
  return ctx
}

type AutoGwpErrorContextValue = {
  autoGwpError: string | null
}

const AutoGwpErrorContext = createContext<AutoGwpErrorContextValue>({
  autoGwpError: null
})

const AutoGwpErrorProvider = ({
  autoGwpError,
  children
}: {
  autoGwpError: string | null
  children: ReactNode
}): ReactElement => (
  <AutoGwpErrorContext.Provider value={{ autoGwpError }}>
    {children}
  </AutoGwpErrorContext.Provider>
)

const useAutoGwpError = (): AutoGwpErrorContextValue => {
  return useContext(AutoGwpErrorContext)
}

export {
  AutoGwpErrorProvider,
  CartProvider,
  SharedRewardsProvider,
  useAutoGwpError,
  useCartContext,
  useSharedRewards
}
