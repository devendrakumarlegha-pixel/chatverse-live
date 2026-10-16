(function () {
  let enabled = true;
  let audio;
  const sequences = {
    red: [220, 330], blue: [330, 494], build: [180, 420],
    attack: [150, 95, 260], defend: [260, 390],
    power: [440, 660, 880], forest: [320, 460],
    castle: [130, 196, 260], chaos: [110, 180, 90, 330],
    round: [392, 523, 659], reset: [440, 330]
  };
  function play(kind) {
    if (!enabled) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audio = audio || new Ctx();
      if (audio.state === "suspended") audio.resume();
      const start = audio.currentTime;
      (sequences[kind] || [300, 420]).forEach((hz, i) => {
        const osc = audio.createOscillator();
        const vol = audio.createGain();
        osc.type = kind === "attack" || kind === "chaos" ? "sawtooth" : "triangle";
        osc.frequency.setValueAtTime(hz, start + i * 0.075);
        vol.gain.setValueAtTime(0.0001, start + i * 0.075);
        vol.gain.exponentialRampToValueAtTime(0.12, start + i * 0.075 + 0.012);
        vol.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.075 + 0.16);
        osc.connect(vol); vol.connect(audio.destination);
        osc.start(start + i * 0.075); osc.stop(start + i * 0.075 + 0.18);
      });
    } catch (_) {}
  }
  window.playChatverseSound = play;
  window.setChatverseSound = function (value) { enabled = !!value; };
})();