import {AllGeoJSON} from '@turf/helpers';
import * as turf from '@turf/turf';
import {GeoJsonObject} from 'geojson';
import {uniqueId} from 'lodash';
import React, {FormEvent, useEffect, useState} from 'react';
import {GeoJSON, Map} from 'react-leaflet';
import {Button, Form, Grid, Icon, InputOnChangeData, Modal} from 'semantic-ui-react';
import uuid from 'uuid';
import {ICells} from '../../../../../core/model/geometry/Cells.type';
import {IGridSize} from '../../../../../core/model/geometry/GridSize.type';
import {BoundingBox, Cells, Geometry, GridSize} from '../../../../../core/model/modflow';
import AffectedCellsLayer from '../../../../../services/geoTools/affectedCellsLayer';
import {getStyle} from '../../../../../services/geoTools/mapHelpers';
import {BasicTileLayer} from '../../../../../services/geoTools/tileLayers';
import SliderWithTooltip from '../../../../shared/complexTools/SliderWithTooltip';
import {CALCULATE_CELLS_INPUT} from '../../../worker/t03.worker';
import {asyncWorker} from '../../../worker/worker';

interface IProps {
    boundingBox: BoundingBox;
    geometry: Geometry;
    gridSize: GridSize;
    intersection: number;
    onChange: (gridSize: GridSize, intersection: number, rotation: number, cells: Cells) => void;
    rotation: number;
    readonly?: boolean;
}

const style = {
    map: {
        backgroundColor: '#ffffff',
        height: '500px',
        width: '100%'
    }
};

