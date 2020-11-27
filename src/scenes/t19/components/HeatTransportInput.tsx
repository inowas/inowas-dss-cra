import {DataSourceCollection, Rtm} from '../../../core/model/rtm';
import {
    DropdownProps,
    Form,
    Message,
    Segment
} from 'semantic-ui-react';
import {HeatTransportInputChart} from '.';
import {IDateTimeValue, ISensor, ISensorParameter} from '../../../core/model/rtm/Sensor.type';
import {IHeatTransportInput} from '../../../core/model/htm/Htm.type';
import {IRootReducer} from '../../../reducers';
import {IRtm} from '../../../core/model/rtm/Rtm.type';
import {ProcessingCollection} from '../../../core/model/rtm/processing';
import {fetchApiWithToken, makeTimeProcessingRequest} from '../../../services/api';
import {updateData, updateHtmInput} from '../actions/actions';
import {useDispatch, useSelector} from 'react-redux';
import HtmInput from '../../../core/model/htm/HtmInput';
import React, {SyntheticEvent, useEffect, useState} from 'react';
import uuid from 'uuid';

interface IProps {
    dateTimeFormat: string;
    input: HtmInput;
    label: string;
    name: 'gw' | 'sw';
    readOnly: boolean;
}

interface IError {
    id: string;
    message: string;
}

