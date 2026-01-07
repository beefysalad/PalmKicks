"use client";
import React, { Fragment } from "react";
import { motion } from "framer-motion";
const FloatingOrbs = () => {
  return (
    <Fragment>
      <motion.div
        className='absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/20 blur-[100px]'
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 8,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className='absolute right-1/4 top-1/2 h-64 w-64 rounded-full bg-primary/10 blur-[100px]'
        animate={{
          x: [0, -50, 0],
          y: [0, -30, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 10,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
    </Fragment>
  );
};

export default FloatingOrbs;
