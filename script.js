var map;
var positionMarker;
var closestMarker;
var currentCity;

var icons = {
	"activeIcon": L.icon({iconUrl: 'icons/activefountain.svg', iconSize: [27, 37]}),
	"inactiveIcon": L.icon({iconUrl: 'icons/inactivefountain.svg', iconSize: [27, 37]}),
	"closestIcon": L.icon({iconUrl: 'icons/closestfountain.svg', iconSize: [27, 37]}),
	"positionIcon": L.icon({iconUrl: 'icons/currentposition.svg', iconSize: [27, 37]})
};
		
var cities = {
	"Paris": {"data": "https://parisdata.opendatasoft.com/api/records/1.0/search/?dataset=fontaines-a-boire&rows=2000",
                  "lat": 48.87,
                  "lon": 2.35,
                  "zoom": 12,
                  "filterContent": (json)=>json.records,
                  "getTitle": (fountain)=>fountain.fields.voie,
                  "getLat": (fountain)=>fountain.fields.geo_point_2d[0],
                  "getLon": (fountain)=>fountain.fields.geo_point_2d[1],
                  "isActive": (fountain)=>fountain.fields.dispo=="OUI"},
	"Toulouse": {"data": "https://data.toulouse-metropole.fr/api/records/1.0/search/?dataset=fontaines-a-boire&rows=2000",
                     "lat": 43.61,
                     "lon": 1.44,
                     "zoom": 12,
                     "filterContent": (json)=>json.records,
                     "getTitle": (fountain)=>fountain.fields.localisation,
                     "getLat": (fountain)=>fountain.fields.geo_point_2d[0],
                     "getLon": (fountain)=>fountain.fields.geo_point_2d[1],
                     "isActive": (fountain)=>fountain.fields.etat=="en service"}
};

window.addEventListener("load", (event) => {
	var getParams = new RegExp("metropole=([^&#=]*)").exec(window.location.search);
	cities["defaultCity"] = (getParams==null || !Object.keys(cities).includes(getParams[1])) ? "Paris" : getParams[1];
	currentCity = cities["defaultCity"];
	fetch(cities[currentCity]["data"]).then((response) => response.json()).then((json) => showPoints(json));
	map = L.map('map', {zoomControl: false}).setView([cities[currentCity]["lat"], cities[currentCity]["lon"]], cities[currentCity]["zoom"]);
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
		    {attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		                + ' | Programme sous licence <a href="https://creativecommons.org/publicdomain/zero/1.0/legalcode.fr">CC0</a>'}).addTo(map);
	for (const key of Object.keys(cities))
		if (key != "defaultCity")
			document.getElementById("cityselector").innerHTML += "<option value='"+key+"' "+(key==cities["defaultCity"] ? "selected" : "")+">"+key+"</option>";
});

function showPoints(json) {
	cities[currentCity]["cache"] = cities[currentCity]["filterContent"](json);
	for (const fountain of Object.values(cities[currentCity]["cache"])) {
		L.marker([cities[currentCity]["getLat"](fountain), cities[currentCity]["getLon"](fountain)],
		         {icon: cities[currentCity]["isActive"](fountain) ? icons.activeIcon : icons.inactiveIcon})
		         .addTo(map)
		         .on('click', ()=>showInfo(fountain, false, false));
	}
}

function haversine(lat1, lon1, lat2, lon2) {
	const toRad = (deg)=>deg*Math.PI/180;
	const x1 = lat2-lat1;
	const dLat = toRad(x1);  
	const x2 = lon2-lon1;
	const dLon = toRad(x2);  
	const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);  
	return 12742 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function geoLocation() {
	if ("geolocation" in navigator && positionMarker == undefined) {
		navigator.geolocation.getCurrentPosition((position)=>addUserPosition(position),
		                                         (error)=>alert("La géolocalisation a échoué"),
		                                         {enableHighAccuracy: true});
	}
}

function addUserPosition(position) {
	if (haversine(cities[currentCity]["lat"], cities[currentCity]["lon"], position.coords.latitude, position.coords.longitude) > 20) {
		alert("Les coordonnées de votre appareil indiquent que vous n'êtes pas situé dans la ville sélectionée.\n"
		     +"Vérifiez que votre connexion ne passe pas à travers un serveur intermédiaire, ou essayez les autres villes proposées.");
		return;
	}
	positionMarker = L.marker([position.coords.latitude, position.coords.longitude],
		 {icon: icons.positionIcon})
		 .addTo(map)
		 .on('click', ()=>showInfo({"lat":position.coords.latitude,"lon":position.coords.longitude}, false, true));
	const closestFountain = findClosestFountain(position.coords.latitude, position.coords.longitude);
	closestMarker = L.marker([cities[currentCity]["getLat"](closestFountain), cities[currentCity]["getLon"](closestFountain)],
	         {icon: icons.closestIcon})
	         .addTo(map)
	         .on('click', ()=>showInfo(closestFountain, true, false))
	         .setZIndexOffset(5000);
	map.fitBounds(new L.featureGroup([positionMarker, closestMarker]).getBounds()).zoomOut();
	showInfo(closestFountain, true, false);
}

function findClosestFountain(lat, lon) {
	var closestFountain = null;
	var bestDistance = Infinity;
	for (const fountain of Object.values(cities[currentCity]["cache"])) {
		var distance = haversine(cities[currentCity]["getLat"](fountain), cities[currentCity]["getLon"](fountain), lat, lon);
		if (cities[currentCity]["isActive"](fountain) && distance < bestDistance) {
			closestFountain = Object.assign({}, fountain);   
			bestDistance = distance; 		
		}
	}
	return closestFountain;
}

function showInfo(fountain, isClosest, isCurrent) {
	const content = document.getElementById("content");
	if (isCurrent) content.innerHTML = "<b>VOTRE POSITION ACTUELLE</b><br>"+"Coordonnées : ("+Number(fountain.lat).toFixed(4)+", "+Number(fountain.lon).toFixed(4)+")";
	else {
		content.innerHTML = "<b>"+cities[currentCity]["getTitle"](fountain).toUpperCase()+"</b><br>";
		if (isClosest) content.innerHTML += "Cette fontaine est proche de vous";
	        else if (cities[currentCity]["isActive"](fountain)) content.innerHTML += "Cette fontaine est utilisable";
	        else content.innerHTML += "Cette fontaine est hors-service...";
		content.innerHTML += "<br>Coordonnées : ("+Number(cities[currentCity]["getLat"](fountain)).toFixed(4)+", "+Number(cities[currentCity]["getLon"](fountain)).toFixed(4)+")";
	}
	document.getElementById("infoprompt").style.display = "flex";
	document.getElementById("sidecolor").style["background-color"] = isClosest ? "#2db400" : isCurrent ? "red" : cities[currentCity]["isActive"](fountain) ? "#0066ff" : "#ff9100";
	document.getElementById("sideimage").src = isClosest ? "icons/closestfountain.svg" : isCurrent ? "icons/currentposition.svg" : cities[currentCity]["isActive"](fountain) ? "icons/activefountain.svg" : "icons/inactivefountain.svg";
}

function changeCity(cityName) {
	for (const layer of Object.values(map._layers))  if ('_icon' in layer) map.removeLayer(layer);
	currentCity = cityName;
	fetch(cities[currentCity]["data"]).then((response) => response.json()).then((json) => showPoints(json));
	document.getElementById('infoprompt').style.display = 'none';
	map.setView(new L.LatLng(cities[currentCity]["lat"], cities[currentCity]["lon"]), cities[currentCity]["zoom"]);
}
