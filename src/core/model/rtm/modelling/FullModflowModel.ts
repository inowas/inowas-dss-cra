import {BoundaryCollection, ModflowModel, Soilmodel, VariableDensity} from '../../modflow';
import {FlopyMt3d} from '../../flopy/packages/mt';
import {FlopySeawat} from '../../flopy';
import { IBoundary } from '../../modflow/boundaries/Boundary.type';
import { IFlopyPackages } from '../../flopy/packages/FlopyPackages.type';
import {IModflowModel} from '../../modflow/ModflowModel.type';
import {ISoilmodel} from '../../modflow/soilmodel/Soilmodel.type';
import { ITransport } from '../../modflow/transport/Transport.type';
import {IVariableDensity} from '../../modflow/variableDensity/VariableDensity.type';
import FlopyModflow from '../../flopy/packages/mf/FlopyModflow';
import FlopyModpath from '../../flopy/packages/mp/FlopyModpath';
import FlopyPackages from '../../flopy/packages/FlopyPackages';
import Transport from '../../modflow/transport/Transport';

export interface IFullModflowModel extends IModflowModel {
    boundaries: IBoundary[];
    soilmodel: ISoilmodel;
    transport: ITransport;
    variableDensity: IVariableDensity;
    packages?: IFlopyPackages;
}

class FullModflowModel extends ModflowModel {

    constructor(
        model: ModflowModel,
        soilmodel: Soilmodel,
        boundaries: BoundaryCollection,
        transport: Transport,
        variableDensity: VariableDensity,
        packages?: FlopyPackages
    ) {
        super(model.toObject());
        this._props = {
            ...model.toObject(),
            boundaries: boundaries.toObject(),
            soilmodel: soilmodel.toObject(),
            transport: transport.toObject(),
            variableDensity: variableDensity.toObject(),
            packages: packages ? packages.toObject() : undefined
        };
    }

    protected readonly _props: IFullModflowModel;

    public applyRTModelling(): void {
        // this.stressperiods.addStressPeriod()
        // this.boundaries.applySPValues
    }

    get packages(): FlopyPackages {
        if (this._props.packages) {
            return FlopyPackages.fromObject(this._props.packages).update(
                this, this.soilmodel, this.boundaries, this.transport, this.variableDensity
            );
        }

        return FlopyPackages.create(
            this.id,
            FlopyModflow.create(this, this.soilmodel, this.boundaries),
            FlopyModpath.create(),
            FlopyMt3d.create(this.transport, this.boundaries),
            FlopySeawat.create(this.variableDensity)
        );
    }

    get boundaries(): BoundaryCollection {
        return BoundaryCollection.fromObject(this._props.boundaries);
    }

    get soilmodel(): Soilmodel {
        return Soilmodel.fromObject(this._props.soilmodel);
    }

    get transport(): Transport {
        return Transport.fromObject(this._props.transport);
    }

    get variableDensity(): VariableDensity {
        return VariableDensity.fromObject(this._props.variableDensity);
    }
}

export default FullModflowModel;