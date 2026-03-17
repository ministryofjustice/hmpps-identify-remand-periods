;(function () {
  document.addEventListener(
    'change',
    function (event) {
      // If the clicked element doesn't have the right selector, bail
      if (event.target.id === 'unselect-all') {
        const { checked } = event.target
        if (checked) {
          var checkboxes = document.querySelectorAll('.row-checkbox')
          for (var i = 0; i < checkboxes.length; i++) {
            checkboxes[i].checked = !checked
          }
        }
      } else if (event.target.matches('.row-checkbox')) {
        const unselectAll = document.getElementById('unselect-all')
        var checkboxes = document.querySelectorAll('.row-checkbox')
        let anyChecked = false
        for (var i = 0; i < checkboxes.length; i++) {
          if (checkboxes[i].checked) {
            anyChecked = true
            break
          }
        }
        if (anyChecked) {
          unselectAll.checked = false
        }
      } else {
      }
    },
    false,
  )
})()
