type BulkRemandCalculationRow = {
  NOMS_ID: string
  ACTIVE_BOOKING_ID: number
  AGENCY_LOCATION_ID: string
  COURT_DATES_JSON: string
  CALCULATED_ALL_JSON: string
  NOMIS_REMAND_DAYS: number
  NOMIS_UNUSED_REMAND_DAYS: number
  CALCULATED_REMAND_DAYS: number
  NOMIS_REMAND_JSON: string
  NOMIS_UNUSED_REMAND_JSON: string
  CALCULATED_REMAND_JSON: string
  IS_REMAND_SAME: 'Y' | 'N'
  IS_DAYS_SAME: 'Y' | 'N'
  IS_DATES_SAME: 'Y' | 'N'
  INTERSECTING_SENTENCES: string
  NOMIS_INPUT_MESSAGES: string

  ERROR_TEXT: string
  ERROR_JSON: string
}

export default BulkRemandCalculationRow
