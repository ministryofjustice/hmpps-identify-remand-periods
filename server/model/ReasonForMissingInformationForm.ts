import AbstractForm from './abstractForm'
import ValidationError from './validationError'

export default class ReasonForMissingInformationForm extends AbstractForm<ReasonForMissingInformationForm> {
  nomsId: string

  reasonForMissingInformation: string

  constructor(nomsId: string, params: Partial<ReasonForMissingInformationForm>) {
    super(params)
    this.nomsId = nomsId
    this.reasonForMissingInformation = params?.reasonForMissingInformation
  }

  validation(): ValidationError[] {
    if (!this.reasonForMissingInformation || !this.reasonForMissingInformation.trim()) {
      return [
        {
          text: 'Enter a reason for missing information',
          fields: ['reasonForMissingInformation'],
        },
      ]
    }
    return []
  }
}
