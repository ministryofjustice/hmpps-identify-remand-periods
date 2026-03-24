import AbstractForm from './abstractForm'
import ValidationError from './validationError'

export default class RemandDecisionForm extends AbstractForm<RemandDecisionForm> {
  decision: 'yes' | 'no'

  comment: string

  constructor(params: Partial<RemandDecisionForm>) {
    super(params)
    this.decision = params?.decision
    this.comment = params?.comment
  }

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
