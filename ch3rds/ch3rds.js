function Harmonic(container, id, label){
	this.container = container;
	this.id = id;
	this.label = label;
	this.on = false;
	this.div = document.createElement("DIV");
	if (label == "root" || label == "3rd" || label == "5th"){
		this.on = true;
		this.div.className = "harmonic harmonic-on";
	}
	else{
		this.div.className = "harmonic";
	}
	this.div.id = id;
	this.div.appendChild(document.createTextNode(label));
	container.appendChild(this.div);
	var harmonic = this;
	this.div.onmousedown = function(){
		if (harmonic.on){
			harmonic.on = false;
			harmonic.div.className = "harmonic";
		}
		else{
			harmonic.on = true;
			harmonic.div.className = "harmonic harmonic-on";
		}
	};
	this.div.addEventListener('touchstart', function (event){
		event.preventDefault();
		if (harmonic.on){
			harmonic.on = false;
			harmonic.div.className = "harmonic";
		}
		else{
			harmonic.on = true;
			harmonic.div.className = "harmonic harmonic-on";
		}
	}, false);
}

function Chord(container, id, label, type){
	this.container = container;
	this.id = id;
	this.label = label;
	this.type = type;
	this.on = false;
	this.whole = document.createElement("DIV");
	this.whole.className = "chord";
	container.appendChild(this.whole);
	var HARMONICS = ["root", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "13th", "14th", "15th", "16th", "17th"];
	var harmonics = [];
	for (var index = HARMONICS.length - 1; index >= 0; index--){
		var harmonic = new Harmonic(this.whole, this.id + "." + index, HARMONICS[index]);
		harmonics.push(harmonic);
	}
	this.div = document.createElement("DIV");
	this.div.className = "chord-button";
	this.div.id = id;
	this.div.appendChild(document.createTextNode(label));
	this.whole.appendChild(this.div);
	var chord = this;
	this.div.onmousedown = function(){
		chord.on = true;
		chord.div.className = "chord-button chord-on";
	};
	this.div.onmouseup = function(){
		chord.on = false;
		chord.div.className = "chord-button";
	};
	this.div.addEventListener('touchstart', function (event){
		event.preventDefault();
		chord.on = true;
		chord.div.className = "chord-button chord-on";
	}, false);
	this.div.addEventListener('touchend', function (event){
		event.preventDefault();
		chord.on = false;
		chord.div.className = "chord-button";
	}, false);
}

var chords = [];
chords.push(new Chord(document.body, "chord1", "F#m", "minor"));
chords.push(new Chord(document.body, "chord2", "A", "major"));
chords.push(new Chord(document.body, "chord2", "G", "major"));
chords.push(new Chord(document.body, "chord2", "Dm", "major"));
chords.push(new Chord(document.body, "chord2", "Bm", "major"));
