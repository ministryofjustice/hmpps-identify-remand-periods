window.addEventListener('load', function () {
  accessibleAutocomplete.enhanceSelectElement({
    selectElement: document.querySelector('#prisonId'),
    placeholder: 'Start typing the name of the prison',
  })
})
