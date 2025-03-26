import { RequestHandler } from 'express'
import { stringify } from 'csv-stringify'
import PrisonerService from '../services/prisonerService'
import BulkRemandCalculationService from '../services/bulkRemandCalculationService'
import RelevantRemandModel from '../model/RelevantRemandModel'
import IdentifyRemandPeriodsService from '../services/identifyRemandPeriodsService'
import config from '../config'
import RemandDecisionForm from '../model/RemandDecisionForm'
import { IdentifyRemandDecision, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import SelectedApplicableRemandStoreService from '../services/selectedApplicableRemandStoreService'
import SelectApplicableRemandModel from '../model/SelectApplicableRemandModel'
import SelectApplicableRemandForm from '../model/SelectApplicableRemandForm'
import { UserDetails } from '../services/userService'
import AdjustmentsService from '../services/adjustmentsService'
import CalculateReleaseDatesService from '../services/calculateReleaseDatesService'
import { Adjustment } from '../@types/adjustments/adjustmentsTypes'
import ConfirmAndSaveModel from '../model/ConfirmAndSaveModel'
import DetailedRemandCalculation from '../model/DetailedRemandCalculation'
import DetailedRemandCalculationAndSentence from '../model/DetailedRemandCalculationAndSentence'
import RemandOverviewModel from '../model/RemandOverviewModel'

export default class RemandRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly identifyRemandPeriodsService: IdentifyRemandPeriodsService,
    private readonly bulkRemandCalculationService: BulkRemandCalculationService,
    private readonly selectedApplicableRemandStoreService: SelectedApplicableRemandStoreService,
    private readonly adjustmentsService: AdjustmentsService,
    private readonly calculateReleaseDatesService: CalculateReleaseDatesService,
  ) {}

  public entry: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { bookingId } = res.locals.prisoner
    // TODO lookup existing decision and check if approved.
    const relevantRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(
      nomsId,
      {
        includeRemandCalculation: false,
        userSelections: [],
      },
      username,
    )
    const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)
    this.selectedApplicableRemandStoreService.storeCalculation(req, nomsId, relevantRemand)

    const detailedCalculation = new DetailedRemandCalculation(relevantRemand)
    const detailedRemandAndSentence = new DetailedRemandCalculationAndSentence(
      detailedCalculation,
      sentencesAndOffences,
    )

    if (detailedRemandAndSentence.mostImportantErrors().length) {
      return res.redirect(`/prisoner/${nomsId}/validation-errors`)
    }
    if (detailedCalculation.getReplaceableChargeRemand().length) {
      return res.redirect(`/prisoner/${nomsId}/replaced-offence-intercept`)
    }
    return res.redirect(`/prisoner/${nomsId}/remand`)
  }

  public validationErrors: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { bookingId } = res.locals.prisoner

    const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)
    const relevantRemand = this.selectedApplicableRemandStoreService.getCalculation(req, nomsId)
    this.selectedApplicableRemandStoreService.clearCalculation(req, nomsId)

    const detailedCalculation = new DetailedRemandCalculation(relevantRemand)
    const detailedRemandAndSentence = new DetailedRemandCalculationAndSentence(
      detailedCalculation,
      sentencesAndOffences,
    )
    if (detailedRemandAndSentence.mostImportantErrors().length) {
      return res.render('pages/remand/validation-errors', {
        model: detailedRemandAndSentence,
      })
    }
    return res.redirect(`/prisoner/${nomsId}`)
  }

  public replacedOffenceIntercept: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const calculation = this.selectedApplicableRemandStoreService.getCalculation(req, nomsId)
    const chargeIds = calculation.chargeRemand
      .find(it => ['CASE_NOT_CONCLUDED', 'NOT_SENTENCED'].includes(it.status))
      .chargeIds.join(',')

    return res.render('pages/remand/replaced-offence-intercept', { chargeIds })
  }

  public remand: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { includeInactive } = req.query as Record<string, string>
    const { bookingId, prisonerNumber } = res.locals.prisoner
    const selections = this.selectedApplicableRemandStoreService.getSelections(req, nomsId)
    const cachedCalculation = this.selectedApplicableRemandStoreService.getCalculation(req, nomsId)
    let relevantRemand: RemandResult
    if (selections?.length || !cachedCalculation) {
      relevantRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(
        nomsId,
        {
          includeRemandCalculation: false,
          userSelections: selections,
        },
        username,
      )
    } else {
      // If no selections are made, use the cached calculation and clear it.
      relevantRemand = cachedCalculation
      this.selectedApplicableRemandStoreService.clearCalculation(req, nomsId)
    }
    const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)

    return res.render('pages/remand/results', {
      model: new RelevantRemandModel(
        prisonerNumber,
        relevantRemand,
        sentencesAndOffences,
        includeInactive === 'true',
        selections,
        await this.adjustmentsService.findByPerson(nomsId, username),
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
          await this.adjustmentsService.findByPerson(nomsId, username),
        ),
        form,
      })
    }

    if (form.decision === 'yes') {
      return res.redirect(`/prisoner/${prisonerNumber}/overview`)
    }
    const decision = {
      accepted: false,
      rejectComment: form.comment,
      options: {
        includeRemandCalculation: false,
        userSelections: selections,
      },
    } as IdentifyRemandDecision

    const result = await this.identifyRemandPeriodsService.saveRemandDecision(nomsId, decision, username)

    const message = JSON.stringify({
      type: 'REMAND',
      days: result.days,
      action: 'REJECTED',
    })
    return res.redirect(`${config.services.adjustmentServices.url}/${nomsId}/success?message=${message}`)
  }

  public selectApplicable: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { chargeIds } = req.query as Record<string, string>
    const { bookingId, prisonerNumber } = res.locals.prisoner

    const calculation = this.selectedApplicableRemandStoreService.getCalculation(req, nomsId)
    const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)

    return res.render('pages/remand/select-applicable', {
      model: new SelectApplicableRemandModel(
        prisonerNumber,
        bookingId,
        calculation,
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
    const calculation = this.selectedApplicableRemandStoreService.getCalculation(req, nomsId)
    const chargeNumbers = chargeIds.split(',').map(it => Number(it))

    form.validate()
    if (form.errors.length) {
      const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)
      return res.render('pages/remand/select-applicable', {
        model: new SelectApplicableRemandModel(
          prisonerNumber,
          bookingId,
          calculation,
          sentencesAndOffences,
          chargeNumbers,
        ),
        form,
      })
    }

    if (form.selection === 'no') {
      this.selectedApplicableRemandStoreService.removeSelection(
        req,
        nomsId,
        chargeIds.split(',').map(it => Number(it)),
      )
    } else {
      this.selectedApplicableRemandStoreService.storeSelection(req, nomsId, {
        chargeIdsToMakeApplicable: chargeIds.split(',').map(it => Number(it)),
        targetChargeId: Number(form.selection),
      })
    }

    const detailedCalculation = new DetailedRemandCalculation(calculation)
    const replaceableCharges = detailedCalculation.getReplaceableChargeRemand()
    const index = detailedCalculation.indexOfReplaceableChargesMatchingChargeIds(chargeNumbers)
    if (index + 1 === replaceableCharges.length) {
      return res.redirect(`/prisoner/${prisonerNumber}/remand`)
    }
    const nextChargeIds = replaceableCharges[index + 1].chargeIds.join(',')
    return res.redirect(`/prisoner/${prisonerNumber}/replaced-offence?chargeIds=${nextChargeIds}`)
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

  // eslint-disable-next-line consistent-return
  public submitBulkRemand: RequestHandler = async (req, res): Promise<void> => {
    if (req.body.single) {
      const prisonerId = req.body['single-prisoner']
      return res.redirect(`/prisoner/${prisonerId}`)
    }

    const user = res.locals.user as UserDetails
    const { prisonerIds } = req.body
    const nomsIds = prisonerIds.split(/\r?\n/)
    if (nomsIds.length > 500) return res.redirect(`/remand/`)

    const results = await this.bulkRemandCalculationService.runCalculations(user, nomsIds)
    const fileName = `download-remand-dates.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    stringify(results, {
      header: true,
    }).pipe(res)
  }

  public overview: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { bookingId } = res.locals.prisoner
    const relevantRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(
      nomsId,
      {
        includeRemandCalculation: false,
        userSelections: this.selectedApplicableRemandStoreService.getSelections(req, nomsId),
      },
      username,
    )
    const identifiedRemand = relevantRemand.adjustments.filter(it => it.status === 'ACTIVE') as Adjustment[]
    const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)

    return res.render('pages/remand/overview.njk', {
      model: new RemandOverviewModel(nomsId, identifiedRemand, sentencesAndOffences),
    })
  }

  public confirmAndSave: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { bookingId } = res.locals.prisoner

    const relevantRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(
      nomsId,
      {
        includeRemandCalculation: false,
        userSelections: this.selectedApplicableRemandStoreService.getSelections(req, nomsId),
      },
      username,
    )
    const identifiedRemand = relevantRemand.adjustments.filter(it => it.status === 'ACTIVE') as Adjustment[]

    const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)

    const adjustments = await this.adjustmentsService.findByPerson(nomsId, username)
    const unusedDeductions = await this.calculateReleaseDatesService.unusedDeductionsHandlingCRDError(
      identifiedRemand,
      adjustments,
      sentencesAndOffences,
      nomsId,
      username,
    )

    return res.render('pages/remand/confirm-and-save', {
      model: new ConfirmAndSaveModel(nomsId, identifiedRemand, unusedDeductions?.unusedDeductions),
    })
  }

  public submitConfirmAndSave: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params

    const decision = {
      accepted: true,
      rejectComment: null,
      options: {
        includeRemandCalculation: false,
        userSelections: this.selectedApplicableRemandStoreService.getSelections(req, nomsId),
      },
    } as IdentifyRemandDecision

    const result = await this.identifyRemandPeriodsService.saveRemandDecision(nomsId, decision, username)

    const message = JSON.stringify({
      type: 'REMAND',
      days: result.days,
      action: 'CREATE',
    })
    return res.redirect(`${config.services.adjustmentServices.url}/${nomsId}/success?message=${message}`)
  }
}
