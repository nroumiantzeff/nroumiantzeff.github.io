function Harmonic(audioContext, master, container, id, label){
	this.audioContext = audioContext;
	this.master = master;
	this.oscillator = new Oscillator(audioContext, master);
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
	if (this.on){
		this.oscillator.setGain(1);
	}
	this.div.id = id;
	this.div.appendChild(document.createTextNode(label));
	container.appendChild(this.div);
	var harmonic = this;
	this.div.onmousedown = function(){
		if (harmonic.on){
			harmonic.oscillator.setGain(0);
			harmonic.on = false;
			harmonic.div.className = "harmonic";
		}
		else{
			harmonic.oscillator.setGain(1);
			harmonic.on = true;
			harmonic.div.className = "harmonic harmonic-on";
		}
	};
	this.div.addEventListener('touchstart', function (event){
		event.preventDefault();
		if (harmonic.on){
			harmonic.oscillator.setGain(0);
			harmonic.on = false;
			harmonic.div.className = "harmonic";
		}
		else{
			harmonic.oscillator.setGain(1);
			harmonic.on = true;
			harmonic.div.className = "harmonic harmonic-on";
		}
	}, false);
}

function Chord(audioContext, master, container, id, label, type){
	this.audioContext = audioContext;
	this.master = master;
	this.gain = new Gain(audioContext, master);
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
		var harmonic = new Harmonic(audioContext, this.gain, this.whole, this.id + "." + index, HARMONICS[index]);
		harmonics.push(harmonic);
	}
	this.div = document.createElement("DIV");
	this.div.className = "chord-button";
	this.div.id = id;
	this.div.appendChild(document.createTextNode(label));
	this.whole.appendChild(this.div);
	var chord = this;
	this.div.onmousedown = function(){
		chord.gain.setGain(1);
		chord.on = true;
		chord.div.className = "chord-button chord-on";
	};
	this.div.onmouseup = function(){
		chord.gain.setGain(0);
		chord.on = false;
		chord.div.className = "chord-button";
	};
	this.div.addEventListener('touchstart', function (event){
		event.preventDefault();
		chord.gain.setGain(1);
		chord.on = true;
		chord.div.className = "chord-button chord-on";
	}, false);
	this.div.addEventListener('touchend', function (event){
		event.preventDefault();
		chord.gain.setGain(0);
		chord.on = false;
		chord.div.className = "chord-button";
	}, false);
}

window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();
var master = new Gain(audioContext);
master.setGain(0.1);

var chords = [];
chords.push(new Chord(audioContext, master, document.body, "chord1", "F#m", "minor"));
//debug chords.push(new Chord(audioContext, master, document.body, "chord2", "A", "major"));
//debug chords.push(new Chord(audioContext, master, document.body, "chord2", "G", "major"));
//debug chords.push(new Chord(audioContext, master, document.body, "chord2", "Dm", "major"));
//debug chords.push(new Chord(audioContext, master, document.body, "chord2", "Bm", "major"));


//debug var debug = new Harmonic(audioContext, master, document.body, "debug", "debug");//debug
