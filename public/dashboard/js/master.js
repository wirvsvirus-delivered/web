function dialogue(id, title, content) {
  $('body').append('<div class="modal-wrapper" style="display: flex" id="' +
    id +
    '"><div class="modal"><h2 class="heading">' +
    title +
    '<button style="border-radius: 50%; padding: 4px;float: right; background:#ab1c48" onclick="$(\'#' +
    id +
    '\').remove();"><i class="material-icons md-18">close</i></button></h2>' +
    '<p>' +
    content +
    '</p></div></div>')
}
// Überprüft, ob Nuther authentifiziert & Telefonist ist
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    $('#email').html(user.email);
    var db = firebase.firestore();
    var docRef = db.collection("users").doc(user.uid);
    docRef.get().then(function(doc) {
      if (doc.exists) {
        if (doc.data().type === 'telephoner') {
          $('.loader-wrapper').hide();
        } else {
          firebase.auth().signOut();
          alert('Du bist kein registrierter Telefonist');
          window.location.replace('/dashboard/auth/');
        }
      } else {
        firebase.auth().signOut();
        alert('Du bist kein registrierter Telefonist');
        window.location.replace('/dashboard/auth/');
      }
    }).catch(function(error) {
      window.location.replace('/dashboard/auth/');
    });
  }
});

// Wenn das Eintrag-Suchformular abgeschickt wird, such nach Einträgen
// in der DB und gib sie aus
$(".form-searchEntry").submit(function(event) {
  event.preventDefault();
  $('.loader-wrapper').css('display', 'flex');
  $('.modal-searchEntry-wrapper').hide();
  const zip = parseInt($('.form-searchEntry input[name="zip"]').val());
  const fname = $('.form-searchEntry input[name="fname"]').val();
  const lname = $('.form-searchEntry input[name="lname"]').val();
  firebase.functions().httpsCallable('telephonerGetTasks')({
    fname: fname,
    lname: lname,
    zip: zip
  }).then(function(response) {
    if (response.data.state === 'ok') {
      $('#zip p').html(zip);
      $('.modal-showEntry .heading span').html(fname + ' ' + lname)
      for (index in response.data.data) {
        const ref = response.data.data[index];
        $('#entries').append(
          generateEntryBlock(
            index.toString(),
            ref.street,
            ref.number,
            ref.delivered,
            ref.payed
          )
        )
      }
      $('.modal-showEntry-wrapper').css('display', 'flex');
      $('.loader-wrapper').hide();
    } else {
      dialogue('showEntriesInvalidResponse', 'Fehler', 'Ung&uuml;ltige Antwort erhalten')
    }
  }).catch(function(error) {
    console.log(error);
    alert(error);
  });
  $('.form-searchEntry input').val(null);
});

var itemsInCart = 1;

function createNewEntryItem() {
  $('.form-newEntry-items').append('<div class="form-newEntry-item row" id="form-newEntry-item-' +
    itemsInCart +
    '"><input required style="width:30%" type="text" class="form-newEntry-item-name" placeholder="Name"><input required style="width:20%" type="text" class="form-newEntry-item-amount" placeholder="Menge"><input style="width:35%" type="text" class="form-newEntry-item-info" placeholder="Info"></div>')
}

var cart = {
  items: [],
  addItem: function(item, amount, info) {
    if (this.items.length < 20 && item !== '' && item !== null && amount !== '' & amount !== null) {
      this.items.push({
        amount: amount,
        item: item,
        info: info
      });
    }
  },
  removeItem: function(item, amount, info) {
    try {
      this.items.splice(this.items.indexOf({
        amount: amount,
        item: item,
        info: info
      }));
    } catch (error) {
      console.log(error);
    }
  },
  countItems: function() {
    return this.items.length + 1;
  },
  clear: function() {
    this.items = [];
  },
}

// Neuen Eintrag erstellen
$('.form-newEntry').submit(function(event) {
  event.preventDefault()
  $('.loader-wrapper').css('display', 'flex');
  $('.modal-newEntry-wrapper').hide();
  for (i = 1; i <= itemsInCart; i++) {
    cart.addItem(
      $('#form-newEntry-item-' + i + ' .form-newEntry-item-name').val(),
      $('#form-newEntry-item-' + i + ' .form-newEntry-item-amount').val(),
      $('#form-newEntry-item-' + i + ' .form-newEntry-item-info').val(),
    );
  }
  const birthdate = new Date(
    parseInt($('.form-newEntry [name="year"]').val()),
    parseInt($('.form-newEntry [name="month"]').val()) - 1,
    parseInt($('.form-newEntry [name="day"]').val())
  ).getTime() / 1000;
  firebase.functions().httpsCallable('telephonerAddTask')({
    fname: $('.form-newEntry [name="fname"]').val(),
    lname: $('.form-newEntry [name="lname"]').val(),
    birth: birthdate,
    country: 'de',
    number: $('.form-newEntry [name="num"]').val(),
    over16: $('.form-newEntry [name="over16"]').is(':checked'),
    over18: $('.form-newEntry [name="over18"]').is(':checked'),
    phone: parseInt($('.form-newEntry [name="tel"]').val()),
    street: $('.form-newEntry [name="street"]').val(),
    addressInfo: $('.form-newEntry [name="addressInfo"]').val(),
    zip: parseInt($('.form-newEntry [name="zip"]').val()),
    items: cart.items
  }).then(function(response) {
    if (response.data.state === 'ok') {
      dialogue('newEntryDialogue', 'Auftragsstatus', 'Erfolgreich abgeschickt');
    } else {
      dialogue('newEntryDialogue', 'Auftragsstatus', 'Es ist ein Fehler aufgetreten');
    }
  }).catch(function(error) {
    alert(error);
  });
  cart.clear();
  $('.form-newEntry').trigger("reset");
  $('.form-newEntry-item').remove();
  itemsInCart = 1;
  generateEntryBlock();
  $('.loader-wrapper').hide();
})


// Generiert Eintrag-Übersicht
function generateEntryBlock(num, street, streetnum, alreadyDelivered, userPayed) {
  var delivered, payed;
  id = parseInt(num) + 1;
  if (alreadyDelivered === true) {
    delivered = 'Ja';
  } else {
    delivered = 'Nein';
  }
  if (userPayed === true) {
    payed = 'Ja';
  } else {
    payed = 'Nein';
  }
  return '<hr>' +
    '<section id="showEntrySection' + id + '" class="showEntrySection">' +
    '<h2 style="margin-bottom: 5px;">Auftrag Nr. <span>' + id + '</span></h2>' +
    '<section>' +
    '<h3>Straße</h3>' +
    '<p>' + street + ' ' + streetnum + '</p>' +
    '</section>' +
    '<section>' +
    '<h3>Zugestellt</h3>' +
    '<p>' + delivered + '</p>' +
    '</section>' +
    '<section>' +
    '<h3>Bezahlt</h3>' +
    '<p>' + payed + '</p>' +
    '</section>' +
    '</section>';
}

function generateRandomString(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

$(document).on('keydown', function(event) {
  if (event.key == "Escape") {
    $('.modal-wrapper').hide();
  }
});
