import {Collection} from '../../collection/Collection';
import {IWeight} from './Weight.type';
import {IWeightAssignment} from './WeightAssignment.type';
import WeightsCollection from './WeightsCollection';

class WeightAssignmentsCollection extends Collection<IWeightAssignment> {

    public static fromObject(obj: IWeightAssignment[]) {
        return new WeightAssignmentsCollection(obj);
    }

    public isFinished() {
        return this.length >= 1;
    }

    public activeWeights() {
        const activeWeightsCollection = new WeightsCollection();
        const activeWeightAssignments = this.all.filter((wa) => wa.isActive);
        if (activeWeightAssignments.length > 0) {
            activeWeightsCollection.items = ([] as IWeight[]).concat(...activeWeightAssignments.map(
                (wa) => wa.weights
            ));
        }
        return activeWeightsCollection;
    }

    get subCriteriaWithoutActiveWA() {
        const result: IWeightAssignment[] = [];
        this.all.forEach((wa) => {
            if (
                (!wa.parent && result.filter((wx) => !wx.parent && wx.isActive).length === 0) ||
                (wa.parent && result.filter((wx) => wx.parent === wa.parent && wx.isActive).length === 0)
            ) {
                result.push(wa);
            }
        });
        return result;
    }

    public toObject() {
        return this.all;
    }
}

export default WeightAssignmentsCollection;
