// components/Bubbles.tsx
"use client";

import { useEffect, useRef } from "react";

const Bubbles = () => {
  const interBubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let curX = 0;
    let curY = 0;
    let tgX = 0;
    let tgY = 0;
    let reqId: number;

    const move = () => {
      // Smoothly move toward the target position (now 2x slower)
      curX += (tgX - curX) / 20;
      curY += (tgY - curY) / 20;
      if (interBubbleRef.current) {
        interBubbleRef.current.style.transform = `translate(${Math.round(
          curX
        )}px, ${Math.round(curY)}px)`;
      }
      reqId = requestAnimationFrame(move);
    };

    const handleMouseMove = (event: MouseEvent) => {
      tgX = event.clientX;
      tgY = event.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove);
    move();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(reqId);
    };
  }, []);

  return (
    <div className="gradient-bg">
      <svg xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="goo">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className="gradients-container">
        <div className="g1"></div>
        <div className="g2"></div>
        <div className="g3"></div>
        <div className="g4"></div>
        <div className="g5"></div>
        <div ref={interBubbleRef} className="interactive"></div>
      </div>

      {/* Global styles */}
      <style jsx global>{`
        :root {
          --color-bg1: rgb(108, 0, 162);
          --color-bg2: rgb(0, 17, 82);
          --color1: 18, 113, 255;
          --color2: 221, 74, 255;
          --color3: 100, 220, 255;
          --color4: 200, 50, 50;
          --color5: 180, 180, 50;
          --color-interactive: 140, 100, 255;
          --circle-size: 80%;
          --blending: hard-light;
        }

        @keyframes moveInCircle {
          0% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(180deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes moveVertical {
          0% {
            transform: translateY(-50%);
          }
          50% {
            transform: translateY(50%);
          }
          100% {
            transform: translateY(-50%);
          }
        }
        @keyframes moveHorizontal {
          0% {
            transform: translateX(-50%) translateY(-10%);
          }
          50% {
            transform: translateX(50%) translateY(10%);
          }
          100% {
            transform: translateX(-50%) translateY(-10%);
          }
        }

        .gradient-bg {
          width: 100vw;
          height: 100vh;
          position: fixed;
          overflow: hidden;
          background: linear-gradient(
            40deg,
            var(--color-bg1),
            var(--color-bg2)
          );
          top: 0;
          left: 0;
          z-index: -1;
        }
        .gradient-bg svg {
          position: fixed;
          top: 0;
          left: 0;
          width: 0;
          height: 0;
        }
        .gradient-bg .gradients-container {
          filter: url(#goo) blur(40px);
          width: 100%;
          height: 100%;
        }
        .gradient-bg .g1 {
          position: absolute;
          background: radial-gradient(
              circle at center,
              rgba(var(--color1), 0.8) 0,
              rgba(var(--color1), 0) 50%
            )
            no-repeat;
          mix-blend-mode: var(--blending);
          width: var(--circle-size);
          height: var(--circle-size);
          top: calc(50% - var(--circle-size) / 2);
          left: calc(50% - var(--circle-size) / 2);
          transform-origin: center center;
          animation: moveVertical 60s ease infinite;
          opacity: 1;
        }
        .gradient-bg .g2 {
          position: absolute;
          background: radial-gradient(
              circle at center,
              rgba(var(--color2), 0.8) 0,
              rgba(var(--color2), 0) 50%
            )
            no-repeat;
          mix-blend-mode: var(--blending);
          width: var(--circle-size);
          height: var(--circle-size);
          top: calc(50% - var(--circle-size) / 2);
          left: calc(50% - var(--circle-size) / 2);
          transform-origin: calc(50% - 400px);
          animation: moveInCircle 40s reverse infinite;
          opacity: 1;
        }
        .gradient-bg .g3 {
          position: absolute;
          background: radial-gradient(
              circle at center,
              rgba(var(--color3), 0.8) 0,
              rgba(var(--color3), 0) 50%
            )
            no-repeat;
          mix-blend-mode: var(--blending);
          width: var(--circle-size);
          height: var(--circle-size);
          top: calc(50% - var(--circle-size) / 2 + 200px);
          left: calc(50% - var(--circle-size) / 2 - 500px);
          transform-origin: calc(50% + 400px);
          animation: moveInCircle 80s linear infinite;
          opacity: 1;
        }
        .gradient-bg .g4 {
          position: absolute;
          background: radial-gradient(
              circle at center,
              rgba(var(--color4), 0.8) 0,
              rgba(var(--color4), 0) 50%
            )
            no-repeat;
          mix-blend-mode: var(--blending);
          width: var(--circle-size);
          height: var(--circle-size);
          top: calc(50% - var(--circle-size) / 2);
          left: calc(50% - var(--circle-size) / 2);
          transform-origin: calc(50% - 200px);
          animation: moveHorizontal 80s ease infinite;
          opacity: 0.7;
        }
        .gradient-bg .g5 {
          position: absolute;
          background: radial-gradient(
              circle at center,
              rgba(var(--color5), 0.8) 0,
              rgba(var(--color5), 0) 50%
            )
            no-repeat;
          mix-blend-mode: var(--blending);
          width: calc(var(--circle-size) * 2);
          height: calc(var(--circle-size) * 2);
          top: calc(50% - var(--circle-size));
          left: calc(50% - var(--circle-size));
          transform-origin: calc(50% - 800px) calc(50% + 200px);
          animation: moveInCircle 40s ease infinite;
          opacity: 1;
        }
        .gradient-bg .interactive {
          position: absolute;
          background: radial-gradient(
              circle at center,
              rgba(var(--color-interactive), 0.8) 0,
              rgba(var(--color-interactive), 0) 50%
            )
            no-repeat;
          mix-blend-mode: var(--blending);
          width: 100%;
          height: 100%;
          top: -50%;
          left: -50%;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
};

export default Bubbles;
