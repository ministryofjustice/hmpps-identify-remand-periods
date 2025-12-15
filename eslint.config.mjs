import hmppsConfig from '@ministryofjustice/eslint-config-hmpps'

export default hmppsConfig({
  extraPathsAllowingDevDependencies: ['.allowed-scripts.mjs'],
  extraIgnorePaths: ['assets/js/preventDoubleSubmit/index.js', 'assets/js/*.js', 'esbuild/*.js'],
})
