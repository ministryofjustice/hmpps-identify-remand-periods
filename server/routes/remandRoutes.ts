import { RequestHandler } from 'express'
import { stringify } from 'csv-stringify'
import PrisonerService from '../services/prisonerService'
import BulkRemandCalculationService from '../services/bulkRemandCalculationService'
import RelevantRemandModel from '../model/RelevantRemandModel'
import IdentifyRemandPeriodsService from '../services/identifyRemandPeriodsService'
import config from '../config'
import RemandDecisionForm from '../model/RemandDecisionForm'
import { IdentifyRemandDecision } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import CachedDataService from '../services/cachedDataService'
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
import { sameMembers } from '../utils/utils'

export default class RemandRoutes {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly identifyRemandPeriodsService: IdentifyRemandPeriodsService,
    private readonly bulkRemandCalculationService: BulkRemandCalculationService,
    private readonly cachedDataService: CachedDataService,
    private readonly adjustmentsService: AdjustmentsService,
    private readonly calculateReleaseDatesService: CalculateReleaseDatesService,
  ) {}

  public entry: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { bookingId } = res.locals.prisoner

    const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)
    const calculation = await this.cachedDataService.getCalculationWithoutSelections(req, nomsId, username, true)

    const detailedCalculation = new DetailedRemandCalculation(calculation)
    const detailedRemandAndSentence = new DetailedRemandCalculationAndSentence(
      detailedCalculation,
      sentencesAndOffences,
    )

    if (detailedRemandAndSentence.mostImportantErrors().length) {
      return res.redirect(`/prisoner/${nomsId}/validation-errors`)
    }
    if (detailedCalculation.getReplaceableChargeRemandGroupedByChargeIds().length) {
      const decision = await this.identifyRemandPeriodsService.getRemandDecision(nomsId, username)
      if (decision?.accepted && decision?.options?.userSelections?.length) {
        decision.options.userSelections.forEach(it => {
          this.cachedDataService.storeSelection(req, nomsId, it)
        })

        return res.redirect(`/prisoner/${nomsId}/remand`)
      }
      return res.redirect(`/prisoner/${nomsId}/replaced-offence-intercept`)
    }
    return res.redirect(`/prisoner/${nomsId}/remand`)
  }

  public validationErrors: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { bookingId } = res.locals.prisoner

    const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)
    const calculation = await this.cachedDataService.getCalculationWithoutSelections(req, nomsId, username, true)

    const detailedCalculation = new DetailedRemandCalculation(calculation)
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
    const { username } = res.locals.user
    const calculation = await this.cachedDataService.getCalculationWithoutSelections(req, nomsId, username)
    const chargeIds = calculation.chargeRemand
      .find(it => ['CASE_NOT_CONCLUDED', 'NOT_SENTENCED'].includes(it.status))
      .chargeIds.join(',')

    return res.render('pages/remand/replaced-offence-intercept', { chargeIds })
  }

  public remand: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { bookingId, prisonerNumber } = res.locals.prisoner
    const selections = this.cachedDataService.getSelections(req, nomsId)
    const calculation = await this.cachedDataService.getCalculation(req, nomsId, username, true)
    const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)

    return res.render('pages/remand/results', {
      model: new RelevantRemandModel(
        prisonerNumber,
        calculation,
        sentencesAndOffences,
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
    const selections = this.cachedDataService.getSelections(req, nomsId)
    const form = new RemandDecisionForm(req.body)
    form.validate()
    if (form.errors.length) {
      const calculation = await this.cachedDataService.getCalculation(req, nomsId, username)
      const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)
      return res.render('pages/remand/results', {
        model: new RelevantRemandModel(
          prisonerNumber,
          calculation,
          sentencesAndOffences,
          selections,
          await this.adjustmentsService.findByPerson(nomsId, username),
        ),
        form,
      })
    }

    if (form.decision === 'yes') {
      this.cachedDataService.clearRejectedRemandDecision(req, nomsId)
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

    this.cachedDataService.storeRejectedRemandDecision(req, nomsId, decision)

    return res.redirect(`/prisoner/${prisonerNumber}/confirm-and-save`)
  }

  public selectApplicable: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId, edit } = req.params
    const { chargeIds } = req.query as Record<string, string>
    const { bookingId, prisonerNumber } = res.locals.prisoner

    const chargeNumbers = chargeIds.split(',').map(it => Number(it))

    const calculation = await this.cachedDataService.getCalculationWithoutSelections(req, nomsId, username)
    const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)
    const selections = this.cachedDataService.getSelections(req, nomsId)
    const existingSelection = selections.find(it => sameMembers(it.chargeIdsToMakeApplicable, chargeNumbers))

    return res.render('pages/remand/select-applicable', {
      model: new SelectApplicableRemandModel(prisonerNumber, calculation, sentencesAndOffences, chargeNumbers, !!edit),
      form: SelectApplicableRemandForm.from(existingSelection),
    })
  }

  public submitApplicable: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId, edit } = req.params
    const { bookingId, prisonerNumber } = res.locals.prisoner
    const { chargeIds } = req.query as Record<string, string>
    const form = new SelectApplicableRemandForm(req.body)
    const calculation = await this.cachedDataService.getCalculationWithoutSelections(req, nomsId, username)
    const chargeNumbers = chargeIds.split(',').map(it => Number(it))

    form.validate()
    if (form.errors.length) {
      const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)
      return res.render('pages/remand/select-applicable', {
        model: new SelectApplicableRemandModel(
          prisonerNumber,
          calculation,
          sentencesAndOffences,
          chargeNumbers,
          !!edit,
        ),
        form,
      })
    }

    if (form.selection === 'no') {
      this.cachedDataService.removeSelection(
        req,
        nomsId,
        chargeIds.split(',').map(it => Number(it)),
      )
    } else {
      this.cachedDataService.storeSelection(req, nomsId, {
        chargeIdsToMakeApplicable: chargeIds.split(',').map(it => Number(it)),
        targetChargeId: Number(form.selection),
      })
    }

    const detailedCalculation = new DetailedRemandCalculation(calculation)
    const replaceableCharges = detailedCalculation.getReplaceableChargeRemandGroupedByChargeIds()
    const index = detailedCalculation.indexOfReplaceableChargesMatchingChargeIds(chargeNumbers)
    if (index + 1 === replaceableCharges.length || edit) {
      return res.redirect(`/prisoner/${prisonerNumber}/remand`)
    }
    const nextChargeIds = replaceableCharges[index + 1].chargeIds.join(',')
    return res.redirect(`/prisoner/${prisonerNumber}/replaced-offence?chargeIds=${nextChargeIds}`)
  }

  public removeSelection: RequestHandler = async (req, res): Promise<void> => {
    const { nomsId } = req.params
    const { chargeIds } = req.query as Record<string, string>
    const { prisonerNumber } = res.locals.prisoner

    this.cachedDataService.removeSelection(
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
    const calculation = await this.cachedDataService.getCalculation(req, nomsId, username)
    const identifiedRemand = calculation.adjustments.filter(it => it.status === 'ACTIVE') as Adjustment[]
    if (!identifiedRemand.length) {
      return res.redirect(`/prisoner/${nomsId}/confirm-and-save`)
    }
    const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)

    return res.render('pages/remand/overview.njk', {
      model: new RemandOverviewModel(nomsId, identifiedRemand, sentencesAndOffences),
    })
  }

  public confirmAndSave: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params
    const { bookingId } = res.locals.prisoner

    const rejectedRemandDecision = this.cachedDataService.getRejectedRemandDecision(req, nomsId)

    const calculation = await this.cachedDataService.getCalculation(req, nomsId, username)
    const identifiedRemand = calculation.adjustments.filter(it => it.status === 'ACTIVE') as Adjustment[]

    const remandRejected = rejectedRemandDecision?.accepted === false
    let unusedDeductions
    if (!remandRejected) {
      const sentencesAndOffences = await this.prisonerService.getSentencesAndOffences(bookingId, username)

      const adjustments = await this.adjustmentsService.findByPerson(nomsId, username)
      unusedDeductions = await this.calculateReleaseDatesService.unusedDeductionsHandlingCRDError(
        identifiedRemand,
        adjustments,
        sentencesAndOffences,
        nomsId,
        username,
      )
    }

    return res.render('pages/remand/confirm-and-save', {
      model: new ConfirmAndSaveModel(
        nomsId,
        identifiedRemand,
        unusedDeductions?.unusedDeductions,
        rejectedRemandDecision,
      ),
    })
  }

  public submitConfirmAndSave: RequestHandler = async (req, res): Promise<void> => {
    const { username } = res.locals.user
    const { nomsId } = req.params

    const rejectedRemandDecision = this.cachedDataService.getRejectedRemandDecision(req, nomsId)

    const decision =
      rejectedRemandDecision ||
      ({
        accepted: true,
        rejectComment: null,
        options: {
          includeRemandCalculation: false,
          userSelections: this.cachedDataService.getSelections(req, nomsId),
        },
      } as IdentifyRemandDecision)

    const result = await this.identifyRemandPeriodsService.saveRemandDecision(nomsId, decision, username)

    const message = JSON.stringify({
      type: 'REMAND',
      days: result.days,
      action: rejectedRemandDecision ? 'REJECTED' : 'CREATE',
    })
    return res.redirect(`${config.services.adjustmentServices.url}/${nomsId}/success?message=${message}`)
  }
}
