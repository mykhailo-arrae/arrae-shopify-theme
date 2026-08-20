const run = async () => {
  // eslint-disable-next-line no-constant-condition
  if (false) {
    console.warn('Unreachable code')
  }

  console.warn('This is a placeholder script')
}

run().catch((err) => {
  console.error(err)
})
