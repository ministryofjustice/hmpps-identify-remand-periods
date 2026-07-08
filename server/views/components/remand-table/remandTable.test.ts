import nunjucks from 'nunjucks'
import * as cheerio from 'cheerio'
import RemandTableModel, { createRemandTable } from './RemandTableModel'
import { remandResult } from '../../../routes/testutils/testData'
import { ChargeRemand } from '../../../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'

nunjucks.configure([__dirname, 'node_modules/govuk-frontend/dist/', 'node_modules/govuk-frontend/dist/components/'])

describe('Tests for remand tables component', () => {
  it('Should show remand table with single offence in the remand period', () => {
    const model: RemandTableModel = createRemandTable(
      [
        {
          from: '2023-02-01',
          to: '2023-03-20',
          days: 48,
          chargeIds: [3933870],
          status: 'APPLICABLE',
        } as ChargeRemand,
        {
          from: '2023-01-10',
          to: '2023-01-20',
          days: 11,
          chargeIds: [3933924],
          status: 'APPLICABLE',
        } as ChargeRemand,
      ],
      remandResult.charges,
    )
    const content = nunjucks.render('test.njk', { model })
    const $ = cheerio.load(content)
    const remandTable = $('[data-qa=remand-table]')
    expect(remandTable).toHaveLength(1)
    const remandRows = remandTable.find('tbody').find('tr')
    expect(remandRows).toHaveLength(2)

    const firstRowCells = remandRows.eq(0).find('td')
    expect(firstRowCells.eq(0).text()).toStrictEqual('01/02/2023 to 20/03/2023')
    expect(firstRowCells.eq(1).text()).toStrictEqual('48')
    expect(firstRowCells.eq(2).text()).toStrictEqual('WR91001 - Abstract water without a licence')
    expect(firstRowCells.eq(3).text()).toStrictEqual('10/01/2022 to 10/01/2022')

    const secondRowCells = remandRows.eq(1).find('td')
    expect(secondRowCells.eq(0).text()).toStrictEqual('10/01/2023 to 20/01/2023')
    expect(secondRowCells.eq(1).text()).toStrictEqual('11')
    expect(secondRowCells.eq(2).text()).toStrictEqual('TP47017 - Accidentally allow a chimney to be on fire')
    expect(secondRowCells.eq(3).text()).toStrictEqual('01/02/2023')
  })

  it('Should show remand table with multiple offences sorted by the offence start date and no lines between rows in the same remand period', () => {
    const model: RemandTableModel = createRemandTable(
      [
        {
          from: '2023-02-01',
          to: '2023-03-20',
          days: 48,
          chargeIds: [3933870, 3933924, 3934217],
          status: 'APPLICABLE',
        } as ChargeRemand,
      ],
      remandResult.charges,
    )
    const content = nunjucks.render('test.njk', { model })
    const $ = cheerio.load(content)
    const remandTable = $('[data-qa=remand-table]')
    expect(remandTable).toHaveLength(1)
    const remandRows = remandTable.find('tbody').find('tr')
    expect(remandRows).toHaveLength(3)

    const firstRowCells = remandRows.eq(0).find('td')
    expect(firstRowCells.eq(0).text()).toStrictEqual('01/02/2023 to 20/03/2023')
    expect(firstRowCells.eq(0).hasClass('no-bottom-border')).toStrictEqual(true)
    expect(firstRowCells.eq(1).text()).toStrictEqual('48')
    expect(firstRowCells.eq(1).hasClass('no-bottom-border')).toStrictEqual(true)
    expect(firstRowCells.eq(2).text()).toStrictEqual('WR91001 - Abstract water without a licence')
    expect(firstRowCells.eq(2).hasClass('no-bottom-border')).toStrictEqual(true)
    expect(firstRowCells.eq(3).text()).toStrictEqual('10/01/2022 to 10/01/2022')
    expect(firstRowCells.eq(3).hasClass('no-bottom-border')).toStrictEqual(true)

    const secondRowCells = remandRows.eq(1).find('td')
    expect(secondRowCells.eq(0).text()).toStrictEqual('')
    expect(secondRowCells.eq(0).hasClass('no-bottom-border')).toStrictEqual(true)
    expect(secondRowCells.eq(1).text()).toStrictEqual('')
    expect(secondRowCells.eq(1).hasClass('no-bottom-border')).toStrictEqual(true)
    expect(secondRowCells.eq(2).text()).toStrictEqual('TH68036 - Burglary dwelling and theft  - no violence')
    expect(secondRowCells.eq(2).hasClass('no-bottom-border')).toStrictEqual(true)
    expect(secondRowCells.eq(3).text()).toStrictEqual('18/06/2022')
    expect(secondRowCells.eq(3).hasClass('no-bottom-border')).toStrictEqual(true)

    const thirdRowCells = remandRows.eq(2).find('td')
    expect(thirdRowCells.eq(0).text()).toStrictEqual('')
    expect(thirdRowCells.eq(0).hasClass('no-bottom-border')).toStrictEqual(false)
    expect(thirdRowCells.eq(1).text()).toStrictEqual('')
    expect(thirdRowCells.eq(1).hasClass('no-bottom-border')).toStrictEqual(false)
    expect(thirdRowCells.eq(2).text()).toStrictEqual('TP47017 - Accidentally allow a chimney to be on fire')
    expect(thirdRowCells.eq(2).hasClass('no-bottom-border')).toStrictEqual(false)
    expect(thirdRowCells.eq(3).text()).toStrictEqual('01/02/2023')
    expect(thirdRowCells.eq(3).hasClass('no-bottom-border')).toStrictEqual(false)
  })
})
