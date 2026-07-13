import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'
import { remandResult } from '../../../routes/testutils/testData'
import RemandBreakdownModel, { createRemandBreakdown } from './RemandBreakdownModel'
import { RemandAndCharge } from '../../../model/DetailedRemandCalculation'

nunjucks.configure([__dirname, 'node_modules/govuk-frontend/dist/', 'node_modules/govuk-frontend/dist/components/'])

describe('Tests for remand breakdown component', () => {
  it('Should show remand with single case and offence', () => {
    const models: RemandBreakdownModel[] = createRemandBreakdown([
      {
        from: '2023-02-01',
        to: '2023-03-20',
        days: 48,
        chargeIds: [3933870],
        status: 'APPLICABLE',
        fromEvent: { description: 'Remand in Custody (Bail Refused)', date: '2023-02-01' },
        toEvent: { description: 'Imprisonment', date: '2023-03-20' },
        charges: [remandResult.charges[3933870]],
      } as RemandAndCharge,
    ])
    expect(models).toHaveLength(1)
    const model = models[0]
    const content = nunjucks.render('test.njk', { model })
    const $ = cheerio.load(content)
    const remandPeriod = $('[data-qa=remand-period]')
    expect(remandPeriod).toHaveLength(1)

    const periodHeading = remandPeriod.find('h3').eq(0)
    expect(periodHeading.text().trim()).toStrictEqual('01/02/2023 to 20/03/2023 (48 days)')

    const periodSubHeading = remandPeriod.find('h4').eq(0)
    expect(periodSubHeading.text().trim()).toStrictEqual('Case CASE1234 at Birmingham Crown Court')

    const offenceCard = remandPeriod.find('[data-qa=offence-card-CASE1234-WR91001]')
    expect(offenceCard).toHaveLength(1)
    expect(offenceCard.find('[data-qa=count]').eq(0).text().trim()).toStrictEqual('Count 1')
    expect(offenceCard.find('[data-qa=card-title]').eq(0).text().trim()).toStrictEqual(
      'WR91001 - Abstract water without a licence',
    )
    expect(offenceCard.find('dt:contains("Committed on")').next().text().trim()).toStrictEqual(
      '10/01/2022 to 10/01/2022',
    )
    expect(offenceCard.find('dt:contains("Outcome at remand start")').next().text().trim()).toStrictEqual(
      'Remand in Custody (Bail Refused) on 01/02/2023',
    )
    expect(offenceCard.find('dt:contains("Outcome at remand end")').next().text().trim()).toStrictEqual(
      'Imprisonment on 20/03/2023',
    )
    expect(offenceCard.find('dt:contains("Current offence outcome")').next().text().trim()).toStrictEqual(
      'Imprisonment',
    )
  })

  it('Should show offences from the same case together', () => {
    const models: RemandBreakdownModel[] = createRemandBreakdown([
      {
        from: '2023-02-01',
        to: '2023-03-20',
        days: 48,
        chargeIds: [3933870, 4444],
        status: 'APPLICABLE',
        fromEvent: { description: 'Remand in Custody (Bail Refused)', date: '2023-02-01' },
        toEvent: { description: 'Imprisonment', date: '2023-03-20' },
        charges: [remandResult.charges[3933870], remandResult.charges[4444]],
      } as RemandAndCharge,
    ])

    expect(models).toHaveLength(1)
    const model = models[0]
    const content = nunjucks.render('test.njk', { model })
    const $ = cheerio.load(content)
    const remandPeriod = $('[data-qa=remand-period]')
    expect(remandPeriod).toHaveLength(1)

    const periodHeading = remandPeriod.find('h3').eq(0)
    expect(periodHeading.text().trim()).toStrictEqual('01/02/2023 to 20/03/2023 (48 days)')

    const periodSubHeading = remandPeriod.find('[data-qa=case-heading]')
    expect(periodSubHeading).toHaveLength(1)
    expect(periodSubHeading.eq(0).text().trim()).toStrictEqual('Case CASE1234 at Birmingham Crown Court')

    const firstOffenceCard = remandPeriod.find('[data-qa=offence-card-CASE1234-WR91001]')
    expect(firstOffenceCard).toHaveLength(1)
    expect(firstOffenceCard.find('[data-qa=count]').eq(0).text().trim()).toStrictEqual('Count 1')
    expect(firstOffenceCard.find('[data-qa=card-title]').eq(0).text().trim()).toStrictEqual(
      'WR91001 - Abstract water without a licence',
    )
    expect(firstOffenceCard.find('dt:contains("Committed on")').next().text().trim()).toStrictEqual(
      '10/01/2022 to 10/01/2022',
    )
    expect(firstOffenceCard.find('dt:contains("Outcome at remand start")').next().text().trim()).toStrictEqual(
      'Remand in Custody (Bail Refused) on 01/02/2023',
    )
    expect(firstOffenceCard.find('dt:contains("Outcome at remand end")').next().text().trim()).toStrictEqual(
      'Imprisonment on 20/03/2023',
    )
    expect(firstOffenceCard.find('dt:contains("Current offence outcome")').next().text().trim()).toStrictEqual(
      'Imprisonment',
    )
    const secondOffenceCard = remandPeriod.find('[data-qa=offence-card-CASE1234-WR91002]')
    expect(secondOffenceCard).toHaveLength(1)
    expect(secondOffenceCard.find('[data-qa=count]').eq(0).text().trim()).toStrictEqual('Count 1')
    expect(secondOffenceCard.find('[data-qa=card-title]').eq(0).text().trim()).toStrictEqual(
      'WR91002 - offence on another booking',
    )
    expect(secondOffenceCard.find('dt:contains("Committed on")').next().text().trim()).toStrictEqual('10/01/2022')
    expect(secondOffenceCard.find('dt:contains("Outcome at remand start")').next().text().trim()).toStrictEqual(
      'Remand in Custody (Bail Refused) on 01/02/2023',
    )
    expect(secondOffenceCard.find('dt:contains("Outcome at remand end")').next().text().trim()).toStrictEqual(
      'Imprisonment on 20/03/2023',
    )
    expect(secondOffenceCard.find('dt:contains("Current offence outcome")').next().text().trim()).toStrictEqual(
      'Imprisonment',
    )
  })

  it('Should show offences from different cases separately', () => {
    const models: RemandBreakdownModel[] = createRemandBreakdown([
      {
        from: '2023-02-01',
        to: '2023-03-20',
        days: 48,
        chargeIds: [3933870, 3933924],
        status: 'APPLICABLE',
        fromEvent: { description: 'Remand in Custody (Bail Refused)', date: '2023-02-01' },
        toEvent: { description: 'Imprisonment', date: '2023-03-20' },
        charges: [remandResult.charges[3933870], remandResult.charges[3933924]],
      } as RemandAndCharge,
    ])

    expect(models).toHaveLength(1)
    const model = models[0]
    const content = nunjucks.render('test.njk', { model })
    const $ = cheerio.load(content)
    const remandPeriod = $('[data-qa=remand-period]')
    expect(remandPeriod).toHaveLength(1)

    const periodHeading = remandPeriod.find('h3').eq(0)
    expect(periodHeading.text().trim()).toStrictEqual('01/02/2023 to 20/03/2023 (48 days)')

    const periodSubHeading = remandPeriod.find('[data-qa=case-heading]')
    expect(periodSubHeading).toHaveLength(2)
    expect(periodSubHeading.eq(0).text().trim()).toStrictEqual('Case CASE1234 at Birmingham Crown Court')
    expect(periodSubHeading.eq(1).text().trim()).toStrictEqual('Case CASE5678 at Birmingham Crown Court')
  })
})
