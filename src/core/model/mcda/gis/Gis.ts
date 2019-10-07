import {booleanContains, booleanOverlap} from '@turf/turf';
import {getGridCells} from '../../../../services/geoTools';
import {BoundingBox, Geometry} from '../../geometry';
import {Array2D} from '../../geometry/Array2D.type';
import GridSize from '../../geometry/GridSize';
import {Cells} from '../../modflow';
import {IGis} from './Gis.type';
import RasterLayer from './RasterLayer';
import VectorLayersCollection from './VectorLayersCollection';

class Gis {

    get cells(): Cells {
        return Cells.fromObject(this._props.activeCells);
    }

    set cells(value: Cells) {
        this._props.activeCells = value.toObject();
    }

    get boundingBox(): BoundingBox {
        return BoundingBox.fromObject(this._props.boundingBox);
    }

    set boundingBox(value: BoundingBox) {
        this._props.boundingBox = value.toObject();
    }

    get vectorLayers(): VectorLayersCollection {
        return VectorLayersCollection.fromObject(this._props.vectorLayers);
    }

    set vectorLayers(value: VectorLayersCollection) {
        this._props.vectorLayers = value.toObject();
    }

    get gridSize(): GridSize {
        return GridSize.fromObject(this._props.gridSize);
    }

    set gridSize(value: GridSize) {
        this._props.gridSize = value.toObject();
    }

    get rasterLayer(): RasterLayer {
        return RasterLayer.fromObject(this._props.rasterLayer);
    }

    set rasterLayer(value: RasterLayer) {
        this._props.rasterLayer = value.toObject();
    }

    public static fromObject(obj: IGis) {
        return new Gis(obj);
    }

    protected _props: IGis;

    constructor(obj: IGis) {
        this._props = obj;
    }

    public toObject() {
        return this._props;
    }

    public toPayload() {
        return {
            cells: this.cells.toObject(),
            boundingBox: this.boundingBox.toObject(),
            vectorLayers: this.vectorLayers.toObject(),
            gridSize: this.gridSize.toObject(),
            raster: this.rasterLayer.toObject()
        };
    }

    public calculateActiveCells() {
        const gridCells = getGridCells(this.boundingBox, this.gridSize);
        const raster = RasterLayer.fromDefaults();
        raster.data = Array(this.gridSize.nY).fill(0).map(() => Array(this.gridSize.nX).fill(1)) as Array2D<number>;
        raster.gridSize = this.gridSize;
        raster.boundingBox = this.boundingBox;
        raster.min = 0;
        raster.max = 1;

        const suitableArea = Geometry.fromGeoJson(this.boundingBox.geoJson);
        const nonSuitableAreas = this.vectorLayers.findBy('type', 'hole');

        if (!suitableArea) {
            return null;
        }

        gridCells.forEach((cell) => {
            let cellIsSuitable = true;
            if (booleanContains(suitableArea, cell.geometry) || booleanOverlap(suitableArea, cell.geometry)) {
                nonSuitableAreas.forEach((area) => {
                    if (booleanContains(area.geometry, cell.geometry) || booleanOverlap(area.geometry, cell.geometry)) {
                        cellIsSuitable = false;
                        return cellIsSuitable;
                    }
                });
                /*if (cellIsSuitable) {
                    cells.addCell([cell.x, cell.y]);
                }*/
                raster.data[cell.y][cell.x] = cellIsSuitable ? 1 : NaN;
            }
        });

        // this.cells = cells;
        this.rasterLayer = raster;
    }
}

export default Gis;