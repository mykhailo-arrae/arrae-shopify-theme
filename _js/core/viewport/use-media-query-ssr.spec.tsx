import test from 'ava'
import type { FC } from 'react'
import { renderToString } from 'react-dom/server'
import { useMediaQuery } from './use-media-query.js'

test('given server-side environment', (t) => {
  const App: FC<{ defaultValue?: boolean }> = ({ defaultValue }) => {
    const isDesktop = useMediaQuery('(min-width: 1024px)', { defaultValue })

    return <div>{isDesktop ? 'desktop' : 'not desktop'}</div>
  }

  t.is(
    renderToString(<App />),
    '<div>not desktop</div>',
    'should set media query match to false by default'
  )
  t.is(renderToString(<App defaultValue={false} />), '<div>not desktop</div>')
  t.is(renderToString(<App defaultValue={true} />), '<div>desktop</div>')
})
