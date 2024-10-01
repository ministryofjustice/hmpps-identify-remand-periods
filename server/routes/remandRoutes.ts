import { RequestHandler } from 'express'
import { stringify } from 'csv-stringify'
import PrisonerService from '../services/prisonerService'
import BulkRemandCalculationService from '../services/bulkRemandCalculationService'
import RelevantRemandModel from '../model/RelevantRemandModel'
import IdentifyRemandPeriodsService from '../services/identifyRemandPeriodsService'
import config from '../config'
import RemandDecisionForm from '../model/RemandDecisionForm'
import { IdentifyRemandDecision } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import SelectedApplicableRemandStoreService from '../services/selectedApplicableRemandStoreService'
import SelectApplicableRemandModel from '../model/SelectApplicableRemandModel'
import SelectApplicableRemandForm from '../model/SelectApplicableRemandForm'

export default class RemandRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly identifyRemandPeriodsService: IdentifyRemandPeriodsService,
    private readonly bulkRemandCalculationService: BulkRemandCalculationService,
    private readonly selectedApplicableRemandStoreService: SelectedApplicableRemandStoreService,
  ) {}

  public remand: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { includeInactive } = req.query as Record<string, string>
    const { bookingId, prisonerNumber } = res.locals.prisoner
    const selections = this.selectedApplicableRemandStoreService.getSelections(req, nomsId)
    const relevantRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(
      nomsId,
      {
        includeRemandCalculation: false,
        userSelections: selections,
      },
      username,
    )
    const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)

    return res.render('pages/remand/results', {
      model: new RelevantRemandModel(
        prisonerNumber,
        relevantRemand,
        sentencesAndOffences,
        includeInactive === 'true',
        selections,
      ),
      form: new RemandDecisionForm({}),
    })
  }

  public remandSubmit: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { bookingId, prisonerNumber } = res.locals.prisoner
    const { includeInactive } = req.query as Record<string, string>
    const selections = this.selectedApplicableRemandStoreService.getSelections(req, nomsId)
    const form = new RemandDecisionForm(req.body)
    form.validate()
    if (form.errors.length) {
      const relevantRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(
        nomsId,
        {
          includeRemandCalculation: false,
          userSelections: selections,
        },
        username,
      )
      const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)
      return res.render('pages/remand/results', {
        model: new RelevantRemandModel(
          prisonerNumber,
          relevantRemand,
          sentencesAndOffences,
          includeInactive === 'true',
          selections,
        ),
        form,
      })
    }

    const decision = {
      accepted: form.decision === 'yes',
      rejectComment: form.decision === 'no' ? form.comment : null,
      options: {
        includeRemandCalculation: false,
        userSelections: selections,
      },
    } as IdentifyRemandDecision

    const result = await this.identifyRemandPeriodsService.saveRemandDecision(nomsId, decision, username)

    const message = JSON.stringify({
      type: 'REMAND',
      days: result.days,
      action: form.decision === 'yes' ? 'CREATE' : 'REJECTED',
    })
    return res.redirect(`${config.services.adjustmentServices.url}/${nomsId}/success?message=${message}`)
  }

  public selectApplicable: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { chargeIds } = req.query as Record<string, string>
    const { bookingId, prisonerNumber } = res.locals.prisoner

    const relevantRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(
      nomsId,
      {
        includeRemandCalculation: false,
        userSelections: this.selectedApplicableRemandStoreService.getSelections(req, nomsId),
      },
      username,
    )
    const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)

    return res.render('pages/remand/select-applicable', {
      model: new SelectApplicableRemandModel(
        prisonerNumber,
        bookingId,
        relevantRemand,
        sentencesAndOffences,
        chargeIds.split(',').map(it => Number(it)),
      ),
      form: new SelectApplicableRemandForm({}),
    })
  }

  public submitApplicable: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { bookingId, prisonerNumber } = res.locals.prisoner
    const { chargeIds } = req.query as Record<string, string>
    const form = new SelectApplicableRemandForm(req.body)
    form.validate()
    if (form.errors.length) {
      const relevantRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(
        nomsId,
        {
          includeRemandCalculation: false,
          userSelections: this.selectedApplicableRemandStoreService.getSelections(req, nomsId),
        },
        username,
      )
      const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)
      return res.render('pages/remand/select-applicable', {
        model: new SelectApplicableRemandModel(
          prisonerNumber,
          bookingId,
          relevantRemand,
          sentencesAndOffences,
          chargeIds.split(',').map(it => Number(it)),
        ),
        form,
      })
    }

    this.selectedApplicableRemandStoreService.storeSelection(req, nomsId, {
      chargeIdsToMakeApplicable: chargeIds.split(',').map(it => Number(it)),
      targetChargeId: form.selection,
    })

    return res.redirect(`/prisoner/${prisonerNumber}`)
  }

  public removeSelection: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { chargeIds } = req.query as Record<string, string>
    const { prisonerNumber } = res.locals.prisoner

    this.selectedApplicableRemandStoreService.removeSelection(
      req,
      nomsId,
      chargeIds.split(',').map(it => Number(it)),
    )

    return res.redirect(`/prisoner/${prisonerNumber}`)
  }

  public bulkRemand: RequestHandler = async (req, res): Promise<void> => {
    return res.render('pages/remand/bulk')
  }

  public submitBulkRemand: RequestHandler = async (req, res) => {
    if (req.body.single) {
      const prisonerId = req.body['single-prisoner']
      return res.redirect(`/prisoner/${prisonerId}`)
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
