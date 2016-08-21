function Harmonic(audioContext, master, container, id, tone, type, order){
	this.audioContext = audioContext;
	this.master = master;
	this.container = container;
	this.id = id;
	this.tone = tone;
	this.type = type;
	this.order = order;
	this.frequency = this.getFrequency(tone, type, order);
	this.detune = this.getDetune(tone, type, order);
	this.label = this.getLabel(type, order);
	this.oscillator = new Oscillator(audioContext, master);
	this.oscillator.setFrequency(this.frequency);
	this.oscillator.setDetune(this.detune);
	this.on = false;
	if (order == 1 || order == 3 || order == 5){
		this.on = true;
	}
	this.div = document.createElement("DIV");
	this.div.className = "harmonic";
	this.div.id = id;
	this.div.appendChild(document.createTextNode(this.label));
	container.appendChild(this.div);
	if (this.on){
		this.div.className = "harmonic harmonic-on";
		this.oscillator.setGain(1);
	}
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

Harmonic.prototype.getFrequency = function(tone, type, order){
	return 440;
}

Harmonic.prototype.getDetune = function(tone, type, order){
	var detune = 0;
	var TONES = { "A": 0, "A#": 100, "B": 200, "C": 300, "C#": 400, "D": 500, "D#": 600, "E": 700, "F": 800, "F#": 900, "G": 1000, "G#": 1100};
	detune += TONES[tone];
	var pitch = (order - 1) % 7;
	var octave = (order - 1 - pitch) / 7;
	if (type === "minor"){
		var MINOR = [0, 200, 300, 500, 700, 800, 1000];
		detune += MINOR[pitch];
	}
	else{
		var MAJOR = [0, 200, 400, 500, 700, 900, 1100];
		detune += MAJOR[pitch];
	}
	detune += octave * 1200;
	return detune;
}

Harmonic.prototype.getLabel = function(type, order){
	var label = (order === 1)? "1st": (order === 2)? "2nd": (order === 3)? "3rd": order + "th";
	return label;
}

function Chord(audioContext, master, container, before, id, tone, type){
	this.audioContext = audioContext;
	this.master = master;
	this.gain = new Gain(audioContext, master);
	this.container = container;
	this.id = id;
	this.tone = tone;
	this.type = type;
	this.label = this.getLabel(tone, type);
	this.on = false;
	this.whole = document.createElement("DIV");
	this.whole.className = "chord";
	if (before){
		container.insertBefore(this.whole, before);
	}
	else{
		container.appendChild(this.whole);
	}
	var HARMONICS = ["root", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "13th", "14th", "15th", "16th", "17th"];
	var harmonics = [];
	for (var order = 17; order > 0; order--){
		var harmonic = new Harmonic(audioContext, this.gain, this.whole, this.id + "." + order, tone, type, order);
		harmonics.push(harmonic);
	}
	var separator = document.createElement("DIV");
	separator.className = "chord-delete";
	this.whole.appendChild(separator);
	this.div = document.createElement("DIV");
	this.div.className = "chord-button";
	this.div.id = id;
	this.div.appendChild(document.createTextNode(this.label));
	this.whole.appendChild(this.div);
	var appendButton = document.createElement("DIV");
	appendButton.className = "chord-append";
	appendButton.appendChild(document.createTextNode("+"));
	this.whole.appendChild(appendButton);
	var deleteButton = document.createElement("DIV");
	deleteButton.className = "chord-delete";
	deleteButton.appendChild(document.createTextNode("-"));
	this.whole.appendChild(deleteButton);
	var chord = this;
	appendButton.onmousedown = function(){
		chord.newChord();
	};
	this.div.addEventListener('touchstart', function (event){
		event.preventDefault();
		chord.newChord();
	}, false);
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

Chord.prototype.getLabel = function(tone, type){
	var label = tone;
	if (type === "minor"){
		label += "m";
	}
	return label;
}

Chord.prototype.insertChord = function(tone, type){
	return new Chord(this.audioContext, this.master, this.container, this.whole, this.id, tone, type);
}

Chord.prototype.appendChord = function(tone, type){
	return new Chord(this.audioContext, this.master, this.container, this.whole.nextSibling, this.id, tone, type);
}

Chord.prototype.newChord = function(){
	
}

window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();
var master = new Gain(audioContext);
master.setGain(0.1);

var chords = [];
//debug chords.push(new Chord(audioContext, master, document.body, "chords", "C", "major"));
//debug chords.push(new Chord(audioContext, master, document.body, "chord1", "A", "major"));
chords.push(new Chord(audioContext, master, document.body, null, "chord2", "A", "minor"));
chords.push(new Chord(audioContext, master, document.body, null, "chord2", "A", "minor"));
chords.push(new Chord(audioContext, master, document.body, null, "chord2", "A", "minor"));
chords.push(new Chord(audioContext, master, document.body, null, "chord2", "A", "minor"));
chords.push(new Chord(audioContext, master, document.body, null, "chord2", "A", "minor"));
chords.push(new Chord(audioContext, master, document.body, null, "chord2", "A", "minor"));
chords.push(new Chord(audioContext, master, document.body, null, "chord2", "A", "minor"));
chords.push(new Chord(audioContext, master, document.body, null, "chord2", "A", "minor"));
//debug chords.push(chords[4].insertChord("C", "major"));
chords.push(chords[2].insertChord("E", "major"));
