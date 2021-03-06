import {Array2D} from '../../../../../../core/model/geometry/Array2D.type';
import {Checkbox, Grid, Header} from 'semantic-ui-react';
import {ILayerParameterZone} from '../../../../../../core/model/modflow/soilmodel/LayerParameterZone.type';
import {LayerParameterZonesCollection, RasterParameter} from '../../../../../../core/model/modflow/soilmodel';
import {ModflowModel} from '../../../../../../core/model/modflow';
import {cloneDeep} from 'lodash';
import BoundaryCollection from '../../../../../../core/model/modflow/boundaries/BoundaryCollection';
import RasterDataImage from '../../../../../shared/rasterData/rasterDataImage';
import React from 'react';
import Soilmodel from '../../../../../../core/model/modflow/soilmodel/Soilmodel';
import SoilmodelLayer from '../../../../../../core/model/modflow/soilmodel/SoilmodelLayer';
import ZonesEditor from '../zones/zonesEditor';
import uuidv4 from 'uuid/v4';

interface IProps {
    boundaries: BoundaryCollection;
    defaultData: number | Array2D<number>;
    model: ModflowModel;
    layer: SoilmodelLayer;
    onChange: (layer: SoilmodelLayer) => any;
    parameter: RasterParameter;
    soilmodel: Soilmodel;
}

interface ISmoothParameters {
    cycles: number;
    distance: number;
    parameterId: string;
}

const regular = (props: IProps) => {
    const parameters = props.layer.toObject().parameters;
    const isDefault = parameters.filter((p) => p.id === props.parameter.id).length === 0;
    const activeParameter = props.layer.parameters.filter((p) => p.id === props.parameter.id);

    const handleAddRelation = (relation: ILayerParameterZone) => {
        const cLayer = SoilmodelLayer.fromObject(props.layer.toObject());
        cLayer.addRelation(relation);
        cLayer.relations = cLayer.relations.reorderPriority(relation.parameter);
        cLayer.zonesToParameters(
            props.model.gridSize,
            props.soilmodel.zonesCollection,
            activeParameter
        );
        return props.onChange(cLayer);
    };

    const handleChangeRelations = (cRelations: LayerParameterZonesCollection) => {
        const cLayer = SoilmodelLayer.fromObject(props.layer.toObject());
        cRelations.all.forEach((r) => {
            cLayer.updateRelation(r);
        });
        cLayer.zonesToParameters(
            props.model.gridSize,
            props.soilmodel.zonesCollection,
            activeParameter
        );
        return props.onChange(cLayer);
    };

    const handleRemoveRelation = (relation: ILayerParameterZone) => {
        const relations = LayerParameterZonesCollection.fromObject(props.layer.relations.toObject());
        relations.removeById(relation.id);
        relations.reorderPriority(relation.parameter);
        const cLayer = SoilmodelLayer.fromObject(props.layer.toObject());
        cLayer.relations = relations;
        cLayer.zonesToParameters(
            props.model.gridSize,
            props.soilmodel.zonesCollection,
            activeParameter
        );
        return props.onChange(cLayer);
    };

    const handleSmoothLayer = (params: ISmoothParameters) => {
        const cLayer = SoilmodelLayer.fromObject(props.layer.toObject());
        cLayer.smoothParameter(props.model.gridSize, params.parameterId, params.cycles, params.distance);
        return props.onChange(cLayer);
    };

    const handleToggleDefault = () => {
        const cParameters = cloneDeep(parameters);

        if (cParameters.filter((p) => p.id === props.parameter.id).length === 0) {
            cParameters.push({
                id: props.parameter.id,
                data: {file: null},
                value: props.defaultData
            });
            const cLayer = props.layer.toObject();
            cLayer.parameters = cParameters;
            cLayer.relations.push({
                data: {file: null},
                id: uuidv4(),
                parameter: props.parameter.id,
                priority: 0,
                value: props.defaultData,
                zoneId: 'default'
            });

            return props.onChange(SoilmodelLayer.fromObject(cLayer));
        }

        const layer = props.layer.toObject();
        layer.parameters = parameters.filter((p) => p.id !== props.parameter.id);
        layer.relations = LayerParameterZonesCollection.fromObject(layer.relations)
            .removeBy('parameter', props.parameter.id).toObject();
        return props.onChange(SoilmodelLayer.fromObject(layer));
    };

    const renderData = () => {
        if (!isDefault) {
            return (
                <Grid.Row columns={1}>
                    <Grid.Column>
                        <ZonesEditor
                            boundaries={props.boundaries}
                            layer={props.layer}
                            model={props.model}
                            onAddRelation={handleAddRelation}
                            onChange={handleChangeRelations}
                            onRemoveRelation={handleRemoveRelation}
                            onSmoothLayer={handleSmoothLayer}
                            parameter={props.parameter}
                            readOnly={props.model.readOnly}
                            zones={props.soilmodel.zonesCollection}
                        />
                    </Grid.Column>
                </Grid.Row>
            );
        }
        return (
            <Grid.Row centered={true} columns={1}>
                <Grid.Column width={8}>
                    <RasterDataImage
                        data={props.defaultData}
                        gridSize={props.model.gridSize}
                        unit={props.parameter.unit}
                    />
                </Grid.Column>
            </Grid.Row>
        );
    };

    return (
        <Grid>
            <Grid.Row>
                <Grid.Column width={8}>
                    <Header as="h4">{props.parameter.title}, {props.parameter.id} [{props.parameter.unit}]</Header>
                </Grid.Column>
                <Grid.Column textAlign="right" width={8}>
                    <Checkbox
                        checked={isDefault}
                        disabled={props.model.readOnly}
                        label="Use default value."
                        onChange={handleToggleDefault}
                        style={{float: 'right'}}
                        toggle={true}
                    />
                </Grid.Column>
            </Grid.Row>
            {renderData()}
        </Grid>
    );
};

export default regular;
