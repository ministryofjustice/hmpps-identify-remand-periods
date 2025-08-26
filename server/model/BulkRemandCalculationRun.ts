import BulkRemandCalculationRow from './BulkRemandCalculationRow'

type BulkRemandCalculationRun = {
  id: string
  status: 'RUNNING' | 'DONE' | 'FAILED'
  results: BulkRemandCalculationRow[] | null
}

export default BulkRemandCalculationRun
