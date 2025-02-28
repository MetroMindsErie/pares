// src/components/HeatMapGraph.js
import React from 'react';
import Heatmap from 'react-heatmap-grid';

const HeatMapGraph = ({ neighborhoods, metrics, data }) => {
  // Transpose data matrix for correct orientation
  const transposedData = data[0]?.map((_, colIndex) => 
    data.map(row => row[colIndex])
  );

  return (
    <div className="heatmap-graph p-4">
      <h3 className="text-lg font-semibold mb-2">MLS Data Heat Map</h3>
      <Heatmap
        xLabels={metrics}
        yLabels={neighborhoods}
        data={transposedData || []}
        cellStyle={(background, value, min, max) => ({
          background: `rgb(255, ${255 - Math.round(255 * (value - min) / (max - min || 1))}, 0)`,
          fontSize: "11px",
          color: "#000",
          border: "1px solid #fff"
        })}
        cellRender={value => value && <div>{value}</div>}
      />
    </div>
  );
};

export default HeatMapGraph;