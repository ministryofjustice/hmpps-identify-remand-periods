export default {}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toContainInOrder(expected: string[]): R
    }
  }
}
/**
 * This matcher will test that given strings are found in the result in the order given. This is useful for asserting text is found in html in an order.
 */
expect.extend({
  toContainInOrder(received: string, all: string[]): jest.CustomMatcherResult {
    let match: jest.CustomMatcherResult = null
    let text = received
    all.forEach(expected => {
      const result = text.indexOf(expected)
      if (result === -1) {
        match = {
          message: () => `Remaining text didn't contain: '${expected}' within: \n ${text}`,
          pass: false,
        }
        return
      }
      text = text.substring(result)
    })
    if (match) {
      return match
    }
    return {
      message: () => '',
      pass: true,
    }
  },
})
