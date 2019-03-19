import uuidv4 from 'uuid/v4';
import {SoilmodelZone, ZonesCollection} from './index';
import {GridSize} from '../index';
import {cloneDeep} from 'lodash';
import {Cells, Geometry} from 'core/model/geometry';
import ModflowModel from '../ModflowModel';

class SoilmodelLayer {
    _id = uuidv4();
    _meta = {
        _zones: new ZonesCollection()
    };
    _name = 'New Layer';
    _description = '';
    _number = 0;
    _laytyp = 0;
    _top = 1;
    _botm = 0;
    _hk = 10;
    _hani = 1;
    _vka = 1;
    _layavg = 0;
    _laywet = 0;
    _ss = 0.00002;
    _sy = 0.15;

    static fromDefault(geometry, cells) {
        if (!(geometry instanceof Geometry)) {
            throw new Error('GridSize needs to be instance of GridSize');
        }

        if (!(cells instanceof Cells)) {
            throw new Error('Cells needs to be instance of Cells');
        }

        const layer = new SoilmodelLayer();
        layer.name = 'Top Layer';
        layer.number = 0;

        const defaultZone = SoilmodelZone.fromDefault();
        defaultZone.geometry = geometry;
        defaultZone.cells = cells;
        layer.zonesCollection.add(defaultZone);
        return layer;
    }

    static fromObject(obj, parseParameters = true) {
        const layer = new SoilmodelLayer();

        if (obj) {
            layer.id = obj.id;
            layer.name = obj.name;
            layer.description = obj.description;
            layer.number = obj.number;
            layer.laytyp = obj.laytyp;
            layer.top = obj.top;
            layer.botm = obj.botm;
            layer.hk = obj.hk;
            layer.hani = obj.hani;
            layer.vka = obj.vka;
            layer.layavg = obj.layavg;
            layer.laywet = obj.laywet;
            layer.ss = obj.ss;
            layer.sy = obj.sy;
            layer.zonesCollection = obj._meta && obj._meta.zones ? ZonesCollection.fromArray(obj._meta.zones, parseParameters) : new ZonesCollection();
        }

        return layer;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value ? value : uuidv4();
    }

    get meta() {
        return this._meta;
    }

    set meta(value) {
        this._meta = value ? value : {
            _zones: []
        };
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value ? value : 'New Layer';
    }

    get description() {
        return this._description;
    }

    set description(value) {
        this._description = value ? value : '';
    }

    get number() {
        return this._number;
    }

    set number(value) {
        this._number = value ? parseInt(value) : 0;
    }

    get laytyp() {
        return this._laytyp;
    }

    set laytyp(value) {
        this._laytyp = value ? parseInt(value) : 0;
    }

    get top() {
        return this._top;
    }

    set top(value) {
        this._top = value;
    }

    get botm() {
        return this._botm;
    }

    set botm(value) {
        this._botm = value;
    }

    get hk() {
        return this._hk;
    }

    set hk(value) {
        this._hk = value;
    }

    get hani() {
        return this._hani;
    }

    set hani(value) {
        this._hani = value;
    }

    get vka() {
        return this._vka;
    }

    set vka(value) {
        this._vka = value;
    }

    get layavg() {
        return this._layavg;
    }

    set layavg(value) {
        this._layavg = parseFloat(value);
    }

    get laywet() {
        return this._laywet;
    }

    set laywet(value) {
        this._laywet = parseFloat(value);
    }

    get ss() {
        return this._ss;
    }

    set ss(value) {
        this._ss = value;
    }

    get sy() {
        return this._sy;
    }

    set sy(value) {
        this._sy = value;
    }

    get zonesCollection() {
        return this._meta._zones;
    }

    set zonesCollection(value) {
        if (!(value instanceof ZonesCollection)) {
            throw new Error('Zones expected to be instance of ZonesCollection');
        }
        this._meta._zones = value;
    }

    clone(newId) {
        this._id = newId;
        return SoilmodelLayer.fromObject(this.toObject());
    }

