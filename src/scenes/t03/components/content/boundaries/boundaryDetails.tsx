import * as turf from '@turf/turf';
import {
  Boundary,
  BoundaryCollection,
  HeadObservationWell,
  LineBoundary, PointBoundary
} from '../../../../../core/model/modflow/boundaries';
import {Button, Dropdown, DropdownProps, Form, InputOnChangeData, List, Popup} from 'semantic-ui-react';
import {ModflowModel, Soilmodel} from '../../../../../core/model/modflow';
import {RechargeBoundary, WellBoundary} from '../../../../../core/model/modflow/boundaries';
import BoundaryDateTimeValuesDataTable from './boundaryDateTimeValuesDataTable';
import BoundaryGeometryEditor from './boundaryGeometryEditor';
import BoundaryMap from '../../maps/boundaryMap';
import BoundaryValuesDataTable from './boundaryValuesDataTable';
import EvapotranspirationBoundary from '../../../../../core/model/modflow/boundaries/EvapotranspirationBoundary';
import FlowAndHeadBoundary from '../../../../../core/model/modflow/boundaries/FlowAndHeadBoundary';
import NoContent from '../../../../shared/complexTools/noContent';
import ObservationPointEditor from './observationPointEditor';
import React, {ChangeEvent, SyntheticEvent, useEffect, useState} from 'react';
import uuid from 'uuid';

interface IProps {
  boundary: Boundary;
  boundaries: BoundaryCollection;
  model: ModflowModel;
  soilmodel: Soilmodel;
  onChange: (boundary: Boundary) => any;
  onClick: (bid: string) => any;
  readOnly: boolean;
}

interface IActiveInput {
  name: string;
  value: string;
}

