import ReasonForMissingInformationForm from './ReasonForMissingInformationForm'

describe('ReasonForMissingInformationForm', () => {
  it('validation passes when reasonForMissingInformation is provided', () => {
    const form = new ReasonForMissingInformationForm('A1234BC', 'http://localhost', {
      reasonForMissingInformation: 'Some reason',
    })
    expect(form.validation()).toEqual([])
  })

  it('validation fails when reasonForMissingInformation is empty', () => {
    const form = new ReasonForMissingInformationForm('A1234BC', 'http://localhost', {
      reasonForMissingInformation: '',
    })
    expect(form.validation()).toEqual([
      {
        text: 'Enter a reason for missing information',
        fields: ['reasonForMissingInformation'],
      },
    ])
  })

  it('validation fails when reasonForMissingInformation is whitespace', () => {
    const form = new ReasonForMissingInformationForm('A1234BC', 'http://localhost', {
      reasonForMissingInformation: '  ',
    })
    expect(form.validation()).toEqual([
      {
        text: 'Enter a reason for missing information',
        fields: ['reasonForMissingInformation'],
      },
    ])
  })
})
