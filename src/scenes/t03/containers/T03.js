import React from 'react';
import {connect} from 'react-redux';
import {Redirect, withRouter} from 'react-router-dom';
import PropTypes from 'prop-types';
import AppContainer from '../../shared/AppContainer';
import {Grid, Icon, Message} from 'semantic-ui-react';
import Navigation from './navigation';
import * as Content from '../components/content/index';
import ToolMetaData from '../../shared/simpleTools/ToolMetaData';
import {fetchUrl, fetchUrlAndUpdate, sendCommand} from '../../../services/api';

import {
    clear,
    updateBoundaries,
    updateCalculation,
    updateModel,
    updateOptimization,
    updatePackages,
    updateSoilmodel,
    updateTransport,
    updateVariableDensity
} from '../actions/actions';

import {
    Calculation,
    ModflowModel,
    Soilmodel,
    Transport,
    VariableDensity
} from '../../../core/model/modflow';

import ModflowModelCommand from '../commands/modflowModelCommand';
import CalculationProgressBar from '../components/content/calculation/calculationProgressBar';
import OptimizationProgressBar from '../components/content/optimization/optimizationProgressBar';
import FlopyPackages from '../../../core/model/flopy/packages/FlopyPackages';
import {FlopyModflow} from '../../../core/model/flopy/packages/mf';
import {FlopyMt3d} from '../../../core/model/flopy/packages/mt';
import {fetchCalculationDetails} from '../../../services/api';
import {cloneDeep} from 'lodash';
import FlopyModpath from '../../../core/model/flopy/packages/mp/FlopyModpath';
import FlopySeawat from '../../../core/model/flopy/packages/swt/FlopySeawat';
import {BoundaryCollection, BoundaryFactory} from '../../../core/model/modflow/boundaries';
import {updater} from "../updaters/soilmodel";
import {FileData} from "../../../services/dataDropper";

const navigation = [{
    name: 'Documentation',
    path: 'https://inowas.com/tools/t03-modflow-model-setup-and-editor/',
    icon: <Icon name="file"/>
}];