const BoundaryDetails = (props: IProps) => {
  const [activeInput, setActiveInput] = useState<IActiveInput | null>(null);
  const [showBoundaryEditor, setShowBoundaryEditor] = useState<boolean>(false);
  const [showObservationPointEditor, setShowObservationPointEditor] = useState<boolean>(false);
  const [observationPointId, setObservationPointId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!props.boundary) {
      return;
    }

    if (!observationPointId && props.boundary instanceof LineBoundary) {
      return setObservationPointId(props.boundary.observationPoints[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.boundary]);

  const handleChange = (e: SyntheticEvent<HTMLElement, Event> | ChangeEvent<HTMLInputElement>,
                        data: DropdownProps | InputOnChangeData) => {
    let value = data.value;
    const name = data.name;

    if (name === 'layers') {
      if (typeof data.value === 'number') {
        value = [data.value];
      }

      if (Array.isArray(data.value) && data.value.length === 0) {
        value = [0];
      }
    }

    const cBoundary = props.boundary;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    cBoundary[name] = value;
    return props.onChange(cBoundary);
  };

  const handleCloneClick = () => {
    if (props.boundary instanceof LineBoundary && observationPointId) {
      const cBoundary = props.boundary;
      const newOpId = uuid.v4();
      cBoundary.cloneObservationPoint(observationPointId, newOpId, props.model.stressperiods);
      setObservationPointId(newOpId);
      setShowObservationPointEditor(true);
      return props.onChange(cBoundary);
    }
  };

  const handleLocalChange = (e: ChangeEvent<HTMLInputElement>, data: InputOnChangeData) => setActiveInput({
    name: data.name,
    value: data.value
  });

  const handleChangeGeometry = () => {
    if (activeInput) {
      const n = activeInput.name;
      const v = activeInput.value;
      const cBoundary = props.boundary;

      if (n === 'lat') {
        if (!isNaN(parseFloat(v))) {
          cBoundary.geometry.coordinates[1] = parseFloat(v);
        }
      }

      if (n === 'lon') {
        if (!isNaN(parseFloat(v))) {
          cBoundary.geometry.coordinates[0] = parseFloat(v);
        }
      }

      setActiveInput(null);
      props.onChange(cBoundary);
    }
  };

  const handleBlurName = () => {
    if (!activeInput || activeInput.name !== 'name' || activeInput.value === '') {
      setActiveInput(null);
      return;
    }
    const cBoundary = props.boundary;
    cBoundary.name = activeInput.value;
    setActiveInput(null);
    props.onChange(cBoundary);
  };

  const handleRemoveClick = () => {
    if (props.boundary instanceof LineBoundary && observationPointId) {
      const cBoundary = props.boundary;
      cBoundary.removeObservationPoint(observationPointId);
      setObservationPointId(cBoundary.observationPoints[0].id);
      return props.onChange(cBoundary);
    }
  };

  const layerOptions = () => {
    if (!(props.soilmodel)) {
      return [];
    }

    return props.soilmodel.layersCollection.all.map((l, idx) => (
      {key: l.id, value: idx, text: l.name}
    ));
  };

  const renderDataTable = (props: IProps) => {
    if (boundary instanceof HeadObservationWell || boundary instanceof FlowAndHeadBoundary) {
      return (
        <BoundaryDateTimeValuesDataTable
          boundary={boundary}
          onChange={props.onChange}
          readOnly={props.readOnly}
          selectedOP={observationPointId}
          stressperiods={stressperiods}
        />
      );
    }
    return (
      <BoundaryValuesDataTable
        boundary={boundary}
        onChange={props.onChange}
        readOnly={props.readOnly}
        selectedOP={observationPointId}
        stressperiods={stressperiods}
      />
    );
  };

  const renderLayerSelection = (props: IProps) => {
    const cBoundary = props.boundary;
    const multipleLayers = ['chd', 'ghb', 'fhb', 'riv'].includes(cBoundary.type);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let options;

    switch (cBoundary.type) {
      case 'rch':
        options = {enabled: true, label: 'Recharge option', name: 'nrchop'};
        break;
      case 'evt':
        options = {enabled: true, label: 'Evapotranspiration option', name: 'nevtop'};
        break;
      default:
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        options = {enabled: false, label: '', name: ''};
        break;
    }

    if (!cBoundary.layers) {
      return null;
    }

    return (
      <React.Fragment>
        {(boundary instanceof RechargeBoundary || boundary instanceof EvapotranspirationBoundary) &&
        <Form.Dropdown
          label={boundary.type === 'rch' ? 'Recharge option' : 'Evapotranspiration option'}
          style={{zIndex: 1000}}
          selection={!props.readOnly}
          options={[
            {key: 0, value: 1, text: '1: Top grid layer'},
            {key: 1, value: 2, text: '2: Specified layer'},
            {key: 2, value: 3, text: '3: Highest active cell'}
          ]}
          value={boundary.optionCode}
          name={'optionCode'}
          onChange={handleChange}
          disabled={props.readOnly}
        />
        }
        <Form.Dropdown
          disabled={
            props.readOnly || ((boundary instanceof RechargeBoundary ||
              boundary instanceof EvapotranspirationBoundary) && boundary.optionCode !== 2)}
          loading={!(props.soilmodel)}
          label={multipleLayers ? 'Selected layers' : 'Selected layer'}
          style={{zIndex: 1000}}
          multiple={multipleLayers}
          selection={!props.readOnly}
          options={layerOptions()}
          value={multipleLayers ? boundary.layers : boundary.layers[0]}
          name={'layers'}
          onChange={handleChange}
        />
      </React.Fragment>
    );
  };

  const renderLengthInformation = (props: IProps) => {
    if (boundary.geometry.type === 'LineString') {
      return (
        <Form.Input
          width={8}
          label={'Length [m]'}
          value={turf.length(boundary.geometry.toGeoJSON(), {units: 'meters'}).toFixed(6)}
          type={'number'}
          readOnly={true}
        />
      );
    }
    if (boundary.geometry.type === 'Polygon' || boundary.geometry.type === 'MultiPolygon') {
      return (
        <Form.Input
          width={8}
          label={'Area from affected cells [sqm]'}
          value={boundary.calculateAreaByCells(props.model.boundingBox, props.model.gridSize).toFixed(6)}
          type={'number'}
          readOnly={true}
        />
      );
    }
  };

  const handleCancelGeometryEditor = () => setShowBoundaryEditor(false);
  const handleCancelObservationPointEditor = () => setShowObservationPointEditor(false);
  const handleClickBoundary = (id: string) => props.onClick(id);
  const handleClickShowBoundaryEditor = () => setShowBoundaryEditor(true);
  const handleClickObservationPoint = (id: string) => setObservationPointId(id);
  const handleEditPoint = () => setShowObservationPointEditor(true);
  const handleSelectObservationPoint = (e: SyntheticEvent<HTMLElement, Event>, data: DropdownProps) => {
    if (data.value && typeof data.value === 'string') {
      return setObservationPointId(data.value);
    }
  };

  const {boundary, boundaries, model} = props;
  const {geometry, stressperiods} = model;

  if (!boundary || !geometry) {
    return <NoContent message={'No objects.'}/>;
  }

  if (!boundary.layers || boundary.layers.length === 0) {
    return <NoContent message={'No layers.'}/>;
  }

  return (
    <div>
      <Form style={{marginTop: '1rem'}}>
        <Form.Group widths="equal">
          <Form.Input
            value={boundary.type.toUpperCase()}
            label="Type"
            readOnly={true}
            width={5}
          />

          <Form.Input
            label={'Name'}
            name={'name'}
            value={activeInput && activeInput.name === 'name' ? activeInput.value : boundary.name}
            onBlur={handleBlurName}
            onChange={handleLocalChange}
            readOnly={props.readOnly}
          />

          {renderLayerSelection(props)}

          {boundary.type === 'wel' && boundary instanceof WellBoundary &&
          <Form.Dropdown
            label={'Well type'}
            style={{zIndex: 1000}}
            selection={true}
            options={WellBoundary.wellTypes.types.map((t) => (
              {key: t.value, value: t.value, text: t.name}
            ))}
            value={boundary.wellType}
            name={'wellType'}
            onChange={handleChange}
            disabled={props.readOnly}
          />
          }
        </Form.Group>
        {boundary instanceof PointBoundary &&
        <Form.Group>
          <Form.Input
            width={8}
            label={'Lat'}
            name={'lat'}
            value={activeInput && activeInput.name === 'lat' ?
              activeInput.value : props.boundary.geometry.coordinates[1]}
            onBlur={handleChangeGeometry}
            onChange={handleLocalChange}
            type={'number'}
            disabled={props.model.readOnly}
          />
          <Form.Input
            width={8}
            label={'Lon'}
            name={'lon'}
            value={activeInput && activeInput.name === 'lon' ?
              activeInput.value : props.boundary.geometry.coordinates[0]}
            onBlur={handleChangeGeometry}
            onChange={handleLocalChange}
            type={'number'}
            disabled={props.model.readOnly}
          />
        </Form.Group>
        }
        {renderLengthInformation(props)}
      </Form>

      {!props.readOnly &&
      <List horizontal={true}>
        <List.Item
          as="a"
          onClick={handleClickShowBoundaryEditor}
        >
          Edit boundary on map
        </List.Item>
      </List>
      }
      <BoundaryMap
        geometry={geometry}
        boundary={boundary}
        boundaries={boundaries}
        selectedObservationPointId={observationPointId}
        onClick={handleClickBoundary}
        onClickObservationPoint={handleClickObservationPoint}
      />
      {(boundary instanceof LineBoundary) &&
      <div>
        <Button as={'div'} labelPosition={'left'} fluid={true}>
          <Popup
            trigger={
              <Dropdown
                fluid={true}
                selection={true}
                value={observationPointId}
                options={boundary.observationPoints.map((op) => (
                  {key: op.id, value: op.id, text: op.name})
                )}
                onChange={handleSelectObservationPoint}
              />
            }
            size="mini"
            content="Select Observation Point"
          />
          <Popup
            trigger={
              <Button
                icon={'edit'}
                onClick={handleEditPoint}
                disabled={props.readOnly}
              />
            }
            size="mini"
            content="Edit point"
          />
          <Popup
            trigger={
              <Button
                icon={'clone'}
                onClick={handleCloneClick}
                disabled={props.readOnly}
              />
            }
            size="mini"
            content="Clone point"
          />
          <Popup
            trigger={
              <Button
                icon="trash"
                onClick={handleRemoveClick}
                disabled={props.readOnly || boundary.observationPoints.length === 1}
              />
            }
            size="mini"
            content="Delete point"
          />
        </Button>
      </div>
      }
      {renderDataTable(props)}
      {showBoundaryEditor &&
      <BoundaryGeometryEditor
        boundary={boundary}
        boundaries={boundaries}
        model={model}
        onCancel={handleCancelGeometryEditor}
        onChange={props.onChange}
        readOnly={props.readOnly}
        soilmodel={props.soilmodel}
      />
      }
      {(showObservationPointEditor && boundary instanceof LineBoundary) &&
      <ObservationPointEditor
        boundary={boundary}
        model={model}
        observationPointId={observationPointId}
        onCancel={handleCancelObservationPointEditor}
        onChange={props.onChange}
        readOnly={props.readOnly}
      />
      }
    </div>
  );
};

export default BoundaryDetails;
