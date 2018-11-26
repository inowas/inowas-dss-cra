import React from 'react';
import PropTypes from 'prop-types';
import {Polyline, FeatureGroup} from 'react-leaflet';
import {pure} from 'recompose';
import BoundingBox from 'core/model/modflow/BoundingBox';
import GridSize from 'core/model/modflow/GridSize';
import ActiveCells from 'core/model/modflow/ActiveCells';

const styles = {
    line: {
        color: 'grey',
        weight: 0.3
    }
};

const renderGridCell = (key, xMin, xMax, yMin, yMax) => {
    return (<Polyline key={key} positions={[
        {lng: xMin, lat: yMin},
        {lng: xMin, lat: yMax},
        {lng: xMax, lat: yMax},
        {lng: xMax, lat: yMin},
        {lng: xMin, lat: yMin}
    ]} {...styles.line}/>);
};

const calculateGridCells = (boundingBox, gridSize, activeCells) => {

    const dX = boundingBox.dX / gridSize.nX;
    const dY = boundingBox.dY / gridSize.nY;
    const gridCells = [];

    activeCells.cells.forEach(a => {
        const x = a[0];
        const y = a[1];

        const cXmin = boundingBox.xMin + x * dX;
        const cXmax = boundingBox.xMin + (x + 1) * dX;
        const cYmin = boundingBox.yMax - y * dY;
        const cYmax = boundingBox.yMax - (y + 1) * dY;

        gridCells.push([cXmin, cXmax, cYmin, cYmax]);
    });

    return gridCells;
};

const ActiveCellsLayer = ({boundingBox, gridSize, activeCells}) => {
    if (!activeCells) {
        return null;
    }

    const gridCells = calculateGridCells(boundingBox, gridSize, activeCells);

    return (
        <FeatureGroup>
            {gridCells.map((c, k) => renderGridCell(k, c[0], c[1], c[2], c[3]))};
        </FeatureGroup>
    );
};

ActiveCellsLayer.propTypes = {
    boundingBox: PropTypes.instanceOf(BoundingBox),
    gridSize: PropTypes.instanceOf(GridSize),
    activeCells: PropTypes.instanceOf(ActiveCells)
};

export default pure(ActiveCellsLayer);