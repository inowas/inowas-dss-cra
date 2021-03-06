import 'rc-slider/assets/index.css';
import {Grid} from 'semantic-ui-react';
import PropTypes from 'prop-types';
import React from 'react';
import Slider from 'rc-slider';
import SliderParameter from './SliderParameter';

const styles = {
    L: {
        width: '53px'
    },
    R: {
        width: '65px'
    },
    valueInput: {
        width: '100px'
    },
    row: {
        paddingBottom: '0',
        paddingTop: '0'
    },
    sliderRow: {
        margin: '-25px 0 0 0'
    }
};

class ParameterSlider extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            param: props.param.toObject
        };
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        this.setState({
            ...this.state,
            param: nextProps.param.toObject
        });
    }

    handleLocalChange = ({target}) => {
        const {value, name} = target;
        const param = SliderParameter.fromObject(this.state.param);
        param[name] = value;
        this.setState({
            param: param.toObject
        });
    };

    handleSlider = value => {
        const param = SliderParameter.fromObject(this.state.param);
        param.value = value;

        return this.setState({
            param: param.toObject
        }, this.handleChange);
    };

    handleChange = () => this.props.handleChange(SliderParameter.fromObject(this.state.param));

    render() {
        const {param} = this.state;

        return (
            <Grid.Row columns={3} style={styles.row}>
                <Grid.Column width={5} textAlign='right'>
                    <div dangerouslySetInnerHTML={{__html: param.name}} style={{minHeight: '55px'}}/>
                </Grid.Column>
                <Grid.Column width={8}>
                    <Grid columns={2}>
                        <Grid.Column width={4} floated='left'>
                            <input name='min'
                                   type='number'
                                   className='extraMini'
                                   style={{...styles.L}}
                                   value={param.min} onBlur={this.handleChange} onChange={this.handleLocalChange}
                            />
                        </Grid.Column>
                        <Grid.Column width={4} floated='right'>
                            <input name='max'
                                   type='number'
                                   className='extraMini'
                                   style={{...styles.R}}
                                   value={param.max} onBlur={this.handleChange} onChange={this.handleLocalChange}
                            />
                        </Grid.Column>
                    </Grid>
                    <Grid style={styles.sliderRow}>
                        <Grid.Row>
                            <Slider
                                min={param.min}
                                max={param.max}
                                step={param.stepSize}
                                defaultValue={param.value}
                                value={param.value}
                                onChange={this.handleSlider}
                                onAfterChange={this.handleChange}
                            />
                        </Grid.Row>
                    </Grid>
                </Grid.Column>
                <Grid.Column width={3} style={{verticalAlign: 'top', height: '55px'}}>
                    <input name='value'
                           type='number'
                           size='mini'
                           className='extraMini'
                           style={{...styles.valueInput}}
                           value={param.value} onChange={this.handleLocalChange}
                           onBlur={this.handleChange}
                    />
                </Grid.Column>
            </Grid.Row>
        );
    }
}

ParameterSlider.propTypes = {
    param: PropTypes.object.isRequired,
    handleChange: PropTypes.func.isRequired
};

export default ParameterSlider;
