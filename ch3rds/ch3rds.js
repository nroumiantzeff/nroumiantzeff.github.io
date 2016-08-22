function Harmonic(audioContext, master, container, tone, octave, type, order){
	this.audioContext = audioContext;
	this.master = master;
	this.container = container;
	this.tone = tone;
	this.octave;
	this.type = type;
	this.order = order;
	this.oscillator = new Oscillator(audioContext, master);
	this.setFrequency(tone, octave, type, order);
	this.setDetune(tone, octave, type, order);
	this.setLabel(type, order);
	this.on = false;
	if (order == 1 || order == 3 || order == 5){
		this.on = true;
	}
	this.div = document.createElement("DIV");
	this.div.className = "harmonic";
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

Harmonic.prototype.setFrequency = function(tone, octave, type, order){
	this.frequency = 440;
	this.oscillator.setFrequency(this.frequency);
}

Harmonic.prototype.setDetune = function(tone, octave, type, order){
	var detune = 0;
	var TONES = { "C": -900, "C#": -800, "D": -700, "D#": -600, "E": -500, "F": -400, "F#": -300, "G": -200, "G#": -100, "A": 0, "A#": 100, "B": 200};
	detune += TONES[tone];
	var pitch = (order - 1) % 7;
	octave += (order - 1 - pitch) / 7;
	if (type === "minor"){
		var MINOR = [0, 200, 300, 500, 700, 800, 1000];
		detune += MINOR[pitch];
	}
	else{
		var MAJOR = [0, 200, 400, 500, 700, 900, 1100];
		detune += MAJOR[pitch];
	}
	detune += octave * 1200;
	this.detune = detune;
	this.oscillator.setDetune(this.detune);
}

Harmonic.prototype.setLabel = function(type, order){
	var label = (order === 1)? "1st": (order === 2)? "2nd": (order === 3)? "3rd": order + "th";
	this.label = label;
}

function Chord(audioContext, master, container, before, tone, octave, type){
	this.audioContext = audioContext;
	this.master = master;
	this.gain = new Gain(audioContext, master);
	this.mute = 0;
	this.container = container;
	this.tone = tone;
	this.octave = octave;
	this.type = type;
	this.setLabel(tone, octave, type);
	this.on = false;
	this.whole = document.createElement("DIV");
	this.whole.className = "chord";
	if (before){
		container.insertBefore(this.whole, before);
	}
	else{
		container.appendChild(this.whole);
	}
	this.harmonics = [];
	for (var order = 17; order > 0; order--){
		var harmonic = new Harmonic(audioContext, this.gain, this.whole, tone, octave, type, order);
		this.harmonics.push(harmonic);
	}
	this.addSeparator();
	this.div = document.createElement("DIV");
	this.div.className = "chord-button";
	this.div.appendChild(document.createTextNode(this.label));
	this.whole.appendChild(this.div);
	var chord = this;
	this.div.onmousedown = function(){
		chord.gain.setGain(1-chord.mute);
		chord.on = true;
		chord.div.className = "chord-button chord-on";
	};
	this.div.onmouseup = function(){
		chord.gain.setGain(0);
		chord.on = false;
		chord.div.className = "chord-button";
	};
	this.div.addEventListener('touchstart', function(event){
		event.preventDefault();
		chord.gain.setGain(1-chord.mute);
		chord.on = true;
		chord.div.className = "chord-button chord-on";
	}, false);
	this.div.addEventListener('touchend', function(event){
		event.preventDefault();
		chord.gain.setGain(0);
		chord.on = false;
		chord.div.className = "chord-button";
	}, false);
	this.addSeparator();
	this.addSeparator();
	var toneDiv = document.createElement("DIV");
	var toneSelector = document.createElement("SELECT");
	toneSelector.className = "chord-tone-selector";
	toneSelector.innerHTML = '<option>B</option><option>A#</option><option>A</option><option>G#</option><option>G</option><option>F#</option><option>F</option><option>E</option><option>D#</option><option>D</option><option>C#</option><option>C</option>';
	for (var toneIndex = 0; toneIndex < toneSelector.options.length; toneIndex++){
		if (toneSelector.options[toneIndex].value == this.tone){
			toneSelector.selectedIndex = toneIndex;
			break;
		}
	}
	toneDiv.appendChild(toneSelector);
	this.whole.appendChild(toneDiv);
	toneSelector.onchange = function(){
		chord.changeTone(toneSelector.value);
	};
	this.addSeparator();
	var octaveDiv = document.createElement("DIV");
	var octaveSelector = document.createElement("SELECT");
	octaveSelector.className = "chord-octave-selector";
	octaveSelector.innerHTML = '<option value="5">+5</option><option value="4">+4</option><option value="3">+3</option><option value="2">+2</option><option value="1">+1</option><option value="0">0</option><option value="-1">-1</option><option value="-2">-2</option><option value="-3">-3</option><option value="-4">-4</option><option value="-5">-5</option>';
	for (var octaveIndex = 0; octaveIndex < octaveSelector.options.length; octaveIndex++){
		if (octaveSelector.options[octaveIndex].value == this.octave){
			octaveSelector.selectedIndex = octaveIndex;
			break;
		}
	}
	octaveDiv.appendChild(octaveSelector);
	this.whole.appendChild(octaveDiv);
	octaveSelector.onchange = function(){
		chord.changeOctave(parseInt(octaveSelector.value, 10));
	};
	this.addSeparator();
	var typeDiv = document.createElement("DIV");
	var typeSelector = document.createElement("SELECT");
	typeSelector.className = "chord-type-selector";
	typeSelector.innerHTML = '<option value="major"></option><option value="minor">m</option>';
	for (var typeIndex = 0; typeIndex < typeSelector.options.length; typeIndex++){
		if (typeSelector.options[typeIndex].value == this.type){
			typeSelector.selectedIndex = typeIndex;
			break;
		}
	}
	typeDiv.appendChild(typeSelector);
	this.whole.appendChild(typeDiv);
	typeSelector.onchange = function(){
		chord.changeType(typeSelector.value);
	};
	this.addSeparator();
	var muteDiv = document.createElement("DIV");
	var muteSelector = document.createElement("SELECT");
	muteSelector.className = "chord-mute-selector";
	muteSelector.innerHTML = '<option value="0">*1</option><option value="0.1">*0.9</option><option value="0.2">*0.8</option><option value="0.3">*0.7</option><option value="0.4">*0.6</option><option value="0.5">*0.5</option><option value="0.6">*0.4</option><option value="0.7">*0.3</option><option value="0.8">*0.2</option><option value="0.9">*0.1</option><option value="1">*0</option>';
	for (var muteIndex = 0; muteIndex < muteSelector.options.length; muteIndex++){
		if (muteSelector.options[muteIndex].value == this.mute){
			muteSelector.selectedIndex = muteIndex;
			break;
		}
	}
	muteDiv.appendChild(muteSelector);
	this.whole.appendChild(muteDiv);
	muteSelector.onchange = function(){
		chord.changeMute(muteSelector.value);
	};
	this.addSeparator();
	var appendButton = document.createElement("DIV");
	appendButton.className = "chord-append";
	appendButton.appendChild(document.createTextNode("+"));
	this.whole.appendChild(appendButton);
	appendButton.onmousedown = function(){
		chord.newChord();
	};
	appendButton.addEventListener('touchstart', function(event){
		event.preventDefault();
		chord.newChord();
	}, false);
	var deleteButton = document.createElement("DIV");
	deleteButton.className = "chord-delete";
	deleteButton.appendChild(document.createTextNode("-"));
	this.whole.appendChild(deleteButton);
	deleteButton.onmousedown = function(){
		chord.deleteChord();
	};
	deleteButton.addEventListener('touchstart', function(event){
		event.preventDefault();
		chord.deleteChord();
	}, false);
}

Chord.prototype.addSeparator = function(){
	var separator = document.createElement("DIV");
	separator.className = "chord-separator";
	this.whole.appendChild(separator);
}

Chord.prototype.setLabel = function(tone, octave, type){
	var label = tone;
	if (type === "minor"){
		label += "m";
	}
	this.label = label;
}

Chord.prototype.insertChord = function(tone, octave, type){
	return new Chord(this.audioContext, this.master, this.container, this.whole, tone, octave, type);
}

Chord.prototype.appendChord = function(tone, octave, type){
	return new Chord(this.audioContext, this.master, this.container, this.whole.nextSibling, tone, octave, type);
}

Chord.prototype.newChord = function(){
	this.appendChord(this.tone, this.octave, this.type);
}

Chord.prototype.changeChord = function(tone, octave, type){
	this.tone = tone;
	this.type = type;
	this.refresh();
}

Chord.prototype.refresh = function(){
	this.setLabel(this.tone, this.octave, this.type);
	this.div.firstChild.nodeValue = this.label;
	for (var index = 0; index < this.harmonics.length; index++){
		var harmonic = this.harmonics[index];
		var order = this.harmonics.length - index; 
		harmonic.setFrequency(this.tone, this.octave, this.type, order);
		harmonic.setDetune(this.tone, this.octave, this.type, order);
	}
}

Chord.prototype.changeTone = function(tone){
	this.tone = tone;
	this.refresh();
}

Chord.prototype.changeOctave = function(octave){
	this.octave = octave;
	this.refresh();
}

Chord.prototype.changeType = function(type){
	this.type = type;
	this.refresh();
}

Chord.prototype.changeMute = function(mute){
	this.mute = mute;
}

Chord.prototype.deleteChord = function(){
	//todo release oscilator resources
}

window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();
var master = new Gain(audioContext);
master.setGain(0.1);

new Chord(audioContext, master, document.body, null, "C", 0, "minor");
new Chord(audioContext, master, document.body, null, "D", 0, "minor");
new Chord(audioContext, master, document.body, null, "E", 0, "minor");
new Chord(audioContext, master, document.body, null, "F", 0, "minor");
new Chord(audioContext, master, document.body, null, "G", 0, "minor");
new Chord(audioContext, master, document.body, null, "A", 0, "minor");
new Chord(audioContext, master, document.body, null, "A", +1, "minor");
new Chord(audioContext, master, document.body, null, "A", -1, "minor");
new Chord(audioContext, master, document.body, null, "B", 0, "minor");
