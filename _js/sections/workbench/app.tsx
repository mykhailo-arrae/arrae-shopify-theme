import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { FC } from 'react'
import { Main, type Props } from './main.js'

const queryClient = new QueryClient()

export const App: FC<Props> = (props) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Main {...props} />
    </QueryClientProvider>
  )
}