class T03 extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            model: props.model ? props.model.toObject() : null,
            error: false,
            isLoading: false,
            calculatePackages: false,
            scenarioAnalysisId: null,
            navigation,
            soilmodelFetcher: {
                message: 'Start Fetching Soilmodel ...',
                fetching: true
            }
        }
    }

    componentDidMount() {
        const {id} = this.props.match.params;
        const {search} = this.props.location;

        if (search.startsWith('?sid=')) {
            const scenarioAnalysisId = search.split('=')[1];

            const navigation = cloneDeep(this.state.navigation);
            navigation.push({
                name: 'Return to ScenarioAnalysis',
                path: '/tools/T07/' + scenarioAnalysisId,
                icon: <Icon name="file"/>
            });

            this.setState({
                scenarioAnalysisId,
                navigation
            })
        }

        return this.setState({isLoading: true},
            () => this.fetchModel(id)
        )
    };

    componentWillReceiveProps(nextProps) {
        const {id} = nextProps.match.params;
        if (!this.props.model || this.props.model.id !== id) {
            if (!this.state.isLoading) {
                return this.setState({isLoading: true},
                    () => this.fetchModel(id)
                )
            }
        }

        this.setState({
            model: nextProps.model
        })
    }

    fetchModel(id) {
        if (this.props.model && this.props.model.id !== id) {
            this.props.clear();
        }
        fetchUrl(
            `modflowmodels/${id}`,
            data => {
                const modflowModel = ModflowModel.fromQuery(data);
                this.props.updateModel(modflowModel);
                this.setState({isLoading: false}, () => {
                    this.fetchBoundaries(id);
                    this.fetchPackages(id);
                    this.fetchSoilmodel(id);
                    this.fetchTransport(id);
                    this.fetchVariableDensity(id);

                    if (modflowModel.calculationId) {
                        fetchCalculationDetails(modflowModel.calculationId,
                            data => this.props.updateCalculation(Calculation.fromQuery(data)),
                            error => console.log(error)
                        )
                    }
                });
            },
            error => this.setState(
                {error, isLoading: false},
                () => this.handleError(error)
            )
        );
    };

    fetchBoundaries(id) {
        fetchUrl(`modflowmodels/${id}/boundaries`,
            data => this.props.updateBoundaries(BoundaryCollection.fromQuery(data)),
            error => this.setState(
                {error, isLoading: false},
                () => this.handleError(error)
            )
        );
    };

    fetchPackages(id) {
        fetchUrl(`modflowmodels/${id}/packages`,
            data => {
                if (Array.isArray(data) && data.length === 0) {
                    return this.setState({calculatePackages: true})
                }
                return this.props.updatePackages(FlopyPackages.fromQuery(data));
            },
            error => this.setState(
                {error, isLoading: false},
                () => this.handleError(error)
            )
        );
    };

    fetchSoilmodelTasks(soilmodel) {
        const layers = soilmodel.layers.filter((layer) =>
            layer.parameters.filter((parameter) => parameter.data.file && !Array.isArray(parameter.data.data)).length > 0 ||
            layer.relations.filter((relation) => relation.data.file && !Array.isArray(relation.data.data)).length > 0);

        if (layers.length) {
            const layer = layers[0];
            const parameters = layer.parameters.filter((parameter) => parameter.data.file && !Array.isArray(parameter.data.data));
            if (parameters.length > 0) {
                const parameter = parameters[0];
                this.setState({
                    soilmodelFetcher: {
                        message: `Fetching parameter ${parameter.id} for layer ${layer.name}`,
                        fetching: true
                    }
                });
                FileData.fromFile(parameter.data.file).then((file) => {
                    soilmodel.layers = soilmodel.layers.map((layer) => {
                        layer.parameters = layer.parameters.map((parameter) => {
                            parameter.data = file.toObject();
                            return parameter;
                        });
                        return layer;
                    });
                    return this.fetchSoilmodelTasks(soilmodel);
                });
                return;
            }
            const relations = layer.relations.filter((relation) => relation.data.file && !Array.isArray(relation.data.data));
            if (relations.length > 0) {
                const relation = relations[0];
                this.setState({
                    soilmodelFetcher: {
                        message: `Fetching relation ${relation.id} for layer ${layer.name}`,
                        fetching: true
                    }
                });
                FileData.fromFile(relation.data.file).then((file) => {
                    soilmodel.layers = soilmodel.layers.map((layer) => {
                        layer.relations = layer.relations.map((relation) => {
                            relation.data = file.toObject();
                            return relation;
                        });
                        return layer;
                    });
                    return this.fetchSoilmodelTasks(soilmodel);
                });
                return;
            }
        }

        this.setState({
            soilmodelFetcher: {
                message: `Fetching finished.`,
                fetching: false
            }
        });
        return this.props.updateSoilmodel(Soilmodel.fromObject(soilmodel));
    };

    fetchSoilmodel(id) {
        fetchUrlAndUpdate(`modflowmodels/${id}/soilmodel`,
            data => {
                return updater(data, this.props.model);
            },
            data => {
                const soilmodel = Soilmodel.fromQuery(data).toObject();
                return this.fetchSoilmodelTasks(soilmodel);
            },
            error => this.setState(
                {error, isLoading: false},
                () => this.handleError(error)
            )
        );
    };

    fetchTransport(id) {
        fetchUrl(`modflowmodels/${id}/transport`,
            data => this.props.updateTransport(Transport.fromQuery(data)),
            error => this.setState(
                {error, isLoading: false},
                () => this.handleError(error)
            )
        );
    };

    fetchVariableDensity(id) {
        fetchUrl(`modflowmodels/${id}/variableDensity`,
            data => this.props.updateVariableDensity(VariableDensity.fromQuery(data)),
            error => this.setState(
                {error, isLoading: false},
                () => this.handleError(error)
            )
        );
    }

    calculatePackages = () => {
        return new Promise((resolve, reject) => {
            this.setState({calculatePackages: 'calculation'});
            const mf = FlopyModflow.createFromModel(this.props.model, this.props.soilmodel, this.props.boundaries);
            const modpath = new FlopyModpath();
            const mt = FlopyMt3d.createFromTransport(this.props.transport, this.props.boundaries);
            const swt = FlopySeawat.createFromVariableDensity(this.props.variableDensity);
            const modelId = this.props.model.id;

            const flopyPackages = FlopyPackages.create(modelId, mf, modpath, mt, swt);
            if (flopyPackages instanceof FlopyPackages) {
                this.setState({calculatePackages: false});
                resolve(flopyPackages);
            }

            this.setState({calculatePackages: 'error'});
            reject('Error creating instance of FlopyPackages.');
        });
    };

    handleError = error => {
        console.log(error);
        const {response} = error;
        const {status} = response;
        if (status === 422) {
            this.props.history.push('/tools');
        }
    };

    renderContent(id, property, type) {
        switch (property) {
            case 'discretization':
                return (<Content.Discretization/>);
            case 'soilmodel':
                return (<Content.SoilmodelGuard/>);
            case 'boundaries':
                if (BoundaryFactory.availableTypes.indexOf(type) > -1) {
                    return (<Content.CreateBoundary type={type}/>);
                }
                return (<Content.Boundaries types={['chd', 'drn', 'evt', 'ghb', 'rch', 'riv', 'wel']}/>);
            case 'head_observations':
                if (type === 'hob') {
                    return (<Content.CreateBoundary/>);
                }
                return (<Content.Boundaries types={['hob']}/>);
            case 'transport':
                return (<Content.Transport/>);
            case 'variable_density':
                return (<Content.VariableDensityProperties/>);
            case 'observations':
                return (<Content.Observations/>);
            case 'modflow':
                return (<Content.Modflow/>);
            case 'mt3d':
                return (<Content.Mt3d/>);
            case 'seawat':
                return (<Content.Seawat/>);
            case 'calculation':
                return (<Content.Calculation/>);
            case 'flow':
                return (<Content.FlowResults/>);
            case 'budget':
                return (<Content.BudgetResults/>);
            case 'modpath':
                return (<Content.Modpath/>);
            case 'concentration':
                return (<Content.TransportResults/>);
            case 'optimization':
                return (<Content.Optimization/>);
            default:
                const path = this.props.match.path;
                const basePath = path.split(':')[0];
                return (
                    <Redirect to={basePath + id + '/discretization' + this.props.location.search}/>
                );
        }
    }

    saveMetaData = tool => {
        const {name, description} = tool;
        const isPublic = tool.public;

        const {model} = this.props;
        model.name = name;
        model.description = description;
        model.isPublic = isPublic;

        return sendCommand(
            ModflowModelCommand.updateModflowModelMetadata(model.id, name, description, isPublic),
            () => this.props.updateModel(model),
            (e) => this.setState({error: e})
        );
    };

    render() {
        const {navigation} = this.state;

        if (this.state.soilmodelFetcher.fetching ||
            !(this.props.model instanceof ModflowModel) ||
            !(this.props.boundaries instanceof BoundaryCollection) ||
            !(this.props.soilmodel instanceof Soilmodel) ||
            !(this.props.transport instanceof Transport) ||
            !(this.props.variableDensity instanceof VariableDensity)
        ) {
            return (
                <AppContainer navbarItems={navigation}>
                    <Message icon>
                        <Icon name='circle notched' loading/>
                    </Message>
                </AppContainer>
            )
        }

        if (this.state.calculatePackages === true) {
            this.calculatePackages().then(packages => {
                this.props.updatePackages(packages);
                return sendCommand(
                    ModflowModelCommand.updateFlopyPackages(this.props.model.id, packages),
                    (e) => this.setState({error: e})
                );
            });
        }

        if (!(this.props.packages instanceof FlopyPackages)) {
            return (
                <AppContainer navbarItems={navigation}>
                    <Message icon>
                        <Icon name='circle notched' loading/>
                    </Message>
                </AppContainer>
            )
        }

        const {id, property, type} = this.props.match.params;
        return (
            <AppContainer navbarItems={navigation}>
                <ToolMetaData
                    isDirty={false}
                    onChange={() => {
                    }}
                    readOnly={false}
                    tool={{
                        tool: 'T03',
                        name: this.props.model.name,
                        description: this.props.model.description,
                        public: this.props.model.isPublic
                    }}
                    defaultButton={false}
                    saveButton={false}
                    onSave={this.saveMetaData}
                />
                <Grid padded>
                    <Grid.Row>
                        <Grid.Column width={3}>
                            <Navigation/>
                            <CalculationProgressBar/>
                            <OptimizationProgressBar/>
                        </Grid.Column>
                        <Grid.Column width={13}>
                            {this.renderContent(id, property, type)}
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </AppContainer>
        )
    }
}

