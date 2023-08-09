type ValidationError = {
  fields: string[]
  text?: string
  html?: string
  attributes?: { [key: string]: string }
}

export default ValidationError
