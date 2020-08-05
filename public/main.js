let candidatos = false
let votante = false

let _interval = false

function getCandidatos () {
  candidatos = Array()
  
  firebase.firestore().collection('candidatos').get().then( qs => { 
    qs.forEach( doc => {
      candidatos.push( { ref: doc.id, id: doc.data().id, nome: doc.data().nome } )
    })
  })
}

let votosVal = Array()
let votos = Array()

function getVotosSel () {
  votosVal = Array()
  votos = Array()

  $('#voteConfirm ul').empty()
  
  function _addVotosSel (index){
    if ( $(this).val() === 'branco' ) return;

    votosVal.push($(this).val())

    firebase.firestore().collection('candidatos').doc($(this).val())
    .get().then((doc) => {
      data = doc.data()
      votos.push({ref: doc.id, id: Number(data.id), nome: data.nome})

      $('#voteConfirm ul').append(`<li>${data.id} - ${data.nome}</li>`)
    })
  }
  
  $('.voto').each(_addVotosSel)  
}


function populateVoto (_votoid) {
  let votoid = `#voto-${_votoid}`

  $('.voto').append('<option value="branco"></option>')

  firebase.firestore().collection('candidatos').get().then( qs => { 
    qs.forEach( doc => {
      $('.voto').append(`<option value=${doc.id}>${doc.data().id} - ${doc.data().nome}</option>`)
    })
  })
}

function verificaVotante () {
  function _verificaVotante (doc) {

    if ( $('#iddemolay').val() != doc.data().id ) {
      $('#aviso').modal('show')

      return
    }
    
    if ( doc.data().votou === true ) {
      $('#jaVotou').modal('show')

      $('#votante input').val('')

      return
    }

    votante = { docid: doc.id, id: doc.data().id, nome: doc.data().nome }

    $('section').hide()
    $('#vote').fadeIn()
  }

  firebase.firestore().collection('votantes').doc( $('#codconfirm').val().trim() )
  .get().then(_verificaVotante).catch((e)=>{console.log(`Error: ${e}`)})
}

function sendVote () {
  votos.forEach((voto, index) => {
    firebase.firestore().collection('votos').add({
      ref: voto.ref,
      id: Number(voto.id), 
      nome: voto.nome,
      hora: firebase.firestore.FieldValue.serverTimestamp()
    })
  })

  firebase.firestore().collection('votantes').doc(votante.docid).set({
    id: votante.id, 
    nome: votante.nome, 
    votou: true, 
    hora: firebase.firestore.FieldValue.serverTimestamp()
  })

  goToPage('finish')
}

let _result = []
let _resultTable = ''
function addResult (candidato) {
  _result.push(candidato)
  
  _resultTable = _result.sort( (a,b) => b.votos - a.votos )
    .map( c => `<tr><td>${c.nome} (${c.id})</td><td style="text-align: right">${c.votos}</td></tr>` )
    .join('')
  
  $('#result table tbody').empty()
  $('#result table tbody').append(_resultTable)
}

function goToPage(id) {
  $('section').hide()

  $(`#${id}`).fadeIn()

  if (id === 'result') getResult()

  if (id === 'wait') {
    _interval = setInterval(function () {
      firebase.firestore().collection('conf').doc('geral')
      .get().then(doc => { if (doc.data().iniciar) location.reload(true) })
    }, 2500)
  } else if (id === 'start' ) {
    clearInterval(_interval)
    
    _interval = setInterval(function () {
      firebase.firestore().collection('conf').doc('geral')
      .get().then(doc => { if (doc.data().finalizar) location.reload(true) })
    }, 2500)
  } else if (id === 'finish' ) {
    clearInterval(_interval)
    
    _interval = setInterval(function () {
      firebase.firestore().collection('conf').doc('geral')
      .get().then(doc => { if (doc.data().resultados) location.reload(true) })
    }, 2500)
  } else {
    clearInterval(_interval)
  }
}

function getResult () {
  function _getVotos (candidato) {
    firebase.firestore().collection('votos').where('id', '==', candidato.id)
    .get().then(qs => addResult({id:candidato.id, nome: candidato.nome, votos: qs.size}))
  }
  
  firebase.firestore().collection('candidatos')
  .get().then( qs => qs.forEach( doc => _getVotos( doc.data() ) ))
}

$(function () {
  $('section').hide()

  firebase.firestore().collection('conf').doc('geral')
  .get().then(doc => {
    goToPage( 
      doc.data().iniciar ? 
        doc.data().finalizar ?
          doc.data().resultados ? 
            'result' : 
          'finish' : 
        'start' : 
      'wait'
    )    
  })

  getCandidatos()

  $('#start button').click(() => {
    if ($('#iddemolay').val().length < 3 || $('#codconfirm').val().length < 5) {
      $('#aviso').modal('show')

      return
    }
    
    verificaVotante()
  })

  $('.voto').change((event) => {
    voto = $(event.target).attr('id') 

    if ( votosVal.lastIndexOf($(event.target).val()) > -1 ) {
      $(event.target).val('branco')
    }

    getVotosSel()
  })
  
  populateVoto()
})