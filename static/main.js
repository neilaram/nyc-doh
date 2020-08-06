var mymap = L.map('mapid').setView([40.672958, -73.956945], 13);
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibmFyYW0xIiwiYSI6ImNrNThveDMxdzBxcXUzcHA3MTVnam1td2UifQ.nGwEpj7_PAsyUUFuLXSqBw', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    accessToken: 'your.mapbox.access.token'
}).addTo(mymap);

var before = document.getElementById('before');
var after = document.getElementById('after');

before.value = '2020-01-15'
after.value = '2020-01-15'

var markers = L.layerGroup().addTo(mymap);

var icons = {}
var colors = ["green", "blue", "yellow", "orange", "red", "grey", "violet"]
colors.forEach(function(color) {
    icons[color] = new L.Icon({
        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-' + color + '.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    })
});

var gradeColors = {
    "A": "green",
    "B": "yellow",
    "C": "orange",
    "": "grey",
}

function prevDay() {
    changeDay(-1);
    queryRestaurants();
}

function nextDay() {
    changeDay(1);
    queryRestaurants();
}

function changeDay(days) {
    var before = new Date(document.getElementById("before").value);
    var after = new Date(document.getElementById("after").value);
    before.setDate(before.getDate() + parseInt(days));
    after.setDate(after.getDate() + parseInt(days));
    document.getElementById("before").valueAsDate = before;
    document.getElementById("after").valueAsDate = after;
}

function queryRestaurants() {
    fetch("/inspections", {
            method: "POST",
            body: JSON.stringify({
                restaurant: document.getElementById("restaurant").value,
                after: stringFromDate(document.getElementById("after").value),
                before: stringFromDate(document.getElementById("before").value),
                minPoints: document.getElementById("minPoints").value,
                maxPoints: document.getElementById("maxPoints").value
            })
        })
        .then(res => res.text())
        .then(text => {
            renderRestaurants(text)
        })
        .catch((error) => {
            document.getElementById("demo").innerHTML = `Query failed: ${error}`;
        })
}

function renderRestaurants(jsonResp) {
    markers.clearLayers();
    var table = document.getElementById("tableBody")
    table.innerHTML = ""

    var resp = JSON.parse(jsonResp)
    if (resp == null) {
        document.getElementById("demo").innerHTML = "0 inspections found";
        return
    }
    document.getElementById("demo").innerHTML = resp.length + " inspections found";
    if (resp.length > 1000) {
        document.getElementById("demo").innerHTML += "(Showing 1000)";
    }
    resp.forEach(function(value, index, array) {
        var row = table.insertRow(-1)
        row.insertCell(-1).innerHTML = value.DBA
        row.insertCell(-1).innerHTML = value.Date
        row.insertCell(-1).innerHTML = value.Score
        row.insertCell(-1).innerHTML = value.Grade
        if (index > 1000) {
            return
        }
        var opts = {
            icon: inspIcon(value)
        }
        var marker = L.marker([value.Lat, value.Lon], opts);
        var popup = `${value.DBA}
          <br>Date:  ${value.Date} 
          <br>Score:  ${value.Score}
          <br>Grade:  ${value.Grade}
          <br>Type:  ${value.Type}
          <br>Action:  ${value.Action}
          <table>`
        value.Violations.forEach(function(v) {
            let txt = v
                // The violations can be long...truncate them.
            if (txt.length > 50) {
                txt = txt.slice(0, 50) + '...'
            }
            popup += `<tr><th>${txt}</tr></th>`
        })
        popup += `</table>`

        marker.bindPopup(popup).openPopup();
        marker.on('mouseover', function(e) {
            this.openPopup();
        });
        marker.on('mouseout', function(e) {
            this.closePopup();
        });
        markers.addLayer(marker);
    });
}

// Assign an icon based on the grade and score of an inspection.
function inspIcon(insp) {
    var icon = icons[gradeColors[insp.Grade]]
    if (insp.Score != "" && parseInt(insp.Score) > 40) {
        icon = icons["orange"]
    }
    if (insp.Action.startsWith("Establishment Closed by DOHMH.")) {
        icon = icons["red"]
    }
    if (insp.Action.startsWith("Establishment re-opened")) {
        icon = icons["violet"]
    }
    if (icon == null) {
        icon = icons["blue"]
    }
    return icon
}

var restaurants;

function onPageLoad() {
    queryRestaurants()
    fetch("/restaurantNames")
        .then(res => res.text())
        .then(text => {
            restaurants = JSON.parse(text)
            autocomplete(document.getElementById("restaurant"), restaurants);
        })
}

// Convert a date into YYYY-MM-DD format.
function stringFromDate(date) {
    if (date == "") {
        return ""
    }
    var d = new Date(date);
    return d.toISOString().split('T')[0]
}

// Autocomplete code stolen from https://www.w3schools.com/howto/howto_js_autocomplete.asp
function autocomplete(inp, arr) {
    /*the autocomplete function takes two arguments,
     *   the text field element and an array of possible autocompleted values:*/
    var currentFocus;
    /*execute a function when someone writes in the text field:*/
    inp.addEventListener("input", function(e) {
        var a, b, i, val = this.value;
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        if (!val) {
            return false;
        }
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        /*for each item in the array...*/
        for (i = 0; i < arr.length; i++) {
            /*check if the item starts with the same letters as the text field value:*/
            if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
                /*create a DIV element for each matching element:*/
                b = document.createElement("DIV");
                /*make the matching letters bold:*/
                b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
                b.innerHTML += arr[i].substr(val.length);
                /*insert a input field that will hold the current array item's value:*/
                b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
                /*execute a function when someone clicks on the item value (DIV element):*/
                b.addEventListener("click", function(e) {
                    /*insert the value for the autocomplete text field:*/
                    inp.value = this.getElementsByTagName("input")[0].value;
                    /*close the list of autocompleted values,
                     *               (or any other open lists of autocompleted values:*/
                    closeAllLists();
                });
                a.appendChild(b);
            }
        }
    });

    function closeAllLists(elmnt) {
        /*close all autocomplete lists in the document,
         *     except the one passed as an argument:*/
        var x = document.getElementsByClassName("autocomplete-items");
        for (var i = 0; i < x.length; i++) {
            if (elmnt != x[i] && elmnt != inp) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }
    /*execute a function when someone clicks in the document:*/
    document.addEventListener("click", function(e) {
        closeAllLists(e.target);
    });
}
