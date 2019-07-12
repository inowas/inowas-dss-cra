import {Point} from 'geojson';
import {GeoJson} from '../../geometry/Geometry';
import {ILineBoundaryFeature} from './LineBoundary.type';

export type BoundaryType = '!' | 'all' | 'chd' | 'drn' | 'evt' | 'ghb' | 'rch' | 'riv' | 'wel' | 'hob' | 'op';

export type WellType = 'puw' | 'inw' | 'iw' | 'irw' | 'opw';

export type SpValues = [number[]] | null;

export interface IBoundaryFeature {
    type: 'Feature';
    id: string;
    geometry?: GeoJson;
    properties: {
        type: BoundaryType | '';
    };
}

export interface IBoundaryFeatureCollection {
    type: 'FeatureCollection';
    features: IBoundaryFeature[];
}

export type BoundaryInstance = IBoundaryFeature | ILineBoundaryFeature;

export interface IObservationPointImport {
    name: string;
    geometry: Point;
    sp_values: SpValues;
}

export interface IBoundaryImport {
    type: BoundaryType;
    name: string;
    geometry: GeoJson;
    layers: number[];
    sp_values: SpValues;
    ops?: IObservationPointImport[];
    well_type?: WellType;
}