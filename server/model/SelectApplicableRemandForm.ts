import AbstractForm from './abstractForm'
import ValidationError from './validationError'

export default class SelectApplicableRemandForm extends AbstractForm<SelectApplicableRemandForm> {
  selection: string

  validation(): ValidationError[] {
    if (!this.selection) {
      return [
        {
          text: 'Select a charge',
          fields: ['decision'],
        },
      ]
    }
    return []
  }
}
