import AbstractForm from './abstractForm'
import ValidationError from './validationError'

export default class SelectApplicableRemandForm extends AbstractForm<SelectApplicableRemandForm> {
  selection: number

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
