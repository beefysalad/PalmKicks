import React, { Fragment } from "react";

const PulsingBackground = () => {
  return (
    <Fragment>
      {" "}
      <div className='absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full animate-float-pulse blur-3xl' />
      <div
        className='absolute top-2/3 right-0 w-80 h-80 bg-primary/10 rounded-full animate-float-pulse blur-3xl'
        style={{ animationDelay: "2s" }}
      />
    </Fragment>
  );
};

export default PulsingBackground;
