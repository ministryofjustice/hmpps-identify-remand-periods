import { RequestHandler } from 'express'
import { stringify } from 'csv-stringify'
import PrisonerService from '../services/prisonerService'
import BulkRemandCalculationService from '../services/bulkRemandCalculationService'
import RelevantRemandModel from '../model/RelevantRemandModel'
import { AdjustmentDetails } from '../@types/adjustments/adjustmentsTypes'
import IdentifyRemandPeriodsService from '../services/identifyRemandPeriodsService'
import AdjustmentsService from '../services/adjustmentsService'
import config from '../config'

export default class RemandRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly adjustmentsService: AdjustmentsService,
    private readonly identifyRemandPeriodsService: IdentifyRemandPeriodsService,
    private readonly bulkRemandCalculationService: BulkRemandCalculationService,
  ) {}

  public remand: RequestHandler = async (req, res): Promise<void> => {
    const { caseloads, token } = res.locals.user
    const { nomsId } = req.params
    const prisonerDetail = await this.prisonerService.getPrisonerDetail(nomsId, caseloads, token)
    const relevantRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(nomsId, token)
    return res.render('pages/remand/results', {
      model: new RelevantRemandModel(prisonerDetail, relevantRemand),
    })
  }

  public remandSubmit: RequestHandler = async (req, res): Promise<void> => {
    const { token } = res.locals.user
    const { nomsId } = req.params
    const relevantRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(nomsId, token)

    const adjustments: AdjustmentDetails[] = relevantRemand.sentenceRemand.map(it => {
      return {
        fromDate: it.from,
        toDate: it.to,
        adjustmentType: 'REMAND',
        days: it.days,
        sentenceSequence: it.charge.sentenceSequence,
        bookingId: it.charge.bookingId,
        person: nomsId,
      } as AdjustmentDetails
    })
    await Promise.all(adjustments.map(it => this.adjustmentsService.create(it, token)))

    const message = JSON.stringify({
      type: 'REMAND',
      days: relevantRemand.sentenceRemand.map(it => it.days).reduce((sum, current) => sum + current, 0),
    })

    return res.redirect(`${config.services.adjustmentServices.url}/${nomsId}/success?message=${message}`)
  }

  public bulkRemand: RequestHandler = async (req, res): Promise<void> => {
    return res.render('pages/remand/bulk')
  }

  public submitBulkRemand: RequestHandler = async (req, res) => {
    if (req.body.single) {
      const prisonerId = req.body['single-prisoner']
      return res.redirect(`/${prisonerId}`)
    }

    const { caseloads, token } = res.locals.user
    const { prisonerIds } = req.body
    const nomsIds = prisonerIds.split(/\r?\n/)
    if (nomsIds.length > 500) return res.redirect(`/remand/`)

    const results = await this.bulkRemandCalculationService.runCalculations(caseloads, token, nomsIds)
    const fileName = `download-remand-dates.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    return stringify(results, {
      header: true,
    }).pipe(res)
  }
}