const gridProperties = (props: IProps) => {
    const [activeInput, setActiveInput] = useState<string | null>(null);
    const [activeValue, setActiveValue] = useState<string>('');

    const [boundingBox, setBoundingBox] = useState<GeoJsonObject>(props.boundingBox.geoJson);
    const [boundingBoxRotated, setBoundingBoxRotated] = useState<GeoJsonObject | null>(null);
    const [cells, setCells] = useState<ICells | null>(null);
    const [gridSize, setGridSize] = useState<IGridSize>(props.gridSize.toObject());
    const [intersection, setIntersection] = useState<number>(props.intersection);
    const [isCalculating, setIsCalculating] = useState<boolean>(false);
    const [rotation, setRotation] = useState<number>(props.rotation);

    const [showModal, setShowModal] = useState<boolean>(false);

    useEffect(() => {
        handleChangeRotation(props.rotation);
    }, []);

    useEffect(() => {
        if (cells) {
            setIsCalculating(false);
        }
    }, [cells]);

    useEffect(() => {
        if (isCalculating) {
            return calculateRotation(rotation);
        }
    }, [isCalculating]);

    const calculateRotation = (r: number) => {
        const withRotation = turf.transformRotate(
            props.geometry.toGeoJSON(), -1 * r, {pivot: props.geometry.centerOfMass}
        );
        const bbox = BoundingBox.fromGeoJson(withRotation);
        const bboxWithRotation = bbox.geoJsonWithRotation(r, props.geometry.centerOfMass);
        setBoundingBox(bbox.geoJson);
        setBoundingBoxRotated(bboxWithRotation);
        asyncWorker({
            type: CALCULATE_CELLS_INPUT,
            data: {
                geometry: Geometry.fromGeoJson(withRotation).toObject(),
                boundingBox: bbox.toObject(),
                gridSize,
                intersection
            }
        }).then((c: ICells) => {
            setCells(c);
        });
    };

    const handleBlurGridSize = () => {
        const g = GridSize.fromObject(gridSize);
        if (activeInput === 'nX') {
            g.nX = parseFloat(activeValue);
        }
        if (activeInput === 'nY') {
            g.nY = parseFloat(activeValue);
        }
        setActiveInput(null);
        setGridSize(g.toObject());
    };

    const handleChangeGridSize = (e: FormEvent<HTMLInputElement>, {name, value}: InputOnChangeData) => {
        setActiveInput(name);
        setActiveValue(value);
    };

    const handleChangeIntersection = (value: number) => {
        setIntersection(value);
    };

    const handleChangeRotation = (value: number) => {
        const withRotation = turf.transformRotate(
            props.geometry.toGeoJSON(), -1 * value, {pivot: props.geometry.centerOfMass}
        );
        const bbox = BoundingBox.fromGeoJson(withRotation);
        const bboxWithRotation = bbox.geoJsonWithRotation(value, props.geometry.centerOfMass);
        setBoundingBoxRotated(bboxWithRotation);
        setRotation(value);
    };

    const handleClickApply = () => {
        setShowModal(false);
        if (!cells) {
            return null;
        }
        return props.onChange(GridSize.fromObject(gridSize), intersection, rotation, Cells.fromObject(cells));
    };

    const handleClickCalculation = () => setIsCalculating(true);

    const handleClickRedo = () => {
        const withRotation = turf.transformRotate(props.geometry, rotation, {pivot: props.boundingBox.rotationPoint});
        setBoundingBox(BoundingBox.fromGeoJson(withRotation).geoJson);
        setCells(null);
        setBoundingBoxRotated(null);
    };

    const handleToggleModal = () => setShowModal(!showModal);

    const renderCells = () => {
        if (!cells || !boundingBoxRotated) {
            return null;
        }
        return (
            <Grid>
                <Grid.Row>
                    <Grid.Column width={8}>
                        <Button
                            onClick={handleClickRedo}
                            icon={true}
                            fluid={true}
                            labelPosition="left"
                        >
                            <Icon name="redo"/>
                            Redo
                        </Button>
                    </Grid.Column>
                    <Grid.Column width={8}>
                        <Button
                            primary={true}
                            onClick={handleClickApply}
                            icon={true}
                            fluid={true}
                            labelPosition="left"
                        >
                            <Icon name="save"/>
                            Apply
                        </Button>
                    </Grid.Column>
                </Grid.Row>
                <Grid.Row>
                    <Map
                        style={style.map}
                        bounds={props.boundingBox.getBoundsLatLng()}
                    >
                        <BasicTileLayer/>
                        <GeoJSON
                            key={uniqueId()}
                            data={boundingBoxRotated}
                            style={getStyle('bounding_box')}
                        />
                        <AffectedCellsLayer
                            boundingBox={BoundingBox.fromGeoJson(boundingBox as AllGeoJSON)}
                            cells={Cells.fromObject(cells)}
                            gridSize={GridSize.fromObject(gridSize)}
                            rotation={{geometry: props.geometry, angle: rotation}}
                        />
                        <GeoJSON
                            key={uuid.v4()}
                            data={props.geometry.toGeoJSON()}
                            style={getStyle('area')}
                        />
                    </Map>
                </Grid.Row>
            </Grid>
        );
    };

    const renderPreview = () => {
        return (
            <Form>
                <Grid>
                    <Grid.Row>
                        <Grid.Column>
                            <Form.Group>
                                <Form.Input
                                    type="number"
                                    label="Rows"
                                    name={'nY'}
                                    value={activeInput === 'nY' ? activeValue : gridSize.n_y}
                                    onChange={handleChangeGridSize}
                                    onBlur={handleBlurGridSize}
                                />
                                <Form.Input
                                    type="number"
                                    label="Columns"
                                    name={'nX'}
                                    value={activeInput === 'nX' ? activeValue : gridSize.n_x}
                                    onChange={handleChangeGridSize}
                                    onBlur={handleBlurGridSize}
                                />
                            </Form.Group>
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row>
                        <Grid.Column width={3}>
                            <Form.Input
                                label="Rotation angle"
                                value={rotation}
                            />
                        </Grid.Column>
                        <Grid.Column width={13} verticalAlign="middle">
                            <label>&nbsp;</label>
                            <SliderWithTooltip
                                disabled={isCalculating}
                                onChange={handleChangeRotation}
                                max={360}
                                min={-360}
                                value={rotation}
                            />
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row>
                        <Grid.Column width={3}>
                            <Form.Input
                                label="Intersection"
                                value={intersection}
                            />
                        </Grid.Column>
                        <Grid.Column width={13} verticalAlign="middle">
                            <label>&nbsp;</label>
                            <SliderWithTooltip
                                disabled={isCalculating}
                                onChange={handleChangeIntersection}
                                max={1}
                                min={0}
                                step={0.1}
                                value={intersection}
                            />
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row>
                        <Button
                            loading={isCalculating}
                            onClick={handleClickCalculation}
                            primary={true}
                            icon={true}
                            fluid={true}
                            labelPosition="left"
                        >
                            <Icon name="calculator"/>
                            Calculate cells
                        </Button>
                    </Grid.Row>
                    <Grid.Row>
                        <Map
                            style={style.map}
                            bounds={props.boundingBox.getBoundsLatLng()}
                        >
                            <GeoJSON
                                key={uuid.v4()}
                                data={props.geometry.toGeoJSON()}
                                style={getStyle('area')}
                            />
                            {!isCalculating && false &&
                            <GeoJSON
                                key={uuid.v4()}
                                data={boundingBox}
                                style={getStyle('bounding_box')}
                            />
                            }
                            {boundingBoxRotated &&
                            <GeoJSON
                                key={uniqueId()}
                                data={boundingBoxRotated}
                                style={getStyle('bounding_box')}
                            />
                            }
                        </Map>
                    </Grid.Row>
                </Grid>
            </Form>
        );
    };

    return (
        <React.Fragment>
            <Form>
                <Form.Group>
                    <Form.Input
                        label="Rows"
                        value={gridSize.n_y}
                        readOnly={true}
                    />
                    <Form.Input
                        label="Columns"
                        value={gridSize.n_x}
                        readOnly={true}
                    />
                    <Form.Input
                        label="Grid rotation"
                        value={props.rotation || 0}
                        readOnly={true}
                    />
                    <Form.Input
                        label="Intersection"
                        value={props.intersection || 0}
                        readOnly={true}
                    />
                    <Form.Button
                        fluid={true}
                        icon="pencil"
                        label="&nbsp;"
                        onClick={handleToggleModal}
                        disabled={props.readonly}
                    />
                </Form.Group>
            </Form>
            <Modal
                open={showModal}
                onClose={handleToggleModal}
            >
                <Modal.Header>Grid rotation</Modal.Header>
                <Modal.Content>
                    {cells ? renderCells() : renderPreview()}
                </Modal.Content>
            </Modal>
        </React.Fragment>
    );
};

export default gridProperties;