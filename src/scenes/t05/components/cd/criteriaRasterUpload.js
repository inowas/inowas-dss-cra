import React from 'react';
import PropTypes from 'prop-types';
import {Criterion} from 'core/mcda/criteria';
import {Grid, Button, Icon, Message, Form, Segment} from 'semantic-ui-react';
import RasterfileUploadModal from '../../../shared/rasterData/rasterfileUploadModal';
import CriteriaRasterMap from './criteriaRasterMap';
import {Rule, RulesCollection} from 'core/mcda/criteria';
import {Raster, Tile} from 'core/mcda/gis';
import {min, max} from 'scenes/shared/rasterData/helpers';
import {BoundingBox, GridSize} from 'core/geometry';
import TilesMap from './tilesMap';

class CriteriaRasterUpload extends React.Component {
    state = {
        activeTile: null,
        hash: null,
        metadata: null,
        selectedBand: 0,
        showInfo: true,
        showUploadModal: false,
        errorFetching: false,
        errorUploading: false,
        showBasicLayer: false
    };

    handleClickTile = tile => this.setState({
        activeTile: tile.toObject()
    });

    handleDismiss = () => this.setState({showInfo: false});

    handleUploadClick = () => this.setState({showUploadModal: true});

    handleCancelModal = () => this.setState({showUploadModal: false});

    handleChangeRaster = raster => {
        if (!(raster instanceof Raster)) {
            throw new Error('Raster expected to be instance of Raster.');
        }
        const criterion = this.props.criterion;
        criterion.raster = raster;
        return this.props.onChange(criterion);
    };

    handleUploadFile = result => {
        const {data, metadata} = result;

        const criterion = this.props.criterion;
        const tile = new Tile();
        tile.data = Array.from(data);
        tile.min = min(tile.data);
        tile.max = max(tile.data);
        tile.gridSize = this.props.gridSize;

        let boundingBox = null;
        if (metadata) {
            boundingBox = BoundingBox.fromPoints([
                [metadata.origin[0], metadata.origin[1] + metadata.pixelSize[1] * metadata.rasterYSize],
                [metadata.origin[0] + metadata.pixelSize[0] * metadata.rasterXSize, metadata.origin[1]]
            ]);
        }
        tile.boundingBox = boundingBox;
        criterion.tilesCollection.add(tile);

        criterion.rulesCollection = new RulesCollection();
        const rule = new Rule();
        rule.from = tile.min;
        rule.to = tile.max;
        criterion.rulesCollection.add(rule);

        this.setState({
            activeTile: tile.toObject(),
            showUploadModal: false
        });
        return this.props.onChange(criterion);
    };

    onToggleBasicLayer = () => this.setState({showBasicLayer: !this.state.showBasicLayer});

    render() {
        const {activeTile, showInfo, showBasicLayer, showUploadModal} = this.state;
        const {tilesCollection} = this.props.criterion;

        return (
            <Grid>
                <Grid.Row>
                    <Grid.Column width={16}>
                        {showInfo &&
                        <Message onDismiss={this.handleDismiss}>
                            <Message.Header>Upload raster</Message.Header>
                            <p>...</p>
                        </Message>
                        }
                    </Grid.Column>
                </Grid.Row>
                <Grid.Row>
                    <Grid.Column width={5}>
                        <Segment textAlign='center' inverted color='grey' secondary>
                            Upload
                        </Segment>
                        <Segment>
                            <Form>
                                <Form.Group>
                                    <Button primary icon labelPosition='left' fluid onClick={this.handleUploadClick}>
                                        <Icon name='upload'/>Upload Raster Tile
                                    </Button>
                                </Form.Group>
                            </Form>
                        </Segment>
                        <Segment textAlign='center' inverted color='grey' secondary>
                            Tiles
                        </Segment>

                        {tilesCollection.length > 0 ?
                            <TilesMap
                                activeTile={!!activeTile ? Tile.fromObject(activeTile) : null}
                                handleClick={this.handleClickTile}
                                tilesCollection={tilesCollection}
                            /> :
                            <Segment>
                                No tiles found ...
                            </Segment>
                        }
                    </Grid.Column>
                    <Grid.Column width={11}>
                        {tilesCollection.length > 0 && !!activeTile &&
                        <CriteriaRasterMap
                            onChange={this.handleChangeRaster}
                            raster={Tile.fromObject(activeTile)}
                            showBasicLayer={showBasicLayer}
                        />
                        }
                    </Grid.Column>
                </Grid.Row>
                {showUploadModal &&
                <RasterfileUploadModal
                    gridSize={this.props.gridSize}
                    onCancel={this.handleCancelModal}
                    onChange={this.handleUploadFile}
                    parameter={{unit: 'm'}}
                />
                }
            </Grid>
        )
    }
}

CriteriaRasterUpload.proptypes = {
    criterion: PropTypes.instanceOf(Criterion).isRequired,
    gridSize: PropTypes.instanceOf(GridSize).isRequired,
    onChange: PropTypes.func.isRequired
};

export default CriteriaRasterUpload;

/*
<Form.Group>
                                    <Checkbox toggle label='Basic Tile Layer' onClick={this.onToggleBasicLayer}/>
                                </Form.Group>
 */