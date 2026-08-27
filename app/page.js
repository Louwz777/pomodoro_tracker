"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [studyMin, setStudyMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [rounds, setRounds] = useState(4);

  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [phase, setPhase] = useState("study"); // "study" | "break"
  const [currentRound, setCurrentRound] = useState(1);
  const [finished, setFinished] = useState(false);

  const intervalRef = useRef(null);

  // Campana al cambiar de estado (estudio-descanso o descanso-estudio)
  function playBell() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 830;
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1);
  }

  // Campana de la cuenta regresiva para los últimos 5 segundos de descanso
  function playTick() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.value = 600;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  const countdownAlert =
    phase === "break" &&
    isRunning &&
    secondsLeft <= 5 &&
    currentRound < rounds;

  useEffect(() => {
    const body = document.body;
    body.classList.remove("phase-study", "phase-break", "phase-done", "countdown-alert");
    if (finished) {
      body.classList.add("phase-done");
    } else if (phase === "break") {
      body.classList.add("phase-break");
    } else {
      body.classList.add("phase-study");
    }
    if (countdownAlert) {
      body.classList.add("countdown-alert");
    }
    return () => {
      body.classList.remove("phase-study", "phase-break", "phase-done", "countdown-alert");
    };
  }, [phase, finished, countdownAlert]);

  // Format seconds to mm:ss
  function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  // Tick
  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        // Sonido de la cuenta regresiva en los últimos 5 segundos de descanso antes del siguiente estudio
        if (phase === "break" && prev <= 6 && prev > 1 && currentRound < rounds) {
          playTick();
        }

        if (prev <= 1) {
          clearInterval(intervalRef.current);

          if (phase === "study") {
            // Termina el estudio → comienza el descanso
            playBell();
            setPhase("break");
            setIsRunning(true);
            return breakMin * 60;
          } else {
            // Termina el descanso → siguiente ronda o termina
            if (currentRound >= rounds) {
              playBell();
              setFinished(true);
              setIsRunning(false);
              setHasStarted(false);
              return 0;
            }
            playBell();
            setCurrentRound((r) => r + 1);
            setPhase("study");
            setIsRunning(true);
            return studyMin * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, phase, currentRound, rounds, studyMin, breakMin]);

  function start() {
    if (finished) return;
    setIsRunning(true);
    setHasStarted(true);
  }

  function pause() {
    setIsRunning(false);
    clearInterval(intervalRef.current);
  }

  function reset() {
    setIsRunning(false);
    setHasStarted(false);
    clearInterval(intervalRef.current);
    setPhase("study");
    setCurrentRound(1);
    setFinished(false);
    setSecondsLeft(studyMin * 60);
  }

  // Sincroniza el temporizador cuando cambia la configuración y no se ha iniciado
  useEffect(() => {
    if (!hasStarted && !finished) {
      setSecondsLeft(phase === "study" ? studyMin * 60 : breakMin * 60);
    }
  }, [studyMin, breakMin, phase, hasStarted, finished]);

  return (
    <div className="container">
      {!hasStarted && (
        <>
          <h1>Pomodoro Tracker 🍅</h1>
          <h2>Grupo 01 - Prototipo de Sebastian Burgos</h2>
        </>
      )}

      {/* Config*/}
      {!hasStarted && (
        <div className="config">
          <label>
            Estudio (min):
            <input
              type="number"
              min={1}
              max={120}
              value={studyMin}
              disabled={isRunning}
              onChange={(e) => setStudyMin(Math.max(1, Number(e.target.value)))}
            />
          </label>
          <label>
            Descanso (min):
            <input
              type="number"
              min={1}
              max={60}
              value={breakMin}
              disabled={isRunning}
              onChange={(e) => setBreakMin(Math.max(1, Number(e.target.value)))}
            />
          </label>
          <label>
            Repeticiones:
            <input
              type="number"
              min={1}
              max={20}
              value={rounds}
              disabled={isRunning}
              onChange={(e) => setRounds(Math.max(1, Number(e.target.value)))}
            />
          </label>
        </div>
      )}

      {/* Timer */}
      {(hasStarted || finished) && (
        <div className={`timer${countdownAlert ? " countdown-alert" : ""}`}>
          <div className="time">{fmt(secondsLeft)}</div>
          <div className="status">
            {finished
              ? "¡Sesion terminada!"
              : `Ronda ${currentRound}/${rounds}`}
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="buttons">
        {!isRunning ? (
          <button className="btn-start" onClick={start} disabled={finished}>
            Iniciar
          </button>
        ) : (
          <button className="btn-pause" onClick={pause}>
            Pausar
          </button>
        )}
        <button className="btn-reset" onClick={reset}>
          Reiniciar
        </button>
      </div>

      {/* Progreso */}
      <div className="progress">
        Ronda {currentRound} de {rounds}
      </div>
    </div>
  );
}
