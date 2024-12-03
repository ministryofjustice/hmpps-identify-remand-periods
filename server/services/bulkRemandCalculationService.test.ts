import {
  LegacyDataProblem,
  RemandCalculation,
  RemandResult,
  RemandResultAdjustment,
} from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import {
  PrisonApiCourtDateResult,
  PrisonApiImprisonmentStatusHistoryDto,
  PrisonApiSentenceAdjustments,
} from '../@types/prisonApi/prisonClientTypes'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import BulkRemandCalculationRow from '../model/BulkRemandCalculationRow'
import BulkRemandCalculationService from './bulkRemandCalculationService'
import IdentifyRemandPeriodsService from './identifyRemandPeriodsService'
import PrisonerSearchService from './prisonerSearchService'
import PrisonerService from './prisonerService'
import { UserDetails } from './userService'

jest.mock('../services/prisonerService')
jest.mock('../services/prisonerSearchService')
jest.mock('../services/identifyRemandPeriodsService')

const prisonerSearchService = new PrisonerSearchService(null) as jest.Mocked<PrisonerSearchService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const identifyRemandPeriodsService = new IdentifyRemandPeriodsService(null) as jest.Mocked<IdentifyRemandPeriodsService>

describe('Bulk calculation service test', () => {
  const service = new BulkRemandCalculationService(prisonerSearchService, prisonerService, identifyRemandPeriodsService)
  const prisonerNumber = 'ABC123'
  const bookingId = '123'

  it('Prison API Error', async () => {
    prisonerSearchService.getPrisonerDetails.mockRejectedValue({ error: 'THIS IS A PRISON API ERROR' })

    const row = removeWhitespaceFromRow(
      (await service.runCalculations({ caseloads: [], username: 'bob' } as UserDetails, [prisonerNumber]))[0],
    )

    expect(row).toStrictEqual({
      ACTIVE_BOOKING_ID: undefined,
      AGENCY_LOCATION_ID: undefined,
      CALCULATED_REMAND_DAYS: 0,
      COURT_DATES_JSON: '[]',
      IMPRISONMENT_STATUSES: '[]',
      ERROR_JSON: '{"error":"THIS IS A PRISON API ERROR"}',
      ERROR_STACK: undefined,
      ERROR_TEXT: undefined,
      INTERSECTING_SENTENCES: undefined,
      INTERSECTING_SENTENCES_SOURCE: '[]',
      IS_DATES_SAME: 'N',
      IS_DAYS_SAME: 'N',
      IS_REMAND_SAME: 'N',
      NOMIS_REMAND_DAYS: 0,
      NOMIS_REMAND_JSON: '[]',
      NOMIS_UNUSED_REMAND_JSON: '[]',
      NOMS_ID: 'ABC123',
      REMAND_TOOL_INPUT: '{}',
      REMAND_TOOL_OUTPUT: '{}',
      VALIDATION_MESSAGES: '',
    })
  })
  it('Calculation error', async () => {
    prisonerSearchService.getPrisonerDetails.mockResolvedValue({
      prisonerNumber,
      bookingId,
    } as PrisonerSearchApiPrisoner)

    prisonerService.getBookingAndSentenceAdjustments.mockResolvedValue({
      bookingAdjustments: [],
      sentenceAdjustments: [
        {
          sentenceSequence: 1,
          type: 'REMAND',
          numberOfDays: 25,
          fromDate: '2023-02-01',
          toDate: '2023-02-25',
          active: true,
        } as PrisonApiSentenceAdjustments,
        {
          sentenceSequence: 1,
          type: 'UNUSED_REMAND',
          numberOfDays: 4,
          fromDate: null,
          toDate: null,
          active: true,
        } as PrisonApiSentenceAdjustments,
      ],
    })

    prisonerService.getCourtDateResults.mockResolvedValue([
      { courtData: 'DATA' } as unknown as PrisonApiCourtDateResult,
    ])

    prisonerService.getImprisonmentStatuses.mockResolvedValue([
      { imprisonmentData: 'DATA' } as unknown as PrisonApiImprisonmentStatusHistoryDto,
    ])

    prisonerService.getSentencesAndOffences.mockResolvedValue([
      {
        offences: [
          {
            offenceStatute: 'ABC',
          },
        ],
        caseReference: 'REF',
        sentenceSequence: 1,
        sentenceStatus: 'A',
      },
    ])

    identifyRemandPeriodsService.calculateRelevantRemand.mockRejectedValue({
      error: 'THIS IS AN ERROR IN CALCULATION',
    })

    const row = removeWhitespaceFromRow(
      (await service.runCalculations({ caseloads: [], username: 'bob' } as UserDetails, [prisonerNumber]))[0],
    )

    expect(row).toStrictEqual({
      ACTIVE_BOOKING_ID: '123',
      AGENCY_LOCATION_ID: undefined,
      CALCULATED_REMAND_DAYS: 0,
      COURT_DATES_JSON: '[{"courtData":"DATA"}]',
      IMPRISONMENT_STATUSES: '[{"imprisonmentData":"DATA"}]',
      ERROR_JSON: '{"error":"THIS IS AN ERROR IN CALCULATION"}',
      ERROR_STACK: undefined,
      ERROR_TEXT: undefined,
      INTERSECTING_SENTENCES: undefined,
      INTERSECTING_SENTENCES_SOURCE: '[]',
      IS_DATES_SAME: 'N',
      IS_DAYS_SAME: 'N',
      IS_REMAND_SAME: 'N',
      NOMIS_REMAND_DAYS: 29,
      NOMIS_REMAND_JSON:
        '[{"sentenceSequence":1,"type":"REMAND","numberOfDays":25,"fromDate":"2023-02-01","toDate":"2023-02-25","active":true}]',
      NOMIS_UNUSED_REMAND_JSON:
        '[{"sentenceSequence":1,"type":"UNUSED_REMAND","numberOfDays":4,"fromDate":null,"toDate":null,"active":true}]',
      NOMS_ID: 'ABC123',
      REMAND_TOOL_INPUT: '{}',
      REMAND_TOOL_OUTPUT: '{}',
      VALIDATION_MESSAGES: '',
    })
  })
  it('Successful calculation', async () => {
    prisonerSearchService.getPrisonerDetails.mockResolvedValue({
      prisonerNumber,
      bookingId,
    } as PrisonerSearchApiPrisoner)

    prisonerService.getBookingAndSentenceAdjustments.mockResolvedValue({
      bookingAdjustments: [],
      sentenceAdjustments: [
        {
          sentenceSequence: 1,
          type: 'REMAND',
          numberOfDays: 25,
          fromDate: '2023-02-01',
          toDate: '2023-02-25',
          active: true,
        } as PrisonApiSentenceAdjustments,
        {
          sentenceSequence: 1,
          type: 'UNUSED_REMAND',
          numberOfDays: 0,
          fromDate: null,
          toDate: null,
          active: true,
        } as PrisonApiSentenceAdjustments,
      ],
    })

    prisonerService.getCourtDateResults.mockResolvedValue([
      { courtData: 'DATA' } as unknown as PrisonApiCourtDateResult,
    ])

    prisonerService.getImprisonmentStatuses.mockResolvedValue([
      { imprisonmentData: 'DATA' } as unknown as PrisonApiImprisonmentStatusHistoryDto,
    ])

    prisonerService.getSentencesAndOffences.mockResolvedValue([
      {
        offences: [
          {
            offenceStatute: 'ABC',
          },
        ],
        caseReference: 'REF',
        sentenceSequence: 1,
        sentenceStatus: 'A',
      },
    ])

    identifyRemandPeriodsService.calculateRelevantRemand.mockResolvedValue({
      adjustments: [
        {
          fromDate: '2023-02-01',
          toDate: '2023-02-25',
          status: 'ACTIVE',
          bookingId: Number(bookingId),
        } as RemandResultAdjustment,
      ],
      remandCalculation: {
        calculationData: 'DATA',
      } as unknown as RemandCalculation,
      issuesWithLegacyData: [
        {
          bookingId,
          message: 'This error is important',
          offence: {
            statute: 'ABC',
          },
          courtCaseRef: 'NA',
        } as unknown as LegacyDataProblem,
        {
          bookingId,
          message: 'This error is aslo important',
          offence: {
            statute: 'QRS',
          },
          courtCaseRef: 'REF',
        } as unknown as LegacyDataProblem,
        {
          bookingId,
          message: 'This error is not important',
          offence: {
            statute: 'QRS',
          },
          courtCaseRef: 'NA',
        } as unknown as LegacyDataProblem,
      ],
    } as RemandResult)

    const row = removeWhitespaceFromRow(
      (await service.runCalculations({ caseloads: [], username: 'bob' } as UserDetails, [prisonerNumber]))[0],
    )

    expect(row).toStrictEqual({
      ACTIVE_BOOKING_ID: '123',
      AGENCY_LOCATION_ID: undefined,
      CALCULATED_REMAND_DAYS: 25,
      COURT_DATES_JSON: '[{"courtData":"DATA"}]',
      IMPRISONMENT_STATUSES: '[{"imprisonmentData":"DATA"}]',
      ERROR_JSON: 'null',
      ERROR_STACK: undefined,
      ERROR_TEXT: undefined,
      INTERSECTING_SENTENCES: undefined,
      INTERSECTING_SENTENCES_SOURCE:
        '[{"offences":[{"offenceStatute":"ABC"}],"caseReference":"REF","sentenceSequence":1,"sentenceStatus":"A"}]',
      IS_DATES_SAME: 'Y',
      IS_DAYS_SAME: 'Y',
      IS_REMAND_SAME: 'Y',
      NOMIS_REMAND_DAYS: 25,
      NOMIS_REMAND_JSON:
        '[{"sentenceSequence":1,"type":"REMAND","numberOfDays":25,"fromDate":"2023-02-01","toDate":"2023-02-25","active":true}]',
      NOMIS_UNUSED_REMAND_JSON:
        '[{"sentenceSequence":1,"type":"UNUSED_REMAND","numberOfDays":0,"fromDate":null,"toDate":null,"active":true}]',
      NOMS_ID: 'ABC123',
      REMAND_TOOL_INPUT: '{"remandCalculation":{"calculationData":"DATA"}}',
      REMAND_TOOL_OUTPUT:
        '{"adjustments":[{"fromDate":"2023-02-01","toDate":"2023-02-25","status":"ACTIVE","bookingId":123}],"issuesWithLegacyData":[{"bookingId":"123","message":"This error is important","offence":{"statute":"ABC"},"courtCaseRef":"NA"},{"bookingId":"123","message":"This error is aslo important","offence":{"statute":"QRS"},"courtCaseRef":"REF"},{"bookingId":"123","message":"This error is not important","offence":{"statute":"QRS"},"courtCaseRef":"NA"}]}',
      VALIDATION_MESSAGES: `This error is important\nThis error is aslo important`,
    })
  })
})

function removeWhitespaceFromRow(row: BulkRemandCalculationRow): BulkRemandCalculationRow {
  return {
    ...row,
    COURT_DATES_JSON: JSON.stringify(JSON.parse(row.COURT_DATES_JSON)),
    IMPRISONMENT_STATUSES: JSON.stringify(JSON.parse(row.IMPRISONMENT_STATUSES)),
    INTERSECTING_SENTENCES_SOURCE: JSON.stringify(JSON.parse(row.INTERSECTING_SENTENCES_SOURCE)),
    NOMIS_REMAND_JSON: JSON.stringify(JSON.parse(row.NOMIS_REMAND_JSON)),
    NOMIS_UNUSED_REMAND_JSON: JSON.stringify(JSON.parse(row.NOMIS_UNUSED_REMAND_JSON)),
    REMAND_TOOL_INPUT: JSON.stringify(JSON.parse(row.REMAND_TOOL_INPUT)),
    REMAND_TOOL_OUTPUT: JSON.stringify(JSON.parse(row.REMAND_TOOL_OUTPUT)),
    ERROR_JSON: JSON.stringify(JSON.parse(row.ERROR_JSON)),
  }
}
