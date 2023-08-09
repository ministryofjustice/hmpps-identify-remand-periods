import AbstractForm from './abstractForm'
import ValidationError from './validationError'

export default class RemandDecisionForm extends AbstractForm<RemandDecisionForm> {
  decision: 'yes' | 'no'

  comment: string

  validation(): ValidationError[] {
    if (!this.decision) {
      return [
        {
          text: 'Select yes or no',
          fields: ['decision'],
        },
      ]
    }
    if (this.decision === 'no' && !this.comment) {
      return [
        {
          text: 'Enter a comment',
          fields: ['comment'],
        },
      ]
    }
    return []
  }
}
