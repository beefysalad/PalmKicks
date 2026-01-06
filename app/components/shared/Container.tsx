import React from "react";
import Navbar from "./Navbar";

interface ContainerProps {
  children: React.ReactNode;
}
const Container = ({ children }: ContainerProps) => {
  return (
    <div className='min-h-screen flex flex-col'>
      <Navbar />
      <main className='flex-1'>{children}</main>
    </div>
  );
};

export default Container;
