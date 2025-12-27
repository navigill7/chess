import { useRef, useCallback } from 'react';

const SOUNDS = {
  move: '/assets/sound/Move.mp3',
  capture: '/assets/sound/Capture.mp3',
  check: '/assets/sound/Check.mp3',
  castle: '/assets/sound/Check.mp3',
  gameStart: '/assets/sound/Check.mp3',
  gameEnd: '/assets/sound/Checkmate.mp3',
  lowTime: '/assets/sound/Check.mp3',
  notification: '/assets/sound/Capture.mp3',
};

function useSound() {
  const audioContextRef = useRef(null);
  const soundsRef = useRef({});
  const enabledRef = useRef(true);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  }, []);

  const loadSound = useCallback(async (name, url) => {
    if (soundsRef.current[name]) return;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      soundsRef.current[name] = audioBuffer;
    } catch (error) {
      console.error(`Failed to load sound: ${name}`, error);
    }
  }, []);

  const play = useCallback((soundName, volume = 1.0) => {
    if (!enabledRef.current) return;

    initAudio();

    const soundUrl = SOUNDS[soundName];
    if (!soundUrl) {
      console.warn(`Sound not found: ${soundName}`);
      return;
    }

    // For simplicity, use Audio API instead of Web Audio API
    const audio = new Audio(soundUrl);
    audio.volume = volume;
    audio.play().catch((error) => {
      console.error(`Failed to play sound: ${soundName}`, error);
    });
  }, [initAudio]);

  const playMove = useCallback((captured = false) => {
    play(captured ? 'capture' : 'move');
  }, [play]);

  const playCheck = useCallback(() => {
    play('check');
  }, [play]);

  const playCastle = useCallback(() => {
    play('castle');
  }, [play]);

  const playGameStart = useCallback(() => {
    play('gameStart');
  }, [play]);

  const playGameEnd = useCallback(() => {
    play('gameEnd');
  }, [play]);

  const playLowTime = useCallback(() => {
    play('lowTime', 0.5);
  }, [play]);

  const playNotification = useCallback(() => {
    play('notification');
  }, [play]);

  const setEnabled = useCallback((enabled) => {
    enabledRef.current = enabled;
  }, []);

  return {
    play,
    playMove,
    playCheck,
    playCastle,
    playGameStart,
    playGameEnd,
    playLowTime,
    playNotification,
    setEnabled,
  };
}

export default useSound;