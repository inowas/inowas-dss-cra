import Criterion from './Criterion';
import AbstractCollection from '../../collection/AbstractCollection';

class CriteriaCollection extends AbstractCollection {
    static fromArray(array) {
        const cc = new CriteriaCollection();
        cc.items = array.map(c => Criterion.fromObject(c));
        return cc;
    }

    validateInput (criterion) {
        if (!(criterion instanceof Criterion)) {
            throw new Error('Criterion expected to be instance of Criterion');
        }
        return criterion;
    }

    isFinished() {
        return this.all.filter(c => !c.suitability || c.suitability.data.length === 0).length === 0;
    }
}

export default CriteriaCollection;