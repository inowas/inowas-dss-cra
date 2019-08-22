import {DrawEvents, LatLngExpression} from 'leaflet';
import {uniqueId} from 'lodash';
import React from 'react';
import {FeatureGroup, GeoJSON, Map, Polygon} from 'react-leaflet';
import {EditControl} from 'react-leaflet-draw';
import {Zone, ZonesCollection} from '../../../core/model/gis';
import {BoundingBox, Geometry} from '../../../core/model/modflow';
import {getStyle} from '../../../services/geoTools/mapHelpers';
import {BasicTileLayer} from '../../../services/geoTools/tileLayers';

const styles = {
    map: {
        height: '400px',
        width: '100%'
    }
};

interface IProps {
    boundingBox: BoundingBox;
    geometry?: Geometry;
    zone?: Zone;
    zones: ZonesCollection;
    onCreatePath: (e: DrawEvents.Created) => any;
    onEditPath: (e: DrawEvents.Edited) => any;
    readOnly?: boolean;
}

const zonesMap = (props: IProps) => {
    const {boundingBox, geometry, readOnly, zone, zones} = props;

    const options = {
        edit: {
            remove: false
        },
        draw: {
            polyline: false,
            polygon: !(zone && zone.geometry) && !geometry,
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
            poly: {
                allowIntersection: false
            }
        }
    };

    const getGeometry = () => {
        if (zone && zone.geometry) {
            return Geometry.fromGeoJson(zone.geometry);
        }
        if (geometry) {
            Geometry.fromGeoJson(geometry);
        }
        return null;
    };

    const bgZones = zone ? zones.findBy('id', zone.id, false) : zones.all;
    const iGeometry = getGeometry();

    return (
        <Map
            key={zone ? zone.id : undefined}
            zoomControl={false}
            dragging={!readOnly}
            boxZoom={!readOnly}
            touchZoom={!readOnly}
            doubleClickZoom={!readOnly}
            scrollWheelZoom={!readOnly}
            bounds={boundingBox.getBoundsLatLng()}
            style={styles.map}
        >
            <BasicTileLayer/>
            <GeoJSON
                key={boundingBox.hash()}
                data={boundingBox.geoJson}
                style={getStyle('area')}
            />
            {bgZones.length > 0 ?
                <FeatureGroup>
                    {bgZones.map((z) => {
                        if (z.geometry) {
                            return (
                                <Polygon
                                    key={z.id}
                                    id={z.id}
                                    positions={Geometry.fromGeoJson(z.geometry).coordinatesLatLng as LatLngExpression[]}
                                    color="grey"
                                    weight={1}
                                    fillOpacity={0.3}
                                />
                            );
                        }
                    })}
                </FeatureGroup>
                :
                <div/>
            }
            <FeatureGroup>
                <EditControl
                    position="bottomright"
                    onCreated={props.onCreatePath}
                    onEdited={props.onEditPath}
                    {...options}
                />
                {iGeometry &&
                <Polygon
                    key={uniqueId(iGeometry.hash())}
                    id={-1}
                    positions={iGeometry.coordinatesLatLng as LatLngExpression[]}
                    color="#7C4DFF"
                />
                }
            </FeatureGroup>
        </Map>
    );
};

export default zonesMap;
