"use client";
import React from 'react';
import PropTypes from 'prop-types';
import { ActiveProperty } from './ActiveProperty';

export const SpecialConditionsProperty = ({ property, contextLoading, taxData, historyData }) => {
  return (
    <ActiveProperty
      property={property}
      contextLoading={contextLoading}
      taxData={taxData}
      historyData={historyData}
      variant="special"
    />
  );
};

SpecialConditionsProperty.propTypes = {
  property: PropTypes.object.isRequired,
  contextLoading: PropTypes.bool,
  taxData: PropTypes.object,
  historyData: PropTypes.object
};
