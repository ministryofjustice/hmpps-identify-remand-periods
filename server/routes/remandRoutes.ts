import { RequestHandler } from 'express'
import { stringify } from 'csv-stringify'
import PrisonerService from '../services/prisonerService'
import BulkRemandCalculationService from '../services/bulkRemandCalculationService'
import RelevantRemandModel from '../model/RelevantRemandModel'
import IdentifyRemandPeriodsService from '../services/identifyRemandPeriodsService'
import config from '../config'
import RemandDecisionForm from '../model/RemandDecisionForm'
import { IdentifyRemandDecision } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'

export default class RemandRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly identifyRemandPeriodsService: IdentifyRemandPeriodsService,
    private readonly bulkRemandCalculationService: BulkRemandCalculationService,
  ) {}

  public remand: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { includeInactive } = req.query as Record<string, string>
    const { bookingId, prisonerNumber } = res.locals.prisoner
    const relevantRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(
      nomsId,
      { includeRemandCalculation: false },
      username,
    )
    const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)

    return res.render('pages/remand/results', {
      model: new RelevantRemandModel(prisonerNumber, relevantRemand, sentencesAndOffences, includeInactive === 'true'),
      form: new RemandDecisionForm({}),
    })
  }

  public remandSubmit: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { bookingId, prisonerNumber } = res.locals.prisoner
    const { includeInactive } = req.query as Record<string, string>
    const form = new RemandDecisionForm(req.body)
    form.validate()
    if (form.errors.length) {
      const relevantRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(
        nomsId,
        { includeRemandCalculation: false },
        username,
      )
      const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)
      return res.render('pages/remand/results', {
        model: new RelevantRemandModel(
          prisonerNumber,
          relevantRemand,
          sentencesAndOffences,
          includeInactive === 'true',
        ),
        form,
      })
    }

    const decision = {
      accepted: form.decision === 'yes',
      rejectComment: form.decision === 'no' ? form.comment : null,
    } as IdentifyRemandDecision

    const result = await this.identifyRemandPeriodsService.saveRemandDecision(nomsId, decision, username)

    const message = JSON.stringify({
      type: 'REMAND',
      days: result.days,
      action: form.decision === 'yes' ? 'CREATE' : 'REJECTED',
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
