import FlopyMt3dMtadv from './FlopyMt3dMtadv';
import FlopyMt3dMtbtn from './FlopyMt3dMtbtn';
import FlopyMt3dMtdsp from './FlopyMt3dMtdsp';
import FlopyMt3dMtgcg from './FlopyMt3dMtgcg';
import FlopyMt3dMt from './FlopyMt3dMt';
import FlopyMt3dMtrct from './FlopyMt3dMtrct';
import FlopyMt3dMtssm from './FlopyMt3dMtssm';

import {Transport} from '../../../modflow';
import {BoundaryCollection} from '../../../modflow/boundaries';

const packagesMap = {
    'mt': FlopyMt3dMt,
    'adv': FlopyMt3dMtadv,
    'btn': FlopyMt3dMtbtn,
    'dsp': FlopyMt3dMtdsp,
    'gcg': FlopyMt3dMtgcg,
    'rct': FlopyMt3dMtrct,
    'ssm': FlopyMt3dMtssm
};

class FlopyMt3d {

    _enabled = false;

    _packages = {};

    static createFromTransport(transport, boundaries) {

        if (!(transport instanceof Transport)) {
            throw new Error('Expecting instance of Transport')
        }

        if (!(boundaries instanceof BoundaryCollection)) {
            throw new Error('Expecting instance of BoundaryCollection')
        }

        const mt = new this();

        mt.enabled = transport.enabled;

        FlopyMt3dMtbtn.create(mt, {});
        FlopyMt3dMtadv.create(mt, {});
        FlopyMt3dMtdsp.create(mt, {});
        FlopyMt3dMtgcg.create(mt, {});
        FlopyMt3dMtrct.create(mt, {});

        const mtSsm = FlopyMt3dMtssm.create(null, {});
        mtSsm.stress_period_data = FlopyMt3dMtssm.calculateSpData(transport.substances, boundaries);
        mt.setPackage(mtSsm);
        return mt;
    }


    static fromObject(obj) {
        const self = new this();
        self.enabled = obj.enabled;
        for (const prop in obj) {
            if (prop !== '_meta' && prop !== 'enabled') {
                if (obj.hasOwnProperty(prop)) {
                    self.setPackage(packagesMap[prop].fromObject(obj[prop]))
                }
            }
        }
        return self;
    }

    constructor() {
        this.setPackage(FlopyMt3dMt.create());
    }

    recalculate = (transport, boundaries) => {

        if (!(transport instanceof Transport)) {
            throw new Error('Expecting instance of Transport')
        }

        if (!(boundaries instanceof BoundaryCollection)) {
            throw new Error('Expecting instance of BoundaryCollection')
        }

        this.enabled = transport.enabled;

        const mtBtn = this.hasPackage('btn') ? this.getPackage('btn') : FlopyMt3dMtbtn.create(null, {});
        mtBtn.ncomp = transport.substances.length;
        mtBtn.mcomp = transport.substances.length;
        mtBtn.species_names = transport.substances.all.map(s => s.name);
        this.setPackage(mtBtn);

        if (!this.hasPackage('rct')) {
            this.setPackage(FlopyMt3dMtrct.create(this, {}));
        }

        const mtSsm = this.hasPackage('ssm') ? this.getPackage('ssm') : FlopyMt3dMtssm.create(null, {});
        mtSsm.stress_period_data = FlopyMt3dMtssm.calculateSpData(transport.substances, boundaries);
        this.setPackage(mtSsm);
    };

    update = (transport, boundaries) => {
        this.recalculate(transport, boundaries);
        return this;
    };

    get enabled() {
        return this._enabled;
    }

    toggleEnabled() {
        this._enabled = !this._enabled;
    }

    set enabled(value) {
        this._enabled = value;
    }

    get packages() {
        return this._packages;
    }

    setPackage(p) {
        for (const name in packagesMap) {
            if (p instanceof packagesMap[name]) {
                this._packages[name] = p;
                return;
            }
        }

        throw new Error('Package ' + p.constructor.name + ' not found in PackageMap.')
    }

    hasPackage(name) {
        return !!this._packages[name];
    }

    // noinspection JSMethodCanBeStatic
    getPackageType(p) {
        let type = null;
        for (const name in packagesMap) {
            if (p instanceof packagesMap[name]) {
                type = name;
            }
        }

        return type;
    }


    getPackage(name) {
        if (!this._packages[name]) {
            throw new Error('Package not found');
        }

        return this._packages[name];
    }

    toObject() {
        const obj = {
            enabled: this.enabled
        };

        for (let prop in this.packages) {
            if (this.packages.hasOwnProperty(prop)) {
                obj[prop] = this.packages[prop].toObject();
            }
        }

        return obj;
    }

    toFlopyCalculation = () => {
        if (!this.enabled) {
            return null;
        }

        const obj = {
            packages: Object.keys(this.packages)
        };

        for (const prop in this.packages) {
            if (this.packages.hasOwnProperty(prop)) {
                obj[prop] = this.packages[prop].toObject();
            }
        }

        return obj;
    };
}

export default FlopyMt3d;
