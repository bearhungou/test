function deleteInfo(id) {
  fetch(`/api/restaurant/${id}`, {
    method: 'DELETE'
  }).then(res => res.text()).then(res => {
    if (res === 'ok') {
      window.location.href = '/'
    } else {
      alert(`You couldn't delete it!`)
    }
  })
}
