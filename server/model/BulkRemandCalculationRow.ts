type BulkRemandCalculationRow = {
  // Inputs
  NOMS_ID: string
  ACTIVE_BOOKING_ID: string
  AGENCY_LOCATION_ID: string
  COURT_DATES_JSON: string
  IMPRISONMENT_STATUSES: string

  // Matching
  IS_REMAND_SAME: 'Y' | 'N'
  IS_DAYS_SAME: 'Y' | 'N'
  IS_DATES_SAME: 'Y' | 'N'

  // NOMIS
  NOMIS_REMAND_DAYS: number
  NOMIS_REMAND_JSON: string
  NOMIS_UNUSED_REMAND_JSON: string

  // Calculated
  REMAND_TOOL_INPUT: string
  REMAND_TOOL_OUTPUT: string
  CALCULATED_REMAND_DAYS: number
  INTERSECTING_SENTENCES: string
  INTERSECTING_SENTENCES_SOURCE: string
  VALIDATION_MESSAGES: string

  // Errors
  ERROR_TEXT: string
  ERROR_JSON: string
  ERROR_STACK: string
}

export default BulkRemandCalculationRow
