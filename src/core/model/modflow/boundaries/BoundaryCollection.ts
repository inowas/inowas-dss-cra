import {cloneDeep, each, isArray, isEqual, isObject, sortBy} from 'lodash';
import {Collection} from '../../collection/Collection';
import BoundingBox from '../../geometry/BoundingBox';
import GridSize from '../../geometry/GridSize';
import {BoundaryType, IBoundary, IBoundaryImport} from './Boundary.type';
import {Boundary, BoundaryFactory} from './index';

export interface IBoundaryComparisonItem {
    id: string;
    state: string | null;
    diff: object | null;
    type: BoundaryType;
    name: string;
}

class BoundaryCollection extends Collection<Boundary> {

    get boundaries() {
        return sortBy(this.all, [(b) => b.name && b.name.toUpperCase()]);
    }

    public static fromQuery(query: IBoundary[]) {
        return BoundaryCollection.fromObject(query);
    }

    public static fromObject(obj: IBoundary[]) {
        const bc = new BoundaryCollection();
        obj.forEach((b) => {
            bc.addBoundary(BoundaryFactory.fromObject(b));
        });
        return bc;
    }

    public static fromImport(i: IBoundaryImport[], boundingBox: BoundingBox, gridSize: GridSize) {
        const bc = new BoundaryCollection();
        i.forEach((b) => bc.addBoundary(BoundaryFactory.fromImport(b, boundingBox, gridSize)));
        return bc;
    }

    public findById(value: string) {
        return this.findFirstBy('id', value, true);
    }

    public addBoundary(boundary: Boundary) {
        return this.add(boundary);
    }

    public countByType(type: BoundaryType) {
        return this.boundaries.filter((b) => b.type === type).length;
    }

    public removeById(id: string) {
        this.removeBy('id', id);
        return this;
    }

    public toObject = () => {
        return this.boundaries.map((b) => b.toObject());
    };

    public toImport = () => {
        return this.all.map((b) => b.toImport());
    };

    public filter = (callable: (b: any) => boolean) => {
        return BoundaryCollection.fromObject(this.all.filter(callable).map((b) => b.toObject()));
    };

    public compareWith = (nbc: BoundaryCollection): IBoundaryComparisonItem[] => {
        const currentBoundaries = BoundaryCollection.fromObject(cloneDeep(this.toObject()));
        const newBoundaries = nbc;

        let items: IBoundaryComparisonItem[] = currentBoundaries.all.map((b) => (
            {id: b.id, state: null, type: b.type, diff: null, name: b.name})
        );

        // DELETE
        items = items.map((i) => {
            if (newBoundaries.filter((b) => b.id === i.id).length === 0) {
                return {...i, state: 'delete', diff: {}};
            }
            return i;
        });

        // UPDATE
        newBoundaries.all.forEach((b) => {
            if (items.filter((i) => i.id === b.id).length === 0) {
                items.push({id: b.id, state: 'add', type: b.type, diff: {}, name: b.name});
                return;
            }

            const currentBoundary = currentBoundaries.findById(b.id);
            const newBoundary = newBoundaries.findById(b.id);

            if (!newBoundary || !currentBoundary) {
                return;
            }

            const diff = this.diff(newBoundary.toObject(), currentBoundary.toObject());
            const state = (isEqual(diff, {})) ? 'noUpdate' : 'update';

            items = items.map((i) => {
                if (i.id === b.id) {
                    return {...i, state, diff, name: b.name};
                }
                return i;
            });
        });

        return items;
    };

    protected diff = (newObj: any, currObj: any) => {
        const r: any = {};
        each(newObj, (v, k) => {
            if (currObj[k] === v) {
                return;
            }

            if (isArray(currObj[k]) && isArray(v)) {
                if (isEqual(currObj[k], v)) {
                    return;
                }

                r[k] = v;
            } else if (isObject(v)) {
                r[k] = this.diff(v, currObj[k]);
            } else {
                r[k] = v;
            }
        });

        for (const prop in r) {
            if (r.hasOwnProperty(prop) && isEqual(r[prop], {})) {
                delete r[prop];
            }
        }

        return r;
    };
}

export default BoundaryCollection;
