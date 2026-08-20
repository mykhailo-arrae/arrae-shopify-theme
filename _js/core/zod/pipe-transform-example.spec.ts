import test from 'ava'
import { z } from 'zod'

test('given a schema with transforms', (t) => {
  // 4 words with trailing spaces
  const input = 'hello world  from zod '

  // We expect 3 non-empty words
  const Words = z.array(z.string().min(1)).length(3)

  const Input = z
    .string()
    .min(1)
    .transform((s) => s.trim().split(' '))
    .transform<string[]>((words) => {
      return words.flatMap((_word) => {
        const word = _word.trim()

        return word.length ? [word] : []
      })
    })
    .pipe(Words)

  type Input = z.infer<typeof Input>

  const result = Input.safeParse(input)

  if (result.success) {
    t.pass()
    return
  }

  // t.log(result.error.message)

  t.is(result.error.issues.length, 1)

  result.error.issues.forEach((issue) => {
    t.deepEqual(issue.path, [])
    t.is(issue.code, 'too_big', 'should expect 3 words')
  })
})

test('given a string with trailing non-breaking space', (t) => {
  const input = '  hello world  '

  t.is(input.trim(), 'hello world', '.trim() should remove non-standard spaces')
})
