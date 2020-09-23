import * as turf from '@turf/turf';
import {default as geojson, Polygon} from 'geojson';
import { DrawEvents } from 'leaflet';
import React, {ChangeEvent, useState} from 'react';
import {Button, Form, InputOnChangeData, Modal} from 'semantic-ui-react';
import uuidv4 from 'uuid/v4';
import {Geometry} from '../../../../../../core/model/geometry';
import {ICells} from '../../../../../../core/model/geometry/Cells.type';
import {Cells, ModflowModel} from '../../../../../../core/model/modflow';
import BoundaryCollection from '../../../../../../core/model/modflow/boundaries/BoundaryCollection';
import {Zone, ZonesCollection} from '../../../../../../core/model/modflow/soilmodel';
import {CALCULATE_CELLS_INPUT} from '../../../../worker/t03.worker';
import {ICalculateCellsInputData} from '../../../../worker/t03.worker.type';
import {asyncWorker} from '../../../../worker/worker';
import {ZonesMap} from './index';

interface IProps {
    onCancel: () => any;
    onChange: (zone: Zone) => any;
    boundaries: BoundaryCollection;
    model: ModflowModel;
    zones: ZonesCollection;
}

const createZoneModal = (props: IProps) => {
    const [name, setName] = useState<string>('New Zone');
    const [geometry, setGeometry] = useState<Polygon | null>(null);

    const handleApply = () => {
        if (name && geometry) {
            const {model} = props;
            const cGeometry = Geometry.fromObject(geometry);

            let g = cGeometry.toGeoJSON();
            if (model.rotation % 360 !== 0) {
                g = turf.transformRotate(
                    cGeometry.toGeoJSON(), -1 * model.rotation, {pivot: model.geometry.centerOfMass}
                );
            }

            asyncWorker({
                type: CALCULATE_CELLS_INPUT,
                data: {
                    geometry: g,
                    boundingBox: model.boundingBox.toObject(),
                    gridSize: model.gridSize.toObject(),
                    intersection: model.intersection
                } as ICalculateCellsInputData
            }).then((c: ICells) => {
                const cCells = Cells.fromObject(c).removeCells(model.inactiveCells);
                const zone = new Zone({
                    id: uuidv4(),
                    isDefault: false,
                    name,
                    geometry,
                    cells: cCells
                });

                return props.onChange(zone);
            });
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>, input: InputOnChangeData) => {
        if (input.name === 'name') {
            return setName(input.value);
        }
    };

    const handleCreatePath = (e: DrawEvents.Created) => {
        const layer = e.layer;
        if (layer) {
            return setGeometry(layer.toGeoJSON().geometry as Polygon);
        }
    };

    const handleEditPath = (e: DrawEvents.Edited) => {
        const layers = e.layers.toGeoJSON() as geojson.FeatureCollection;

        if (layers.features.length > 0) {
            const layer = layers.features[0];
            return setGeometry(layer.geometry as Polygon);
        }
    };

    return (
        <Modal size={'large'} open={true} dimmer={'inverted'}>
            <Modal.Header>Edit Zone</Modal.Header>
            <Modal.Content>
                <Form>
                    <Form.Field>
                        <label>Name</label>
                        <Form.Input
                            type="text"
                            name="name"
                            value={name}
                            placeholder="name ="
                            onChange={handleChange}
                        />
                    </Form.Field>
                    <Form.Field>
                        <label>Geometry</label>
                        <ZonesMap
                            model={props.model}
                            boundaries={props.boundaries}
                            geometry={geometry ? Geometry.fromObject(geometry) : undefined}
                            zones={props.zones}
                            onCreatePath={handleCreatePath}
                            onEditPath={handleEditPath}
                            readOnly={false}
                        />
                    </Form.Field>
                </Form>
            </Modal.Content>
            <Modal.Actions>
                <Button onClick={props.onCancel}>Cancel</Button>
                <Button
                    disabled={!geometry || name === ''}
                    positive={true}
                    onClick={handleApply}
                >
                    Apply
                </Button>
            </Modal.Actions>
        </Modal>
    );
};

export default createZoneModal;
