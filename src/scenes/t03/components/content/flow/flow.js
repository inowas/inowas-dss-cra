import React from 'react';
import {connect} from 'react-redux';
import {withRouter} from 'react-router-dom';
import PropTypes from 'prop-types';

import {Button, Grid, Menu, Segment} from 'semantic-ui-react';
import {ModflowModel, Soilmodel} from 'core/model/modflow';
import {BoundaryCollection} from 'core/model/modflow/boundaries';

import ContentToolBar from '../../../../shared/ContentToolbar';
import {updatePackages} from '../../../actions/actions';

import {FlopyModflow, FlopyModflowPackage} from 'core/model/flopy/packages/mf';
import FlopyPackages from 'core/model/flopy/packages/FlopyPackages';

import {
    MfPackageProperties
} from './mf';
import {sendCalculationRequest, sendCommand} from '../../../../../services/api';
import ModflowModelCommand from '../../../commands/modflowModelCommand';

const sideBar = (boundaries) => ([
    {id: undefined, name: 'Modflow package', enabled: true},
    {id: 'dis', name: 'Discretization package', enabled: true},
    {id: 'bas', name: 'Basic package', enabled: true},
    {id: 'chd', name: 'Constant head package', enabled: boundaries.countByType('chd') > 0},
    {id: 'ghb', name: 'General head package', enabled: boundaries.countByType('ghb') > 0},
    {id: 'rch', name: 'Recharge package', enabled: boundaries.countByType('rch') > 0},
    {id: 'riv', name: 'River package', enabled: boundaries.countByType('riv') > 0},
    {id: 'wel', name: 'Well package', enabled: boundaries.countByType('wel') > 0},
    {id: 'hob', name: 'Head observation package', enabled: boundaries.countByType('hob') > 0},
    {id: 'flow', name: 'Flow packages', enabled: true},
    {id: 'solver', name: 'Solver package', enabled: true},
    {id: 'oc', name: 'Output control', enabled: true}
]);

class Flow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            mf: props.packages.mf.toObject(),
            isError: false,
            isDirty: false,
            isLoading: false
        }
    }

    componentWillReceiveProps(nextProps, nextContext) {
        this.setState({
            mf: nextProps.packages.mf.toObject()
        })
    }

    handleSave = () => {
        const packages = this.props.packages;
        packages.model_id = this.props.model.id;
        packages.mf = ModflowModel.fromObject(this.state.mf);

        this.setState({loading: true}, () =>
            sendCommand(
                ModflowModelCommand.updateFlopyPackages(this.props.model.id, packages),
                () => {
                    this.props.updatePackages(packages);
                    return this.setState({isDirty: false, loading: false});
                }
            )
        );
    };

    handleCalculate = () => {
        const packages = this.props.packages;
        packages.model_id = this.props.model.id;
        packages.mf = FlopyModflow.fromObject(this.state.mf);

        if (this.state.isDirty) {
            this.handleSave();
        }

        sendCalculationRequest(packages,
            data => console.log(data),
            error => console.log(error)
        );
    };

    handleRecalculate = () => {
        const packages = this.props.packages;
        packages.model_id = this.props.model.id;
        packages.mf = FlopyModflow.createFromModel(this.props.model, this.props.soilmodel, this.props.boundaries);
        packages.validate().then(data => {
            if (data[0] === true) {
                this.props.updatePackages(packages)
            }
        });
    };

    handleChangePackage = (p) => {
        if (p instanceof FlopyModflowPackage) {
            const mf = FlopyModflow.fromObject(this.state.mf);
            mf.setPackage(p);

            return this.setState({mf: mf.toObject(), isDirty: true},
                () => this.props.updatePackages(mf));
        }

        throw new Error('Package has to be instance of FlopyModflowPackage');
    };

    onMenuClick = (type) => {
        const path = this.props.match.path;
        const basePath = path.split(':')[0];

        if (!type) {
            return this.props.history.push(basePath + this.props.model.id + '/flow');
        }

        return this.props.history.push(basePath + this.props.model.id + '/flow/' + type);
    };

    renderProperties() {

        const mf = FlopyModflow.fromObject(this.state.mf);

        const readOnly = this.props.model.readOnly;
        const {type} = this.props.match.params;

        switch (type) {
            case 'mf':
                return (
                    <MfPackageProperties
                        mfPackage={mf.getPackage(type)}
                        onChange={this.handleChangePackage}
                        readonly={readOnly}
                    />
                );
            default:
                return (
                    <MfPackageProperties
                        mfPackage={mf.getPackage('mf')}
                        onChange={this.handleChangePackage}
                        readonly={readOnly}
                    />
                );
        }
    }

    renderSidebar = () => {
        const {type} = this.props.match.params;
        return (
            <div>
                <Menu fluid vertical tabular>
                    {sideBar(this.props.boundaries).map((item, key) => {
                        if (item.enabled) {
                            return (
                                <Menu.Item
                                    key={key}
                                    name={item.name}
                                    active={type === item.id}
                                    onClick={() => this.onMenuClick(item.id)}
                                />
                            )
                        }
                        return null;
                    })}
                </Menu>
                <Button onClick={this.handleCalculate}>Calculate</Button>
                <Button onClick={this.handleRecalculate}>Recalculate</Button>
            </div>
        );
    };

    render() {
        const {isDirty, isError, isLoading, mf} = this.state;

        if (!mf) {
            return null;
        }

        return (
            <div>
                <Segment color={'grey'} loading={isLoading}>
                    <Grid>
                        <Grid.Row>
                            <Grid.Column width={4}/>
                            <Grid.Column width={12}>
                                <ContentToolBar isDirty={isDirty} isError={isError} save onSave={this.handleSave}/>
                            </Grid.Column>
                        </Grid.Row>
                        <Grid.Row>
                            <Grid.Column width={4}>
                                {this.renderSidebar()}
                            </Grid.Column>
                            <Grid.Column width={12}>
                                {this.renderProperties()}
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Segment>
            </div>
        );
    }
}

const mapStateToProps = (state) => ({
    boundaries: BoundaryCollection.fromObject(state.T03.boundaries),
    model: ModflowModel.fromObject(state.T03.model),
    packages: FlopyPackages.fromObject(state.T03.packages),
    soilmodel: Soilmodel.fromObject(state.T03.soilmodel),
});

const mapDispatchToProps = {updatePackages};

Flow.proptypes = {
    boundaries: PropTypes.instanceOf(BoundaryCollection).isRequired,
    history: PropTypes.object.isRequired,
    match: PropTypes.object.isRequired,
    model: PropTypes.instanceOf(ModflowModel).isRequired,
    packages: PropTypes.instanceOf(FlopyPackages).isRequired,
    soilmodel: PropTypes.instanceOf(Soilmodel).isRequired,
    updatePackages: PropTypes.func.isRequired,
};

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Flow));