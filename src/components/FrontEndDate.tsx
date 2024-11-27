"use client";
import React from 'react'

const FrontEndDate = ({date}:{date:Date}) => {
  return (
    <>
    {date.getHours()}:{date.getMinutes()}
    </>
  )
}

export default FrontEndDate