const HeatTransportInput = (props: IProps) => {
    const [isFetching, setIsFetching] = useState<boolean>(true);

    const [errors, setErrors] = useState<IError[]>([]);

    const [input, setInput] = useState<IHeatTransportInput>(props.input.toObject());

    const [rtm, setRtm] = useState<IRtm>();

    const [sensor, setSensor] = useState<ISensor>();

    const [tempTime, setTempTime] = useState<[number, number]>();       // KEY
    const [timesteps, setTimesteps] = useState<number[]>();             // UNIX[]

    const T19 = useSelector((state: IRootReducer) => state.T19);
    const data = props.name in T19.data ? T19.data[props.name] : null;
    const t10Instances = T19.t10instances;
    const dispatch = useDispatch();

    const fetchData = async (p: ISensorParameter) => {
        try {
            setIsFetching(true);
            const dataSourceCollection = DataSourceCollection.fromObject(p.dataSources);
            const mergedData = await dataSourceCollection.mergedData();
            const processings = ProcessingCollection.fromObject(p.processings);
            const processedData = await processings.apply(mergedData);
            const uniqueData = processedData.filter((value, index, self) => self.findIndex((v) => v.timeStamp === value.timeStamp) === index);
            const timeProcessedData = await makeTimeProcessingRequest(uniqueData, '1d', 'cubic');
            if (timeProcessedData.length > 0) {
                const ts: number[] = timeProcessedData.map((t: IDateTimeValue) => t.timeStamp);
                const tp: [number, number] = [ts[0], ts[ts.length - 1]];
                setTimesteps(ts);

                const htmInput = {
                    ...input,
                    timePeriod: tp
                };

                const startIndex = ts.indexOf(tp[0]);
                const endIndex = ts.indexOf(tp[1]);
                setTempTime([startIndex < 0 ? 0 : startIndex, endIndex < 0 ? ts.length - 1 : endIndex]);

                setInput(htmInput);
                //dispatch(updateHtmInput(HtmInput.fromObject(htmInput)));
                dispatch(updateData({type: props.name, data: timeProcessedData}));
            }
        } catch (err) {
            setErrors([{id: uuid.v4(), message: 'Data processing failed.'}]);
        }
    };

    const fetchRtm = async (id: string, sensorId?: string | null) => {
        try {
            setIsFetching(true);
            const res = await fetchApiWithToken(`tools/T10/${id}`);
            const r = Rtm.fromObject(res.data);
            fetchSensor(r, sensorId);
            setRtm(r.toObject());
        } catch (err) {
            setErrors([{id: uuid.v4(), message: `Fetching t10 instance ${id} failed.`}]);
        }
    };

    const fetchSensor = (r: Rtm, id?: string | null) => {
        if (!id) {
            return setSensor(undefined);
        }

        const sensors = sensorsWithTemperature(r.toObject()).filter((swt) => swt.id === id);
        if (sensors.length > 0) {
            const param = sensors[0].parameters.all.filter((p) => p.type === 't');
            if (param.length > 0) {
                setSensor(sensors[0].toObject());
                fetchData(param[0]).then(() => setIsFetching(false));
            }
        }
    };

    useEffect(() => {
        console.log(props.name, 'INPUT', props.input);
        const input = props.input.toObject();
        // RTM HAS NOT BEEN LOADED
        if (input.rtmId && !rtm) {
            console.log(props.name, 'RTM HAS NOT BEEN LOADED');
            fetchRtm(input.rtmId, input.sensorId).then(() => setIsFetching(false));
        }
        // RTM HAS BEEN CHANGED
        if (input.rtmId && rtm && rtm.id !== input.rtmId) {
            console.log(props.name, 'RTM HAS BEEN CHANGED');
            fetchRtm(input.rtmId).then(() => setIsFetching(false));
        }
        // SENSOR HAS BEEN CHANGED
        if (rtm && sensor && input.sensorId !== sensor.id) {
            console.log(props.name, 'SENSOR HAS BEEN CHANGED');
            fetchSensor(Rtm.fromObject(rtm), input.sensorId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.input.toObject()]);

    const sensorsWithTemperature = (rtm: IRtm) => Rtm.fromObject(rtm).sensors.all.filter((s) =>
        s.parameters.filterBy('type', 't').length > 0
    );

    const getSensorOptions = () => {
        if (!rtm) {
            return [];
        }

        return sensorsWithTemperature(rtm).map((s) => {
            return {
                key: s.id,
                text: s.name,
                value: s.id
            };
        });
    };

    const handleChangeRtm = (e: SyntheticEvent<HTMLElement, Event>, {value}: DropdownProps) => {
        if (typeof value !== 'string') {
            return null;
        }

        dispatch(updateData({type: props.name, data: null}));
        setInput({
            ...input,
            rtmId: value,
        });
    };

    const handleChangeSensor = (e: SyntheticEvent<HTMLElement, Event>, {value}: DropdownProps) => {
        if (typeof value !== 'string' || !rtm) {
            return null;
        }

        setInput({...input, sensorId: value});
    };

    const handleDismissError = (id: string) => () => setErrors(errors.filter((e) => e.id !== id));

    return (
        <div>
            <Segment color="grey">
                <h4>{props.label}</h4>
                <Form.Select
                    loading={t10Instances.length === 0}
                    disabled={props.readOnly}
                    label="T10 Instance"
                    placeholder="Select instance"
                    fluid={true}
                    selection={true}
                    value={rtm ? rtm.id : undefined}
                    options={t10Instances.map((i) => ({
                        key: i.id,
                        text: `${i.name} (${i.user_name})`,
                        value: i.id
                    }))}
                    onChange={handleChangeRtm}
                />
                {rtm &&
                    <Form.Select
                        disabled={props.readOnly || !rtm || rtm.data.sensors.length === 0}
                        label="Sensor"
                        placeholder="Select sensor"
                        fluid={true}
                        selection={true}
                        value={sensor ? sensor.id : undefined}
                        options={getSensorOptions()}
                        onChange={handleChangeSensor}
                    />
                }
                {sensor &&
                <HeatTransportInputChart
                    data={data}
                    dateTimeFormat={props.dateTimeFormat}
                    tempTime={tempTime}
                    timesteps={timesteps}
                    isLoading={isFetching}
                />
                }
            </Segment>
            {errors.map((error, key) => (
                <Message key={key} negative={true} onDismiss={handleDismissError(error.id)}>
                    <Message.Header>Error</Message.Header>
                    <p>{error.message}</p>
                </Message>
            ))}
        </div>
    );
};

export default HeatTransportInput;
