"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import svgPathsSpeichern from "../imports/svg-cw3uriulxp";
import svgPathsBarik from "../imports/svg-kmdpw2kkge";

type ButtonState = "speichern" | "barik" | "gespeichert";

function IconamoonHeart({ filled = false, animate = false }: { filled?: boolean; animate?: boolean }) {
  return (
    <motion.div 
      className="relative shrink-0 size-[24px]" 
      data-name="iconamoon:heart"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={animate ? {
        scale: [0.9, 1.1, 1.05, 1],
        opacity: 1,
      } : {
        scale: 1,
        opacity: 1,
      }}
      transition={{
        duration: 0.5,
        ease: [0.34, 1.56, 0.64, 1],
      }}
    >
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="iconamoon:heart">
          {filled ? (
            <motion.path
              d={svgPathsSpeichern.p9c58a00}
              fill="white"
              stroke="var(--stroke-0, white)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.33333"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.4,
                ease: "easeOut",
              }}
            />
          ) : (
            <motion.path
              d={svgPathsSpeichern.p9c58a00}
              stroke="var(--stroke-0, white)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.33333"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 0.5,
                ease: "easeInOut",
              }}
            />
          )}
        </g>
      </svg>
    </motion.div>
  );
}

function SpeichernButton({ isHovered }: { isHovered: boolean }) {
  return (
    <div className="relative rounded-[9.6px] size-full overflow-hidden">
      <motion.div 
        className="absolute inset-0"
        animate={{
          opacity: 1,
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{
          background: "#589d96",
        }}
      />
      <motion.div 
        className="relative size-full"
        animate={{
          boxShadow: isHovered 
            ? "0 2px 8px rgba(88, 157, 150, 0.15)" 
            : "0 1px 4px rgba(88, 157, 150, 0.1)",
        }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex flex-row items-center justify-center size-full">
          <motion.div 
            className="box-border content-stretch flex gap-[4.8px] items-center justify-center overflow-clip px-[16px] py-0 relative size-full"
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <IconamoonHeart />
            <motion.div 
              className="flex flex-col font-['Inter_Tight:Medium',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-[16px] text-center text-nowrap text-white"
              initial={{ opacity: 0, x: -3 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            >
              <p className="leading-[normal] whitespace-pre">Speichern</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function BarikButton() {
  return (
    <div className="relative rounded-[12px] size-full overflow-hidden" data-name="Buttons">
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{
          background: "linear-gradient(to right, #d2b581 4.348%, #e5d1a0 52.174%, #af8650 100%)",
        }}
      />
      <div className="relative flex flex-row items-center justify-center size-full">
        <motion.div 
          className="box-border content-stretch flex gap-[5.143px] items-center justify-center overflow-clip px-[17.143px] py-0 relative size-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.div 
            className="relative shrink-0 size-[24px]" 
            data-name="Ornament"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.1,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <div className="absolute inset-[16.85%_16.94%_16.48%_16.49%]" data-name="image 3 (Traced)">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
                <g id="image 3 (Traced)">
                  <path clipRule="evenodd" d={svgPathsBarik.p3767f370} fill="white" fillRule="evenodd" />
                  <path d={svgPathsBarik.p3c97df80} fill="white" />
                  <path d={svgPathsBarik.p3028d580} fill="white" />
                  <path d={svgPathsBarik.p1778e980} fill="white" />
                  <path d={svgPathsBarik.peac0880} fill="white" />
                  <path d={svgPathsBarik.p37d20680} fill="white" />
                  <path d={svgPathsBarik.p22617200} fill="white" />
                  <path d={svgPathsBarik.p1574d200} fill="white" />
                  <path d={svgPathsBarik.p959eaf0} fill="white" />
                  <path d={svgPathsBarik.pa6baa80} fill="white" />
                </g>
              </svg>
            </div>
          </motion.div>
          <motion.div 
            className="flex flex-col font-['Inter_Tight:Medium',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-[16px] text-center text-nowrap text-white" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p className="leading-[normal] whitespace-pre">Allahuma Barik</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function GespeichertButton({ isHovered }: { isHovered: boolean }) {
  return (
    <div className="relative rounded-[9.6px] size-full overflow-hidden">
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{
          background: "#589d96",
        }}
      />
      <motion.div 
        className="relative size-full"
        animate={{
          boxShadow: isHovered 
            ? "0 2px 8px rgba(88, 157, 150, 0.15)" 
            : "0 1px 4px rgba(88, 157, 150, 0.1)",
        }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex flex-row items-center justify-center size-full">
          <motion.div 
            className="box-border content-stretch flex gap-[4.8px] items-center justify-center overflow-clip px-[16px] py-0 relative size-full"
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <IconamoonHeart filled animate />
            <motion.div 
              className="flex flex-col font-['Inter_Tight:Medium',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-[16px] text-center text-nowrap text-white"
              initial={{ opacity: 0, x: -3 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            >
              <p className="leading-[normal] whitespace-pre">Gespeichert</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export function AnimatedButton() {
  const [buttonState, setButtonState] = useState<ButtonState>("speichern");
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (isAnimating) return;
    
    if (buttonState === "speichern") {
      setIsAnimating(true);
      setButtonState("barik");
      
      setTimeout(() => {
        setButtonState("gespeichert");
        setIsAnimating(false);
      }, 1500);
    } else if (buttonState === "gespeichert") {
      setButtonState("speichern");
    }
  };

  return (
    <motion.div
      className="w-64 h-12 cursor-pointer"
      onClick={handleClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      <AnimatePresence mode="wait">
        {buttonState === "speichern" && (
          <motion.div
            key="speichern"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="size-full"
          >
            <SpeichernButton isHovered={isHovered} />
          </motion.div>
        )}
        {buttonState === "barik" && (
          <motion.div
            key="barik"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ 
              duration: 0.5, 
              ease: [0.25, 0.1, 0.25, 1]
            }}
            className="size-full"
          >
            <BarikButton />
          </motion.div>
        )}
        {buttonState === "gespeichert" && (
          <motion.div
            key="gespeichert"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="size-full"
          >
            <GespeichertButton isHovered={isHovered} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