const mapStateToProps = state => ({
    model: state.T03.model ? ModflowModel.fromObject(state.T03.model) : null,
    boundaries: state.T03.boundaries ? BoundaryCollection.fromObject(state.T03.boundaries) : null,
    calculation: state.T03.calculation ? Calculation.fromObject(state.T03.calculation) : null,
    packages: state.T03.packages ? FlopyPackages.fromObject(state.T03.packages) : null,
    soilmodel: state.T03.soilmodel ? Soilmodel.fromObject(state.T03.soilmodel) : null,
    transport: state.T03.transport ? Transport.fromObject(state.T03.transport) : null,
    variableDensity: state.T03.variableDensity ? VariableDensity.fromObject(state.T03.variableDensity) : null
});

const mapDispatchToProps = {
    clear,
    updateCalculation,
    updateBoundaries,
    updatePackages,
    updateModel,
    updateOptimization,
    updateTransport,
    updateSoilmodel,
    updateVariableDensity
};


T03.propTypes = {
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    match: PropTypes.object.isRequired,
    boundaries: PropTypes.instanceOf(BoundaryCollection),
    calculation: PropTypes.instanceOf(Calculation),
    packages: PropTypes.instanceOf(FlopyPackages),
    model: PropTypes.instanceOf(ModflowModel),
    soilmodel: PropTypes.instanceOf(Soilmodel),
    variableDensity: PropTypes.instanceOf(VariableDensity),
    clear: PropTypes.func.isRequired,
    updateModel: PropTypes.func.isRequired,
    updatePackages: PropTypes.func.isRequired,
    updateBoundaries: PropTypes.func.isRequired,
    updateOptimization: PropTypes.func.isRequired,
    updateSoilmodel: PropTypes.func.isRequired,
    updateVariableDensity: PropTypes.func.isRequired
};

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(T03));
