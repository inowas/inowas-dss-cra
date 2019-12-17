import React, {useEffect, useState} from 'react';
import {Button, Dropdown, Grid, Header, Icon, Label, Segment, Table} from 'semantic-ui-react';
import {DataSourceCollection, Rtm} from '../../../core/model/rtm';
import {ProcessingFactory} from '../../../core/model/rtm/processing';
import {IProcessing} from '../../../core/model/rtm/processing/Processing.type';
import ProcessingCollection from '../../../core/model/rtm/processing/ProcessingCollection';
import TimeProcessing from '../../../core/model/rtm/processing/TimeProcessing';
import ValueProcessing from '../../../core/model/rtm/processing/ValueProcessing';
import {ISensorParameter} from '../../../core/model/rtm/Sensor.type';
import {parameterList, processingList} from '../defaults';
import {
    DataSourcesChart,
    ProcessingTimeRange,
    ValueProcessingEditor
} from './index';

interface IProps {
    rtm: Rtm;
    parameter: ISensorParameter;
    onChange: (parameter: ISensorParameter) => void;
}

const arrayMoveItems = (arr: any[], from: number, to: number) => {
    if (from !== to && 0 <= from && from <= arr.length && 0 <= to && to <= arr.length) {
        const tmp = arr[from];
        if (from < to) {
            for (let i = from; i < to; i++) {
                arr[i] = arr[i + 1];
            }
        } else {
            for (let i = from; i > to; i--) {
                arr[i] = arr[i - 1];
            }
        }
        arr[to] = tmp;
    }

    return arr;
};

