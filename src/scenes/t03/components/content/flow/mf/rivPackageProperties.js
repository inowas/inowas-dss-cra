import PropTypes from 'prop-types';
import React from 'react';
import {Accordion, Form, Grid, Header, Icon, Segment, Table} from 'semantic-ui-react';

import AbstractPackageProperties from './AbstractPackageProperties';
import {FlopyModflowMfriv} from 'core/model/flopy/packages/mf';
import {GridSize} from 'core/model/modflow';
import {documentation} from '../../../../defaults/flow';
import {RasterDataImage} from '../../../../../shared/rasterData';

class RivPackageProperties extends AbstractPackageProperties {

    render() {
        if (!this.state.mfPackage) {
            return null;
        }

        const {mfPackage, mfPackages, readonly} = this.props;
        const {activeIndex} = this.state;
        const basPackage = mfPackages.getPackage('bas');
        const {ibound} = basPackage;
        const affectedCellsLayers = ibound.map(l => l.map(r => r.map(() => 0)));
        Object.values(mfPackage.stress_period_data)[0].forEach(spv => {
            const [lay, row, col] = spv;
            affectedCellsLayers[lay][row][col] = 1;
        });

        return (
            <Form>
                <Accordion styled fluid>
                    <Accordion.Title active={activeIndex === 0} index={0} onClick={this.handleClickAccordion}>
                        <Icon name='dropdown'/>
                        River Boundaries (RIV)
                    </Accordion.Title>
                    <Accordion.Content active={activeIndex === 0}>
                        <Grid divided={'vertically'}>
                            <Grid.Row columns={2}>
                                {affectedCellsLayers.map((layer, idx) => (
                                    <Grid.Column key={idx}>
                                        <Header size='small' as='label'>Layer {idx + 1}</Header>
                                        <RasterDataImage
                                            data={layer}
                                            gridSize={GridSize.fromData(layer)}
                                            unit={''}
                                            legend={[
                                                {value: 1, color: 'blue', label: 'RIV affected cells'},
                                            ]}
                                            border={'1px dotted black'}
                                        />
                                    </Grid.Column>
                                ))}
                            </Grid.Row>
                        </Grid>
                    </Accordion.Content>
                </Accordion>

                <Segment basic>
                    <Grid>
                        <Grid.Row columns={2}>
                            <Grid.Column>

                                <Form.Group>
                                    <Form.Field width={15}>
                                        <label>Cell-by-cell budget data (ipakcb)</label>
                                        <Form.Dropdown
                                            options={[
                                                {key: 0, value: 0, text: 'false'},
                                                {key: 1, value: 1, text: 'true'},
                                            ]}
                                            placeholder='Select ipakcb'
                                            name='ipakcb'
                                            selection
                                            value={mfPackage.ipakcb || 0}
                                            readOnly={readonly}
                                            onChange={this.handleOnSelect}
                                        />
                                    </Form.Field>
                                    <Form.Field width={1}>
                                        <label>&nbsp;</label>
                                        {this.renderInfoPopup(documentation.ipakcb, 'ipakcb', 'top left', true)}
                                    </Form.Field>
                                </Form.Group>

                            </Grid.Column>
                            <Grid.Column>
                                <Table basic='very'>
                                    <Table.Body>
                                        <Table.Row>
                                            <Table.Cell collapsing>Package Options</Table.Cell>
                                            <Table.Cell>{this.renderInfoPopup(documentation.options, 'options', 'left center')}</Table.Cell>
                                            <Table.Cell textAlign='right'>{mfPackage.options || '-'}</Table.Cell>
                                        </Table.Row>

                                        <Table.Row>
                                            <Table.Cell collapsing>Data type (dtype)</Table.Cell>
                                            <Table.Cell>{this.renderInfoPopup(documentation.dtype, 'dtype', 'left center')}</Table.Cell>
                                            <Table.Cell textAlign='right'>{mfPackage.dtype || ''}</Table.Cell>
                                        </Table.Row>
                                        <Table.Row>
                                            <Table.Cell collapsing>Filename extension (extension)</Table.Cell>
                                            <Table.Cell>{this.renderInfoPopup(documentation.extension, 'extension', 'left center')}</Table.Cell>
                                            <Table.Cell textAlign='right'>{mfPackage.extension}</Table.Cell>
                                        </Table.Row>

                                        <Table.Row>
                                            <Table.Cell collapsing>File unit number (unitnumber)</Table.Cell>
                                            <Table.Cell>{this.renderInfoPopup(documentation.unitnumber, 'unitnumber', 'left center')}</Table.Cell>
                                            <Table.Cell textAlign='right'>{mfPackage.unitnumber || ''}</Table.Cell>
                                        </Table.Row>

                                        <Table.Row>
                                            <Table.Cell collapsing>Filenames (filenames)</Table.Cell>
                                            <Table.Cell>{this.renderInfoPopup(documentation.filenames, 'filenames', 'left center')}</Table.Cell>
                                            <Table.Cell textAlign='right'>{mfPackage.filenames || ''}</Table.Cell>
                                        </Table.Row>
                                    </Table.Body>
                                </Table>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Segment>

            </Form>
        );
    }
}

RivPackageProperties.propTypes = {
    mfPackage: PropTypes.instanceOf(FlopyModflowMfriv),
    onChange: PropTypes.func.isRequired,
    readonly: PropTypes.bool.isRequired
};


export default RivPackageProperties;