    toObject() {
        return {
            'id': this.id,
            'name': this.name,
            '_meta': {
                'zones': this.zonesCollection.toArray()
            },
            'description': this.description,
            'number': this.number,
            'laytyp': this.laytyp,
            'top': this.top,
            'botm': this.botm,
            'hk': this.hk,
            'hani': this.hani,
            'vka': this.vka,
            'layavg': this.layavg,
            'laywet': this.laywet,
            'ss': this.ss,
            'sy': this.sy
        };
    }

    updateGeometry(model) {
        if (!(model instanceof ModflowModel)) {
            throw new Error('Model needs to be instance of ModflowModel');
        }

        const defaultZone = this.zonesCollection.findBy('priority', 0, {first: true});
        if (defaultZone) {
            defaultZone.geometry = model.geometry;
            defaultZone.cells = model.cells;
            this.zonesCollection.update(defaultZone);
            this.resetParameters().zonesToParameters(model.gridSize);
        }
        return this;
    }

    resetParameters() {
        const defaultLayer = new SoilmodelLayer();
        this.top = defaultLayer.top;
        this.botm = defaultLayer.botm;
        this.hk = defaultLayer.hk;
        this.hani = defaultLayer.hani;
        this.vka = defaultLayer.vka;
        this.ss = defaultLayer.ss;
        this.sy = defaultLayer.sy;
        return this;
    }

    smoothParameter(gridSize, parameter, cycles = 1, distance = 1) {
        //console.log(`Calculate with gridSize ${gridSize} for parameter ${parameter} in ${cycles} cycles and ${distance} distance.`);

        for (let cyc = 1; cyc <= cycles; cyc++) {
            for (let row = 0; row < gridSize.nY; row++) {
                for (let col = 0; col < gridSize.nX; col++) {
                    let avg = parseFloat(this[parameter][row][col]);
                    let div = 1;

                    this[parameter].forEach((r, rowKey) => {
                        if (rowKey >= row - distance && rowKey <= row + distance) {
                            this[parameter][rowKey].forEach((c, colKey) => {
                                if (colKey >= col - distance && colKey <= col + distance) {
                                    avg += parseFloat(this[parameter][rowKey][colKey]);
                                    div++;
                                }
                            });
                        }
                    });
                    this[parameter][row][col] = avg / div;
                }
            }
        }
    }

    zonesToParameters(gridSize, parameters = ['top', 'botm', 'hk', 'hani', 'vka', 'ss', 'sy']) {
        if (!(gridSize instanceof GridSize)) {
            throw new Error('GridSize needs to be instance of GridSize');
        }

        if (!Array.isArray(parameters)) {
            parameters = [parameters];
        }

        const zones = this.zonesCollection.orderBy('priority');

        // loop through all the zones
        zones.all.forEach(zone => {
            // loop through all the parameters ...

            parameters.forEach(parameter => {
                // ... and check if the current zone has values for the parameter
                const zoneParameter = zone[parameter];

                if (zoneParameter.isActive) {
                    if (zone.priority === 0) {
                        // default zone parameter value is a number:
                        if (!zoneParameter.isArray()) {
                            this[parameter] = new Array(gridSize.nY).fill(0).map(() => new Array(gridSize.nX).fill(zoneParameter.value));
                        }
                        // default zone parameter value is a raster:
                        if (zoneParameter.isArray()) {
                            this[parameter] = cloneDeep(zoneParameter.value);
                        }
                    }

                    // ... zone is not default:
                    if (zone.priority > 0) {
                        // update the values for the parameter in the cells given by the zone
                        zone.cells.cells.forEach(cell => {
                            //console.log(`set ${parameter} at ${cell[1]} ${cell[0]} with value ${zone[parameter]}`);
                            this[parameter][cell[1]][cell[0]] = zoneParameter.value;
                        });
                    }
                }
            });
        });

        return this;
    }
}

export default SoilmodelLayer;