const processing = (props: IProps) => {
    const [addProcessing, setAddProcessing] = useState<string | null>(null);
    const [editProcessing, setEditProcessing] = useState<ValueProcessing | TimeProcessing | null>(null);

    useEffect(() => {
        const dsc = DataSourceCollection.fromObject(props.parameter.dataSources);
        dsc.mergedData().then((() => handleUpdateDataSources(dsc)));
    }, []);

    const handleAddProcessing = (p: ValueProcessing | TimeProcessing) => {
        const {parameter} = props;
        if (!parameter) {
            return;
        }

        parameter.processings.push(p.toObject());
        setAddProcessing(null);
        props.onChange(parameter);
    };

    const handleUpdateDataSources = (dsc: DataSourceCollection) => {
        const {parameter} = props;
        if (!parameter) {
            return;
        }

        parameter.dataSources = dsc.toObject();
        setEditProcessing(null);
        props.onChange(parameter);
    };

    const handleUpdateProcessing = (pInst: ValueProcessing | TimeProcessing) => {
        const {parameter} = props;
        if (!parameter) {
            return;
        }

        parameter.processings = parameter.processings.map((p) => {
            if (p.id === pInst.id) {
                return pInst.toObject();
            }

            return p;
        });

        setEditProcessing(null);
        props.onChange(parameter);
    };

    const handleAddProcessingClick = (dsType: string) => () => {
        setAddProcessing(dsType);
    };

    const handleCancelProcessingClick = () => {
        setAddProcessing(null);
        setEditProcessing(null);
    };

    const handleDeleteProcessingClick = (id: string) => () => {
        const {parameter} = props;
        if (!parameter) {
            return;
        }

        parameter.processings = parameter.processings.filter((p: IProcessing) => p.id !== id);
        props.onChange(parameter);
    };

    const handleEditProcessingClick = (id: string) => () => {
        const {parameter} = props;
        if (!parameter) {
            return;
        }

        const filteredP = parameter.processings.filter((p: IProcessing) => p.id === id);
        if (filteredP.length === 0) {
            return;
        }

        setEditProcessing(ProcessingFactory.fromObject(filteredP[0]));
    };

    const handleMoveProcessingClick = (from: number, to: number) => () => {
        const {parameter} = props;
        parameter.processings = arrayMoveItems(parameter.processings, from, to);
        props.onChange(parameter);
    };

    const renderDatasourceDetails = () => {
        if (addProcessing && addProcessing === 'value') {
            return (
                <ValueProcessingEditor
                    dsc={dataSourceCollection}
                    onCancel={handleCancelProcessingClick}
                    onSave={handleAddProcessing}
                />
            );
        }

        if (editProcessing && editProcessing instanceof ValueProcessing) {
            return (
                <ValueProcessingEditor
                    dsc={dataSourceCollection}
                    processing={editProcessing as ValueProcessing}
                    onCancel={handleCancelProcessingClick}
                    onSave={handleUpdateProcessing}
                />
            );
        }

        return null;
    };

    if (!props.parameter) {
        return null;
    }

    const dataSourceCollection = DataSourceCollection.fromObject(props.parameter.dataSources);
    const processingCollection = ProcessingCollection.fromObject(props.parameter.processings);

    return (
        <Grid>
            <Grid.Row>
                <Grid.Column>
                    <Segment color={'red'} raised={true}>
                        <Header as={'h2'} dividing={true}>
                            {parameterList.filter((i) => i.parameter === props.parameter.type)[0].text}
                        </Header>
                        <Label color={'blue'} ribbon={true} size={'large'}>
                            Data sources
                        </Label>
                        <Table>
                            <Table.Header>
                                <Table.Row>
                                    <Table.HeaderCell>Type</Table.HeaderCell>
                                    <Table.HeaderCell>Time range</Table.HeaderCell>
                                    <Table.HeaderCell/>
                                    <Table.HeaderCell/>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {processingCollection.all.map((p, key) => {
                                    const pInst = ProcessingFactory.fromObject(p);
                                    if (pInst === null) {
                                        return null;
                                    }

                                    return (
                                        <Table.Row key={key}>
                                            <Table.Cell>{pInst.type}</Table.Cell>
                                            <Table.Cell>
                                                <ProcessingTimeRange processing={pInst}/>
                                            </Table.Cell>
                                            <Table.Cell/>
                                            <Table.Cell textAlign={'right'}>
                                                {!props.rtm.readOnly &&
                                                <div>
                                                    <Button.Group>
                                                        <Button
                                                            icon={true}
                                                            onClick={handleMoveProcessingClick(key, key - 1)}
                                                            disabled={key === 0}
                                                        >
                                                            <Icon name={'arrow up'}/>
                                                        </Button>
                                                        <Button
                                                            icon={true}
                                                            onClick={handleMoveProcessingClick(key, key + 1)}
                                                            disabled={key === processingCollection.length - 1}
                                                        >
                                                            <Icon name={'arrow down'}/>
                                                        </Button>
                                                    </Button.Group>
                                                    {' '}
                                                    <Button.Group>
                                                        <Button
                                                            icon={true}
                                                            onClick={handleEditProcessingClick(pInst.id)}
                                                        >
                                                            <Icon name={'edit'}/>
                                                        </Button>
                                                        <Button
                                                            icon={true}
                                                            onClick={handleDeleteProcessingClick(pInst.id)}
                                                        >
                                                            <Icon name={'trash'}/>
                                                        </Button>
                                                    </Button.Group>
                                                </div>}
                                            </Table.Cell>
                                        </Table.Row>
                                    );
                                })}
                            </Table.Body>

                            {!props.rtm.readOnly &&
                            <Table.Footer>
                                <Table.Row>
                                    <Table.HeaderCell colSpan={5}>
                                        <Button
                                            as="div"
                                            labelPosition="left"
                                            floated={'right'}
                                        >
                                            <Dropdown
                                                text="Add"
                                                icon="add"
                                                labeled={true}
                                                button={true}
                                                className="icon blue"
                                                disabled={props.rtm.readOnly}
                                            >
                                                <Dropdown.Menu>
                                                    <Dropdown.Header>Choose type</Dropdown.Header>
                                                    {processingList.map((p) =>
                                                        <Dropdown.Item
                                                            key={p}
                                                            text={p}
                                                            onClick={handleAddProcessingClick(p)}
                                                        />
                                                    )}
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </Button>
                                    </Table.HeaderCell>
                                </Table.Row>
                            </Table.Footer>
                            }
                        </Table>
                    </Segment>

                    {props.parameter.dataSources.length > 0 &&
                    <Segment color={'grey'} raised={true}>
                        <Label color={'blue'} ribbon={true} size={'large'}>
                            Chart
                        </Label>
                        {dataSourceCollection.isFetched() && <DataSourcesChart dataSources={dataSourceCollection}/>}
                    </Segment>
                    }

                </Grid.Column>
            </Grid.Row>
            {renderDatasourceDetails()}
        </Grid>
    );
};

export default processing;