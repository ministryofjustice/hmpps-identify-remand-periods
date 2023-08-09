import { fieldHasErrors } from '../utils/utils'
import ValidationError from './validationError'

export default abstract class AbstractForm<T> {
  constructor(params: Partial<T>) {
    Object.assign(this, params)
  }

  errors: ValidationError[] = []

  validate(): void {
    this.errors = this.validation()
  }

  abstract validation(): ValidationError[]

  fieldHasError(field: string): boolean {
    return fieldHasErrors(this.errors, field)
  }

  messageForField(...fields: string[]): { text: string } {
    const error = this.errors.find(it => fields.find(field => it.fields.indexOf(field) !== -1))
    if (error) {
      return { text: error.text }
    }
    return null
  }

  errorList() {
    return this.errors.map(it => {
      return {
        text: it.text,
        html: it.html,
        href: it.fields.length ? `#${it.fields[0]}` : null,
      }
    })
  }
}
