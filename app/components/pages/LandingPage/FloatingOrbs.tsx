"use client";
import React, { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";

const FloatingOrbs = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Fragment>
      <motion.div
        className='absolute left-1/4 top-1/4 h-48 w-48 rounded-full bg-primary/20 blur-[40px] will-change-transform md:h-64 md:w-64 md:blur-[100px]'
        animate={
          shouldReduceMotion
            ? {}
            : {
                x: [0, 30, 0],
                y: [0, 20, 0],
                scale: [1, 1.1, 1],
              }
        }
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className='absolute right-1/4 top-1/2 h-48 w-48 rounded-full bg-primary/10 blur-[40px] will-change-transform md:h-64 md:w-64 md:blur-[100px]'
        animate={
          shouldReduceMotion
            ? {}
            : {
                x: [0, -30, 0],
                y: [0, -20, 0],
                scale: [1, 1.15, 1],
              }
        }
        transition={{
          duration: 15,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
    </Fragment>
  );
};

export default FloatingOrbs;
